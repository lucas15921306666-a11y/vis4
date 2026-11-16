#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <string.h>
#include <math.h>
#include "bsp/esp-bsp.h"
#include "lvgl.h"
#include "driver/gpio.h"
#include "driver/i2c_master.h"
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

#include "web_assets.h"
#if FAN_BUTTON_A_GPIO == FAN_BUTTON_B_GPIO || FAN_BUTTON_A_GPIO == FAN_DRIVER_KEY_GPIO || FAN_BUTTON_B_GPIO == FAN_DRIVER_KEY_GPIO
#error "Button A/B and MOSFET KEY must use distinct GPIOs"
#endif
#if FAN_ENABLE_BATTERY_ADC && FAN_DRIVER_KEY_GPIO == 17
#error "GPIO17 is reserved for 2S battery ADC in this profile; cannot also be MOSFET KEY"
#endif


static const char *TAG = "portable_fan";

static esp_err_t release_v2_panel_reset(void)
{
    i2c_master_bus_config_t cfg = {
        .i2c_port = I2C_NUM_0,
        .sda_io_num = GPIO_NUM_15,
        .scl_io_num = GPIO_NUM_14,
        .clk_source = I2C_CLK_SRC_DEFAULT,
        .glitch_ignore_cnt = 7,
        .flags.enable_internal_pullup = true,
    };
    i2c_master_bus_handle_t bus = NULL;
    i2c_master_dev_handle_t chip = NULL;
    esp_err_t err = i2c_new_master_bus(&cfg, &bus);
    if (err != ESP_OK) return err;
    i2c_device_config_t dev = {
        .dev_addr_length = I2C_ADDR_BIT_LEN_7,
        .device_address = 0x20,
        .scl_speed_hz = 100000,
    };
    err = i2c_master_bus_add_device(bus, &dev, &chip);
    if (err != ESP_OK) goto finish;

    uint8_t out = 0xFF, dir = 0xFF;
    uint8_t reg = 0x01;
    err = i2c_master_transmit_receive(chip, &reg, 1, &out, 1, 500);
    if (err != ESP_OK) goto finish;
    reg = 0x03;
    err = i2c_master_transmit_receive(chip, &reg, 1, &dir, 1, 500);
    if (err != ESP_OK) goto finish;
    ESP_LOGI(TAG, "TCA9554 before: output=0x%02X config=0x%02X", out, dir);

    uint8_t bytes[2] = {0x03, (uint8_t)(dir & ~0x07)};
    err = i2c_master_transmit(chip, bytes, 2, 500);
    if (err != ESP_OK) goto finish;
    // Preserve unrelated expander outputs and make P0/P1/P2 output.
    bytes[0] = 0x01;
    bytes[1] = out | 0x07;
    err = i2c_master_transmit(chip, bytes, 2, 500);
    if (err != ESP_OK) goto finish;
    vTaskDelay(pdMS_TO_TICKS(100));
    bytes[1] = out & (uint8_t)~0x07;
    err = i2c_master_transmit(chip, bytes, 2, 500);
    if (err != ESP_OK) goto finish;
    vTaskDelay(pdMS_TO_TICKS(300));
    bytes[1] = out | 0x07;
    err = i2c_master_transmit(chip, bytes, 2, 500);
    if (err != ESP_OK) goto finish;
    ESP_LOGI(TAG, "V2 TCA9554 reset done: P0/P1/P2 HIGH-LOW-HIGH");

finish:
    if (chip) i2c_master_bus_rm_device(chip);
    if (bus) i2c_del_master_bus(bus);
    return err;
}


