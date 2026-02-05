const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1400, height: 1000 });

  const appFile = path.join(__dirname, '../src/v2-research-tools.html');
  await page.goto(`file://${appFile}`);

  // Wait for page to load
  await page.waitForTimeout(2000);

  // Click on Phase Explorer tab
  await page.click('text=Phase Explorer');
  await page.waitForTimeout(1000);

  // Take screenshot
  const screenshotPath = path.join(__dirname, '../scratchpad/phase-explorer-with-line-chart.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
})();
