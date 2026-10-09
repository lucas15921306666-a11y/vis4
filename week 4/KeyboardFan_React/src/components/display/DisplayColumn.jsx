import React from "react";
import LCDCanvas from "./LCDCanvas.jsx";
import ScaleControls from "./ScaleControls.jsx";
import SetupPanel from "../panels/SetupPanel.jsx";
import ControllerGuide from "../panels/ControllerGuide.jsx";

export default function DisplayColumn({ fan, scale, onScaleChange, controllerConnected, bridgeConnected }) {
  return (
    <section className="display-column">
      <h1>Keyboard Cleaning Fan</h1>
      <LCDCanvas battery={fan.battery} displayOpening={fan.displayOpening} speed={fan.speed}
        charging={fan.charging} scale={scale} />
      <ScaleControls scale={scale} onScaleChange={onScaleChange} />
      <div className="info-row">
        <SetupPanel controllerConnected={controllerConnected} bridgeConnected={bridgeConnected} />
        <ControllerGuide />
      </div>
    </section>
  );
}
