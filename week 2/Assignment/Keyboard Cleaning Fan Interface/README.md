# Keyboard Cleaning Fan Interface

A browser-based interface prototype for a portable keyboard-cleaning fan.

The interface supports a **PS5 DualSense controller** for:

- **R2** — Fan speed
- **D-pad Up / Down** — Fan opening angle
- **Triangle** — Charging mode
- **Controller vibration** — Fan motor feedback
- **R2 adaptive trigger resistance** — Increases with fan speed

---

## 1. Open the Interface

Open:

```text
index.html
```

in Chrome or another Chromium-based browser.

Connect a **PS5 DualSense controller** by USB or Bluetooth, then press any controller button.

---

## 2. Haptic Feedback

The webpage can read controller input directly, but the local controller bridge is required for:

- DualSense vibration
- R2 adaptive trigger feedback

There are two ways to run the bridge.

---

## Option A — Python Installed

If the computer already has Python installed, you can run the Python bridge directly.

### Install the required packages

Open Terminal / PowerShell inside the project folder and run:

```bash
pip install pydualsense websockets
```

If `pip` does not work, use:

```bash
python -m pip install pydualsense websockets
```

### Run the controller bridge

```bash
python controller_bridge.py
```

You should see something similar to:

```text
Connecting to DualSense...
DualSense connected.
Starting WebSocket bridge...
Bridge ready:
ws://127.0.0.1:8765
```

Keep this terminal window open while using the webpage.

Then open the webpage and press **R2**.

---

## Option B — No Python Installed

Run:

```text
KeyboardFanController.exe
```

The EXE contains the local controller bridge required for haptic feedback.

Keep the EXE window open while using the webpage.

If Windows shows a SmartScreen warning, only continue if you received or built this EXE from a trusted copy of this project.

---

## Controller Setup

For the first test, **USB connection is recommended**.

After connecting the DualSense:

```text
R2        Fan Speed
↑ / ↓     Fan Opening
△         Charging Mode On / Off
```

Hold **↑ / ↓** to change the fan opening continuously.

The display updates after the D-pad is released.

---

## Feedback Mapping

Fan speed controls both vibration and adaptive trigger resistance.

```text
Low speed
→ light vibration
→ light R2 resistance

Medium speed
→ stronger vibration
→ medium R2 resistance

High speed
→ strong vibration
→ strong R2 resistance
```

When the fan stops, both vibration and R2 resistance are released.

---

## Charging Simulation

Charging mode can be enabled using:

```text
Triangle
```

or the Charging switch on the webpage.

While charging:

- Battery level increases
- Fan power consumption is still calculated
- The battery bar shows an animated `+`
- The `+` inverts when it overlaps the black battery fill

---

## Project Structure

```text
Keyboard Cleaning Fan Interface/
├── index.html
├── styles.css
├── script.js
├── controller_bridge.py
├── KeyboardFanController.exe
└── assets/
    ├── frame.svg
    ├── battery-digits.svg
    ├── opening-digits.svg
    ├── fan.svg
    ├── degree-1.svg
    ├── degree-2.svg
    ├── degree-3.svg
    ├── degree-4.svg
    ├── degree-5.svg
    └── degree-6.svg
```

---

## Troubleshooting

### Controller shows `WAITING`

Press any button on the DualSense after opening the webpage.

If it still does not connect:

1. Reconnect the controller
2. Refresh the page
3. Try USB instead of Bluetooth

### Haptic Bridge shows `NOT CONNECTED`

Run either:

```bash
python controller_bridge.py
```

or:

```text
KeyboardFanController.exe
```

The webpage connects locally to:

```text
ws://127.0.0.1:8765
```

### Python says a module is missing

Run:

```bash
python -m pip install pydualsense websockets
```

### EXE reports HIDAPI error

Use the HIDAPI-enabled build of:

```text
KeyboardFanController.exe
```

---

## Notes

The webpage itself cannot automatically launch a local Windows `.exe`.

The user must manually run either:

```text
controller_bridge.py
```

or:

```text
KeyboardFanController.exe
```

to enable DualSense haptic feedback.
