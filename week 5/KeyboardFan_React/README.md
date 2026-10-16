# 3D Annotation + Circle Input V3

Replace these four files in your existing project:

- `src/components/three/FanScene.jsx`
- `src/hooks/useGamepad.js`
- `src/components/panels/ControllerGuide.jsx`
- `src/fan3d.css`

No changes to Python, model (`public/models/PortableFan.glb`), OLED, materials or battery/cable animations.

## Annotation numbering

- 01 Trigger / Airflow (pointer, left)
- 02 Battery Module (pointer, left)
- 03 Fan Opening (pointer, right)
- 04 Charging Port (pointer, right)
- 05 View Orbit (left, no pointer)
- 06 Camera Zoom (left, no pointer)

## Controller

- Circle (○) toggles annotation visibility, equivalent to Hide/Show Labels.
- Right stick changes 3D view, D-pad up/down zooms.
- All previous actions remain mapped.

## Charging port out of view

Label stays visible. If its anchor moves offscreen but is still in front of the camera, the leader ends at the viewport boundary. When behind the camera, leader is hidden but label stays visible to avoid misleading direction.

## Important

`FanScene.jsx` imports React. No font asset changes are needed; existing FanPixelMono.ttf remains in use.
