const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'v2-research-tools.html');
    await page.goto(`file://${appPath}`);
    await page.waitForTimeout(1500);

    console.log('\n' + '='.repeat(60));
    console.log('TOOLTIP SYSTEM TESTS');
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

        // Test 1: addSvgTooltip function exists
        test('addSvgTooltip function exists', () => {
            if (typeof addSvgTooltip !== 'function') throw new Error('Not a function');
        });

        // Test 2: Scatter plot tooltip group exists
        test('Scatter plot has tooltip group', () => {
            const container = document.createElement('div');
            const data = [
                { x: 0, y: 0, label: 'Point A', color: '#ff0088' },
                { x: 1, y: 1, label: 'Point B', color: '#00ff88' }
            ];
            createScatterPlot(container, data);
            const svg = container.querySelector('svg');
            const tooltip = svg.querySelector('.chart-tooltip');
            if (!tooltip) throw new Error('No tooltip group found');
        });

        // Test 3: Scatter plot circles have cursor pointer
        test('Scatter plot circles are interactive (cursor: pointer)', () => {
            const container = document.createElement('div');
            const data = [{ x: 0, y: 0, label: 'Test', color: '#ff0088' }];
            createScatterPlot(container, data);
            const circle = container.querySelector('circle[data-label]');
            if (!circle) throw new Error('No circle found');
            if (circle.style.cursor !== 'pointer') throw new Error('Cursor not pointer');
        });

        // Test 4: Scatter plot stores data attributes
        test('Scatter plot circles store data-label, data-x, data-y', () => {
            const container = document.createElement('div');
            const data = [{ x: 3.14, y: 2.72, label: 'Pi/e', color: '#ff0088' }];
            createScatterPlot(container, data);
            const circle = container.querySelector('circle[data-label="Pi/e"]');
            if (!circle) throw new Error('Circle not found');
            if (circle.getAttribute('data-x') !== '3.14') throw new Error('Wrong x');
            if (circle.getAttribute('data-y') !== '2.72') throw new Error('Wrong y');
        });

        // Test 5: Line chart tooltip group exists
        test('Line chart has tooltip group', () => {
            const container = document.createElement('div');
            const series = [
                { name: 'Series A', color: '#ff0088', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }
            ];
            createLineChart(container, series);
            const svg = container.querySelector('svg');
            const tooltip = svg.querySelector('.chart-tooltip');
            if (!tooltip) throw new Error('No tooltip group found');
        });

        // Test 6: Line chart has invisible hover circles
        test('Line chart has hover circles for each data point', () => {
            const container = document.createElement('div');
            const series = [
                { name: 'S1', color: '#ff0088', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
                { name: 'S2', color: '#00ff88', points: [{ x: 0, y: 1 }, { x: 1, y: 0 }] }
            ];
            createLineChart(container, series);
            const hoverCircles = container.querySelectorAll('.line-hover-points circle');
            if (hoverCircles.length !== 4) throw new Error(`Expected 4 hover circles, got ${hoverCircles.length}`);
        });

        // Test 7: Hover circles are transparent initially
        test('Hover circles are transparent by default', () => {
            const container = document.createElement('div');
            const series = [{ name: 'S1', color: '#ff0088', points: [{ x: 0, y: 0 }] }];
            createLineChart(container, series);
            const circle = container.querySelector('.line-hover-points circle');
            if (circle.getAttribute('fill') !== 'transparent') throw new Error('Not transparent');
        });

        // Test 8: Hover circles store data attributes
        test('Line chart hover circles store data attributes', () => {
            const container = document.createElement('div');
            const series = [
                { name: 'Entropy', color: '#ff0088', points: [{ x: 0.5, y: 0.75 }] }
            ];
            createLineChart(container, series);
            const circle = container.querySelector('.line-hover-points circle');
            if (circle.getAttribute('data-series-name') !== 'Entropy') throw new Error('Wrong series name');
            if (circle.getAttribute('data-x') !== '0.5') throw new Error('Wrong x');
            if (circle.getAttribute('data-y') !== '0.75') throw new Error('Wrong y');
            if (circle.getAttribute('data-color') !== '#ff0088') throw new Error('Wrong color');
        });

        // Test 9: Tooltip is hidden by default
        test('Tooltip is hidden by default', () => {
            const container = document.createElement('div');
            const data = [{ x: 0, y: 0, label: 'Test', color: '#ff0088' }];
            createScatterPlot(container, data);
            const tooltip = container.querySelector('.chart-tooltip');
            if (tooltip.style.display !== 'none') throw new Error('Tooltip not hidden');
        });

        // Test 10: Tooltip has dark background and green border
        test('Tooltip has themed styling (dark bg, green border)', () => {
            const container = document.createElement('div');
            const data = [{ x: 0, y: 0, label: 'Test', color: '#ff0088' }];
            createScatterPlot(container, data);
            const tooltipBg = container.querySelector('.chart-tooltip rect');
            if (!tooltipBg) throw new Error('No tooltip background rect');
            if (tooltipBg.getAttribute('fill') !== '#222') throw new Error('Wrong bg fill');
            if (tooltipBg.getAttribute('stroke') !== '#00ff88') throw new Error('Wrong border color');
        });

        // Test 11: Tooltip text uses monospace font
        test('Tooltip text uses monospace font', () => {
            const container = document.createElement('div');
            const data = [{ x: 0, y: 0, label: 'Test', color: '#ff0088' }];
            createScatterPlot(container, data);
            const tooltipText = container.querySelector('.chart-tooltip text');
            if (tooltipText.getAttribute('font-family') !== 'monospace') throw new Error('Wrong font');
        });

        // Test 12: Tooltip show/hide API works
        test('Tooltip show/hide API works correctly', () => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', 600);
            svg.setAttribute('height', 400);
            document.body.appendChild(svg);

            const tooltip = addSvgTooltip(svg, 600, 400);

            // Show
            tooltip.show(100, 100, ['Line 1', 'Line 2']);
            const group = svg.querySelector('.chart-tooltip');
            if (group.style.display === 'none') throw new Error('Tooltip not shown');

            // Check tspans
            const tspans = group.querySelectorAll('tspan');
            if (tspans.length !== 2) throw new Error(`Expected 2 tspans, got ${tspans.length}`);
            if (tspans[0].textContent !== 'Line 1') throw new Error('Wrong text line 1');
            if (tspans[1].textContent !== 'Line 2') throw new Error('Wrong text line 2');

            // Hide
            tooltip.hide();
            if (group.style.display !== 'none') throw new Error('Tooltip not hidden');

            document.body.removeChild(svg);
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

    // Visual test: Simulate hover interaction on scatter plot
    // Switch to Rule Map tab (has scatter plot demo)
    await page.click('text=Rule Map');
    await page.waitForTimeout(500);

    // Check if scatter plot exists and try to hover
    const hasScatter = await page.evaluate(() => {
        const mapPanel = document.getElementById('panel-map');
        return mapPanel && mapPanel.querySelector('svg circle') !== null;
    });

    if (hasScatter) {
        const circle = await page.locator('#panel-map svg circle').first();
        await circle.hover();
        await page.waitForTimeout(300);

        const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
        await page.screenshot({ path: path.join(scratchpadDir, 'tooltip-scatter-hover.png'), fullPage: true });
        console.log('\n✓ Scatter hover screenshot saved');
    }

    // Switch to Phase Explorer for line chart tooltip test
    await page.click('text=Phase Explorer');
    await page.waitForTimeout(500);

    const hasLine = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        return phasePanel && phasePanel.querySelector('.line-hover-points circle') !== null;
    });

    if (hasLine) {
        const hoverCircle = await page.locator('#panel-phase .line-hover-points circle').first();
        await hoverCircle.hover();
        await page.waitForTimeout(300);

        const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
        await page.screenshot({ path: path.join(scratchpadDir, 'tooltip-line-hover.png'), fullPage: true });
        console.log('✓ Line chart hover screenshot saved');
    }

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