#define UI_SIZE 240
#define LCD_W 368
#define LCD_H 448
#define UI_X ((LCD_W-UI_SIZE)/2)
#define UI_Y ((LCD_H-UI_SIZE)/2)
#define INK 0x0000
// Two buttons: base mode is persistent; BOOST is a momentary overlay.
typedef enum { MODE_ECO, MODE_NORMAL, MODE_BOOST } fan_mode_t;
typedef struct {
    bool power_on; // physical fan logical power, NOT display brightness
    bool screen_awake;
    fan_mode_t base_mode;
    bool b_held;
    int battery_percent; // -1 means ADC not yet valid
    float battery_voltage;
} fan_state_t;
static fan_state_t s = { .power_on = false, .screen_awake = true, .base_mode = MODE_ECO, .b_held = false,
#if FAN_ENABLE_BATTERY_ADC
                         .battery_percent = -1,
#else
                         .battery_percent = FAN_DEMO_BATTERY_PERCENT, // DEMO ONLY; not measured
#endif
                         .battery_voltage = 0 };

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


// ---- External one-key motor controller bridge (N-MOSFET, not motor PWM) ----
// Verified requirement: controller KEY input is pulled up to ~5V, and a press
// shorts KEY to the controller's own GND. MOSFET D=KEY, S=controller GND.
// ESP32 shares that GND ONLY after verifying common-ground compatibility.
// Gate has 1k series resistor from 3.3V GPIO and a 100k pulldown to source.
// Logic LOW=release, HIGH=press. Do not drive the 5V KEY node from ESP32.

typedef enum {
    KEY_IDLE, KEY_START_DOWN_1, KEY_START_BETWEEN,
    KEY_START_DOWN_2, KEY_STEP_DOWN, KEY_STOP_DOWN, KEY_SETTLE
} key_phase_t;
typedef struct {
    bool hardware_running;  // predicted hardware state; not actual RPM sensing
    int hardware_mode;      // 0/1/2: assumed ECO/NORMAL/HIGH on original board
    key_phase_t phase;
    int64_t until_ms;
} original_driver_t;
static original_driver_t driver = { .hardware_running = false,
                                    .hardware_mode = FAN_DRIVER_START_MODE,
                                    .phase = KEY_IDLE, .until_ms = 0 };
static int64_t last_activity_ms = 0;
static bool last_touch_pressed = false;

static void driver_key_set(bool pressed) {
#if FAN_ENABLE_MOSFET_KEY
    gpio_set_level((gpio_num_t)FAN_DRIVER_KEY_GPIO, pressed ? 1 : 0);
#else
    (void)pressed;
#endif
}
static void driver_key_init(void) {
#if FAN_ENABLE_MOSFET_KEY
    gpio_config_t pin = {
        .pin_bit_mask = 1ULL << FAN_DRIVER_KEY_GPIO,
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_ENABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&pin));
    driver_key_set(false); // fail-safe: simulated button RELEASED at boot
    ESP_LOGW(TAG, "MOSFET KEY emulation ENABLED on GPIO%d. Confirm the original 5V low-side key wiring.", FAN_DRIVER_KEY_GPIO);
#else
    ESP_LOGW(TAG, "MOSFET KEY emulation DISABLED. Fan state works in UI only.");
