#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "bsp/esp-bsp.h"
#include "lvgl.h"
#include "driver/gpio.h"
#include "driver/ledc.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_timer.h"
#include "esp_log.h"
#include "esp_check.h"
#include "esp_heap_caps.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "fan_board_config.h"

#include "ui_base.h"
#include "battery_digits.h"

#define UI_SIZE 240
#define LCD_W 368
#define LCD_H 448
#define UI_X ((LCD_W-UI_SIZE)/2)
#define UI_Y ((LCD_H-UI_SIZE)/2)
#define INK 0x0000
static const char *TAG = "portable_fan";

// Two buttons: base mode is persistent; BOOST is a momentary overlay.
typedef enum { MODE_ECO, MODE_NORMAL, MODE_BOOST } fan_mode_t;
typedef struct {
    bool power_on;
    fan_mode_t base_mode;
    bool b_held;
    int battery_percent; // -1 means ADC not yet valid
    float battery_voltage;
} fan_state_t;
static fan_state_t s = { .power_on = false, .base_mode = MODE_ECO, .b_held = false,
                         .battery_percent = -1, .battery_voltage = 0 };

static fan_mode_t effective_mode(void) {
    return s.b_held ? MODE_BOOST : s.base_mode;
}
static uint32_t mode_duty_pct(void) {
    if (!s.power_on || s.battery_percent == 0) return 0;
    switch (effective_mode()) {
        case MODE_ECO: return 28;
        case MODE_NORMAL: return 58;
        case MODE_BOOST: return 95;
    }
    return 0;
}

// This is intentionally a PWM DRIVER signal, never a direct motor connection.
static void motor_init(void) {
#if FAN_MOTOR_PWM_GPIO >= 0
    ledc_timer_config_t t = { .speed_mode=LEDC_LOW_SPEED_MODE, .duty_resolution=LEDC_TIMER_10_BIT,
                              .timer_num=LEDC_TIMER_0, .freq_hz=20000, .clk_cfg=LEDC_AUTO_CLK };
    ESP_ERROR_CHECK(ledc_timer_config(&t));
    ledc_channel_config_t c = { .gpio_num=FAN_MOTOR_PWM_GPIO, .speed_mode=LEDC_LOW_SPEED_MODE,
                                .channel=LEDC_CHANNEL_0, .intr_type=LEDC_INTR_DISABLE,
                                .timer_sel=LEDC_TIMER_0, .duty=0, .hpoint=0 };
    ESP_ERROR_CHECK(ledc_channel_config(&c));
#endif
}
static void motor_apply(void) {
    uint32_t percent = mode_duty_pct();
#if FAN_MOTOR_PWM_GPIO >= 0
    // Never drive the external motor controller if battery sensing is invalid.
    uint32_t safe_percent = (s.battery_percent < 0 ? 0 : percent);
    uint32_t duty = (safe_percent * 1023U) / 100U;
    ESP_ERROR_CHECK(ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty));
    ESP_ERROR_CHECK(ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0));
#endif
    ESP_LOGI(TAG, "Fan logic: power=%d base=%s boost_held=%d effective=%s duty=%lu%% (PWM GPIO=%d)",
       s.power_on, s.base_mode == MODE_ECO ? "ECO" : "NORMAL", s.b_held,
       effective_mode() == MODE_BOOST ? "BOOST" : (s.base_mode == MODE_ECO ? "ECO" : "NORMAL"),
       (unsigned long)percent, FAN_MOTOR_PWM_GPIO);
}

typedef struct {
    int gpio;
    bool stable_pressed;
    bool last_raw;
    int64_t last_change_ms;
    int64_t press_start_ms;
    bool long_done;
} physical_button_t;
static physical_button_t key_a = {.gpio=FAN_BUTTON_A_GPIO};
static physical_button_t key_b = {.gpio=FAN_BUTTON_B_GPIO};

