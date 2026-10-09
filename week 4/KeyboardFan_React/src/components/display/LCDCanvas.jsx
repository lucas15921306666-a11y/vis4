import { useCanvasDisplay } from "../../hooks/useCanvasDisplay.js";

export default function LCDCanvas({ battery, displayOpening, speed, charging, scale }) {
  const canvasRef = useCanvasDisplay({ battery, displayOpening, speed, charging });
  return (
    <div className="display-bezel">
      <canvas
        ref={canvasRef}
        width={240}
        height={240}
        className="lcd-screen"
        style={{ width: 240 * scale, height: 240 * scale }}
        aria-label="240 by 240 pixel LCD fan interface preview"
        role="img"
      />
    </div>
  );
}
