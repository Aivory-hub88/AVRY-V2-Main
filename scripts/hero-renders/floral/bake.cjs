// Bakes the six hero "shot" cards as floral art (floral.js) to 720x720 WebP, plus the caption glass:
// a folder-shaped pane with a dramatic iOS-style blur whose upper edge FADES into the art instead of
// ending on a hard line, then a hairline rim that fades out with it. Text is not baked.
//
//   NODE_PATH=../frontend-nextjs-landing/node_modules node scripts/hero-renders/floral/bake.cjs
//   CARD_VER=v15  OUT=public/landing/hero  ONLY=audit,lock
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const VER = process.env.CARD_VER || 'v15';
const OUT = process.env.OUT || path.join(__dirname, 'baked');
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;

// name -> caption + floral config. ascii/glitch are kept low so the type on the pane stays the hero.
const CARDS = [
  // Big close-up petals that fill the frame, saturated and different per card; heavy glitch + ASCII like the reference.
  { name: 'audit', cap: 'Governed, with a full audit trail', pal: 'poppy', kind: 'fan', seed: 61, n: 9, ls: 1.45, bl: 6, smear: 5, fiber: 0.12 },
  { name: 'growth', cap: 'Streamline your business operations', pal: 'violet', kind: 'ruffle', seed: 14, n: 9, ls: 1.35, bl: 6, fiber: 0.12,
    custom: { bg: ['#8f8fe0', '#b79ad0'], petal: ['#e2362a', '#ff5a5a', '#c42a8a', '#9a2fa8', '#ff7a9a'], core: '#7a1f7a', shadow: '#4a1250', tip: ['#ffd6e8', '#f2e4ff', '#ffc8b8'], stem: '#d8452a', stamen: '#ffd9a8' } },
  { name: 'automation', cap: 'Build any automation', pal: 'peony', kind: 'fan', seed: 73, n: 9, ls: 1.45, bl: 6, smear: 5, fiber: 0.12 },
  { name: 'lock', cap: 'Encrypted', pal: 'cobalt', kind: 'poppy', seed: 29, n: 12, ls: 1.5, bl: 6, fiber: 0.12,
    custom: { bg: ['#0a1a4a', '#2a5ad8'], petal: ['#1a6bff', '#3a8dff', '#0d4fd0', '#7aa8ff', '#e0733a'], core: '#ff9a4a', shadow: '#0a1250', tip: ['#d9e6ff', '#ffd2b8', '#bcd0ff'], stem: '#1a3aa8', stamen: '#ffb870' } },
  { name: 'decision', cap: 'Faster decision making', pal: 'sun', kind: 'ruffle', seed: 52, n: 9, ls: 1.35, bl: 6, fiber: 0.12,
    custom: { bg: ['#ffb04a', '#ff5a3a'], petal: ['#ffd23a', '#ff9a2a', '#ff5a1a', '#ffb84a', '#ff7a3a'], core: '#d8301f', shadow: '#7a1a3a', tip: ['#fff3c4', '#ffe0b0', '#ffd0d0'], stem: '#e8502a', stamen: '#fff0b0' } },
  { name: 'vault', cap: 'Data sovereignty', pal: 'lagoon', kind: 'fan', seed: 83, n: 9, ls: 1.45, bl: 6, smear: 5, fiber: 0.12,
    custom: { bg: ['#0a4a4a', '#7ae0c0'], petal: ['#2fd8b0', '#7fe6ff', '#1aa890', '#c8ff8a', '#3aa0e0'], core: '#0a4a3a', shadow: '#06302e', tip: ['#e8fff0', '#d0f6ff', '#f4ffd0'], stem: '#1aa890', stamen: '#f4ffc0' } },
];
const COMMON = { glitch: 13, ascii: 1, dots: 0, motion: 0, bokeh: 0, smear: 0, fiber: 0, hue: 0, sat: 1, bri: 0, con: 1, tmp: 0, ang: 56 };

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400&family=JetBrains+Mono:wght@700&display=swap" rel="stylesheet">
<style>
body{margin:0;background:#fff}
.card{position:relative;width:360px;height:360px;container-type:inline-size;margin:8px}
.card canvas{position:absolute;inset:0;width:100%;height:100%}
/* production caption metrics on a 196px card, as cqw so they scale with the bake size */
.cap{position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;display:flex;align-items:flex-end;
  padding:15.31cqw 9.18cqw 8.16cqw;font:300 10.71cqw/1.1 Manrope,sans-serif;letter-spacing:-.022em;min-height:48%;text-wrap:balance;color:#fff}
</style></head><body></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => console.error('page error:', e.message));
  await p.setContent(PAGE, { waitUntil: 'networkidle' });
  await p.addScriptTag({ path: path.join(__dirname, 'floral.js') });
  await p.evaluate(() => document.fonts.ready);

  const list = CARDS.filter((c) => !ONLY || ONLY.includes(c.name));
  for (const def of list) {
    const [w, paneAt196, url] = await p.evaluate(async ({ def, COMMON }) => {
      const { PALS, render } = window.__floral;
      document.body.innerHTML = '';
      const card = document.createElement('div');
      card.className = 'card';
      const cv = document.createElement('canvas');
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = def.cap;
      card.append(cv, cap);
      document.body.append(card);
      await document.fonts.load('300 20px Manrope');
      await document.fonts.load('700 20px "JetBrains Mono"');

      if (def.custom) PALS[def.pal] = def.custom;
      const P = PALS[def.pal];
      const cfg = Object.assign({}, COMMON, { kind: def.kind, seed: def.seed, n: def.n, ls: def.ls, bl: def.bl, smear: def.smear || 0, fiber: def.fiber || 0, ratio: 1, mode: 'pal' }, def.over || {});
      cfg.col = { bg: P.bg.slice(), petal: P.petal.slice(), core: P.core, stem: P.stem, stamen: P.stamen, bk: (P.bk || P.petal).slice(), tip: P.tip || null, shadow: P.shadow || null };
      // Render, then crop in from the top so more of the bloom clears the glass pane (the bottom ~half is under it).
      const tmp = document.createElement('canvas');
      render(tmp, cfg, 720);
      const Z = def.zoom || 1.18;
      cv.width = tmp.width; cv.height = tmp.height;
      cv.getContext('2d').drawImage(tmp, -(Z - 1) * 360, tmp.height - Z * tmp.height, Z * tmp.width, Z * tmp.height);

      // ---- caption glass, sized to the real caption box
      const cr = card.getBoundingClientRect(), pr = cap.getBoundingClientRect(), k = cv.width / cr.width;
      const x0 = 0, y0 = (pr.top - cr.top) * k, W = cv.width, H = cv.height, h = H - y0;
      const fade = 26 * k; // how far above the pane's edge the blur dissolves
      const FOLDER = 'M0,22 C0,16.5 2.5,14 8,14 L34,14 C41,14 42.5,0.6 51,0.6 L92,0.6 C97.5,0.6 100,3 100,8.5 L100,60 L0,60 Z';
      const shape = (over) => new Path2D(FOLDER.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, a, c) => {
        let X = (+a) * W / 100, Y = y0 + (+c) * h / 60;
        if (over) { if (+a === 0) X = -W; if (+a === 100) X = 2 * W; if (+c === 60) Y = H + 2 * k * 10; }
        return X.toFixed(2) + ',' + Y.toFixed(2);
      }));
      const ctx = cv.getContext('2d');
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
      const base = mk(); base.getContext('2d').drawImage(cv, 0, 0);

      // 1. dramatic blur of the art under the pane (edge-clamped by padding the source)
      const blurred = mk(), bx = blurred.getContext('2d');
      bx.filter = `blur(${(15 * k).toFixed(1)}px) saturate(1.5) brightness(.92)`;
      bx.drawImage(base, -40, -40, W + 80, H + 80);
      bx.filter = 'none';
      // glass body: sheen at the top, a little ink at the bottom so white type holds on pale art
      let g = bx.createLinearGradient(0, y0, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.4, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(255,255,255,.02)');
      bx.fillStyle = g; bx.fillRect(0, y0 - fade * 2, W, H);
      g = bx.createLinearGradient(0, y0, 0, H);
      g.addColorStop(0, 'rgba(10,14,28,0)'); g.addColorStop(1, 'rgba(10,14,28,.34)');
      bx.fillStyle = g; bx.fillRect(0, y0 - fade * 2, W, H);

      // 2. mask = the folder shape with a feathered top: the glass melts into the art above its edge
      const mask = mk(), mx = mask.getContext('2d');
      mx.filter = `blur(${(fade * 0.42).toFixed(1)}px)`;
      mx.fillStyle = '#000';
      mx.fill(shape(true));
      mx.filter = 'none';
      // lift the feathered shoulder so the pane reaches full strength a few px inside the old edge
      mx.globalCompositeOperation = 'source-over';
      mx.fillStyle = '#000';
      mx.save(); mx.translate(0, fade * 0.35); mx.fill(shape(true)); mx.restore();
      bx.globalCompositeOperation = 'destination-in';
      bx.drawImage(mask, 0, 0);
      bx.globalCompositeOperation = 'source-over';
      ctx.drawImage(blurred, 0, 0);

      // 3. hairline rim that fades out along with the pane (strong low on the tab, gone at the top)
      ctx.save();
      const rim = ctx.createLinearGradient(0, y0 - fade * 0.2, 0, y0 + h * 0.45);
      rim.addColorStop(0, 'rgba(255,255,255,0)'); rim.addColorStop(0.35, 'rgba(255,255,255,.5)'); rim.addColorStop(1, 'rgba(255,255,255,.12)');
      ctx.strokeStyle = rim; ctx.lineWidth = 1.4 * k; ctx.stroke(shape(false));
      ctx.restore();

      return [cv.width, Math.round(h / k / cr.width * 196), cv.toDataURL('image/webp', 0.9)];
    }, { def, COMMON });
    const file = path.join(OUT, `render-${def.name}-${VER}.webp`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(def.name, w + 'px', 'pane @196:', paneAt196 + 'px', '->', path.relative(process.cwd(), file));
  }
  await b.close();
})();
