import React from "react";
import { useState } from "react";

function ConnectionRow({ label, connected, disconnectedLabel = "NOT CONNECTED" }) {
  return (
    <div className="connection-row">
      <span>{label}</span>
      <span className={`connection-status ${connected ? "connected" : "disconnected"}`}>
        {connected ? "CONNECTED" : disconnectedLabel}
      </span>
    </div>
  );
}

export default function SetupPanel({ controllerConnected, bridgeConnected }) {
  const exeUrl = `${import.meta.env.BASE_URL}KeyboardFanController.exe`;
  return (
    <section className="info-panel setup-panel" aria-labelledby="setup-title">
      <h2 id="setup-title">SETUP</h2>
      <div className="connection-block">
        <ConnectionRow label="PS5 CONTROLLER" connected={controllerConnected} disconnectedLabel="WAITING" />
        <p>Connect a PS5 DualSense and press any button.</p>
      </div>
      <div className="connection-block">
        <ConnectionRow label="HAPTIC BRIDGE" connected={bridgeConnected} />
        <p>For vibration and adaptive R2 resistance, run the local controller bridge.</p>
        <a className="bridge-download" href={exeUrl} download="KeyboardFanController.exe">Download Haptic Bridge</a>
        <p className="file-note">KeyboardFanController.exe · Windows only</p>
      </div>
    </section>
  );
}
