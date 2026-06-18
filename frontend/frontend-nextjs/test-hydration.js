const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3004/free-diagnostic');
  await page.fill('#company-name', 'Acme');
  await page.selectOption('#company-size', 'small');
  await page.selectOption('#industry', 'retail');
  await page.waitForTimeout(1000);
  
  const isDisabled = await page.evaluate(() => {
    return document.querySelector('.btn-primary').disabled;
  });
  console.log('IS DISABLED:', isDisabled);
  await page.screenshot({ path: 'screenshot-filled.png' });
  await browser.close();
})();
