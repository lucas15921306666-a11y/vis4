import { useEffect, useRef } from "react";
import { createCanvasEngine } from "../rendering/canvasEngine.js";

export function useCanvasDisplay({ battery, displayOpening, speed, charging }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const nextRef = useRef({ battery, opening: displayOpening, speed, charging });
  nextRef.current = { battery, opening: displayOpening, speed, charging };

  useEffect(() => {
    let disposed = false;
    let engine;
    const assetPath = `${import.meta.env.BASE_URL}assets/`;
    createCanvasEngine(canvasRef.current, assetPath).then((created) => {
      if (disposed) { created.destroy(); return; }
      engine = created;
      engineRef.current = created;
      created.update(nextRef.current);
    }).catch((error) => console.error("LCD assets could not load:", error));
    return () => { disposed = true; engine?.destroy(); engineRef.current = null; };
  }, []);

  useEffect(() => {
    engineRef.current?.update({ battery, opening: displayOpening, speed, charging });
  }, [battery, displayOpening, speed, charging]);

  return canvasRef;
}
