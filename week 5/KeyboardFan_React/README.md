# Portable Fan — Realistic Studio Rendering

Replace these three files in `src/components/three/`:

- `FanScene.jsx`: preserves V4 annotations and animations; refines renderer exposure, antialiasing and grain intensity.
- `FanMaterials.js`: only `塑料玻璃着色器` and `拉丝金属` are replaced.
- `StudioLighting.jsx`: precomputed studio environment map and improved key/fill/rim light placement.

No changes to GLB, OLED, device input, airflow or Python Bridge.

## Starting adjustments

In `FanScene.jsx`:
- `renderer.toneMappingExposure = 1.0`: increase to `1.1` if too dark, decrease to `0.9` if washed out.
- `grainPass.uniforms.amount.value = 0.012`: tiny camera-like grain.

In `FanMaterials.js`:
- frosted plastic `roughness: 0.42` and `transmission: 0.82`.
- gray metal `roughness: 0.38`, `metalness: 0.80`.

## Limits

This uses Three.js WebGL and precomputed reflections, not ray-traced Cycles. Frosted transmission through complex multilayer shells can differ from physically accurate offline rendering. The sheen and diffusion will need assessment in your actual browser and model scale.

Keep backups of current working files.
