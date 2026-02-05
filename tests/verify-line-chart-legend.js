const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Load the test page
    const testFilePath = path.join(__dirname, 'line-chart-legend-real.test.html');
    await page.goto(`file://${testFilePath}`);

    // Wait for tests to complete
    await page.waitForTimeout(2000);

    // Get test results
    const results = await page.evaluate(() => {
        const resultsDiv = document.getElementById('results');
        const h2 = resultsDiv.querySelector('h2');
        const testResults = Array.from(resultsDiv.querySelectorAll('.test-result')).map(el => ({
            text: el.textContent,
            pass: el.classList.contains('pass')
        }));

        return {
            summary: h2 ? h2.textContent : 'No results',
            tests: testResults
        };
    });

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('LINE CHART LEGEND TESTS');
    console.log('='.repeat(60));
    console.log(results.summary);
    console.log('='.repeat(60));

    results.tests.forEach(test => {
        console.log(test.text);
    });

    console.log('='.repeat(60));

    // Take screenshots of visual tests
    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';

    // Screenshot 1: Standard 3-series
    const container1 = await page.locator('#test-container-1');
    await container1.screenshot({ path: path.join(scratchpadDir, 'line-chart-legend-3series.png') });
    console.log(`\n✓ Screenshot saved: line-chart-legend-3series.png`);

    // Screenshot 2: 10-series
    const container2 = await page.locator('#test-container-2');
    await container2.screenshot({ path: path.join(scratchpadDir, 'line-chart-legend-10series.png') });
    console.log(`✓ Screenshot saved: line-chart-legend-10series.png`);

    // Screenshot 3: Long names
    const container3 = await page.locator('#test-container-3');
    await container3.screenshot({ path: path.join(scratchpadDir, 'line-chart-legend-longnames.png') });
    console.log(`✓ Screenshot saved: line-chart-legend-longnames.png`);

    await browser.close();

    // Exit with appropriate code
    const allPassed = results.tests.every(t => t.pass);
    process.exit(allPassed ? 0 : 1);
})();
