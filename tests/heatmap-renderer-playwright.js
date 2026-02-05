const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'v2-research-tools.html');
    await page.goto(`file://${appPath}`);
    await page.waitForTimeout(1000);

    console.log('\n' + '='.repeat(60));
    console.log('CANVAS HEATMAP RENDERER TESTS');
    console.log('='.repeat(60));

    // Run all tests inside the page context where createHeatmap is defined
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
        test('createHeatmap function exists', () => {
            if (typeof createHeatmap !== 'function') throw new Error('Not a function');
        });

        // Test 2: Canvas dimensions match matrix
        test('Canvas dimensions match matrix (20x15)', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(15).fill(null).map(() => Array(20).fill(0.5));
            createHeatmap(canvas, matrix);
            if (canvas.width !== 20 || canvas.height !== 15) {
                throw new Error(`Expected 20x15, got ${canvas.width}x${canvas.height}`);
            }
        });

        // Test 3: All zeros render as uniform min color
        test('All zeros render as uniform color', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(10).fill(null).map(() => Array(10).fill(0));
            createHeatmap(canvas, matrix);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 10, 10);
            const first = [imageData.data[0], imageData.data[1], imageData.data[2]];
            for (let i = 4; i < imageData.data.length; i += 4) {
                if (imageData.data[i] !== first[0] || imageData.data[i+1] !== first[1] || imageData.data[i+2] !== first[2]) {
                    throw new Error('Pixels not uniform');
                }
            }
        });

        // Test 4: All ones render as uniform max color
        test('All ones render as uniform color', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(10).fill(null).map(() => Array(10).fill(1));
            createHeatmap(canvas, matrix);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 10, 10);
            const first = [imageData.data[0], imageData.data[1], imageData.data[2]];
            for (let i = 4; i < imageData.data.length; i += 4) {
                if (imageData.data[i] !== first[0] || imageData.data[i+1] !== first[1] || imageData.data[i+2] !== first[2]) {
                    throw new Error('Pixels not uniform');
                }
            }
        });

        // Test 5: Gradient shows visible variation between min and max rows
        test('Mixed values show visible gradient', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(10).fill(null).map((_, i) => Array(10).fill(i / 9));
            createHeatmap(canvas, matrix);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 10, 10);
            const firstRow = [imageData.data[0], imageData.data[1], imageData.data[2]];
            const lastRow = [imageData.data[9 * 10 * 4], imageData.data[9 * 10 * 4 + 1], imageData.data[9 * 10 * 4 + 2]];
            const diff = Math.abs(firstRow[0] - lastRow[0]) + Math.abs(firstRow[1] - lastRow[1]) + Math.abs(firstRow[2] - lastRow[2]);
            if (diff < 50) throw new Error(`Gradient not visible: diff=${diff}`);
        });

        // Test 6: Default gradient goes black → cyan → white
        test('Default gradient: min=black, mid=cyan, max=white', () => {
            const canvas = document.createElement('canvas');
            // 3 values: 0, 0.5, 1
            const matrix = [[0, 0.5, 1]];
            createHeatmap(canvas, matrix);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 3, 1);

            // Pixel 0: min (black)
            const p0 = [imageData.data[0], imageData.data[1], imageData.data[2]];
            // Pixel 1: mid (cyan)
            const p1 = [imageData.data[4], imageData.data[5], imageData.data[6]];
            // Pixel 2: max (white)
            const p2 = [imageData.data[8], imageData.data[9], imageData.data[10]];

            // Black check
            if (p0[0] > 5 || p0[1] > 5 || p0[2] > 5) throw new Error(`Min not black: [${p0}]`);
            // Cyan check
            if (p1[0] > 10 || p1[1] < 240 || p1[2] < 240) throw new Error(`Mid not cyan: [${p1}]`);
            // White check
            if (p2[0] < 240 || p2[1] < 240 || p2[2] < 240) throw new Error(`Max not white: [${p2}]`);
        });

        // Test 7: Custom color config
        test('Custom color config is respected', () => {
            const canvas = document.createElement('canvas');
            const matrix = [[0]];
            createHeatmap(canvas, matrix, {
                colorMin: [255, 0, 0],
                colorMid: [0, 255, 0],
                colorMax: [0, 0, 255]
            });
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 1, 1);
            const p = [imageData.data[0], imageData.data[1], imageData.data[2]];
            // Single value → all same color, range=0, so normalized=0 → min color = red
            if (p[0] < 240 || p[1] > 10 || p[2] > 10) throw new Error(`Expected red, got [${p}]`);
        });

        // Test 8: Pixelated rendering style set
        test('Canvas has pixelated image rendering', () => {
            const canvas = document.createElement('canvas');
            createHeatmap(canvas, [[0, 1], [1, 0]]);
            if (!canvas.style.imageRendering.includes('pixelated')) {
                throw new Error(`Image rendering not pixelated: ${canvas.style.imageRendering}`);
            }
        });

        // Test 9: Alpha channel is always 255
        test('All pixels have full opacity', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(5).fill(null).map((_, i) => Array(5).fill(i * 0.25));
            createHeatmap(canvas, matrix);
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, 5, 5);
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] !== 255) throw new Error(`Alpha not 255 at index ${i}: ${imageData.data[i]}`);
            }
        });

        // Test 10: 128x128 matrix (light cones size)
        test('Handles 128x128 matrix efficiently', () => {
            const canvas = document.createElement('canvas');
            const matrix = Array(128).fill(null).map((_, y) =>
                Array(128).fill(null).map((_, x) => Math.abs(x - 64) <= y ? 1 : 0)
            );
            const start = performance.now();
            createHeatmap(canvas, matrix);
            const elapsed = performance.now() - start;
            if (canvas.width !== 128 || canvas.height !== 128) throw new Error('Wrong dimensions');
            if (elapsed > 100) throw new Error(`Too slow: ${elapsed.toFixed(1)}ms`);
        });

        return results;
    });

    // Print results
    let allPassed = true;
    testResults.forEach(r => {
        const symbol = r.pass ? '✓' : '✗';
        console.log(`${symbol} ${r.name}${r.error ? ': ' + r.error : ''}`);
        if (!r.pass) allPassed = false;
    });

    const passCount = testResults.filter(r => r.pass).length;
    console.log(`\nResults: ${passCount}/${testResults.length} passed`);

    // Visual test: render a light cone heatmap and screenshot it
    await page.evaluate(() => {
        // Add a test canvas to the Light Cones panel
        const lightPanel = document.getElementById('panel-lightcone');
        if (!lightPanel) return;

        // Create a test canvas
        const testDiv = document.createElement('div');
        testDiv.id = 'heatmap-test-div';
        testDiv.style.padding = '20px';

        const canvas = document.createElement('canvas');
        canvas.id = 'heatmap-test-canvas';
        canvas.style.width = '400px';
        canvas.style.height = '400px';

        // Generate a light cone test pattern
        const matrix = Array(128).fill(null).map((_, y) =>
            Array(128).fill(null).map((_, x) => Math.abs(x - 64) <= y ? 1 : 0)
        );
        createHeatmap(canvas, matrix);

        testDiv.appendChild(canvas);
        lightPanel.querySelector('.placeholder').appendChild(testDiv);
    });

    // Switch to Light Cones tab for screenshot
    await page.click('text=Light Cones');
    await page.waitForTimeout(500);

    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'heatmap-test.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: heatmap-test.png');

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