static void init_buttons(void) {
    gpio_config_t cfg = { .pin_bit_mask=(1ULL<<FAN_BUTTON_A_GPIO)|(1ULL<<FAN_BUTTON_B_GPIO),
       .mode=GPIO_MODE_INPUT, .pull_up_en=GPIO_PULLUP_ENABLE, .pull_down_en=GPIO_PULLDOWN_DISABLE,
       .intr_type=GPIO_INTR_DISABLE };
    ESP_ERROR_CHECK(gpio_config(&cfg));
}
static bool update_button(physical_button_t *b, int64_t now) {
    bool raw = gpio_get_level((gpio_num_t)b->gpio) == 0;
    if (raw != b->last_raw) { b->last_raw=raw; b->last_change_ms=now; }
    if (raw != b->stable_pressed && now-b->last_change_ms >= FAN_DEBOUNCE_MS) {
        b->stable_pressed=raw;
        if (raw) { b->press_start_ms=now; b->long_done=false; }
        return true;
    }
    return false;
}
static void poll_buttons(int64_t now) {
    bool change_a = update_button(&key_a, now);
    bool change_b = update_button(&key_b, now);
    if (change_b) {
        s.b_held = key_b.stable_pressed;
        motor_apply(); // release immediately returns to previous ECO/NORMAL
    }
    if (key_a.stable_pressed && !key_a.long_done && now-key_a.press_start_ms >= FAN_A_LONG_MS) {
        key_a.long_done=true;
        s.power_on=!s.power_on;
        if (!s.power_on) s.b_held = false; // reset BOOST overlay on software power-off
        motor_apply();
    }
    if (change_a && !key_a.stable_pressed && !key_a.long_done && s.power_on) {
        s.base_mode=(s.base_mode==MODE_ECO)?MODE_NORMAL:MODE_ECO;
        motor_apply();
    }
    if (s.power_on && key_b.stable_pressed && !s.b_held) {
        s.b_held=true;
        motor_apply();
    }
}

// ADC1 / 2S protected pack readout (OCV approximation, not coulomb counting).
static adc_oneshot_unit_handle_t adc_unit;
static adc_cali_handle_t adc_cal;
static bool adc_cal_ok = false;
static float filtered_voltage = -1.0f;
static void init_battery_adc(void) {
    adc_oneshot_unit_init_cfg_t u = { .unit_id=ADC_UNIT_1 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&u,&adc_unit));
    adc_oneshot_chan_cfg_t chan = { .bitwidth=ADC_BITWIDTH_12, .atten=ADC_ATTEN_DB_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_unit,FAN_BAT_ADC_CHANNEL,&chan));
    adc_cali_curve_fitting_config_t cfg = {
       .unit_id=ADC_UNIT_1, .chan=FAN_BAT_ADC_CHANNEL, .atten=ADC_ATTEN_DB_12,
       .bitwidth=ADC_BITWIDTH_12 };
    esp_err_t result=adc_cali_create_scheme_curve_fitting(&cfg,&adc_cal);
    adc_cal_ok=(result==ESP_OK);
    if (!adc_cal_ok) ESP_LOGW(TAG,"ADC eFuse curve fitting unavailable; voltage reading disabled until calibration is configured");
}
static int voltage_to_percent(float v) {
    // Illustrative 2S Li-ion open-circuit approximation. Calibrate with exact cells.
    static const float voltage[] = {6.00f,6.40f,6.60f,6.80f,7.00f,7.20f,7.40f,7.60f,7.80f,8.00f,8.20f,8.40f};
    static const int pct[]       = {0,    5,    10,   18,   30,   45,   58,   70,   80,   90,   96,   99};
    if (v<=voltage[0]) return 0;
    for (int i=1; i<12; i++) if (v<=voltage[i]) {
        float u=(v-voltage[i-1])/(voltage[i]-voltage[i-1]);
        return (int)lroundf(pct[i-1]+u*(pct[i]-pct[i-1]));
    }
    return 99;
}
static void measure_battery(void) {
    if (!adc_cal_ok) { s.battery_percent=-1; return; }
    int total_mv=0, count=0;
    for (int i=0;i<16;i++) {
       int raw=0,mv=0;
       if (adc_oneshot_read(adc_unit,FAN_BAT_ADC_CHANNEL,&raw)==ESP_OK &&
           adc_cali_raw_to_voltage(adc_cal,raw,&mv)==ESP_OK) {
            total_mv+=mv; count++;
       }
    }
    if (!count) { s.battery_percent=-1; return; }
    float pin_voltage=(total_mv/(float)count)/1000.0f;
    // Reconstruct pack voltage from protection-board P+ to P-.
    float pack_voltage=pin_voltage * (FAN_DIVIDER_R_TOP+FAN_DIVIDER_R_BOTTOM)/FAN_DIVIDER_R_BOTTOM;
    // Open/disconnected divider is not a valid battery measurement.
    if (pin_voltage < 0.15f) { s.battery_percent=-1; return; }
    if (filtered_voltage<0) filtered_voltage=pack_voltage;
    else filtered_voltage=0.85f*filtered_voltage+0.15f*pack_voltage;
    s.battery_voltage=filtered_voltage;
    int prev=s.battery_percent;
    s.battery_percent=voltage_to_percent(filtered_voltage);
    ESP_LOGI(TAG,"Battery %.2f V, estimated %d%%",s.battery_voltage,s.battery_percent);
    if (prev!=s.battery_percent && s.battery_percent==0) motor_apply();
}

