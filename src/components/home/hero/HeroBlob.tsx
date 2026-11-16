'use client';

import { useEffect, useRef } from 'react';
import styles from './HeroOrbit.module.css';

/** Rounded-rect outline as an SVG path, relative to the wrapper. */
function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  return (
    `M${x + k},${y}H${x + w - k}A${k},${k} 0 0 1 ${x + w},${y + k}` +
    `V${y + h - k}A${k},${k} 0 0 1 ${x + w - k},${y + h}` +
    `H${x + k}A${k},${k} 0 0 1 ${x},${y + h - k}` +
    `V${y + k}A${k},${k} 0 0 1 ${x + k},${y}Z`
  );
}

/**
 * The soft blob behind the prompt and CTAs: sky blue core, periwinkle under it,
 * azure / indigo-violet / rose accents (colours from the user's reference).
 * Static: no animation on a big blurred layer.
 *
 * It is clipped to the shapes of the glass it sits under (every `[data-glass]`
 * in the same stage), so colour shows only INSIDE the composer card and the
 * buttons and the page around them stays white. The clip is rebuilt on resize.
 *
 * Grain is a 128px noise tile drawn on a canvas at device-pixel size, so one
 * noise pixel is one physical pixel, overlaid on the blob only.
 */
export default function HeroBlob() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const stage = w?.parentElement;
    if (!w || !stage) return;
    const clip = () => {
      const base = w.getBoundingClientRect();
      const d = Array.from(stage.querySelectorAll<HTMLElement>('[data-glass]'))
        .map((el) => {
          const r = el.getBoundingClientRect();
          const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
          return roundRect(r.left - base.left, r.top - base.top, r.width, r.height, radius);
        })
        .join('');
      w.style.clipPath = d ? `path('${d}')` : '';
    };
    clip();
    const ro = new ResizeObserver(clip);
    ro.observe(stage);
    stage.querySelectorAll('[data-glass]').forEach((el) => ro.observe(el));
    window.addEventListener('resize', clip);
    document.fonts?.ready.then(clip).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', clip);
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const tile = document.createElement('canvas');
    tile.width = tile.height = 128;
    const t = tile.getContext('2d');
    if (!t) return;
    const img = t.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() * 2 - 1) * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    t.putImageData(img, 0, 0);

    const paint = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.max(1, Math.round(r.width * dpr));
      c.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      const pattern = ctx.createPattern(tile, 'repeat');
      if (!pattern) return;
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, c.width, c.height);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrap} className={styles.blobWrap} aria-hidden>
      <div className={styles.blob} />
      <canvas ref={canvas} className={styles.blobGrain} />
    </div>
  );
}
