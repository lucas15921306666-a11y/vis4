# Battery swap + charging cable fix (V2)

Copy the following files into your existing React project:

- `src/App.jsx` (replace)
- `src/components/three/FanScene.jsx` (replace)
- `src/battery-power.css` (new)

You do not need to change the Blender GLB, Gamepad hook, charging UI, or Haptic Bridge.

## Changes

- New Blender local offsets: battery `(0, 0.65, -0.65)` and cable `(0, 0.25, -0.25)`.
- No charging: cable begins and stays hidden. Charging enabled: cable becomes visible while plugging in, and retracts then hides when disabled.
- Battery swap: battery moves out 0.25-0.95 s, disappears 0.95-1.3 s, new battery becomes visible and slides in 1.3-2.35 s.
- Main 240x240 LCD is blacked out via CSS while the battery is disengaged (0.25-2.35 s).
- The 3D `Screen_Display` mesh is also temporarily replaced with a black unlit material during the same interval, then restored.
- Power-off state is sent by `FanScene` to `App` through `onBatteryPowerChange`.
- Retains original React imports, postprocessing, controls, rotor z-axis and trigger x-axis/0.28 angle.

## Test

Run `npm run dev`; use webpage Reset to 99% or DualSense X to swap.
Use Charging switch or Triangle to plug or unplug.

Note: offsets are in the Blender Empty object's parent coordinate system. This update has been syntax inspected, but not tested against physical DualSense hardware or a running browser.
