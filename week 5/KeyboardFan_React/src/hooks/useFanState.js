import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "../utils/format.js";

const DRAIN_PER_SECOND_AT_MAX = 0.5;
const CHARGE_PER_SECOND = 0.5;

export function useFanState() {
  const [speed, setSpeedState] = useState(0);
  const [opening, setOpeningState] = useState(1);
  const [displayOpening, setDisplayOpening] = useState(1);
  const [battery, setBattery] = useState(99);
  const [charging, setCharging] = useState(false);
  const batteryExact = useRef(99);
  const openingRef = useRef(1);
  const speedRef = useRef(0);
  const chargingRef = useRef(false);

  const setSpeed = useCallback((value) => {
    const next = clamp(Math.round(Number(value) || 0), 0, 100);
    // No power means no fan unless the charger is connected.
    const allowed = batteryExact.current > 0 || chargingRef.current;
    speedRef.current = allowed ? next : 0;
    setSpeedState(speedRef.current);
  }, []);

  const setOpening = useCallback((value, commit = true) => {
    const next = clamp(Math.round(Number(value) || 1), 1, 90);
    openingRef.current = next;
    setOpeningState(next);
    if (commit) setDisplayOpening(next);
  }, []);

  const commitOpening = useCallback(() => {
    setDisplayOpening(openingRef.current);
  }, []);

  const setBatteryManually = useCallback((value) => {
    const next = clamp(Number(value), 0, 99);
    batteryExact.current = next;
    setBattery(Math.floor(next));
    if (next <= 0 && !chargingRef.current) {
      speedRef.current = 0;
      setSpeedState(0);
    }
  }, []);

  const setChargingMode = useCallback((value) => {
    setCharging((current) => {
      const next = typeof value === "function" ? value(current) : Boolean(value);
      chargingRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    let requestId;
    let previous = null;
    const tick = (now) => {
      if (previous !== null) {
        const dt = Math.min((now - previous) / 1000, 0.1);
        const change = (chargingRef.current ? CHARGE_PER_SECOND : 0)
          - DRAIN_PER_SECOND_AT_MAX * speedRef.current / 100;
        if (change !== 0) {
          batteryExact.current = clamp(batteryExact.current + change * dt, 0, 99);
          setBattery((old) => {
            const next = Math.floor(batteryExact.current + 1e-8);
            return next === old ? old : next;
          });
          if (batteryExact.current <= 0 && !chargingRef.current) {
            speedRef.current = 0;
            setSpeedState(0);
          }
        }
      }
      previous = now;
      requestId = requestAnimationFrame(tick);
    };
    requestId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestId);
  }, []);

  return {
    speed, opening, displayOpening, battery, charging,
    setSpeed, setOpening, commitOpening,
    setBatteryManually, resetBattery: () => setBatteryManually(99),
    setChargingMode,
    toggleCharging: () => setChargingMode((current) => !current),
    batteryExact,
  };
}
