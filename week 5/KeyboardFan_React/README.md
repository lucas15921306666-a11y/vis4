# Keyboard Cleaning Fan — React Version

React + Vite conversion of the existing 240×240 LCD keyboard fan prototype. The **React component hierarchy** is separated from **fan state**, **gamepad I/O**, **local WebSocket bridge**, and **pixel Canvas rendering**.

## Start

Requirements: Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

Production bundle:

```bash
npm run build
```

Vite produces a `dist/` folder for hosting. This `dist/` has nothing to do with the Python/PyInstaller temporary `dist/` folder.

## Component hierarchy

```text
App (root: state and device connections)
├── DisplayColumn
│   ├── LCDCanvas (240×240 native-resolution rendering)
│   ├── ScaleControls
│   └── info-row (responsive side-by-side panels)
│       ├── SetupPanel (controller and local bridge connection)
│       └── ControllerGuide (R2, D-pad, Triangle)
└── ControlsPanel
    ├── RangeControl (Battery + Reset + Charging)
    ├── RangeControl (Fan Speed)
    └── RangeControl (Fan Opening)
```

## Responsibility boundaries

| Path | Responsibility |
| --- | --- |
| `src/App.jsx` | Top-level assembly and device hooks |
| `src/components/` | React JSX markup only |
| `src/hooks/useFanState.js` | Fan speed, degree, battery drain/charge, state |
| `src/hooks/useGamepad.js` | DualSense R2, ↑ / ↓, △ polling and release commit |
| `src/hooks/useHapticBridge.js` | Local WebSocket haptic bridge connection + messages |
| `src/hooks/useCanvasDisplay.js` | Bind React values to the pixel engine |
| `src/rendering/canvasEngine.js` | Canvas frame, fan rotation, charging bar, pixel scans |
| `src/rendering/pixelFont.js` | Pixel-sharp 5×7 STATE text |
| `src/utils/format.js` | Pure formatting and status helpers |
| `src/styles.css` | Page layout and responsive styles |
| `public/assets/` | Original/derived SVG sprites |

## Assets

The included `frame.svg` and `battery-digits.svg` were derived from the SVG source files provided during the conversation.

The included `opening-digits.svg` and six `degree-*.svg` illustrations are **functional approximations**, not exact copies of your previous hand-crafted versions. For pixel-perfect matching, copy your original SVGs into `public/assets/`, retaining these filenames:

```text
frame.svg
battery-digits.svg
opening-digits.svg
fan.svg
degree-1.svg ... degree-6.svg
```

Canvas pixel layout is 240×240 regardless of screen scale. Degree: 40×40, opening graphics: unscaled 40×30, battery digits: 80×140, battery tiles: 10×10.

## Controller and haptics

Connect a PS5 DualSense by USB or Bluetooth and press any button. The browser supports basic gamepad input without extra Python software.

| Control | Effect |
| --- | --- |
| R2 | Fan speed 0–100 |
| D-pad ↑ / ↓ | Opening angle 1°–90°; LCD commits on release |
| Triangle △ | Toggle charging |

To enable **controller rumble + adaptive R2 resistance** on Windows, run your current HIDAPI-enabled `KeyboardFanController.exe` separately. The browser connects to `ws://127.0.0.1:8765`.

If you want the React website to provide the EXE download link, put your built Windows file here:

```text
public/KeyboardFanController.exe
```

The Windows EXE is **not included** in this ZIP. Browsers cannot automatically run it.

If Python is installed, instead run your `controller_bridge.py` with:

```bash
python -m pip install pydualsense websockets
python controller_bridge.py
```

The bridge script should be the current working version with HIDAPI support and adaptive R2 effects. You do not need to move the Python runtime into React.

## Git

The root `.gitignore` ignores Node caches, Vite build outputs, and temporary Python build folders. Do not ignore `public/KeyboardFanController.exe` if you want others to download it.
