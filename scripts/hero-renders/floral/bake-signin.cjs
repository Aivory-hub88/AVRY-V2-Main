// Sign-in / free-analysis page: dark floral side panel, baked portrait (800x1280).
//   NODE_PATH=../frontend-nextjs/node_modules node scripts/hero-renders/floral/bake-signin.cjs
//   PAL=checkout SEEDS=3,8,21 OUT=/some/dir  to preview several seeds
// ASCII glyphs need JetBrains Mono Bold (OFL), otherwise the browser falls back to a Courier-like face:
//   FONT=/path/to/JetBrainsMono-Bold.ttf  (https://github.com/JetBrains/JetBrainsMono/tree/master/fonts/ttf)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const FONT = process.env.FONT;
const OUT = process.env.OUT || path.join(__dirname, 'mock');
const SEEDS = (process.env.SEEDS || '31').split(',').map(Number);
// Palettes: 'signin' = Aivory indigo + orchid + peach; 'checkout' = deep teal + emerald + amber (so the two pages don't match).
const PALS = {
  signin: { bg: ['#04050b', '#16154f'], petal: ['#5b4de0', '#b05ad0', '#f2a07a', '#2f6bff', '#e46a9c'], core: '#ffe2c8', shadow: '#0a0820', tip: ['#e8dcff', '#ffd2b8', '#cfe0ff'], stem: '#2a2a86', stamen: '#ffd9a8' },
  checkout: { bg: ['#03080a', '#0a2e33'], petal: ['#14b8a6', '#34d399', '#f5b942', '#0e7490', '#a3e635'], core: '#fff1c2', shadow: '#04201f', tip: ['#d9fff4', '#fff0c2', '#c8f7ff'], stem: '#0f5b56', stamen: '#ffe08a' },
};
const PAL = PALS[process.env.PAL || 'signin'];
const NAME = process.env.PAL || 'signin';
const ASCII = Number(process.env.ASCII || 1.1);
const CFG = { kind: 'fan', n: 10, ls: 1.35, glitch: 4, ascii: 0, dots: 0, motion: 0, bokeh: 1, smear: 0, fiber: 0.14, hue: 0, sat: 1.35, bri: -6, con: 1.12, tmp: 0, ang: 80, bl: 8, ratio: 1.6, mode: 'pal' };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(), p = await b.newPage();
  await p.setContent('<body></body>');
  if (FONT) {
    const b64 = fs.readFileSync(FONT).toString('base64');
    await p.addStyleTag({ content: `@font-face{font-family:"JetBrains Mono";font-weight:700;src:url(data:font/ttf;base64,${b64}) format("truetype")}` });
    await p.evaluate(() => document.fonts.load('700 50px "JetBrains Mono"'));
  } else console.warn('FONT not set: ASCII will use the fallback monospace face');
  await p.addScriptTag({ path: path.join(__dirname, 'floral.js') });
  for (const seed of SEEDS) {
    const url = await p.evaluate(({ PAL, CFG, seed, ASCII }) => {
      const { render } = window.__floral;
      const cfg = Object.assign({}, CFG, { seed });
      cfg.col = { bg: PAL.bg.slice(), petal: PAL.petal.slice(), core: PAL.core, stem: PAL.stem, stamen: PAL.stamen, bk: PAL.petal.slice(), tip: PAL.tip, shadow: PAL.shadow };
      const cv = document.createElement('canvas'); render(cv, cfg, 800);
      // ASCII over the whole panel: light across the top (the CSS scrim keeps the copy readable there), dense over the bloom.
      const a = document.createElement('canvas'); render(a, Object.assign({}, cfg, { ascii: ASCII }), 800);
      const m = a.getContext('2d'), g = m.createLinearGradient(0, 0, 0, a.height);
      g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.3, 'rgba(0,0,0,.4)'); g.addColorStop(0.5, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)');
      m.globalCompositeOperation = 'destination-in'; m.fillStyle = g; m.fillRect(0, 0, a.width, a.height);
      cv.getContext('2d').drawImage(a, 0, 0);
      return cv.toDataURL('image/webp', 0.9);
    }, { PAL, CFG, seed, ASCII });
    fs.writeFileSync(path.join(OUT, `${NAME}-${seed}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok', seed);
  }
  await b.close();
})();
