# Airflow + Slider Fix

Replace only these two files in the existing project:

- `src/components/three/FanScene.jsx`
- `src/components/three/AirflowParticles.js`

Changes:
- `立方体.012` opening travel increased from 0.22 to **0.75 model units** on its parent's local Z axis, with diagnostic info printed in the developer console.
- Airflow geometry rotated **+90 degrees around its own X axis** to compensate for the Blender Empty's -90° X orientation.
- Particle budget increased **380 → 2400**, with larger sprites, stronger alpha, and better visibility at lower fan speeds.
- Kept the prior swap/charging/trigger/rotor/grain code unchanged.

## Testing
1. Open browser developer tools and check the `[Fan Opening] Found mesh` log after GLB loads.
2. Change Opening from 1° to 90°. The test offset is 0.75 in `FanScene.jsx`. Adjust sign or vector components to match the physical slider mechanism; 0.75 is not a calibrated travel value.
3. Set fan speed 50–80%. Check for dense blue particles exiting the nozzle. If direction is backwards, change `AIRFLOW_FORWARD_SIGN` in `AirflowParticles.js` from `1` to `-1`.

Future visual tuning: lower `COUNT` to 1400 on slower GPUs, or lower the `uOpacity` formula for softer airflow.
