import { useState } from "react";
import DisplayColumn from "./components/display/DisplayColumn.jsx";
import ControlsPanel from "./components/controls/ControlsPanel.jsx";
import { useFanState } from "./hooks/useFanState.js";
import { useGamepad } from "./hooks/useGamepad.js";
import { useHapticBridge } from "./hooks/useHapticBridge.js";

export default function App() {
  const fan = useFanState();
  const [scale, setScale] = useState(1);
  const { connected: controllerConnected } = useGamepad({
    opening: fan.opening,
    setSpeed: fan.setSpeed,
    setOpening: fan.setOpening,
    commitOpening: fan.commitOpening,
    toggleCharging: fan.toggleCharging,
  });
  const { connected: bridgeConnected } = useHapticBridge(fan.speed);

  return (
    <main className="page">
      <DisplayColumn fan={fan} scale={scale} onScaleChange={setScale}
        controllerConnected={controllerConnected} bridgeConnected={bridgeConnected} />
      <ControlsPanel fan={fan} />
    </main>
  );
}
