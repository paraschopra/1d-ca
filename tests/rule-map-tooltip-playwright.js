const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'src/index.html');
    await page.goto(`file://${appPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('RULE MAP TOOLTIP TESTS (Task 17)');
    console.log('='.repeat(60));

    // Wait for precomputation
    await page.evaluate(() => {
        return new Promise((resolve) => {
            if (window.precomputedMetrics && window.precomputedMetrics[255]) resolve();
            else window.addEventListener('metricsReady', () => resolve());
        });
    });
    await page.waitForTimeout(500);

    // Switch to Rule Map tab
    await page.click('text=Rule Map');
    await page.waitForTimeout(500);

    const testResults = await page.evaluate(() => {
        const results = [];

        function test(name, fn) {
            try {
                fn();
                results.push({ name, pass: true });
            } catch (e) {
                results.push({ name, pass: false, error: e.message });
            }
        }

        test('Tooltip group exists in Rule Map SVG', () => {
            const chart = document.getElementById('rule-map-chart');
            const tooltip = chart.querySelector('.chart-tooltip');
            if (!tooltip) throw new Error('No tooltip found');
        });

        test('Tooltip is hidden by default', () => {
            const chart = document.getElementById('rule-map-chart');
            const tooltip = chart.querySelector('.chart-tooltip');
            if (tooltip.style.display !== 'none') throw new Error('Tooltip not hidden');
        });

        test('Dots have data-label including Wolfram class', () => {
            const chart = document.getElementById('rule-map-chart');
            const circles = chart.querySelectorAll('circle[data-label]');
            let hasClass = false;
            circles.forEach(c => {
                const label = c.getAttribute('data-label');
                if (label.includes('Class')) hasClass = true;
            });
            if (!hasClass) throw new Error('No dot labels include Wolfram class');
        });

        test('Labels contain both rule number and class', () => {
            const chart = document.getElementById('rule-map-chart');
            const circle = chart.querySelector('circle[data-label*="Rule 30"]');
            if (!circle) throw new Error('Rule 30 dot not found');
            const label = circle.getAttribute('data-label');
            if (!label.includes('Rule 30')) throw new Error('Missing rule number');
            if (!label.includes('Class')) throw new Error('Missing Wolfram class');
        });

        test('Dots have data-x and data-y for tooltip values', () => {
            const chart = document.getElementById('rule-map-chart');
            const circle = chart.querySelector('circle[data-label*="Rule 30"]');
            const x = circle.getAttribute('data-x');
            const y = circle.getAttribute('data-y');
            if (!x || !y) throw new Error('Missing data attributes');
            if (isNaN(parseFloat(x)) || isNaN(parseFloat(y))) throw new Error('Non-numeric values');
        });

        test('Cursor is pointer on dots', () => {
            const chart = document.getElementById('rule-map-chart');
            const circle = chart.querySelector('circle[data-label]');
            if (circle.style.cursor !== 'pointer') throw new Error(`Cursor: ${circle.style.cursor}`);
        });

        return results;
    });

    let allPassed = true;
    testResults.forEach(r => {
        const symbol = r.pass ? '✓' : '✗';
        console.log(`${symbol} ${r.name}${r.error ? ': ' + r.error : ''}`);
        if (!r.pass) allPassed = false;
    });

    // Hover interaction test
    console.log('\nTesting hover interaction...');
    const circle = await page.locator('#rule-map-chart svg circle[data-label]').first();
    await circle.hover({ force: true });
    await page.waitForTimeout(300);

    const tooltipVisible = await page.evaluate(() => {
        const chart = document.getElementById('rule-map-chart');
        const tooltip = chart.querySelector('.chart-tooltip');
        return tooltip.style.display !== 'none';
    });
    console.log(tooltipVisible ? '✓ Tooltip appears on hover' : '✗ Tooltip not visible on hover');
    if (!tooltipVisible) allPassed = false;

    // Check tooltip content
    const tooltipContent = await page.evaluate(() => {
        const chart = document.getElementById('rule-map-chart');
        const tspans = chart.querySelectorAll('.chart-tooltip tspan');
        return Array.from(tspans).map(t => t.textContent);
    });
    console.log(`  Tooltip lines: ${JSON.stringify(tooltipContent)}`);

    const hasRuleInfo = tooltipContent.some(l => l.includes('Rule'));
    const hasClassInfo = tooltipContent.some(l => l.includes('Class'));
    const hasMetricValues = tooltipContent.length >= 3;
    console.log(hasRuleInfo ? '✓ Tooltip shows rule number' : '✗ Missing rule number');
    console.log(hasClassInfo ? '✓ Tooltip shows Wolfram class' : '✗ Missing Wolfram class');
    console.log(hasMetricValues ? '✓ Tooltip shows metric values' : '✗ Missing metric values');
    if (!hasRuleInfo || !hasClassInfo || !hasMetricValues) allPassed = false;

    // Move away - tooltip should hide
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);

    const tooltipHidden = await page.evaluate(() => {
        const chart = document.getElementById('rule-map-chart');
        const tooltip = chart.querySelector('.chart-tooltip');
        return tooltip.style.display === 'none';
    });
    console.log(tooltipHidden ? '✓ Tooltip hides when mouse moves away' : '✗ Tooltip still visible');
    if (!tooltipHidden) allPassed = false;

    // Screenshot
    await circle.hover({ force: true });
    await page.waitForTimeout(300);
    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'rule-map-tooltip.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: rule-map-tooltip.png');

    const passCount = testResults.filter(r => r.pass).length;
    console.log(`\nResults: ${passCount + (tooltipVisible && hasRuleInfo && hasClassInfo && hasMetricValues && tooltipHidden ? 5 : 0)}/${testResults.length + 5} passed`);
    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
