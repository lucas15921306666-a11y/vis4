import React from "react";
import { useEffect, useRef, useState } from "react";

const BUTTON = { CROSS: 0, TRIANGLE: 3, SQUARE: 2, CIRCLE: 1, R2: 7, DPAD_UP: 12, DPAD_DOWN: 13 };
const DEADZONE = 0.18;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Reads DualSense using the browser Gamepad API. No Python bridge is required for INPUT.
 * The existing useHapticBridge.js continues to handle force feedback independently.
 */
export function useGamepad({ opening, setSpeed, setOpening, toggleCharging, onSwapBattery }) {
  const [connected, setConnected] = useState(false);
  const viewInputRef = useRef({ x: 0, y: 0, zoom: 0, reset: false, toggleLabels: false });
  const cb = useRef({ setSpeed, setOpening, toggleCharging, onSwapBattery });
  cb.current = { setSpeed, setOpening, toggleCharging, onSwapBattery };
  const openingRef = useRef(1);
  const buttonEdges = useRef({ triangle: false, square: false, cross: false, circle: false });

  // Synchronize changes from the on-screen slider with the stick's running value.
  useEffect(() => { openingRef.current = opening; }, [opening]);
  useEffect(() => {
    let frame;
    let previousTimestamp = null;
    let previousSpeed = null;
    let lastPadIndex = null;
    function poll(now) {
      const dt = previousTimestamp === null ? 0 : Math.min((now - previousTimestamp) / 1000, 0.05);
      previousTimestamp = now;
      const pads = navigator.getGamepads?.() || [];
      const pad = (lastPadIndex !== null && pads[lastPadIndex]) ||
        Array.from(pads).find((p) => p && p.mapping === "standard") || Array.from(pads).find(Boolean);
      if (!pad) {
        if (lastPadIndex !== null) cb.current.setSpeed(0);
        lastPadIndex = null;
        previousSpeed = null;
        viewInputRef.current.x = 0;
        viewInputRef.current.y = 0;
        viewInputRef.current.zoom = 0;
        buttonEdges.current = { triangle: false, square: false, cross: false, circle: false };
        setConnected((old) => old ? false : old);
      } else {
        lastPadIndex = pad.index;
        setConnected((old) => old ? old : true);
        viewInputRef.current.x = pad.axes[2] || 0;
        viewInputRef.current.y = pad.axes[3] || 0;
        // The standard DualSense gamepad mapping: 12=Up, 13=Down.
        // Holding the key continuously zooms in/out in FanScene's render loop.
        viewInputRef.current.zoom =
          (pad.buttons[BUTTON.DPAD_UP]?.pressed ? 1 : 0) -
          (pad.buttons[BUTTON.DPAD_DOWN]?.pressed ? 1 : 0);
        const r2 = pad.buttons[BUTTON.R2]?.value || 0;
        const speed = r2 <= 0.02 ? 0 : Math.round(clamp((r2 - 0.02) / 0.98 * 100, 0, 100));
        if (speed !== previousSpeed) { cb.current.setSpeed(speed); previousSpeed = speed; }
        const leftVertical = pad.axes[1] || 0;
        if (Math.abs(leftVertical) >= DEADZONE && dt > 0) {
          // Full-stick displacement = ~30 degrees/second.
          openingRef.current = clamp(openingRef.current - leftVertical * 30 * dt, 1, 90);
          cb.current.setOpening(Math.round(openingRef.current), true);
        }
        const cross = !!pad.buttons[BUTTON.CROSS]?.pressed;
        if (cross && !buttonEdges.current.cross) cb.current.onSwapBattery?.();
        buttonEdges.current.cross = cross;
        const triangle = !!pad.buttons[BUTTON.TRIANGLE]?.pressed;
        if (triangle && !buttonEdges.current.triangle) cb.current.toggleCharging();
        buttonEdges.current.triangle = triangle;
        const square = !!pad.buttons[BUTTON.SQUARE]?.pressed;
        if (square && !buttonEdges.current.square) viewInputRef.current.reset = true;
        buttonEdges.current.square = square;
        // Circle toggles 3D annotation visibility on a new press only.
        const circle = !!pad.buttons[BUTTON.CIRCLE]?.pressed;
        if (circle && !buttonEdges.current.circle) {
          viewInputRef.current.toggleLabels = true;
        }
        buttonEdges.current.circle = circle;
      }
      frame = requestAnimationFrame(poll);
    }
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { connected, viewInputRef, openingRef };
}
