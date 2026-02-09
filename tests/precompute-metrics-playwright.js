const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'src/index.html');
    await page.goto(`file://${appPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('PRECOMPUTED METRICS TESTS');
    console.log('='.repeat(60));

    // Wait for precomputation to complete (listen for metricsReady event)
    console.log('Waiting for metric precomputation...');
    await page.evaluate(() => {
        return new Promise((resolve) => {
            if (window.precomputedMetrics && window.precomputedMetrics[255]) {
                resolve(); // Already done
            } else {
                window.addEventListener('metricsReady', () => resolve());
            }
        });
    });
    console.log('Precomputation complete.');

    // Wait a bit to make sure precomputedMetrics is set
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

        // Test 1: Array exists and has 256 entries
        test('precomputedMetrics array has 256 entries', () => {
            if (!precomputedMetrics) throw new Error('precomputedMetrics is null');
            if (precomputedMetrics.length !== 256) throw new Error(`Length: ${precomputedMetrics.length}`);
        });

        // Test 2: Each entry has rule number
        test('Each entry has rule number field', () => {
            for (let i = 0; i < 256; i++) {
                if (precomputedMetrics[i].rule !== i) {
                    throw new Error(`Rule ${i} has rule=${precomputedMetrics[i].rule}`);
                }
            }
        });

        // Test 3: Each entry has all 8 metrics
        test('Each entry has all 8 existing metrics', () => {
            const requiredFields = ['entropy', 'density', 'meanField', 'symmetry', 'lyapunov', 'compressibility', 'period', 'wolframClass'];
            for (let i = 0; i < 256; i++) {
                for (const field of requiredFields) {
                    if (precomputedMetrics[i][field] === undefined) {
                        throw new Error(`Rule ${i} missing ${field}`);
                    }
                }
            }
        });

        // Test 4: Metrics are deterministic (center-cell)
        test('Metrics are deterministic (recomputing same rule gives same result)', () => {
            const rule30 = precomputedMetrics[30];
            const initialConfig = generateCenterCell(128);
            const grid = generateGrid(30, 128, 128, initialConfig);
            const metrics = computeAllMetrics(30, grid, initialConfig);

            if (Math.abs(rule30.entropy - metrics.entropy) > 0.001) {
                throw new Error(`Entropy mismatch: ${rule30.entropy} vs ${metrics.entropy}`);
            }
            if (Math.abs(rule30.density - metrics.density) > 0.001) {
                throw new Error(`Density mismatch: ${rule30.density} vs ${metrics.density}`);
            }
        });

        // Test 5: Uses 128x128 grid
        test('Rule 0 has expected behavior (all zeros after generation 1)', () => {
            const r0 = precomputedMetrics[0];
            // Rule 0: all cells die. Only generation 0 has the center cell.
            // Density should be very low (1 cell out of 128*128)
            if (r0.density > 0.01) throw new Error(`Rule 0 density too high: ${r0.density}`);
        });

        // Test 6: Known rule behaviors
        test('Rule 30 (chaotic) has higher entropy than Rule 0', () => {
            const r0 = precomputedMetrics[0];
            const r30 = precomputedMetrics[30];
            if (r30.entropy <= r0.entropy) {
                throw new Error(`Rule 30 entropy (${r30.entropy}) should be > Rule 0 (${r0.entropy})`);
            }
        });

        // Test 7: Wolfram class is present
        test('Rules have valid Wolfram class assignments', () => {
            const validClasses = ['I', 'II', 'III', 'IV'];
            for (let i = 0; i < 256; i++) {
                if (!validClasses.includes(precomputedMetrics[i].wolframClass)) {
                    throw new Error(`Rule ${i} has invalid class: ${precomputedMetrics[i].wolframClass}`);
                }
            }
        });

        // Test 8: Numeric metrics are valid numbers
        test('All numeric metrics are finite numbers', () => {
            const numericFields = ['entropy', 'density', 'meanField', 'symmetry', 'lyapunov', 'compressibility'];
            for (let i = 0; i < 256; i++) {
                for (const field of numericFields) {
                    const val = precomputedMetrics[i][field];
                    if (typeof val !== 'number' || !isFinite(val)) {
                        throw new Error(`Rule ${i}.${field} is not a finite number: ${val}`);
                    }
                }
            }
        });

        // Test 9: precomputedMetrics accessible globally
        test('precomputedMetrics is accessible from global scope', () => {
            if (typeof window.precomputedMetrics === 'undefined') {
                // Check if it's just a local variable (not on window)
                if (typeof precomputedMetrics === 'undefined') {
                    throw new Error('Not accessible');
                }
            }
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

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