#endif
}
static void driver_change_phase(key_phase_t phase, int64_t now, int interval_ms, bool pressed) {
    driver.phase = phase;
    driver.until_ms = now + interval_ms;
    driver_key_set(pressed);
}
static void driver_tick(int64_t now) {
#if !FAN_ENABLE_MOSFET_KEY
    (void)now;
    return; // UI-only test must not pretend a physical driver has changed state.
#endif
    // One physical key cannot immediately jump to an arbitrary mode. The
    // controller's three-speed cycle is reconciled one short press at a time.
    if (driver.phase != KEY_IDLE) {
        if (now < driver.until_ms) return;
        switch (driver.phase) {
            case KEY_START_DOWN_1:
                driver_change_phase(KEY_START_BETWEEN, now, FAN_DRIVER_DOUBLE_GAP_MS, false);
                return;
            case KEY_START_BETWEEN:
                driver_change_phase(KEY_START_DOWN_2, now, FAN_DRIVER_TAP_MS, true);
                return;
            case KEY_START_DOWN_2:
                driver.hardware_running = true;
                driver.hardware_mode = FAN_DRIVER_START_MODE;
                ESP_LOGI(TAG, "Driver double-click start sent; assumed initial mode index %d", driver.hardware_mode);
                driver_change_phase(KEY_SETTLE, now, FAN_DRIVER_SETTLE_MS, false);
                return;
            case KEY_STEP_DOWN:
                driver.hardware_mode = (driver.hardware_mode + 1) % 3;
                ESP_LOGI(TAG, "Driver click sent; predicted physical mode %d", driver.hardware_mode);
                driver_change_phase(KEY_SETTLE, now, FAN_DRIVER_SETTLE_MS, false);
                return;
            case KEY_STOP_DOWN:
                driver.hardware_running = false;
                driver.hardware_mode = FAN_DRIVER_START_MODE;
                ESP_LOGI(TAG, "Driver long-press OFF sent");
                driver_change_phase(KEY_SETTLE, now, FAN_DRIVER_SETTLE_MS, false);
                return;
            case KEY_SETTLE:
                driver.phase = KEY_IDLE;
                break;
            default:
                driver_key_set(false);
                driver.phase = KEY_IDLE;
                break;
        }
    }
    // Reconcile according to the most recent logical state, including BOOST
    // release while a prior transition is still in progress.
    if (!s.power_on && driver.hardware_running) {
        driver_change_phase(KEY_STOP_DOWN, now, FAN_DRIVER_STOP_HOLD_MS, true);
    } else if (s.power_on && !driver.hardware_running) {
        driver_change_phase(KEY_START_DOWN_1, now, FAN_DRIVER_TAP_MS, true);
    } else if (s.power_on && driver.hardware_running) {
        const int target = s.b_held ? 2 : (s.base_mode == MODE_NORMAL ? 1 : 0);
        if (driver.hardware_mode != target) {
            driver_change_phase(KEY_STEP_DOWN, now, FAN_DRIVER_TAP_MS, true);
        }
    }
}
static void motor_apply(void) {
    // This function changes DESIRED state only; driver_tick makes the real key
    // transitions. Delays are unavoidable with the original one-button IC.
    ESP_LOGI(TAG, "Desired: fan=%d base=%s boost=%d effective=%s (driver key %s)",
             s.power_on, s.base_mode == MODE_ECO ? "ECO" : "NORMAL", s.b_held,
             s.b_held && s.power_on ? "BOOST" : (s.base_mode == MODE_ECO ? "ECO" : "NORMAL"),
             FAN_ENABLE_MOSFET_KEY ? "enabled" : "disabled");
}
static void screen_activity(int64_t now) {
    last_activity_ms = now;
    if (!s.screen_awake) {
        s.screen_awake = true;
        esp_err_t err = bsp_display_brightness_set(FAN_SCREEN_BRIGHTNESS);
        if (err != ESP_OK) ESP_LOGW(TAG, "Wake brightness: %s", esp_err_to_name(err));
        ESP_LOGI(TAG, "Display wake by user input");
    }
}
static void screen_idle_tick(int64_t now) {
    if (s.screen_awake && now - last_activity_ms >= FAN_SCREEN_TIMEOUT_MS) {
        s.screen_awake = false;
        esp_err_t err = bsp_display_brightness_set(0);
        if (err != ESP_OK) ESP_LOGW(TAG, "Sleep brightness: %s", esp_err_to_name(err));
        ESP_LOGI(TAG, "Display dimmed after 60s idle; motor state unchanged");
    }
}
// LVGL keeps running while brightness is zero, so the built-in capacitive
// controller can still provide pressed/released state for tap-to-wake.
static void poll_touch(int64_t now) {
    bool pressed = false;
    if (!bsp_display_lock(10)) return;
    lv_indev_t *indev = NULL;
    while ((indev = lv_indev_get_next(indev)) != NULL) {
        if (lv_indev_get_type(indev) == LV_INDEV_TYPE_POINTER &&
            lv_indev_get_state(indev) == LV_INDEV_STATE_PRESSED) {
            pressed = true;
            break;
        }
    }
    bsp_display_unlock();
    if (pressed) {
        if (!last_touch_pressed) screen_activity(now);
        last_activity_ms = now; // continuous touch counts as ongoing interaction
    }
    last_touch_pressed = pressed;
}

