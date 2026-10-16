import { useState } from "react";
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

  const { connected: controllerConnected, viewInputRef } = useGamepad({
    opening: fan.opening,
    setSpeed: fan.setSpeed,
    setOpening: fan.setOpening,
    toggleCharging: fan.toggleCharging,
  });

  const { connected: bridgeConnected } = useHapticBridge(fan.speed);

  return (
    <main className="fan-app-layout">
      <section className="fan-workspace">
        <FanScene speed={fan.speed} viewInputRef={viewInputRef} />
        <ControlsPanel fan={fan} />
      </section>

      <aside className="fan-interface-column">
        <DisplayColumn
          fan={fan}
          scale={scale}
          onScaleChange={setScale}
          controllerConnected={controllerConnected}
          bridgeConnected={bridgeConnected}
        />
      </aside>
    </main>
  );
}
