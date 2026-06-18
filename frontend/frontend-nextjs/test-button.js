const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3004/free-diagnostic');
  
  // Fill form natively via typing (triggering React onChange)
  await page.locator('#company-name').type('Acme');
  await page.locator('#company-size').selectOption('small');
  await page.locator('#industry').selectOption('retail');
  await page.waitForTimeout(1000);
  
  const isDisabled = await page.evaluate(() => document.querySelector('.btn-primary').disabled);
  console.log('IS DISABLED:', isDisabled);
  
  // If it's disabled, we force remove disabled and click it
  if (isDisabled) {
    await page.evaluate(() => document.querySelector('.btn-primary').removeAttribute('disabled'));
    await page.click('.btn-primary', { force: true });
    await page.waitForTimeout(1000);
    // Did it change step?
    const h1 = await page.evaluate(() => document.querySelector('h1')?.innerText);
    console.log('H1 AFTER CLICK:', h1);
  }
  await browser.close();
})();
