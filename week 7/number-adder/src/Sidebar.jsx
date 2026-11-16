
import React, { useEffect, useRef } from 'react';

function Sidebar({ total, history, onClear }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let width = 0;
    let height = 0;

    const startTime = performance.now();
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (reduceMotion.matches) drawFrame(startTime);
    }

    function drawFrame(time) {
      if (!width || !height) return;

      const t = reduceMotion.matches
        ? 0
        : (time - startTime) / 1000;

      ctx.clearRect(0, 0, width, height);

      // Large grid extends beyond both visible edges.
      const cols = 145;
      const rows = 38;
      const half = (cols - 1) / 2;

      for (let j = 0; j < rows; j++) {
        const v = j / (rows - 1);

        // Perspective: narrow far away, wider nearby.
        const spread = 0.26 + 0.22 * v;

        for (let i = 0; i < cols; i++) {
          const u = ((i - half) / half) * 2.3;

          const x =
            width * 0.5 +
            u * width * spread;

          // Only draw visible dots.
          if (x < -30 || x > width + 30) continue;

          // Flowing 3D wave surface.
          const wave =
            Math.sin(u * 5 - t * 1.5 + v * 7) * 0.5 +
            Math.cos(v * 9 + t * 1.1 + u * 4) * 0.35;

          const y =
            height * 0.24 +
            v * height * 0.86 -
            wave * 22 * (0.25 + v);

          const radius = Math.max(
            0.35,
            0.55 + v * 1.85 + wave * 0.18
          );

          const opacity = Math.max(
            0,
            Math.min(0.68, v * 0.72 + 0.10)
          );

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(17, 20, 16, ${opacity})`;
          ctx.fill();
        }
      }

      if (!reduceMotion.matches) {
        animationId = requestAnimationFrame(drawFrame);
      }
    }

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    resizeCanvas();

    if (!reduceMotion.matches) {
      animationId = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return (
    <aside className="sidebar">
      <canvas
        ref={canvasRef}
        className="sidebarCanvas"
        aria-hidden="true"
      />

      <div className="sidebarContent">
        <div className="sidebarResult">
          <h3>Result</h3>

          <p id="resultId">
            {String(total).padStart(2, '0')}
          </p>

          <p className="resultStatus">
            {total > 0
              ? 'POSITIVE'
              : total < 0
              ? 'NEGATIVE'
              : 'ZERO'}
          </p>
        </div>

        <div className="historyHeader">
          <h3>History</h3>
          <span className="historyCount">
            {history.length}
          </span>
        </div>

        <div
          className="historyScroll"
          role="region"
          aria-label="Operation history"
          tabIndex={0}
        >
          {history.length === 0 ? (
            <p className="historyEmpty">
              NO HISTORY YET
            </p>
          ) : (
            <ul className="historyList">
              {history.map((entry, index) => (
                <li key={index}>
                  <span className="historyIndex">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{entry}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          className="sidebarClearButton"
          type="button"
          onClick={onClear}
          disabled={history.length === 0 && total === 0}
        >
          Clear History &amp; Results
        </button>
      </div>

      <div className="sidebarFooter">
        SURFACE / ACTIVE
      </div>
    </aside>
  );
}

export default Sidebar;
