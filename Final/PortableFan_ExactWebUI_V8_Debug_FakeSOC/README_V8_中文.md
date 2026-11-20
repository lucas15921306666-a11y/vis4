# Portable Fan V8 — Fake Fan SOC + 1S ESP32 Battery Diagnostics

Based on your previously uploaded `KeyboardFan_React(1).zip` and the **working Waveshare V2 CO5300 BSP** + TCA9554 reset sequence in V7.2. The 240×240 original UI is unchanged.

## 1. Buttons

| Button | Connection | Function |
|---|---|---|
| External A | GPIO41 to GND | Short OFF = wake; long OFF = start fan; short ON = ECO/NORMAL; long ON = stop |
| External B | GPIO42 to GND | Hold ON = BOOST target; release = restore target; OFF = do nothing |
| Onboard **BOOT** | GPIO0 | **Short:** cycle displayed fake battery 99% → 22% → 10% → 99%; **hold 1.5s:** debug fallback |
| Onboard **PWR** | PMIC AXP2101 | **Short:** enter/exit dedicated debug page (PMIC IRQ bit3) |
| Touch | Onboard | Wake screen without controlling the fan |

The PWR key is a PMIC power-control button, **not an ordinary GPIO**. The code uses AXP2101 short press IRQ (`0x49` bit3, enabled at `0x41` bit3). If a particular board firmware routes it differently, BOOT hold 1.5s is a backup way to open/close debug.

## 2. Original motor bridge

* GPIO18 → 1kΩ → Ceksezx PWM; GND → module GND. Connect module power switching terminals to the original **5V logic KEY** only after verifying low-side behavior, not motor power.
* In `main/fan_board_config.h`: `FAN_ENABLE_MOSFET_KEY=1` (active). Set to `0` for UI-only safe bench testing.
* Your current calibrated settings are preserved: `TAP=20ms`, `GAP=50ms`, `SETTLE=20ms`. Original-board long OFF remains `1100ms`; external A long threshold `800ms`.
* The original board does not have actual motor speed feedback. Driver running/mode are **ESTIMATES**. BOOST actual change takes sequential simulated clicks.

## 3. Main fan battery is FAKE (never measured)

It begins at 99%; when the logical fan runs the displayed battery decreases by time:

| Mode | Relative synthetic rate | 99→0 full synthetic run |
|---|---:|---:|
| BOOST | 1.00× | 180 sec (3 minutes) |
| NORMAL | 0.65× | ~277 sec |
| ECO | 0.35× | ~514 sec |

These ECO/NORMAL proportions are **design assumptions**, not measured. They are configurable macros in `fan_board_config.h`. The timer pauses when logical fan OFF, even though the ESP32 still draws current. Screen-off does not reset the timer, and the simulated 0% does **not** cut physical fan power. Fake battery digits and bottom bar use your **original web display assets** and 8 FPS animation.

Onboard BOOT short cycles presets in this exact order: first press 22, second press 10, third press 99, repeat (power-up starts at 99).

## 4. Separate debug display 368×448

PWR short opens debug; PWR short closes. Dark UI, fluorescent green header. Includes:

- Logical fan OFF/ON, ECO/NORMAL base, BOOST effective, physical A/B held states
- Original driver estimated ON/OFF, estimated mode index, state machine phase
- KEY bridge ENABLED, TAP/GAP/SETTLE values
- Fake fan battery %, equivalent remaining BOOST seconds
- **REAL ESP32 battery:** AXP2101 present, 1S battery voltage (mV), AXP fuel gauge SOC estimate %, PMIC CHARGING/DISCHARGING/STANDBY, USB/VBUS present, configured charge limit, uptime

If the battery isn't connected or PMIC is not found, shows N/A rather than invented numbers. Note 1S SOC accuracy depends on the PMIC gauge calibration and real cell capacity; for a 150mAh pouch cell treat it as an estimate.

## 5. Your LP401730 3.7V 150mAh pouch battery safety

**Only connect it to the Waveshare 1S 3.7V MX1.25 battery input if its connector polarity and pinout actually match.** A fitting connector does not prove the wiring polarity. Never connect it to 2S BMS, GPIO, 3V3, or a motor-driver power terminal. Ensure the cell includes suitable protection or the supply has it, and check its allowed maximum charge current and termination voltage.

**Important charge-current hazard:** the AXP2101 datasheet says fast-charge defaults can be around 300mA, much higher than your small 150mAh cell. This firmware attempts to configure and read back **50mA fast / 25mA precharge / 25mA termination** at startup. This is not a substitute for hardware protection or confirmation of the battery spec; the PMU can already be active before app_main() runs. **First flash and test over USB with the battery unplugged, inspect the serial log for `PMU charge-current setting verified: 50mA`, power off USB, then attach battery after checking the polarity; never use simultaneous battery + USB until the limit is verified.** Please verify the actual LP401730 cell datasheet permits these values. If it does not, stop and use an external charger configured to its requirements.

If you already attached the battery, disconnect it before burning the new firmware and verifying the charger current and polarity. Do not rely on the debug SOC display for discharge safety or cutoff.

## 6. Build / flash

Use VS Code ESP-IDF 5.5.6 terminal in project root:

```powershell
$env:IDF_TARGET = "esp32s3"
idf.py set-target esp32s3
idf.py build
idf.py -p COM5 flash monitor
```

On new projects `set-target` is needed once only. On subsequent changes run `idf.py build` and `idf.py -p COM5 flash monitor`.

Logs to check:

```text
AXP2101 detected, ID=0x4A, I2C=0x34
PMU charge-current setting verified: 50mA
ESP BAT (AXP): present=1 VBAT=...mV SOC=...% usb=... charge=...
FAKE FAN SOC RESET = 22% (not a battery measurement)
ONBOARD PWR short-press event -> debug page toggle
DEBUG PAGE OPEN
```

## 7. Notes / tests

- PWR key short-press IRQ integration is designed from AXP2101 register map but not yet checked on your physical V2 board. Some board power-state behavior may override it. BOOT long-press is the fallback.
- Do not confuse PMIC `CHARGING` with simply `USB=YES` or with full battery status. `STANDBY` with USB can mean full/disabled/other reasons.
- This code is based on V7.2 and hasn't been compiled with your Windows ESP-IDF compiler; if `idf.py build` produces a new error, capture the **first** `error:`.
