const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'index.html');
    await page.goto(`file://${appPath}`);
    await page.waitForTimeout(1000);

    console.log('\n' + '='.repeat(60));
    console.log('COLOR SCALE BAR TESTS');
    console.log('='.repeat(60));

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

        // Test 1: Function exists
        test('createColorScaleBar function exists', () => {
            if (typeof createColorScaleBar !== 'function') throw new Error('Not a function');
        });

        // Test 2: Creates a wrapper element
        test('Creates wrapper element in container', () => {
            const container = document.createElement('div');
            const bar = createColorScaleBar(container);
            if (!bar) throw new Error('No return value');
            if (!container.querySelector('.color-scale-bar')) throw new Error('No wrapper created');
        });

        // Test 3: Contains a canvas element
        test('Contains a canvas for the gradient', () => {
            const container = document.createElement('div');
            createColorScaleBar(container);
            const canvas = container.querySelector('.scale-bar-canvas');
            if (!canvas) throw new Error('No canvas found');
        });

        // Test 4: Canvas dimensions match config
        test('Canvas dimensions match barWidth/barHeight config', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { barWidth: 30, barHeight: 150 });
            const canvas = container.querySelector('.scale-bar-canvas');
            if (canvas.width !== 30 || canvas.height !== 150) {
                throw new Error(`Expected 30x150, got ${canvas.width}x${canvas.height}`);
            }
        });

        // Test 5: Max label present
        test('Max value label is present', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { maxValue: 1.0 });
            const maxLabel = container.querySelector('.scale-max-label');
            if (!maxLabel) throw new Error('No max label');
            if (maxLabel.textContent !== '1.00') throw new Error(`Expected '1.00', got '${maxLabel.textContent}'`);
        });

        // Test 6: Min label present
        test('Min value label is present', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { minValue: 0.0 });
            const minLabel = container.querySelector('.scale-min-label');
            if (!minLabel) throw new Error('No min label');
            if (minLabel.textContent !== '0.00') throw new Error(`Expected '0.00', got '${minLabel.textContent}'`);
        });

        // Test 7: Mid-point tick present
        test('Intermediate (mid-point) tick label is present', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { minValue: 0, maxValue: 1 });
            const midLabel = container.querySelector('.scale-mid-label');
            if (!midLabel) throw new Error('No mid label');
            if (!midLabel.textContent.includes('0.50')) throw new Error(`Mid label incorrect: '${midLabel.textContent}'`);
        });

        // Test 8: Gradient bar shows color variation
        test('Gradient bar shows color variation (top != bottom)', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { barWidth: 20, barHeight: 100 });
            const canvas = container.querySelector('.scale-bar-canvas');
            const ctx = canvas.getContext('2d');

            const topPixel = ctx.getImageData(10, 0, 1, 1).data;
            const bottomPixel = ctx.getImageData(10, 99, 1, 1).data;

            const diff = Math.abs(topPixel[0] - bottomPixel[0]) +
                         Math.abs(topPixel[1] - bottomPixel[1]) +
                         Math.abs(topPixel[2] - bottomPixel[2]);

            if (diff < 50) throw new Error(`Top and bottom too similar, diff=${diff}`);
        });

        // Test 9: Top is max color, bottom is min color (default: top=white, bottom=black)
        test('Top pixel is max color (white), bottom is min color (black)', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { barWidth: 20, barHeight: 100 });
            const canvas = container.querySelector('.scale-bar-canvas');
            const ctx = canvas.getContext('2d');

            const topPixel = ctx.getImageData(10, 0, 1, 1).data;
            const bottomPixel = ctx.getImageData(10, 99, 1, 1).data;

            // Top should be white-ish (max)
            if (topPixel[0] < 200 || topPixel[1] < 200 || topPixel[2] < 200) {
                throw new Error(`Top not white: [${topPixel[0]},${topPixel[1]},${topPixel[2]}]`);
            }
            // Bottom should be black-ish (min)
            if (bottomPixel[0] > 30 || bottomPixel[1] > 30 || bottomPixel[2] > 30) {
                throw new Error(`Bottom not black: [${bottomPixel[0]},${bottomPixel[1]},${bottomPixel[2]}]`);
            }
        });

        // Test 10: Custom min/max values
        test('Custom min/max values are displayed correctly', () => {
            const container = document.createElement('div');
            createColorScaleBar(container, { minValue: -5.5, maxValue: 10.3 });
            const maxLabel = container.querySelector('.scale-max-label');
            const minLabel = container.querySelector('.scale-min-label');
            if (maxLabel.textContent !== '10.30') throw new Error(`Max label: ${maxLabel.textContent}`);
            if (minLabel.textContent !== '-5.50') throw new Error(`Min label: ${minLabel.textContent}`);
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

    // Visual test: add scale bar next to a heatmap in Light Cones tab
    await page.evaluate(() => {
        const lightPanel = document.getElementById('panel-lightcone');
        if (!lightPanel) return;
        const placeholder = lightPanel.querySelector('.placeholder');

        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.gap = '20px';
        container.style.alignItems = 'flex-start';
        container.style.justifyContent = 'center';
        container.style.padding = '20px';

        // Heatmap
        const canvas = document.createElement('canvas');
        canvas.style.width = '300px';
        canvas.style.height = '300px';
        const matrix = Array(128).fill(null).map((_, y) =>
            Array(128).fill(null).map((_, x) => Math.abs(x - 64) <= y ? 1 : 0)
        );
        createHeatmap(canvas, matrix);
        container.appendChild(canvas);

        // Scale bar
        const scaleContainer = document.createElement('div');
        createColorScaleBar(scaleContainer, {
            barWidth: 20,
            barHeight: 300,
            minValue: 0,
            maxValue: 1,
            label: 'Difference'
        });
        container.appendChild(scaleContainer);

        placeholder.appendChild(container);
    });

    await page.click('text=Light Cones');
    await page.waitForTimeout(500);

    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'color-scale-bar-test.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: color-scale-bar-test.png');

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
