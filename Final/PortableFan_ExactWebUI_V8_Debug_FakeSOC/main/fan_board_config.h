#pragma once
// PortableFan V7.2 EXTERNAL A/B, Waveshare ESP32-S3-Touch-AMOLED-1.8 V2 (CO5300).
// Two external A/B buttons on IO41/IO42, plus onboard PWR/BOOT for diagnostics.
// The last V7.2 version used IO42 / IO16; V8 uses IO41 / IO42.
// Each external button connects between its assigned GPIO and ESP32 GND.
// GPIO42 may be an onboard audio/I2S signal on some revisions; audio is NOT used
// by this firmware. Verify the IO42 solder pad exists on your exact V2 board.
// If GPIO42 is unavailable, GPIO0 (BOOT, startup caveat) is a fallback only.
#define FAN_BUTTON_A_GPIO 42   // EXTERNAL Button A -> IO42 and ESP32 GND
#define FAN_BUTTON_B_GPIO 41   // EXTERNAL Button B -> IO41 and ESP32 GND
#define FAN_DRIVER_KEY_GPIO 18 // Ceksezx PWM control via 1k (not motor PWM!)

// User has been testing Ceksezx switching, so enabled in V8.
// Set 0 for display-only safety tests; verify wiring before use.
// 0 = screen + buttons + state machine only; 1 = actual MOSFET KEY pulses.
#define FAN_ENABLE_MOSFET_KEY 1
#define FAN_ENABLE_BUTTON_INPUT 1

// Original controller button signature: double-click start, short cycle
// ECO -> NORMAL -> HIGH -> ECO, long press OFF. All delays MUST be calibrated.
// This assumes its first state after double-click is ECO (index 0).
#define FAN_DRIVER_START_MODE 0
#define FAN_DRIVER_TAP_MS 20
#define FAN_DRIVER_DOUBLE_GAP_MS 50
#define FAN_DRIVER_STOP_HOLD_MS 1100
#define FAN_DRIVER_SETTLE_MS 20

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

// Legacy optional 2S ADC disabled; fan SOC is simulated. If later restored,
// a 100k/47k divider on BMS P+ and P-, + optional 100nF input capacitor.
// GPIO17 MUST NOT be wired to the MOSFET KEY gate in this profile.
#define FAN_ENABLE_BATTERY_ADC 0
#define FAN_BAT_ADC_UNIT ADC_UNIT_2
#define FAN_BAT_ADC_CHANNEL ADC_CHANNEL_6
#define FAN_DIVIDER_R_TOP 100000.0f
#define FAN_DIVIDER_R_BOTTOM 47000.0f
#define FAN_BATTERY_PERIOD_MS 1500
#define FAN_DEMO_BATTERY_PERCENT 99

// ===== V8 Fake fan battery =====
// 99% -> 0% in 180 seconds of continuous BOOST. No depletion while OFF.
// ECO / NORMAL are synthetic relative drain rates, not measured runtime.
#define FAN_FAKE_BOOST_EMPTY_MS 180000
#define FAN_FAKE_ECO_FACTOR 0.35f
#define FAN_FAKE_NORMAL_FACTOR 0.65f
#define FAN_FAKE_BOOST_FACTOR 1.00f

// ===== V8 onboard keys =====
// BOOT (GPIO0): short = next fake SOC preset 99->22->10->99.
// BOOT held >= 1500ms: fallback debug enter/exit.
// PWR button: AXP2101 POWERON short-press IRQ = debug enter/exit.
#define FAN_BOOT_GPIO 0
#define FAN_BOOT_HOLD_DEBUG_MS 1500
#define FAN_PMU_POLL_MS 350

// ===== V8 ESP battery telemetry =====
// AXP2101 I2C 0x34 (onboard): raw VBAT, gauge SOC, charge state.
#define FAN_PMU_POLL_BATT_MS 1500
// For 150mAh 1S cell, conservative preliminary charge current limit.
// Verify battery datasheet and actual reading BEFORE battery + USB.
#define FAN_PMU_CHARGE_CURRENT_MA 50
