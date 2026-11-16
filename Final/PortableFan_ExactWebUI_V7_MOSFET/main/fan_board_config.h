#pragma once
// PortableFan V7, Waveshare ESP32-S3-Touch-AMOLED-1.8 V2 (CO5300).
// CURRENT PROTOTYPE PIN PROFILE: ADC and two physical keys and MOSFET on
// 4 pins = GPIO17, BOOT/GPIO0, GPIO16, GPIO18. No UART pin takeover.
// WARNING: Holding A during a cold ESP32 boot can enter ROM download mode.
#define FAN_BUTTON_A_GPIO 0    // external A in parallel to on-board BOOT, to GND
#define FAN_BUTTON_B_GPIO 16   // external B -> GND; disables I2S MCLK/audio use
#define FAN_DRIVER_KEY_GPIO 18 // N-MOSFET gate via 1k, 100k pulldown to GND

// Before confirming the original board's low-side KEY wiring, leave this 0.
// 0 = screen + buttons + state machine only; 1 = actual MOSFET KEY pulses.
#define FAN_ENABLE_MOSFET_KEY 1
#define FAN_ENABLE_BUTTON_INPUT 1

// Original controller button signature: double-click start, short cycle
// ECO -> NORMAL -> HIGH -> ECO, long press OFF. All delays MUST be calibrated.
// This assumes its first state after double-click is ECO (index 0).
#define FAN_DRIVER_START_MODE 0
#define FAN_DRIVER_TAP_MS 30
#define FAN_DRIVER_DOUBLE_GAP_MS 50
#define FAN_DRIVER_STOP_HOLD_MS 1100
#define FAN_DRIVER_SETTLE_MS 50

// Physical button semantics.
#define FAN_A_LONG_MS 800
#define FAN_DEBOUNCE_MS 35

// Display: screen ON initially. ANY touch/A/B wakes. No interaction 60s ->
// bsp_display_brightness_set(0). ESP32, touch, motor logic remain running.
#define FAN_SCREEN_BRIGHTNESS 80
#define FAN_SCREEN_TIMEOUT_MS 60000
#define FAN_TOUCH_POLL_MS 30
#define FAN_UI_PERIOD_MS 125
// 1=original small two-digit artwork shows 01 ECO / 02 NORMAL / 03 BOOST.
// 0=preserve old fixed opening digit 01.
#define FAN_UI_MODE_DIGITS 1

// Battery ADC on GPIO17 = ADC2 channel 6. External 2S pack ONLY through
// a 100k/47k divider on BMS P+ and P-, + optional 100nF input capacitor.
// GPIO17 MUST NOT be wired to the MOSFET KEY gate in this profile.
#define FAN_ENABLE_BATTERY_ADC 1
#define FAN_BAT_ADC_UNIT ADC_UNIT_2
#define FAN_BAT_ADC_CHANNEL ADC_CHANNEL_6
#define FAN_DIVIDER_R_TOP 100000.0f
#define FAN_DIVIDER_R_BOTTOM 47000.0f
#define FAN_BATTERY_PERIOD_MS 1500
#define FAN_DEMO_BATTERY_PERCENT 99
