import React from "react";

const CONTROLS = [
  ["R2", "Fan Speed + Haptics"],
  ["L STICK", "Opening / 1°–90°"],
  ["R STICK", "Orbit Product"],
  ["D-PAD ↑↓", "Zoom In / Out"],
  ["△", "Charging Cable"],
  ["×", "Replace Battery"],
  ["□", "Reset 3D View"],
  ["○", "Show / Hide 3D Labels"],
];

export default function ControllerGuide() {
  return (
    <section className="control-guide info-panel" aria-label="Controller guide">
      <h2 className="guide-title">CONTROLLER / INPUT MAP</h2>
      {CONTROLS.map(([key, action]) => (
        <div className="guide-row" key={key}>
          <span className="guide-key">{key}</span><span>{action}</span>
        </div>
      ))}
      <p className="guide-note">Mouse drag / wheel: orbit and zoom. D-pad Up = zoom in, Down = zoom out. Circle toggles AI labels. Web sliders remain active.</p>
    </section>
  );
}
