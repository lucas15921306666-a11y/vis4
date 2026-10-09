import React from "react";
export default function RangeControl({ id, label, value, display, min, max, onChange, children }) {
  return (
    <div className="control-row">
      <div className="control-header">
        <label htmlFor={id}>{label}</label>
        <div className="control-value">{display}{children}</div>
      </div>
      <input id={id} type="range" min={min} max={max} step="1" value={value}
        onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
