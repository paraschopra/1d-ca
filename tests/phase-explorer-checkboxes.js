/**
 * Test Suite: Phase Transition Explorer - Metric Series Checkboxes
 *
 * Tests that checkboxes correctly toggle metric series visibility
 * and that Y-axis rescales appropriately.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '../src/index.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../scratchpad');

// Ensure scratchpad exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);

    // Navigate to Phase Explorer tab
    await page.click('[data-tab="phase"]');
    await page.waitForTimeout(500);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Phase Explorer Checkbox Tests ===\n');

    // Test 1: Checkbox container exists
    try {
        const checkboxContainer = await page.$('#phase-metric-checkboxes');
        if (checkboxContainer) {
            console.log('✓ Test 1: Checkbox container exists');
            testsPassed++;
        } else {
            console.log('✗ Test 1: Checkbox container not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: All 6 metric checkboxes present
    try {
        const checkboxes = await page.$$('#phase-metric-checkboxes input[type="checkbox"]');
        if (checkboxes.length === 6) {
            console.log('✓ Test 2: All 6 metric checkboxes present');
            testsPassed++;
        } else {
            console.log(`✗ Test 2: Expected 6 checkboxes, found ${checkboxes.length}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: All checkboxes checked by default
    try {
        const allChecked = await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('#phase-metric-checkboxes input[type="checkbox"]');
            return Array.from(checkboxes).every(cb => cb.checked);
        });
        if (allChecked) {
            console.log('✓ Test 3: All checkboxes checked by default');
            testsPassed++;
        } else {
            console.log('✗ Test 3: Not all checkboxes checked by default');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: Checkbox labels match PHASE_METRICS
    try {
        const labels = await page.evaluate(() => {
            const container = document.getElementById('phase-metric-checkboxes');
            const labelElements = container.querySelectorAll('label');
            return Array.from(labelElements).map(l => l.textContent.trim());
        });
        const expectedLabels = ['Entropy', 'Density', 'Mean Field', 'Symmetry', 'Lyapunov', 'Compressibility'];
        const labelsMatch = expectedLabels.every((label, i) => labels[i] === label);
        if (labelsMatch) {
            console.log('✓ Test 4: Checkbox labels match PHASE_METRICS');
            testsPassed++;
        } else {
            console.log('✗ Test 4: Labels mismatch. Expected:', expectedLabels, 'Got:', labels);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: Label colors match metric colors
    try {
        const labelColors = await page.evaluate(() => {
            const container = document.getElementById('phase-metric-checkboxes');
            const labelElements = container.querySelectorAll('label');
            return Array.from(labelElements).map(l => {
                const color = window.getComputedStyle(l).color;
                // Convert rgb to hex for comparison
                const match = color.match(/rgb\((\d+), (\d+), (\d+)\)/);
                if (match) {
                    const r = parseInt(match[1]).toString(16).padStart(2, '0');
                    const g = parseInt(match[2]).toString(16).padStart(2, '0');
                    const b = parseInt(match[3]).toString(16).padStart(2, '0');
                    return `#${r}${g}${b}`;
                }
                return color;
            });
        });
        const expectedColors = ['#ff6666', '#6666ff', '#ffcc00', '#cc66ff', '#00ff88', '#ff9966'];
        const colorsMatch = expectedColors.every((color, i) => labelColors[i] === color);
        if (colorsMatch) {
            console.log('✓ Test 5: Label colors match metric colors');
            testsPassed++;
        } else {
            console.log('✗ Test 5: Colors mismatch. Expected:', expectedColors, 'Got:', labelColors);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Wait for chart to render (default rule 30)
    await page.waitForTimeout(3000);

    // Test 6: Initially all 6 series visible in chart
    try {
        const pathCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return 0;
            return svg.querySelectorAll('path[data-series]').length;
        });
        if (pathCount === 6) {
            console.log('✓ Test 6: All 6 series initially visible in chart');
            testsPassed++;
        } else {
            console.log(`✗ Test 6: Expected 6 visible series, found ${pathCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: Unchecking a checkbox hides that series
    try {
        // Uncheck first checkbox (Entropy)
        await page.click('#phase-metric-checkboxes input[type="checkbox"]');
        await page.waitForTimeout(300);

        const pathCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return 0;
            return svg.querySelectorAll('path[data-series]').length;
        });
        if (pathCount === 5) {
            console.log('✓ Test 7: Unchecking a checkbox hides that series (5 visible)');
            testsPassed++;
        } else {
            console.log(`✗ Test 7: Expected 5 visible series after unchecking, found ${pathCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: Re-checking a checkbox shows that series again
    try {
        // Re-check first checkbox (Entropy)
        await page.click('#phase-metric-checkboxes input[type="checkbox"]');
        await page.waitForTimeout(300);

        const pathCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return 0;
            return svg.querySelectorAll('path[data-series]').length;
        });
        if (pathCount === 6) {
            console.log('✓ Test 8: Re-checking a checkbox shows that series (6 visible)');
            testsPassed++;
        } else {
            console.log(`✗ Test 8: Expected 6 visible series after re-checking, found ${pathCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 8: Error -', e.message);
        testsFailed++;
    }

    // Test 9: Y-axis rescales when series are toggled
    try {
        // Get initial Y-axis max value (all 6 metrics visible)
        const initialYMax = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const yAxisTicks = svg.querySelectorAll('text[data-axis="y"]');
            const values = Array.from(yAxisTicks).map(t => parseFloat(t.textContent));
            return Math.max(...values);
        });

        // Uncheck all metrics except Density (index 1) to force dramatic rescale
        // Density for Rule 30 has a narrower range (~0 to ~0.5) vs full range (~0 to ~1.1)
        const checkboxes = await page.$$('#phase-metric-checkboxes input[type="checkbox"]');
        await checkboxes[0].click(); // Uncheck Entropy
        await checkboxes[2].click(); // Uncheck Mean Field
        await checkboxes[3].click(); // Uncheck Symmetry
        await checkboxes[4].click(); // Uncheck Lyapunov
        await checkboxes[5].click(); // Uncheck Compressibility
        await page.waitForTimeout(300);

        const newYMax = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const yAxisTicks = svg.querySelectorAll('text[data-axis="y"]');
            const values = Array.from(yAxisTicks).map(t => parseFloat(t.textContent));
            return Math.max(...values);
        });

        // Y-axis should definitely rescale with only Density visible
        if (newYMax !== initialYMax) {
            console.log(`✓ Test 9: Y-axis rescales when series toggled (${initialYMax.toFixed(2)} → ${newYMax.toFixed(2)})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 9: Y-axis did not rescale (${initialYMax.toFixed(2)} → ${newYMax.toFixed(2)})`);
            testsFailed++;
        }

        // Re-check all for cleanup
        await checkboxes[0].click();
        await checkboxes[2].click();
        await checkboxes[3].click();
        await checkboxes[4].click();
        await checkboxes[5].click();
        await page.waitForTimeout(300);
    } catch (e) {
        console.log('✗ Test 9: Error -', e.message);
        testsFailed++;
    }

    // Test 10: Multiple checkboxes can be toggled
    try {
        // Uncheck first 3 checkboxes
        const checkboxes = await page.$$('#phase-metric-checkboxes input[type="checkbox"]');
        await checkboxes[0].click();
        await checkboxes[1].click();
        await checkboxes[2].click();
        await page.waitForTimeout(300);

        const pathCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return 0;
            return svg.querySelectorAll('path[data-series]').length;
        });
        if (pathCount === 3) {
            console.log('✓ Test 10: Multiple checkboxes can be toggled (3 visible)');
            testsPassed++;
        } else {
            console.log(`✗ Test 10: Expected 3 visible series after unchecking 3, found ${pathCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 10: Error -', e.message);
        testsFailed++;
    }

    // Take screenshot for visual verification
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'phase-checkboxes-test.png'),
        fullPage: true
    });
    console.log(`\nScreenshot saved to: ${path.join(SCREENSHOT_DIR, 'phase-checkboxes-test.png')}`);

    await browser.close();

    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${testsPassed}`);
    console.log(`Failed: ${testsFailed}`);
    console.log(`Total: ${testsPassed + testsFailed}\n`);

    return testsFailed === 0;
}

runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
