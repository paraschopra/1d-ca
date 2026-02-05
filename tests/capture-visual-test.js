const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const testFile = path.join(__dirname, 'verify-line-chart-visual.html');
  await page.goto(`file://${testFile}`);

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Take screenshot
  const screenshotPath = path.join(__dirname, '../scratchpad/line-chart-visual-test.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
})();
