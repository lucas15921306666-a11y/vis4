import React from "react";
import { useEffect, useRef, useState } from "react";

const BUTTON = { CROSS: 0, TRIANGLE: 3, SQUARE: 2, R2: 7 };
const DEADZONE = 0.18;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Reads DualSense using the browser Gamepad API. No Python bridge is required for INPUT.
 * The existing useHapticBridge.js continues to handle force feedback independently.
 */
export function useGamepad({ opening, setSpeed, setOpening, toggleCharging, onSwapBattery }) {
  const [connected, setConnected] = useState(false);
  const viewInputRef = useRef({ x: 0, y: 0, reset: false });
  const cb = useRef({ setSpeed, setOpening, toggleCharging, onSwapBattery });
  cb.current = { setSpeed, setOpening, toggleCharging, onSwapBattery };
  const openingRef = useRef(1);
  const buttonEdges = useRef({ triangle: false, square: false, cross: false });

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
        buttonEdges.current = { triangle: false, square: false, cross: false };
        setConnected((old) => old ? false : old);
      } else {
        lastPadIndex = pad.index;
        setConnected((old) => old ? old : true);
        viewInputRef.current.x = pad.axes[2] || 0;
        viewInputRef.current.y = pad.axes[3] || 0;
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
      }
      frame = requestAnimationFrame(poll);
    }
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);

  return { connected, viewInputRef, openingRef };
}
