import RangeControl from "./RangeControl.jsx";
import { pad2 } from "../../utils/format.js";

export default function ControlsPanel({ fan }) {
  return (
    <aside className="controls-panel" aria-label="Fan simulation controls">
      <RangeControl id="battery" label="Battery" value={fan.battery}
        display={`${pad2(fan.battery)}%`} min={0} max={99} onChange={fan.setBatteryManually}>
        <button className="battery-reset" onClick={fan.resetBattery}>Reset to 99%</button>
        <label className="charging-control">
          <span>Charging</span>
          <input type="checkbox" checked={fan.charging}
            onChange={(event) => fan.setChargingMode(event.target.checked)} />
          <span className="toggle-track" aria-hidden="true"><span /></span>
        </label>
      </RangeControl>
      <RangeControl id="speed" label="Fan Speed" value={fan.speed}
        display={fan.speed} min={0} max={100} onChange={fan.setSpeed} />
      <RangeControl id="opening" label="Fan Opening" value={fan.opening}
        display={`${pad2(fan.opening)}°`} min={1} max={90}
        onChange={(value) => fan.setOpening(value, true)} />
    </aside>
  );
}
