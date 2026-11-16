'use client';

import { useEffect, useRef } from 'react';
import styles from './HeroOrbit.module.css';

/**
 * One large, soft light blob behind the hero copy: sky blue core, periwinkle
 * under it, a pink rim along the lower edge, white all round (colours sampled
 * from the user's reference). Static: no animation on a big blurred layer.
 *
 * Grain is a 128px noise tile drawn on a canvas at device-pixel size, so one
 * noise pixel is one physical pixel, overlaid on the blob only.
 */
export default function HeroBlob() {
  const canvas = useRef<HTMLCanvasElement>(null);

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
    <div className={styles.blobWrap} aria-hidden>
      <div className={styles.blob} />
      <canvas ref={canvas} className={styles.blobGrain} />
    </div>
  );
}
