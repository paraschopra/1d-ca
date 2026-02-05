const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const testFile = path.join(__dirname, 'line-chart-import.test.html');
  await page.goto(`file://${testFile}`);

  // Wait for tests to complete (iframe load + test execution)
  await page.waitForTimeout(5000);

  // Wait specifically for summary to appear
  await page.waitForSelector('#summary', { timeout: 10000 });

  // Get test results
  const summary = await page.textContent('#summary');
  console.log('\n' + summary);

  // Get all test results
  const results = await page.$$eval('.test-result', els =>
    els.map(el => ({
      passed: el.classList.contains('pass'),
      text: el.textContent
    }))
  );

  console.log('\nDetailed Results:');
  results.forEach(r => {
    console.log(r.passed ? '  ✓' : '  ✗', r.text.substring(2));
  });

  // Check for failures
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }

  // Take screenshot
  const screenshotPath = path.join(__dirname, '../scratchpad/line-chart-tests.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to: ${screenshotPath}`);

  await browser.close();
})();