#if FAN_ENABLE_BUTTON_INPUT
typedef struct {
    gpio_num_t gpio;
    bool stable_pressed;
    bool last_raw;
    int64_t last_change_ms;
    int64_t press_start_ms;
    bool long_done;
} physical_button_t;
static physical_button_t key_a = {.gpio=(gpio_num_t)FAN_BUTTON_A_GPIO};
static physical_button_t key_b = {.gpio=(gpio_num_t)FAN_BUTTON_B_GPIO};

static void init_buttons(void) {
    gpio_config_t cfg = {
        .pin_bit_mask = (1ULL << FAN_BUTTON_A_GPIO) | (1ULL << FAN_BUTTON_B_GPIO),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    ESP_ERROR_CHECK(gpio_config(&cfg));
}
static bool update_button(physical_button_t *b, int64_t now) {
    bool raw = gpio_get_level(b->gpio) == 0;
    if (raw != b->last_raw) {
        b->last_raw = raw;
        b->last_change_ms = now;
    }
    if (raw != b->stable_pressed && now - b->last_change_ms >= FAN_DEBOUNCE_MS) {
        b->stable_pressed = raw;
        if (raw) {
            b->press_start_ms = now;
            b->long_done = false;
        }
        return true;
    }
    return false;
}
static void poll_buttons(int64_t now) {
    bool change_a = update_button(&key_a, now);
    bool change_b = update_button(&key_b, now);
    if (change_a && key_a.stable_pressed) screen_activity(now);
    if (change_b && key_b.stable_pressed) screen_activity(now);
    if (key_a.stable_pressed || key_b.stable_pressed) {
        // An ongoing hold counts as active input for display timeout.
        last_activity_ms = now;
    }
    if (change_b) {
        // A BOOST press while OFF is ignored; it cannot start the motor.
        if (key_b.stable_pressed && s.power_on) s.b_held = true;
        if (!key_b.stable_pressed) s.b_held = false;
        motor_apply();
    }
    if (key_a.stable_pressed && !key_a.long_done &&
        now - key_a.press_start_ms >= FAN_A_LONG_MS) {
        key_a.long_done = true;
        s.power_on = !s.power_on;
        if (!s.power_on) s.b_held = false;
        ESP_LOGI(TAG, "A LONG -> fan %s", s.power_on ? "ON" : "OFF");
        motor_apply();
    }
    if (change_a && !key_a.stable_pressed && !key_a.long_done) {
        if (!s.power_on) {
            ESP_LOGI(TAG, "A SHORT while OFF -> display wake only, fan stays OFF");
        } else {
            s.base_mode = s.base_mode == MODE_ECO ? MODE_NORMAL : MODE_ECO;
            ESP_LOGI(TAG, "A SHORT while ON -> %s", s.base_mode == MODE_ECO ? "ECO" : "NORMAL");
            motor_apply();
        }
    }
}
#endif // FAN_ENABLE_BUTTON_INPUT

#if FAN_ENABLE_BATTERY_ADC
// ADC2 / 2S protected pack readout (OCV approximation, not coulomb counting).
static adc_oneshot_unit_handle_t adc_unit;
static adc_cali_handle_t adc_cal;
static bool adc_cal_ok = false;
static float filtered_voltage = -1.0f;
static int64_t last_invalid_adc_log_ms = -100000;
static void init_battery_adc(void) {
    adc_oneshot_unit_init_cfg_t u = { .unit_id=FAN_BAT_ADC_UNIT };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&u,&adc_unit));
    adc_oneshot_chan_cfg_t chan = { .bitwidth=ADC_BITWIDTH_12, .atten=ADC_ATTEN_DB_12 };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_unit,FAN_BAT_ADC_CHANNEL,&chan));
    adc_cali_curve_fitting_config_t cfg = {
       .unit_id=FAN_BAT_ADC_UNIT, .chan=FAN_BAT_ADC_CHANNEL, .atten=ADC_ATTEN_DB_12,
       .bitwidth=ADC_BITWIDTH_12 };
    esp_err_t result=adc_cali_create_scheme_curve_fitting(&cfg,&adc_cal);
    adc_cal_ok=(result==ESP_OK);
    if (!adc_cal_ok) ESP_LOGW(TAG,"ADC eFuse curve fitting unavailable; voltage reading disabled until calibration is configured");
    else ESP_LOGI(TAG,"Battery ADC configured: ADC2_CH6 (GPIO17), divider %.0f / %.0f ohms", (double)FAN_DIVIDER_R_TOP, (double)FAN_DIVIDER_R_BOTTOM);
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
    if (pin_voltage < 0.15f || pin_voltage > 3.0f || pack_voltage < 4.0f || pack_voltage > 8.65f) {
        int64_t now = esp_timer_get_time()/1000;
        if (now - last_invalid_adc_log_ms > 4000) {
            ESP_LOGW(TAG,"Invalid/disconnected battery sense: pin %.3f V, pack %.3f V; battery display hidden", pin_voltage, pack_voltage);
            last_invalid_adc_log_ms = now;
        }
        s.battery_percent=-1;
        filtered_voltage=-1.0f;
        return;
    }
    if (filtered_voltage<0) filtered_voltage=pack_voltage;
    else filtered_voltage=0.85f*filtered_voltage+0.15f*pack_voltage;
    s.battery_voltage=filtered_voltage;
    int prev=s.battery_percent;
    s.battery_percent=voltage_to_percent(filtered_voltage);
    ESP_LOGI(TAG,"Battery ADC pin %.3f V, pack %.2f V, estimated %d%%", pin_voltage, s.battery_voltage, s.battery_percent);
    (void)prev; // Battery SOC is an estimate, never a substitute for BMS protection.
}

