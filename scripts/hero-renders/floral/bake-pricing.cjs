// Pricing card headers: calm floral (heavy blur, no ASCII), baked wide (720x360). The card fades the art into its white body in CSS.
//   NODE_PATH=../frontend-nextjs-landing/node_modules node scripts/hero-renders/floral/bake-pricing.cjs
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const OUT = process.env.OUT || path.join(__dirname, 'mock');
// PricingStepOne uses the artifact's own palettes (pastel, peony, poppy: see floral.js PALS).
const PLANS = [
  // PricingStepTwo (approved look: do not change)
  { name: 'operational', pal: 'lagoon', kind: 'fan', seed: 83, n: 9, ls: 1.45, custom: { bg: ['#0a4a4a', '#7ae0c0'], petal: ['#2fd8b0', '#7fe6ff', '#1aa890', '#c8ff8a', '#3aa0e0'], core: '#0a4a3a', shadow: '#06302e', tip: ['#e8fff0', '#d0f6ff', '#f4ffd0'], stem: '#1aa890', stamen: '#f4ffc0' } },
  { name: 'business', pal: 'violet', kind: 'ruffle', seed: 14, n: 9, ls: 1.35, custom: { bg: ['#8f8fe0', '#b79ad0'], petal: ['#e2362a', '#ff5a5a', '#c42a8a', '#9a2fa8', '#ff7a9a'], core: '#7a1f7a', shadow: '#4a1250', tip: ['#ffd6e8', '#f2e4ff', '#ffc8b8'], stem: '#d8452a', stamen: '#ffd9a8' } },
  { name: 'enterprise', pal: 'cobalt', kind: 'poppy', seed: 29, n: 12, ls: 1.5, custom: { bg: ['#0a1a4a', '#2a5ad8'], petal: ['#1a6bff', '#3a8dff', '#0d4fd0', '#7aa8ff', '#e0733a'], core: '#ff9a4a', shadow: '#0a1250', tip: ['#d9e6ff', '#ffd2b8', '#bcd0ff'], stem: '#1a3aa8', stamen: '#ffb870' } },
  // one-off purchase cards (PricingStepOne)
  { name: 'assessment', pal: 'pastel', kind: 'ruffle', seed: 52, n: 9, ls: 1.0 },
  { name: 'blueprint', pal: 'peony', kind: 'poppy', seed: 73, n: 9, ls: 1.0 },
  { name: 'complete', pal: 'poppy', kind: 'poppy', seed: 61, n: 9, ls: 1.05 },
];
const COMMON = { glitch: 3, ascii: 0, dots: 0, motion: 0, bokeh: 0, smear: 0, fiber: 0.1, hue: 0, sat: 1, bri: 0, con: 1, tmp: 0, ang: 56, bl: 9, ratio: 0.5, mode: 'pal' };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<body></body>');
  await p.addScriptTag({ path: path.join(__dirname, 'floral.js') });
  for (const def of PLANS) {
    const url = await p.evaluate(({ def, COMMON }) => {
      const { PALS, render } = window.__floral;
      if (def.custom) PALS[def.pal] = def.custom;
      const P = PALS[def.pal];
      const cfg = Object.assign({}, COMMON, { kind: def.kind, seed: def.seed, n: def.n, ls: def.ls });
      cfg.col = { bg: P.bg.slice(), petal: P.petal.slice(), core: P.core, stem: P.stem, stamen: P.stamen, bk: P.petal.slice(), tip: P.tip, shadow: P.shadow };
      // Same art twice (same seed): one clean, one with ASCII. ASCII is kept to the top, fading out before the plan name.
      const cv = document.createElement('canvas'); render(cv, cfg, 720);
      const withA = document.createElement('canvas'); render(withA, Object.assign({}, cfg, { ascii: 0.9 }), 720);
      const m = withA.getContext('2d'), g = m.createLinearGradient(0, 0, 0, withA.height);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.3, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0)');
      m.globalCompositeOperation = 'destination-in'; m.fillStyle = g; m.fillRect(0, 0, withA.width, withA.height);
      cv.getContext('2d').drawImage(withA, 0, 0);
      return cv.toDataURL('image/webp', 0.9);
    }, { def, COMMON });
    fs.writeFileSync(path.join(OUT, `plan-${def.name}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok', def.name);
  }
  await b.close();
})();
