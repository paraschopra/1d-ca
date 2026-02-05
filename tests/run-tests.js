const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTests(testFile) {
    const browser = await chromium.launch({
        headless: true
    });

    try {
        const page = await browser.newPage();

        // Collect console messages
        const logs = [];
        page.on('console', msg => {
            const text = msg.text();
            logs.push(text);
            console.log(text);
        });

        // Navigate to test file
        const testPath = path.resolve(__dirname, testFile);
        await page.goto(`file://${testPath}`, { waitUntil: 'networkidle' });

        // Wait for tests to complete
        await page.waitForSelector('#summary', { timeout: 5000 });

        // Extract test results
        const summary = await page.evaluate(() => {
            const summaryDiv = document.getElementById('summary');
            const resultsDiv = document.getElementById('results');
            const passed = resultsDiv.querySelectorAll('.pass').length;
            const failed = resultsDiv.querySelectorAll('.fail').length;

            return {
                passed,
                failed,
                total: passed + failed,
                summaryText: summaryDiv.textContent
            };
        });

        console.log('\n' + '='.repeat(60));
        console.log(summary.summaryText);
        console.log('='.repeat(60));

        await browser.close();

        // Return exit code based on test results
        return summary.failed === 0 ? 0 : 1;

    } catch (error) {
        console.error('Test execution failed:', error);
        await browser.close();
        return 1;
    }
}

// Run the test file passed as argument, or default to ca-engine.test.html
const testFile = process.argv[2] || 'ca-engine.test.html';
runTests(testFile).then(exitCode => {
    process.exit(exitCode);
});
