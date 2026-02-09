const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Navigate directly to the v2 app
    const appPath = path.join(__dirname, '..', 'src', 'src/index.html');
    await page.goto(`file://${appPath}`);

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Switch to Phase Explorer tab (which has the line chart demo)
    await page.click('text=Phase Explorer');
    await page.waitForTimeout(500);

    console.log('\n' + '='.repeat(60));
    console.log('LINE CHART LEGEND VERIFICATION');
    console.log('='.repeat(60));

    // Verify legend exists
    const legendExists = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return false;
        const svg = phasePanel.querySelector('svg');
        if (!svg) return false;
        const legend = svg.querySelector('.legend');
        return legend !== null;
    });

    console.log(legendExists ? '✓ Legend group exists' : '✗ Legend group NOT found');

    // Count legend items
    const legendItemCount = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return 0;
        const svg = phasePanel.querySelector('svg');
        if (!svg) return 0;
        return svg.querySelectorAll('.legend-item').length;
    });

    console.log(legendItemCount === 3 ? `✓ Correct number of legend items (3)` : `✗ Wrong number of legend items: ${legendItemCount}`);

    // Verify legend items have line samples
    const lineSamplesExist = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return false;
        const legendItems = phasePanel.querySelectorAll('.legend-item');
        if (legendItems.length === 0) return false;

        for (let item of legendItems) {
            const line = item.querySelector('line');
            if (!line) return false;
        }
        return true;
    });

    console.log(lineSamplesExist ? '✓ Legend items have line samples' : '✗ Legend items missing line samples');

    // Verify legend items have text labels
    const textLabelsExist = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return false;
        const legendItems = phasePanel.querySelectorAll('.legend-item');
        if (legendItems.length === 0) return false;

        for (let item of legendItems) {
            const text = item.querySelector('text');
            if (!text || !text.textContent) return false;
        }
        return true;
    });

    console.log(textLabelsExist ? '✓ Legend items have text labels' : '✗ Legend items missing text labels');

    // Verify legend colors match series colors
    const colorsMatch = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return { match: false, details: 'Panel not found' };

        const svg = phasePanel.querySelector('svg');
        if (!svg) return { match: false, details: 'SVG not found' };

        const legendItems = svg.querySelectorAll('.legend-item');
        const chartPaths = svg.querySelectorAll('path[data-series-name]');

        if (legendItems.length !== chartPaths.length) {
            return { match: false, details: `Count mismatch: ${legendItems.length} legend items vs ${chartPaths.length} paths` };
        }

        for (let i = 0; i < legendItems.length; i++) {
            const legendLine = legendItems[i].querySelector('line');
            const legendColor = legendLine.getAttribute('stroke');
            const pathColor = chartPaths[i].getAttribute('stroke');

            if (legendColor !== pathColor) {
                return { match: false, details: `Color mismatch at index ${i}: legend=${legendColor}, path=${pathColor}` };
            }
        }

        return { match: true, details: 'All colors match' };
    });

    console.log(colorsMatch.match ? '✓ Legend colors match chart path colors' : `✗ Color mismatch: ${colorsMatch.details}`);

    // Verify legend positioning (should be to the right of plot area)
    const legendPositioning = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return { correct: false, details: 'Panel not found' };

        const legend = phasePanel.querySelector('.legend');
        if (!legend) return { correct: false, details: 'Legend not found' };

        const transform = legend.getAttribute('transform');
        const match = transform.match(/translate\((\d+),\s*(\d+)\)/);
        if (!match) return { correct: false, details: 'Transform not found' };

        const legendX = parseInt(match[1]);
        const legendY = parseInt(match[2]);

        // Legend should be positioned to the right (x > 400 for a standard chart)
        return {
            correct: legendX > 400,
            details: `Legend at (${legendX}, ${legendY})`
        };
    });

    console.log(legendPositioning.correct ? `✓ Legend positioned correctly (${legendPositioning.details})` : `✗ Legend positioning issue: ${legendPositioning.details}`);

    // Verify vertical spacing
    const spacingCorrect = await page.evaluate(() => {
        const phasePanel = document.getElementById('panel-phase');
        if (!phasePanel) return { correct: false, details: 'Panel not found' };

        const legendItems = phasePanel.querySelectorAll('.legend-item');
        if (legendItems.length < 2) return { correct: false, details: 'Not enough items to check spacing' };

        const transforms = Array.from(legendItems).map(item => item.getAttribute('transform'));
        const yPositions = transforms.map(t => {
            const match = t.match(/translate\(0,\s*(\d+)\)/);
            return match ? parseInt(match[1]) : null;
        });

        // Check that spacing is consistent (25px)
        for (let i = 1; i < yPositions.length; i++) {
            const spacing = yPositions[i] - yPositions[i - 1];
            if (spacing !== 25) {
                return { correct: false, details: `Spacing at item ${i} is ${spacing}px, expected 25px` };
            }
        }

        return { correct: true, details: `All items spaced at 25px intervals` };
    });

    console.log(spacingCorrect.correct ? `✓ Legend items properly spaced (${spacingCorrect.details})` : `✗ Spacing issue: ${spacingCorrect.details}`);

    // Take a screenshot
    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'line-chart-legend-verification.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: line-chart-legend-verification.png');

    // Also take a screenshot of just the Phase Explorer panel
    const phasePanel = await page.locator('#panel-phase');
    await phasePanel.screenshot({ path: path.join(scratchpadDir, 'phase-explorer-legend.png') });
    console.log('✓ Phase Explorer panel screenshot: phase-explorer-legend.png');

    console.log('='.repeat(60));

    await browser.close();

    // Determine success
    const allPassed = legendExists && legendItemCount === 3 && lineSamplesExist && textLabelsExist && colorsMatch.match && legendPositioning.correct && spacingCorrect.correct;

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
