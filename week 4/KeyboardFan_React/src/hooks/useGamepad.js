import { useEffect, useRef, useState } from "react";

const PAD = { R2: 7, TRIANGLE: 3, UP: 12, DOWN: 13 };
const HOLD_DELAY = 350;
const REPEAT_MS = 80;

export function useGamepad({ opening, setSpeed, setOpening, commitOpening, toggleCharging }) {
  const [connected, setConnected] = useState(false);
  const openingRef = useRef(1);
  useEffect(() => { openingRef.current = opening; }, [opening]);
  const callbacks = useRef({ opening, setSpeed, setOpening, commitOpening, toggleCharging });
  callbacks.current = { setSpeed, setOpening, commitOpening, toggleCharging };
  const pressState = useRef({ up: false, down: false, triangle: false, since: 0, repeat: 0 });

  // Keep draft opening in a ref so held D-pad input can update it without stale closures.
  useEffect(() => {
    let raf;
    let lastIndex = null;
    let previousSpeed = null;
    function step(timestamp) {
      const pads = navigator.getGamepads?.() || [];
      const pad = lastIndex !== null && pads[lastIndex]
        ? pads[lastIndex]
        : [...pads].find((p) => p && p.mapping === "standard") || [...pads].find(Boolean);
      const state = pressState.current;
      if (!pad) {
        if (lastIndex !== null) {
          callbacks.current.commitOpening();
          callbacks.current.setSpeed(0);
          setConnected(false);
        }
        lastIndex = null;
        previousSpeed = null;
        pressState.current = { up: false, down: false, triangle: false, since: 0, repeat: 0 };
      } else {
        lastIndex = pad.index;
        setConnected((old) => old || true);
        const triangle = Boolean(pad.buttons[PAD.TRIANGLE]?.pressed);
        if (triangle && !state.triangle) callbacks.current.toggleCharging();
        state.triangle = triangle;
        const up = Boolean(pad.buttons[PAD.UP]?.pressed);
        const down = Boolean(pad.buttons[PAD.DOWN]?.pressed);
        const direction = up === down ? 0 : up ? 1 : -1;
        const wasHolding = state.up || state.down;
        if (direction && (!wasHolding || (up !== state.up || down !== state.down))) {
          openingRef.current = Math.max(1, Math.min(90, openingRef.current + direction));
          callbacks.current.setOpening(openingRef.current, false);
          state.since = timestamp;
          state.repeat = timestamp;
        } else if (direction && timestamp - state.since >= HOLD_DELAY && timestamp - state.repeat >= REPEAT_MS) {
          openingRef.current = Math.max(1, Math.min(90, openingRef.current + direction));
          callbacks.current.setOpening(openingRef.current, false);
          state.repeat = timestamp;
        }
        if (wasHolding && !up && !down) callbacks.current.commitOpening();
        state.up = up;
        state.down = down;
        const speed = Math.round(Math.max(0, (pad.buttons[PAD.R2]?.value || 0) - 0.02) / 0.98 * 100);
        if (previousSpeed !== speed) {
          callbacks.current.setSpeed(speed);
          previousSpeed = speed;
        }
      }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { connected, openingRef };
}
