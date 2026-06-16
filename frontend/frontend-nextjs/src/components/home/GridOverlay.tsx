'use client';

import { useEffect, useRef } from 'react';

interface GridOverlayProps {
  animated?: boolean;
  className?: string;
}

/**
 * Canvas grid overlay with optional random-fade animation.
 * When animated=true, cells randomly fade in/out (hero style).
 * When animated=false, just draws static grid lines + crosshairs.
 */
export default function GridOverlay({ animated = false, className = '' }: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!c) return;
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    if (animated) {
      // Animated version: cells fade in/out randomly
      const cellCount = 1000;
      const cells: { opacity: number; target: number; speed: number }[] = [];
      for (let i = 0; i < cellCount; i++) {
        cells.push({ opacity: 0, target: 0, speed: 0.008 + Math.random() * 0.012 });
      }

      const pickTargets = () => {
        for (let i = 0; i < cells.length; i++) {
          cells[i].target = Math.random() < 0.6 ? 0 : 0.4 + Math.random() * 0.45;
        }
      };

      const interval = setInterval(pickTargets, 600);
      let animId: number;

      const draw = () => {
        if (!c || !ctx) return;
        ctx.clearRect(0, 0, c.width, c.height);
        const cw = 120;
        const ch = 120;
        const colCount = Math.ceil(c.width / cw);
        const rowCount = Math.ceil(c.height / ch);

        const offsetX = (c.width / 2) % cw;
        const offsetY = (c.height / 2) % ch;

        // Calculate dark cell pixel bounds (must match HeroSection positionDarkCell)
        const darkX = (colCount - 1) * cw + offsetX;
        const darkY = (rowCount - 1) * ch + offsetY;

        // Clip the canvas to exclude the dark cell zone — nothing will draw over it
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, c.width, c.height);
        ctx.rect(darkX, darkY, cw, ch); // "cut out" the dark zone (even-odd rule)
        ctx.clip('evenodd');

        // Animated fading cells (excluding the fixed dark cell area)
        for (let i = 0; i < (colCount + 2) * (rowCount + 2) && i < cells.length; i++) {
          const cell = cells[i];
          if (cell.opacity < cell.target) {
            cell.opacity = Math.min(cell.opacity + cell.speed, cell.target);
          } else if (cell.opacity > cell.target) {
            cell.opacity = Math.max(cell.opacity - cell.speed, cell.target);
          }

          const col = (i % (colCount + 2)) - 1;
          const row = Math.floor(i / (colCount + 2)) - 1;

          if (cell.opacity > 0.01) {
            ctx.fillStyle = `rgba(0,0,0,${cell.opacity})`;
            ctx.fillRect(col * cw + offsetX, row * ch + offsetY, cw, ch);
          }
        }



        // Crosshairs at intersections
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        const cs = 4;
        for (let x = -1; x <= colCount + 1; x++) {
          for (let y = -1; y <= rowCount + 1; y++) {
            const px = x * cw + offsetX;
            const py = y * ch + offsetY;
            ctx.beginPath();
            ctx.moveTo(px - cs, py);
            ctx.lineTo(px + cs, py);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, py - cs);
            ctx.lineTo(px, py + cs);
            ctx.stroke();
          }
        }

        ctx.restore();

        animId = requestAnimationFrame(draw);
      };

      draw();

      return () => {
        window.removeEventListener('resize', resize);
        clearInterval(interval);
        cancelAnimationFrame(animId);
      };
    } else {
      // Static version: just grid lines + crosshairs, redraws on resize
      // Uses window dimensions since it's position: fixed
      const drawStatic = () => {
        if (!c || !ctx) return;
        c.width = c.offsetWidth;
        c.height = c.offsetHeight;
        ctx.clearRect(0, 0, c.width, c.height);

        const cw = 120;
        const ch = 120;
        const colCount = Math.ceil(c.width / cw);
        const rowCount = Math.ceil(c.height / ch);
        const offsetX = (c.width / 2) % cw;
        const offsetY = (c.height / 2) % ch;



        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1;
        const cs = 4;
        for (let x = -1; x <= colCount + 1; x++) {
          for (let y = -1; y <= rowCount + 1; y++) {
            const px = x * cw + offsetX;
            const py = y * ch + offsetY;
            ctx.beginPath();
            ctx.moveTo(px - cs, py);
            ctx.lineTo(px + cs, py);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(px, py - cs);
            ctx.lineTo(px, py + cs);
            ctx.stroke();
          }
        }
      };

      drawStatic();
      window.addEventListener('resize', drawStatic);

      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('resize', drawStatic);
      };
    }
  }, [animated]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: animated ? 1 : 0,
        pointerEvents: 'none',
        opacity: 0.85,
      }}
    />
  );
}
