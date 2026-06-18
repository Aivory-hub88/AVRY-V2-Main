const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('PAGE ERROR:', err));
  await page.goto('http://localhost:3004/free-diagnostic');
  
  await page.locator('#company-name').type('Acme');
  await page.locator('#company-size').selectOption('small');
  await page.locator('#industry').selectOption('retail');
  await page.waitForTimeout(500);
  
  console.log('Clicking continue...');
  await page.click('.btn-primary');
  await page.waitForTimeout(1000);
  
  const text = await page.evaluate(() => document.body.innerText);
  if (text.includes("This page couldn't load")) {
    console.log("CRASHED ON QUESTION STEP!");
  } else {
    console.log("DID NOT CRASH. Text:", text.substring(0, 100));
  }
  
  await browser.close();
})();
