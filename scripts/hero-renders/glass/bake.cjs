// Bakes the chosen cards to 720x720 WebP: gradient + glass object + grain, plus the folder-shaped
// liquid-glass pane (blur, tint, rim) sized exactly to each production caption. Text is not baked.
const fs = require('fs');
const { chromium } = require('playwright');
const NAMES = ['audit', 'growth', 'automation', 'lock', 'decision', 'vault'];
const VER = process.env.CARD_VER || 'v12';
// BG_IMAGES='{"audit":"/abs/a.jpg",...}' swaps a card's gradient for an image backdrop; BG_POS='{"audit":[0.5,0.3]}' sets the crop.
const BG = JSON.parse(process.env.BG_IMAGES || '{}'), POS = JSON.parse(process.env.BG_POS || '{}');
const PROD_CAP = `<style>
#chosen .cards{grid-template-columns:repeat(6,360px)!important}main{max-width:none!important}
/* production caption metrics on a 196px card, as cqw so they scale with the bake size */
#chosen .card .cap{padding:15.31cqw 9.18cqw 8.16cqw!important;font-size:10.71cqw!important;font-weight:300!important;line-height:1.1!important;letter-spacing:-.022em!important;min-height:48%!important}
</style>`;
(async () => {
  const src = fs.readFileSync(__dirname + '/cards.html', 'utf8').replace('</head>', PROD_CAP + '</head>');
  fs.writeFileSync(__dirname + '/bake.html', src);
  const b = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 2400, height: 1200 }, deviceScaleFactor: 2 });
  const src64 = {};
  for (const [k, f] of Object.entries(BG)) src64[k] = 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64');
  await p.addInitScript(([a, c]) => { window.__bgSrc = a; window.__bgPos = c; }, [src64, POS]);
  await p.goto('file://' + __dirname + '/bake.html');
  await p.waitForFunction(() => window.__done, null, { timeout: 180000 });
  await p.evaluate(() => document.fonts.ready);
  const out = await p.evaluate(() => {
    const FOLDER = 'M0,22 C0,16.5 2.5,14 8,14 L34,14 C41,14 42.5,0.6 51,0.6 L92,0.6 C97.5,0.6 100,3 100,8.5 L100,60 L0,60 Z';
    return [...document.querySelectorAll('#chosen .card')].map((card) => {
      const cv = card.querySelector('canvas'), cap = card.querySelector('.cap');
      const cr = card.getBoundingClientRect(), pr = cap.getBoundingClientRect(), k = cv.width / cr.width;
      const x0 = (pr.left - cr.left) * k, y0 = (pr.top - cr.top) * k, w = pr.width * k, h = pr.height * k;
      const d = FOLDER.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, a, c) => `${(x0 + (+a) * w / 100).toFixed(2)},${(y0 + (+c) * h / 60).toFixed(2)}`);
      const path = new Path2D(d), c = cv.getContext('2d');
      const copy = document.createElement('canvas'); copy.width = cv.width; copy.height = cv.height; copy.getContext('2d').drawImage(cv, 0, 0);
      c.save(); c.clip(path);
      c.filter = `blur(${(7 * k).toFixed(1)}px) saturate(1.35) brightness(0.9)`; c.drawImage(copy, 0, 0); c.filter = 'none';
      let g = c.createLinearGradient(0, y0, 0, y0 + h);
      g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(0.45, 'rgba(255,255,255,.04)'); g.addColorStop(1, 'rgba(255,255,255,.02)'); c.fillStyle = g; c.fillRect(x0, y0, w, h);
      g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, 'rgba(10,14,22,0)'); g.addColorStop(1, 'rgba(10,14,22,.16)'); c.fillStyle = g; c.fillRect(x0, y0, w, h);
      g = c.createLinearGradient(0, y0, 0, y0 + h); g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(0.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.strokeStyle = g; c.lineWidth = 2.4 * k / 2; c.stroke(path); c.restore();
      return [cv.width, Math.round(h / k / cr.width * 196), cv.toDataURL('image/webp', 0.9)];
    });
  });
  fs.mkdirSync(__dirname + '/baked', { recursive: true });
  out.forEach(([w, ph, u], i) => { fs.writeFileSync(`${__dirname}/baked/card-${NAMES[i]}-${VER}.webp`, Buffer.from(u.split(',')[1], 'base64')); console.log(NAMES[i], w, 'pane px @196:', ph); });
  await b.close();
})();
