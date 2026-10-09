const guide = [
  ["R2", "Fan Speed"],
  ["↑ / ↓", "Fan Opening"],
  ["△", "Charging On / Off"],
];

export default function ControllerGuide() {
  return (
    <section className="info-panel guide-panel" aria-labelledby="controller-title">
      <h2 id="controller-title">CONTROLLER</h2>
      {guide.map(([key, action]) => (
        <div className="guide-row" key={key}><strong>{key}</strong><span>{action}</span></div>
      ))}
      <p className="guide-note">Hold ↑ / ↓ to adjust continuously. Display updates when released.</p>
    </section>
  );
}
