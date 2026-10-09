export function pad2(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function getScreenStatus({ speed, battery, charging }) {
  const running = speed > 0;
  const condition = charging ? "CHARGING" : battery <= 20 ? "LOW BATTERY" : "";
  if (running) return `STATE: RUN${condition ? ` / ${condition}` : ""}`;
  return `STATE: ${condition || "READY"}`;
}
