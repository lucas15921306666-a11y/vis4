import React, { useEffect, useRef } from 'react';

function Sidebar({ total, history }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let animationId;
    let width = 0;
    let height = 0;
    let startTime = performance.now();

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawFrame(time) {
      const t = (time - startTime) / 1000;

      ctx.clearRect(0, 0, width, height);

      const cols = 39;
      const rows = 32;

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const u = (i - (cols - 1) / 2) / ((cols - 1) / 2);
          const v = j / (rows - 1);

          /* perspective:
             top = far
             bottom = near
          */
          const spread = 0.13 + 0.47 * v;

          const x =
            width * 0.51 +
            u * width * spread;

          const wave =
            Math.sin(u * 5 - t * 1.5 + v * 7) * 0.5 +
            Math.cos(v * 9 + t * 1.1 + u * 4) * 0.35;

          const y =
            height * 0.29 +
            v * height * 0.81 -
            wave * 22 * (0.25 + v);

          const radius =
            0.55 +
            v * 1.85 +
            wave * 0.18;

          const opacity = Math.max(
            0,
            Math.min(
              0.62,
              (v * 0.72 + 0.10) * (1 - Math.abs(u) * 0.28)
            )
          );

          ctx.beginPath();
          ctx.arc(
            x,
            y,
            Math.max(0.3, radius),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = `rgba(17, 20, 16, ${opacity})`;
          ctx.fill();
        }
      }

      animationId = requestAnimationFrame(drawFrame);
    }

    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);

    resizeCanvas();

    const motionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    if (motionQuery.matches) {
      drawFrame(startTime);
      cancelAnimationFrame(animationId);
    } else {
      animationId = requestAnimationFrame(drawFrame);
    }

    return () => {
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="sidebar">
      <canvas
        ref={canvasRef}
        className="sidebarCanvas"
        aria-hidden="true"
      />

      <div className="sidebarContent">
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

        <h3>History</h3>

        <ul>
          {history.map((entry, index) => (
            <li key={index}>{entry}</li>
          ))}
        </ul>
      </div>

      <div className="sidebarFooter">
        SURFACE / ACTIVE
      </div>
    </div>
  );
}

export default Sidebar;