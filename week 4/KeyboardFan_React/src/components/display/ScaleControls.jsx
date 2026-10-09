import { useState } from "react";
import { clamp } from "../../utils/format.js";

export default function ScaleControls({ scale, onScaleChange }) {
  const [draft, setDraft] = useState(String(scale));
  function apply() {
    const value = clamp(Math.round(Number(draft) || 1), 1, 10);
    setDraft(String(value));
    onScaleChange(value);
  }
  function reset() { setDraft("1"); onScaleChange(1); }
  return (
    <div className="scale-controls">
      <label htmlFor="scale">Display Scale</label>
      <input id="scale" type="number" min="1" max="10" step="1" value={draft}
        onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && apply()} />
      <button onClick={apply}>Apply</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
}
