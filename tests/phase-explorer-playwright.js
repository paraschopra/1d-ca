const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'v2-research-tools.html');
    await page.goto(`file://${appPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('PHASE TRANSITION EXPLORER TESTS (Tasks 19-21)');
    console.log('='.repeat(60));

    // Switch to Phase Explorer tab
    await page.click('text=Phase Explorer');
    await page.waitForTimeout(500);

    // Wait for initial sweep to complete (Rule 30)
    console.log('Waiting for density sweep to complete...');
    await page.waitForFunction(() => {
        const chart = document.getElementById('phase-chart-container');
        return chart && chart.querySelector('svg');
    }, { timeout: 30000 });
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

        // Task 19: Rule Selector
        test('T19: Rule number input exists', () => {
            const input = document.getElementById('phaseRuleInput');
            if (!input) throw new Error('No input');
            if (input.type !== 'number') throw new Error('Not number type');
        });

        test('T19: Default rule is 30', () => {
            const val = document.getElementById('phaseRuleInput').value;
            if (val !== '30') throw new Error(`Default: ${val}`);
        });

        test('T19: Increment button exists', () => {
            if (!document.getElementById('phaseRuleInc')) throw new Error('No + button');
        });

        test('T19: Decrement button exists', () => {
            if (!document.getElementById('phaseRuleDec')) throw new Error('No - button');
        });

        test('T19: Random Rule button exists', () => {
            if (!document.getElementById('phaseRandomRule')) throw new Error('No random button');
        });

        // Task 20: Density Sweep Results
        test('T20: Chart container has an SVG (sweep completed)', () => {
            const chart = document.getElementById('phase-chart-container');
            if (!chart.querySelector('svg')) throw new Error('No SVG');
        });

        test('T20: Chart has 6 series paths (one per metric)', () => {
            const chart = document.getElementById('phase-chart-container');
            const paths = chart.querySelectorAll('path[data-series-name]');
            if (paths.length !== 6) throw new Error(`Expected 6, got ${paths.length}`);
        });

        // Task 21: Line Chart Rendering
        test('T21: Chart has X axis label "Initial Density"', () => {
            const chart = document.getElementById('phase-chart-container');
            const texts = Array.from(chart.querySelectorAll('svg text')).map(t => t.textContent);
            if (!texts.some(t => t.includes('Initial Density'))) throw new Error('No density label');
        });

        test('T21: Chart has Y axis label "Metric Value"', () => {
            const chart = document.getElementById('phase-chart-container');
            const texts = Array.from(chart.querySelectorAll('svg text')).map(t => t.textContent);
            if (!texts.some(t => t.includes('Metric Value'))) throw new Error('No metric label');
        });

        test('T21: Legend shows all 6 metric names', () => {
            const chart = document.getElementById('phase-chart-container');
            const legendItems = chart.querySelectorAll('.legend-item text');
            const names = Array.from(legendItems).map(t => t.textContent);
            const expected = ['Entropy', 'Density', 'Mean Field', 'Symmetry', 'Lyapunov', 'Compress'];
            for (const exp of expected) {
                if (!names.some(n => n.includes(exp))) throw new Error(`Missing: ${exp}`);
            }
        });

        test('T21: Hover circles exist for tooltip interaction', () => {
            const chart = document.getElementById('phase-chart-container');
            const hoverCircles = chart.querySelectorAll('.line-hover-points circle');
            // Should be 6 metrics * 51 density levels = 306
            if (hoverCircles.length < 300) throw new Error(`Expected ~306, got ${hoverCircles.length}`);
        });

        return results;
    });

    let allPassed = true;
    testResults.forEach(r => {
        const symbol = r.pass ? '✓' : '✗';
        console.log(`${symbol} ${r.name}${r.error ? ': ' + r.error : ''}`);
        if (!r.pass) allPassed = false;
    });

    // Test increment button
    console.log('\nTesting increment button...');
    await page.click('#phaseRuleInc');
    await page.waitForTimeout(500);
    const newVal = await page.evaluate(() => document.getElementById('phaseRuleInput').value);
    console.log(newVal === '31' ? '✓ Increment: 30 → 31' : `✗ Increment failed: ${newVal}`);
    if (newVal !== '31') allPassed = false;

    // Wait for new sweep
    await page.waitForFunction(() => {
        const chart = document.getElementById('phase-chart-container');
        return chart && chart.querySelector('svg');
    }, { timeout: 30000 });
    await page.waitForTimeout(500);

    // Test wrap-around (set to 255, then increment)
    await page.evaluate(() => {
        document.getElementById('phaseRuleInput').value = '255';
    });
    await page.click('#phaseRuleInc');
    await page.waitForTimeout(200);
    const wrappedVal = await page.evaluate(() => document.getElementById('phaseRuleInput').value);
    console.log(wrappedVal === '0' ? '✓ Wrap-around: 255 → 0' : `✗ Wrap failed: ${wrappedVal}`);
    if (wrappedVal !== '0') allPassed = false;

    // Screenshot
    await page.fill('#phaseRuleInput', '110');
    await page.evaluate(() => {
        document.getElementById('phaseRuleInput').dispatchEvent(new Event('change'));
    });
    await page.waitForFunction(() => {
        const chart = document.getElementById('phase-chart-container');
        return chart && chart.querySelector('svg path');
    }, { timeout: 30000 });
    await page.waitForTimeout(1000);

    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'phase-explorer-rule110.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: phase-explorer-rule110.png');

    const passCount = testResults.filter(r => r.pass).length;
    console.log(`\nResults: ${passCount + 2}/${testResults.length + 2} passed`);
    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
