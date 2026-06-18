const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('DEV CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('DEV ERROR:', err));
  await page.goto('http://localhost:3008/free-diagnostic');
  await page.waitForTimeout(4000);
  await browser.close();
  process.exit(0);
})();
