#pragma once
// IMPORTANT: GPIO choices below are provisional test assignments, NOT verified
// for your particular board pads. Verify schematic, pad access, and no conflict
// with BSP, display, touch, IMU, SD, PMU, or boot strapping before connecting.
// Buttons connect between GPIO and GND. External 10k pull-ups are recommended.
#define FAN_BUTTON_A_GPIO 17
#define FAN_BUTTON_B_GPIO 18

// ADC1_CH0 = GPIO1. GPIO1 is also assigned to SD card CMD on some board revisions.
// NO SD CARD / SDMMC DRIVER while using this measurement input.
// Do not connect this pin until you verify that it is physically accessible.
#define FAN_BAT_ADC_CHANNEL ADC_CHANNEL_0

// ADC divider: BMS P+ -- 220k -- GPIO1 -- 82k -- BMS P-/ESP GND
// 100 nF ceramic capacitor between GPIO1 and ESP GND at the ADC input.
#define FAN_DIVIDER_R_TOP 220000.0f
#define FAN_DIVIDER_R_BOTTOM 82000.0f

// Real motor drive is DISABLED until a logic-compatible controller, PWM pin,
// level requirements and safe external power topology have been verified.
// Change to a verified accessible output GPIO only after testing controller input.
#define FAN_MOTOR_PWM_GPIO (-1)

// A is long press to power on/off, short release to cycle ECO/NORMAL.
#define FAN_A_LONG_MS 850
#define FAN_DEBOUNCE_MS 35
// Refresh the native 240x240 pixel area 8 times per second.
#define FAN_UI_PERIOD_MS 125
#define FAN_BATTERY_PERIOD_MS 1500
