import React from "react";
import { useRef, useState, useCallback } from "react";
import DisplayColumn from "./components/display/DisplayColumn.jsx";
import ControlsPanel from "./components/controls/ControlsPanel.jsx";
import FanScene from "./components/three/FanScene.jsx";
import { useFanState } from "./hooks/useFanState.js";
import { useGamepad } from "./hooks/useGamepad.js";
import { useHapticBridge } from "./hooks/useHapticBridge.js";
import "./fan3d.css";

export default function App() {
  const fan = useFanState();
  const [scale, setScale] = useState(1);
  const [swapId, setSwapId] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const swappingRef = useRef(false);
  const fanRef = useRef(fan);
  fanRef.current = fan;

  const onSwapBattery = useCallback(() => {
    if (swappingRef.current) return;
    swappingRef.current = true;
    setSwapping(true);
    fanRef.current.setSpeed(0);
    fanRef.current.setChargingMode(false);
    setSwapId((v) => v + 1);
  }, []);

  const onSwapComplete = useCallback(() => {
    fanRef.current.resetBattery();
    swappingRef.current = false;
    setSwapping(false);
  }, []);

  // Keep controller and on-screen controls in sync with the same battery action.
  const guardedFan = {
    ...fan,
    speed: swapping ? 0 : fan.speed,
    charging: swapping ? false : fan.charging,
    setSpeed: (value) => { if (!swappingRef.current) fan.setSpeed(value); },
    setChargingMode: (value) => { if (!swappingRef.current) fan.setChargingMode(value); },
    resetBattery: onSwapBattery,
  };

  const { connected: controllerConnected, viewInputRef } = useGamepad({
    opening: fan.opening,
    setSpeed: guardedFan.setSpeed,
    setOpening: fan.setOpening,
    toggleCharging: () => { if (!swappingRef.current) fan.toggleCharging(); },
    onSwapBattery,
  });

  const { connected: bridgeConnected } = useHapticBridge(guardedFan.speed);

  return (
    <main className="fan-app-layout">
      <section className="fan-workspace">
        <FanScene speed={guardedFan.speed} charging={guardedFan.charging} swapId={swapId} onSwapComplete={onSwapComplete} viewInputRef={viewInputRef} />
        <ControlsPanel fan={guardedFan} />
      </section>

      <aside className="fan-interface-column">
        <DisplayColumn
          fan={guardedFan}
          scale={scale}
          onScaleChange={setScale}
          controllerConnected={controllerConnected}
          bridgeConnected={bridgeConnected}
        />
      </aside>
    </main>
  );
}
