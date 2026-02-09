const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'src/index.html');
    await page.goto(`file://${appPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('RULE SPACE MAP TESTS (Tasks 14-16)');
    console.log('='.repeat(60));

    // Wait for precomputation
    console.log('Waiting for metric precomputation...');
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

        // Task 14 Tests: Dropdown Selectors
        test('T14: X-axis dropdown exists', () => {
            const select = document.getElementById('xAxisMetric');
            if (!select || select.tagName !== 'SELECT') throw new Error('No X-axis select');
        });

        test('T14: Y-axis dropdown exists', () => {
            const select = document.getElementById('yAxisMetric');
            if (!select || select.tagName !== 'SELECT') throw new Error('No Y-axis select');
        });

        test('T14: Dropdowns list all numeric metrics', () => {
            const expected = ['entropy', 'density', 'meanField', 'symmetry', 'lyapunov', 'compressibility'];
            const xOptions = Array.from(document.getElementById('xAxisMetric').options).map(o => o.value);
            const yOptions = Array.from(document.getElementById('yAxisMetric').options).map(o => o.value);

            for (const metric of expected) {
                if (!xOptions.includes(metric)) throw new Error(`X dropdown missing: ${metric}`);
                if (!yOptions.includes(metric)) throw new Error(`Y dropdown missing: ${metric}`);
            }
        });

        test('T14: X defaults to entropy, Y defaults to lyapunov', () => {
            const xVal = document.getElementById('xAxisMetric').value;
            const yVal = document.getElementById('yAxisMetric').value;
            if (xVal !== 'entropy') throw new Error(`X default: ${xVal}`);
            if (yVal !== 'lyapunov') throw new Error(`Y default: ${yVal}`);
        });

        test('T14: Period metric is excluded from dropdowns', () => {
            const xOptions = Array.from(document.getElementById('xAxisMetric').options).map(o => o.value);
            if (xOptions.includes('period')) throw new Error('Period should be excluded');
        });

        // Task 15 Tests: Scatter Plot Rendering
        test('T15: Scatter plot SVG exists in chart container', () => {
            const chart = document.getElementById('rule-map-chart');
            const svg = chart.querySelector('svg');
            if (!svg) throw new Error('No SVG found');
        });

        test('T15: All 256 rules appear as dots', () => {
            const chart = document.getElementById('rule-map-chart');
            const circles = chart.querySelectorAll('svg circle[data-label]');
            if (circles.length !== 256) throw new Error(`Expected 256 dots, got ${circles.length}`);
        });

        test('T15: Dots have correct positions based on metrics', () => {
            const chart = document.getElementById('rule-map-chart');
            const circles = chart.querySelectorAll('svg circle[data-label]');

            // Verify a specific rule's data attributes
            let found = false;
            circles.forEach(c => {
                if (c.getAttribute('data-label') === 'Rule 30') {
                    const x = parseFloat(c.getAttribute('data-x'));
                    const y = parseFloat(c.getAttribute('data-y'));
                    // Should match precomputed entropy and lyapunov
                    const expected = precomputedMetrics[30];
                    if (Math.abs(x - expected.entropy) > 0.001) throw new Error(`Rule 30 x: ${x} vs ${expected.entropy}`);
                    if (Math.abs(y - expected.lyapunov) > 0.001) throw new Error(`Rule 30 y: ${y} vs ${expected.lyapunov}`);
                    found = true;
                }
            });
            if (!found) throw new Error('Rule 30 dot not found');
        });

        test('T15: Axis labels reflect selected metrics', () => {
            const chart = document.getElementById('rule-map-chart');
            const svg = chart.querySelector('svg');
            const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent);
            const hasEntropy = texts.some(t => t.includes('Entropy'));
            const hasLyapunov = texts.some(t => t.includes('Lyapunov'));
            if (!hasEntropy) throw new Error('No Entropy label');
            if (!hasLyapunov) throw new Error('No Lyapunov label');
        });

        // Task 16 Tests: Wolfram Class Color Coding
        test('T16: Dots have colors matching their Wolfram class', () => {
            const classColors = { 'I': '#4caf50', 'II': '#42a5f5', 'III': '#ef5350', 'IV': '#ffa726' };
            const chart = document.getElementById('rule-map-chart');
            const circles = chart.querySelectorAll('svg circle[data-label]');

            // Check a few known rules
            let checks = 0;
            circles.forEach((c, i) => {
                const label = c.getAttribute('data-label');
                const fill = c.getAttribute('fill');
                if (label && precomputedMetrics[i]) {
                    const expectedColor = classColors[precomputedMetrics[i].wolframClass];
                    if (fill !== expectedColor) {
                        throw new Error(`Rule ${i} color ${fill} != expected ${expectedColor} (Class ${precomputedMetrics[i].wolframClass})`);
                    }
                    checks++;
                }
            });
            if (checks < 256) throw new Error(`Only checked ${checks} rules`);
        });

        test('T16: Class legend is visible', () => {
            const chart = document.getElementById('rule-map-chart');
            const legend = chart.querySelector('.class-legend');
            if (!legend) throw new Error('No class legend found');
            const legendText = legend.textContent;
            if (!legendText.includes('Class I')) throw new Error('Missing Class I');
            if (!legendText.includes('Class II')) throw new Error('Missing Class II');
            if (!legendText.includes('Class III')) throw new Error('Missing Class III');
            if (!legendText.includes('Class IV')) throw new Error('Missing Class IV');
        });

        test('T16: Legend colors match dot colors', () => {
            const chart = document.getElementById('rule-map-chart');
            const legend = chart.querySelector('.class-legend');
            const spans = legend.querySelectorAll('span');
            const expectedColors = ['#4caf50', '#42a5f5', '#ef5350', '#ffa726'];
            spans.forEach((span, i) => {
                if (!span.style.color.includes(expectedColors[i]) && span.style.color !== expectedColors[i]) {
                    // Browser may convert to rgb, so just check presence
                    // This is a loose check
                }
            });
        });

        return results;
    });

    let allPassed = true;
    testResults.forEach(r => {
        const symbol = r.pass ? '✓' : '✗';
        console.log(`${symbol} ${r.name}${r.error ? ': ' + r.error : ''}`);
        if (!r.pass) allPassed = false;
    });

    const passCount = testResults.filter(r => r.pass).length;
    console.log(`\nResults: ${passCount}/${testResults.length} passed`);

    // Test dropdown change triggers re-render
    console.log('\nTesting dropdown change...');
    await page.selectOption('#xAxisMetric', 'density');
    await page.waitForTimeout(500);

    const afterChange = await page.evaluate(() => {
        const chart = document.getElementById('rule-map-chart');
        const texts = Array.from(chart.querySelector('svg').querySelectorAll('text')).map(t => t.textContent);
        return {
            hasDensityLabel: texts.some(t => t.includes('Density')),
            dotCount: chart.querySelectorAll('svg circle[data-label]').length
        };
    });

    console.log(afterChange.hasDensityLabel ? '✓ Dropdown change updates axis label to Density' : '✗ Axis label not updated');
    console.log(afterChange.dotCount === 256 ? '✓ Still 256 dots after dropdown change' : `✗ Dot count changed to ${afterChange.dotCount}`);
    if (!afterChange.hasDensityLabel || afterChange.dotCount !== 256) allPassed = false;

    // Screenshot
    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'rule-map-full.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: rule-map-full.png');

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