#endif // FAN_ENABLE_BATTERY_ADC

// ---- Exact 240x240 webpage canvas raster port ----
// Original: src/rendering/canvasEngine.js, assets under public/assets/.
// All coordinates and sprite sizes match the web Canvas implementation.
// Pixel unit = 1 native AMOLED pixel; no stretching or font antialiasing.
static uint16_t *framebuffer = NULL;
static lv_obj_t *canvas = NULL;
static int last_battery = -99;
static int battery_tiles = 224;
static int last_opening = -1;
static int degree_pixels = 1600;
static int web_opening = 1; // Mechanical opening retired; retain original visual widget at 01.
static float fan_angle = 0.0f;
static int64_t last_render_ms = -1;
static const uint16_t WEB_BLACK = 0x0000;
static const uint16_t WEB_GREEN = 0xCFEA; // overwritten by exact SVG background raster

static bool bit_read(const uint8_t *bitmap, int width, int x, int y) {
    int i = y * width + x;
    return (bitmap[i >> 3] & (0x80U >> (i & 7))) != 0;
}
static void web_pixel(int x, int y, uint16_t color) {
    if ((unsigned)x < UI_SIZE && (unsigned)y < UI_SIZE)
       framebuffer[y*UI_SIZE+x] = color;
}
static void web_fill(int x,int y,int w,int h,uint16_t color) {
    for(int yy=y;yy<y+h;yy++) for(int xx=x;xx<x+w;xx++) web_pixel(xx,yy,color);
}
static void web_restore_frame(void) {
    unsigned idx=0;
    for(unsigned run=0;run<WEB_FRAME_RUN_COUNT;run++) {
        unsigned len=web_frame_runs[run][1];
        uint16_t rgb=web_frame_runs[run][0];
        while(len-- && idx<UI_SIZE*UI_SIZE) framebuffer[idx++]=rgb;
    }
    while(idx<UI_SIZE*UI_SIZE) framebuffer[idx++]=WEB_GREEN;
}
static void web_battery_digit(int digit,int dest_x,int dest_y,int tile_limit,int which) {
    // Source PNG/SVG strip: 890x140, JS uses 90px cell and draws 80x140.
    if(digit<0 || digit>9) return;
    for(int y=0;y<140;y++) for(int x=0;x<80;x++) {
        if(tile_limit<224) {
            int tile=which*112+(y/10)*8+x/10;
            if(tile>=tile_limit)continue;
        }
        if(bit_read(web_battery_bits,890,digit*90+x,y))web_pixel(dest_x+x,dest_y+y,WEB_BLACK);
    }
}
static void web_draw_battery(int percent,int tile_limit) {
    if(percent<0) return; // ADC missing: no fake battery percentage.
    if(percent>99)percent=99;
    web_battery_digit(percent/10,60,55,tile_limit,0);
    web_battery_digit(percent%10,150,55,tile_limit,1);
}
static const uint8_t *web_deg_bitmap(int idx) {
    switch(idx) {
        case 0:return web_degree_1_bits;case 1:return web_degree_2_bits;
        case 2:return web_degree_3_bits;case 3:return web_degree_4_bits;
        case 4:return web_degree_5_bits;default:return web_degree_6_bits;
    }
}
static void web_draw_degree(int opening,int limit) {
    // Source degree-1..6 SVG is 40x30, drawn at (10,65).
    int idx=(opening-1)/15;
    if (idx < 0) { idx = 0; }
    if (idx > 5) { idx = 5; }
    const uint8_t *bm=web_deg_bitmap(idx);
    for(int y=0;y<30;y++)for(int x=0;x<40;x++){
        if(y*40+x>=limit)continue;
        if(bit_read(bm,40,x,y))web_pixel(10+x,65+y,WEB_BLACK);
    }
    // Opening digit strip: cell 8, drawn each at 6x10: (13,30),(21,30) local.
    const int v[2]={opening/10,opening%10};
    for(int d=0;d<2;d++)for(int y=0;y<10;y++)for(int x=0;x<6;x++){
        int gx=13+d*8+x,gy=30+y;
        if(gy*40+gx>=limit)continue;
        if(bit_read(web_opening_bits,78,v[d]*8+x,y)) web_pixel(10+gx,65+gy,WEB_BLACK);
    }
}
static void web_draw_fan(float angle) {
    // Original 40x40 fan.svg, rotation around its center, nearest-neighbor sampling.
    // Same clipping rectangle: (10,135) to (49,174).
    float cs=cosf(angle),sn=sinf(angle);
    for(int y=0;y<40;y++) for(int x=0;x<40;x++) {
        float dx=(x+0.5f)-20.0f,dy=(y+0.5f)-20.0f;
        int sx=(int)floorf(cs*dx+sn*dy+20.0f);
        int sy=(int)floorf(-sn*dx+cs*dy+20.0f);
        if((unsigned)sx<40 && (unsigned)sy<40 && bit_read(web_fan_bits,40,sx,sy))
          web_pixel(10+x,135+y,WEB_BLACK);
    }
}
// Exact pixelFont.js 5x7 glyph shapes; black, top-left (10,10).
static const struct {char ch;const char *rows[7];} font[] = {
    {'A',{"01110","10001","10001","11111","10001","10001","10001"}},
    {'B',{"11110","10001","10001","11110","10001","10001","11110"}},
    {'C',{"01111","10000","10000","10000","10000","10000","01111"}},
    {'D',{"11110","10001","10001","10001","10001","10001","11110"}},
    {'E',{"11111","10000","10000","11110","10000","10000","11111"}},
    {'F',{"11111","10000","10000","11110","10000","10000","10000"}},
    {'G',{"01111","10000","10000","10111","10001","10001","01111"}},
    {'H',{"10001","10001","10001","11111","10001","10001","10001"}},
    {'I',{"11111","00100","00100","00100","00100","00100","11111"}},
    {'J',{"00111","00010","00010","00010","00010","10010","01100"}},
    {'K',{"10001","10010","10100","11000","10100","10010","10001"}},
    {'L',{"10000","10000","10000","10000","10000","10000","11111"}},
    {'M',{"10001","11011","10101","10101","10001","10001","10001"}},
    {'N',{"10001","11001","10101","10011","10001","10001","10001"}},
    {'O',{"01110","10001","10001","10001","10001","10001","01110"}},
    {'P',{"11110","10001","10001","11110","10000","10000","10000"}},
    {'Q',{"01110","10001","10001","10001","10101","10010","01101"}},
    {'R',{"11110","10001","10001","11110","10100","10010","10001"}},
    {'S',{"01111","10000","10000","01110","00001","00001","11110"}},
    {'T',{"11111","00100","00100","00100","00100","00100","00100"}},
    {'U',{"10001","10001","10001","10001","10001","10001","01110"}},
    {'V',{"10001","10001","10001","10001","10001","01010","00100"}},
    {'W',{"10001","10001","10001","10101","10101","10101","01010"}},
    {'X',{"10001","10001","01010","00100","01010","10001","10001"}},
    {'Y',{"10001","10001","01010","00100","00100","00100","00100"}},
    {'Z',{"11111","00001","00010","00100","01000","10000","11111"}},
    {':',{"00000","00100","00100","00000","00100","00100","00000"}},
    {'/',{"00001","00010","00010","00100","01000","01000","10000"}},
    {' ',{"00000","00000","00000","00000","00000","00000","00000"}},
};
static void web_text(const char *s,int x,int y) {
    for(int i=0;s[i];i++){
       const char * const *glyph=NULL;
       for(unsigned k=0;k<sizeof(font)/sizeof(font[0]);k++)if(font[k].ch==s[i]){
           glyph=font[k].rows;break;
       }
       if(!glyph)continue;
       for(int gy=0;gy<7;gy++)for(int gx=0;gx<5;gx++)
          if(glyph[gy][gx]=='1')web_pixel(x+i*6+gx,y+gy,WEB_BLACK);
    }
}
static void web_battery_bar(int battery) {
    // (59,215) 171x8. JS uses black fill from (60,216) 0..169x6.
    if(battery<0)return;
    if(battery>99)battery=99;
    int width=(169*battery+49)/99;
    web_fill(60,216,width,6,WEB_BLACK);
}
static int actual_speed(void) {
    if (!s.power_on) return 0;
    if (s.b_held) return 95;
    return s.base_mode == MODE_NORMAL ? 58 : 28;
}
static void render_ui(int64_t ms) {
    if(!canvas || !framebuffer)return;
    { // Frame remains prepared even when display brightness is zero; touch is alive.
       web_restore_frame();
       int b=s.battery_percent;
       if(b!=last_battery){battery_tiles=(last_battery==-99)?224:0;last_battery=b;}
#if FAN_UI_MODE_DIGITS
       // Keep the exact original digit sprite and its coordinates, while
       // reusing obsolete opening-value digits to identify 01/02/03 speed.
       int o = s.power_on ? (s.b_held ? 3 : (s.base_mode == MODE_NORMAL ? 2 : 1)) : 1;
#else
       int o = web_opening;
#endif
       if(o!=last_opening){degree_pixels=(last_opening==-1)?1600:0;last_opening=o;}
       if(battery_tiles<224){battery_tiles+=28;if(battery_tiles>224)battery_tiles=224;}
       if(degree_pixels<1600){degree_pixels+=800;if(degree_pixels>1600)degree_pixels=1600;}
       web_draw_battery(b,battery_tiles);
       web_draw_degree(o,degree_pixels);
       int speed=actual_speed();
       int64_t dt = (last_render_ms<0)?0:(ms-last_render_ms);
       if (dt > 100) { dt = 100; }
       if (dt < 0) { dt = 0; }
       if(!speed)fan_angle=0.0f;
       else fan_angle=fmodf(fan_angle+(dt/1000.f)*3.14159265359f*4.f*speed/100.f,6.28318530718f);
       web_draw_fan(fan_angle);
       web_battery_bar(b);
       // Exact web status from utils/format.js, without introducing mode labels.
       const char *status;
       if(speed>0)status = "STATE: RUN";
       else if(b>=0 && b<=20)status="STATE: LOW BATTERY";
       else status="STATE: READY";
       web_text(status,10,10);
    }
    last_render_ms=ms;
    lv_obj_invalidate(canvas);
}
static void init_display_ui(void) {
    ESP_LOGI(TAG,"Starting known-working Waveshare V2 BSP + TCA9554 reset sequence");
    lv_display_t *display=bsp_display_start();
    ESP_ERROR_CHECK(display ? ESP_OK : ESP_FAIL);
    ESP_LOGI(TAG,"Panel resolution %ld x %ld",(long)lv_display_get_horizontal_resolution(display),
        (long)lv_display_get_vertical_resolution(display));
    ESP_ERROR_CHECK(bsp_display_brightness_set(FAN_SCREEN_BRIGHTNESS));
    framebuffer=heap_caps_malloc(UI_SIZE*UI_SIZE*sizeof(uint16_t),MALLOC_CAP_SPIRAM|MALLOC_CAP_8BIT);
    ESP_ERROR_CHECK(framebuffer ? ESP_OK : ESP_ERR_NO_MEM);
    memset(framebuffer,0,UI_SIZE*UI_SIZE*2);
    if(bsp_display_lock(2000)) {
        lv_obj_t *root=lv_screen_active();
        lv_obj_set_style_bg_color(root,lv_color_black(),0);
        lv_obj_set_style_bg_opa(root,LV_OPA_COVER,0);
        lv_obj_clear_flag(root,LV_OBJ_FLAG_SCROLLABLE);
        canvas=lv_canvas_create(root);
        lv_canvas_set_buffer(canvas,framebuffer,UI_SIZE,UI_SIZE,LV_COLOR_FORMAT_RGB565);
        lv_obj_set_pos(canvas,UI_X,UI_Y);
        lv_obj_clear_flag(canvas,LV_OBJ_FLAG_SCROLLABLE);
        render_ui(0);
        lv_obj_invalidate(root);
        bsp_display_unlock();
        ESP_LOGI(TAG,"Exact Web UI ready: 240x240 at (64,104)");
    } else ESP_LOGE(TAG,"Could not lock LVGL display");
}
void app_main(void) {
    ESP_LOGI(TAG,"Exact Web UI V7: one-key MOSFET bridge + touch wake + 60s display timeout");
    esp_err_t e=release_v2_panel_reset();
    if(e!=ESP_OK)ESP_LOGE(TAG,"Panel reset failed: %s",esp_err_to_name(e));
#if FAN_ENABLE_BUTTON_INPUT
    init_buttons();
#endif
    driver_key_init();
#if FAN_ENABLE_BATTERY_ADC
    init_battery_adc();
#endif
#if !FAN_ENABLE_BATTERY_ADC
    ESP_LOGW(TAG,"Battery ADC disabled; shown battery %d%% is DEMO DATA, NOT measured",s.battery_percent);
#endif
    init_display_ui();
#if FAN_ENABLE_BATTERY_ADC
    int64_t last_bat=-(int64_t)FAN_BATTERY_PERIOD_MS;
#endif
    int64_t last_ui = 0;
    int64_t last_touch = 0;
    last_activity_ms = esp_timer_get_time() / 1000;
    motor_apply();
    while(true){
        int64_t ms=esp_timer_get_time()/1000;
#if FAN_ENABLE_BUTTON_INPUT
        poll_buttons(ms);
#endif
        driver_tick(ms);
        if (ms - last_touch >= FAN_TOUCH_POLL_MS) {
            last_touch = ms;
            poll_touch(ms);
        }
        screen_idle_tick(ms);
#if FAN_ENABLE_BATTERY_ADC
        if(ms-last_bat>=FAN_BATTERY_PERIOD_MS){last_bat=ms;measure_battery();}
#endif
        if(ms-last_ui>=FAN_UI_PERIOD_MS){
            last_ui=ms;
            if(s.screen_awake && bsp_display_lock(50)){render_ui(ms);bsp_display_unlock();}
        }
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
