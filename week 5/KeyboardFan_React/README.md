# Portable Fan — Sound Update

This update adds motor/airflow sound that changes volume and pitch with the existing fan speed. It does NOT change `FanScene.jsx`, the renderer, the Python bridge, or existing mechanics.

## Replace/add
- Replace `src/App.jsx`
- Add `src/hooks/useFanSound.js`
- Add `src/fan-sound.css`

The included `App.jsx` follows the annotation layout with right-side Setup, Controller, and slider controls. If your App.jsx has diverged, preserve it and copy over only the `useFanSound` import/call and the button markup instead.

## How to test
1. `npm run dev`
2. Click **ENABLE SOUND** on the right panel. This is required by browser audio autoplay restrictions.
3. Increase Fan Speed with R2 or the slider.
4. Check the pitch/volume rise gradually; 0% is silent.
5. Click **MUTE SOUND** to turn off.

## Tuning
In `src/hooks/useFanSound.js`:
- `master.gain.value = 0.55` changes total volume.
- `engine.noiseGain.gain` target changes airflow loudness.
- `engine.whine.frequency` target changes high-speed pitch.
- `engine.whineGain.gain` target changes high-pitched turbine sound.

Audio is Web Audio synthesized locally, so no MP3 or new packages are needed. R2 adaptive resistance still comes from the independent Python bridge.
