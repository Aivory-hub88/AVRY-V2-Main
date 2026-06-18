const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3004/free-diagnostic');
  await page.fill('#company-name', 'Acme');
  await page.selectOption('#company-size', 'small');
  await page.selectOption('#industry', 'retail');
  await page.waitForTimeout(1000);
  
  const vals = await page.evaluate(() => {
    return {
      name: document.querySelector('#company-name').value,
      size: document.querySelector('#company-size').value,
      ind: document.querySelector('#industry').value,
      btn: document.querySelector('.btn-primary').disabled
    };
  });
  console.log('VALUES:', vals);
  await browser.close();
})();