// Original 240x240 pixel drawing. UI exactly one hardware pixel per source pixel.
// No LVGL text antialiasing or SVG raster scaling: static frame and numbers are native pixels.
static uint16_t *framebuffer = NULL;
static lv_obj_t *canvas = NULL;
static void px(int x,int y,uint16_t c) {
    if ((unsigned)x<UI_SIZE && (unsigned)y<UI_SIZE) framebuffer[y*UI_SIZE+x]=c;
}
static void rectangle(int x,int y,int w,int h,uint16_t c) {
    for (int j=0;j<h;j++) for (int i=0;i<w;i++) px(x+i,y+j,c);
}
static void restore_frame(void) {
    int offset=0;
    for (size_t r=0;r<sizeof(ui_base_runs)/sizeof(ui_base_runs[0]);r++) {
        uint16_t color=ui_base_runs[r][0], len=ui_base_runs[r][1];
        for (uint16_t j=0;j<len;j++) framebuffer[offset++]=color;
    }
}
static bool digit_pixel(int digit,int x,int y) {
    size_t index=(size_t)digit*80*140+(size_t)y*80+x;
    return (battery_digit_bits[index/8] & (0x80>>(index%8)))!=0;
}
static void draw_battery_digits(void) {
    if (s.battery_percent<0) {
        // No valid measurement; never fake 99%.
        rectangle(60,119,80,5,INK); rectangle(150,119,80,5,INK);
        return;
    }
    int tens=s.battery_percent/10, ones=s.battery_percent%10;
    for (int y=0;y<140;y++) for (int x=0;x<80;x++) {
        if (digit_pixel(tens,x,y)) px(60+x,55+y,INK);
        if (digit_pixel(ones,x,y)) px(150+x,55+y,INK);
    }
    int filled=(168*s.battery_percent)/99;
    rectangle(60,216,filled,6,INK);
}
// Tiny 5x7 pixel font, no system font dependence.
static const struct {char ch; uint8_t rows[7];} glyphs[]={
    {'A',{14,17,17,31,17,17,17}}, {'B',{30,17,17,30,17,17,30}},
    {'C',{15,16,16,16,16,16,15}}, {'D',{30,17,17,17,17,17,30}},
    {'E',{31,16,16,30,16,16,31}}, {'F',{31,16,16,30,16,16,16}},
    {'G',{15,16,16,23,17,17,15}}, {'H',{17,17,17,31,17,17,17}},
    {'I',{31,4,4,4,4,4,31}}, {'L',{16,16,16,16,16,16,31}},
    {'M',{17,27,21,21,17,17,17}}, {'N',{17,25,21,19,17,17,17}},
    {'O',{14,17,17,17,17,17,14}}, {'R',{30,17,17,30,20,18,17}},
    {'S',{15,16,16,14,1,1,30}}, {'T',{31,4,4,4,4,4,4}},
    {'U',{17,17,17,17,17,17,14}}, {'W',{17,17,17,21,21,21,10}},
    {'Y',{17,17,10,4,4,4,4}}, {'/',{1,1,2,4,8,16,16}},
    {':',{0,4,4,0,4,4,0}}, {'-',{0,0,0,31,0,0,0}},
    {' ',{0,0,0,0,0,0,0}},
};
static void text_at(int x,int y,const char *text) {
    for (int n=0;text[n];n++) {
        const uint8_t *rows=NULL;
        for(size_t g=0;g<sizeof(glyphs)/sizeof(glyphs[0]);g++) if (glyphs[g].ch==text[n]) {rows=glyphs[g].rows;break;}
        if (!rows) continue;
        for (int yy=0;yy<7;yy++) for(int xx=0;xx<5;xx++)
            if (rows[yy] & (1<<(4-xx))) px(x+n*6+xx,y+yy,INK);
    }
}
static void draw_fan(int64_t now_ms) {
    if (!s.power_on) return;
    // Preserve fan icon in the original lower-left 40x40 area.
    // Higher modes animate more spokes; OFF would be full black display.
    int spoke_count=effective_mode()==MODE_ECO?4:(effective_mode()==MODE_NORMAL?6:8);
    float speed=effective_mode()==MODE_ECO?3.0f:(effective_mode()==MODE_NORMAL?6.0f:10.0f);
    float angle=mode_duty_pct()>0 ? (float)now_ms*0.001f*speed : 0;
    for(int i=0;i<spoke_count;i++) {
       float rad=angle + 2.0f*3.14159265f*i/spoke_count;
       for(int r=4;r<19;r++) for(int thick=-1;thick<=1;thick++) {
          int x=30+(int)lroundf(cosf(rad)*r - sinf(rad)*thick);
          int y=155+(int)lroundf(sinf(rad)*r + cosf(rad)*thick);
          px(x,y,INK);
       }
    }
}
static void render_ui(int64_t ms) {
    if (!canvas || !framebuffer) return;
    if (!s.power_on) memset(framebuffer,0,UI_SIZE*UI_SIZE*2);
    else {
        restore_frame();
        draw_battery_digits();
        text_at(8,12,s.battery_percent>=0 && s.battery_percent<=10 ? "STATE: LOW BATTERY" :
             (mode_duty_pct()==0 ? "STATE: READY" : "STATE: RUN"));
        const char *mode=effective_mode()==MODE_BOOST?"BOOST":(s.base_mode==MODE_ECO?"ECO":"NORMAL");
        text_at(7,111,mode);
        draw_fan(ms);
    }
    lv_obj_invalidate(canvas);
}
static void init_display_ui(void) {
    lv_display_t *display=bsp_display_start();
    ESP_ERROR_CHECK(display ? ESP_OK : ESP_FAIL);
    ESP_LOGI(TAG,"Panel resolution %ld x %ld",(long)lv_display_get_horizontal_resolution(display),
       (long)lv_display_get_vertical_resolution(display));
    if (lv_display_get_horizontal_resolution(display)!=LCD_W || lv_display_get_vertical_resolution(display)!=LCD_H)
       ESP_LOGW(TAG,"Expected 368x448 portrait. Centering still uses fixed coordinates; check rotation.");
    ESP_ERROR_CHECK(bsp_display_brightness_set(80));
    framebuffer=heap_caps_malloc(UI_SIZE*UI_SIZE*sizeof(uint16_t),MALLOC_CAP_SPIRAM|MALLOC_CAP_8BIT);
    ESP_ERROR_CHECK(framebuffer ? ESP_OK : ESP_ERR_NO_MEM);
    memset(framebuffer,0,UI_SIZE*UI_SIZE*2);
    if (bsp_display_lock(2000)) {
       lv_obj_t *root=lv_screen_active();
       lv_obj_set_style_bg_color(root,lv_color_black(),0);
       lv_obj_set_style_bg_opa(root,LV_OPA_COVER,0);
       lv_obj_clear_flag(root,LV_OBJ_FLAG_SCROLLABLE);
       canvas=lv_canvas_create(root);
       lv_canvas_set_buffer(canvas,framebuffer,UI_SIZE,UI_SIZE,LV_COLOR_FORMAT_RGB565);
       lv_obj_set_pos(canvas,UI_X,UI_Y); // exactly (64,104), no scale
       lv_obj_clear_flag(canvas,LV_OBJ_FLAG_SCROLLABLE);
       render_ui(0);
       bsp_display_unlock();
    } else ESP_LOGE(TAG,"Could not lock LVGL display");
}

void app_main(void) {
    init_buttons();
    motor_init();
    init_battery_adc();
    init_display_ui();
    int64_t last_bat=-(int64_t)FAN_BATTERY_PERIOD_MS;
    int64_t last_ui=0;
    motor_apply();
    while (true) {
        int64_t ms=esp_timer_get_time()/1000;
        poll_buttons(ms);
        if (ms-last_bat >= FAN_BATTERY_PERIOD_MS) {
           last_bat=ms;
           measure_battery();
        }
        if (ms-last_ui >= FAN_UI_PERIOD_MS) {
           last_ui=ms;
           if (bsp_display_lock(50)) {render_ui(ms);bsp_display_unlock();}
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
