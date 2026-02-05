/**
 * Test Suite: Phase Transition Explorer - Critical Density Points (Task 23)
 *
 * Tests that vertical dashed lines mark where metric derivatives are steepest,
 * colored to match metrics, with density labels, updating on toggle.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '../src/v2-research-tools.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../scratchpad');

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

    // Wait for initial sweep to complete (Rule 30 is default)
    await page.waitForSelector('#phase-chart-container svg', { timeout: 30000 });
    await page.waitForTimeout(1500);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Phase Explorer Critical Density Points Tests ===\n');

    // Test 1: Critical lines group exists in SVG
    try {
        const groupExists = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            return !!svg.querySelector('.critical-lines');
        });
        if (groupExists) {
            console.log('✓ Test 1: Critical lines group exists in SVG');
            testsPassed++;
        } else {
            console.log('✗ Test 1: Critical lines group not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: Critical lines are dashed
    try {
        const isDashed = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return false;
            return Array.from(lines).every(l => {
                const dasharray = l.getAttribute('stroke-dasharray');
                return dasharray && dasharray.length > 0;
            });
        });
        if (isDashed) {
            console.log('✓ Test 2: Critical lines are dashed (stroke-dasharray set)');
            testsPassed++;
        } else {
            console.log('✗ Test 2: Critical lines are not dashed');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: Critical lines are vertical (x1 === x2)
    try {
        const isVertical = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return false;
            return Array.from(lines).every(l => {
                return l.getAttribute('x1') === l.getAttribute('x2');
            });
        });
        if (isVertical) {
            console.log('✓ Test 3: Critical lines are vertical (x1 === x2)');
            testsPassed++;
        } else {
            console.log('✗ Test 3: Critical lines are not vertical');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: Critical line colors match metric colors
    try {
        const colorsMatch = await page.evaluate(() => {
            const metricColors = ['#ff6666', '#6666ff', '#ffcc00', '#cc66ff', '#00ff88', '#ff9966'];
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return false;
            return Array.from(lines).every(l => {
                const stroke = l.getAttribute('stroke');
                return metricColors.includes(stroke);
            });
        });
        if (colorsMatch) {
            console.log('✓ Test 4: Critical line colors match metric colors');
            testsPassed++;
        } else {
            console.log('✗ Test 4: Critical line colors do not match');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: Each critical line has a density label
    try {
        const hasLabels = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const labels = svg.querySelectorAll('.critical-lines text');
            if (labels.length === 0) return false;
            // Labels should contain percentage values like '34%'
            return Array.from(labels).every(t => {
                return t.textContent.includes('%');
            });
        });
        if (hasLabels) {
            console.log('✓ Test 5: Critical lines have density percentage labels');
            testsPassed++;
        } else {
            console.log('✗ Test 5: Critical lines missing density labels');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: Number of critical lines matches number of visible metrics (for Rule 30 - chaotic, should have lines)
    try {
        const counts = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            const paths = svg.querySelectorAll('path[data-series]');
            return { lines: lines.length, paths: paths.length };
        });
        // Each visible metric should have at most one critical line
        // For chaotic Rule 30, most metrics should show a critical point
        if (counts.lines > 0 && counts.lines <= counts.paths) {
            console.log(`✓ Test 6: Critical line count (${counts.lines}) is reasonable for ${counts.paths} visible metrics`);
            testsPassed++;
        } else {
            console.log(`✗ Test 6: Unexpected critical line count: ${counts.lines} for ${counts.paths} metrics`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: Critical lines update when metric is toggled off
    try {
        const initialCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            return svg.querySelectorAll('.critical-lines line').length;
        });

        // Uncheck first two checkboxes (Entropy and Density)
        const checkboxes = await page.$$('#phase-metric-checkboxes input[type="checkbox"]');
        await checkboxes[0].click();
        await checkboxes[1].click();
        await page.waitForTimeout(300);

        const newCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            return svg.querySelectorAll('.critical-lines line').length;
        });

        if (newCount < initialCount) {
            console.log(`✓ Test 7: Critical lines update on toggle (${initialCount} → ${newCount})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 7: Critical lines did not update (${initialCount} → ${newCount})`);
            testsFailed++;
        }

        // Re-check for cleanup
        await checkboxes[0].click();
        await checkboxes[1].click();
        await page.waitForTimeout(300);
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: Class I rule (e.g., Rule 0) shows no critical lines (no sharp transitions)
    try {
        // Change to Rule 0
        await page.fill('#phaseRuleInput', '0');
        await page.evaluate(() => {
            document.getElementById('phaseRuleInput').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(4000); // Wait for sweep

        const rule0Lines = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return -1;
            return svg.querySelectorAll('.critical-lines line').length;
        });
        if (rule0Lines === 0) {
            console.log('✓ Test 8: Rule 0 (Class I) shows no critical lines');
            testsPassed++;
        } else {
            console.log(`✗ Test 8: Rule 0 should show 0 critical lines, found ${rule0Lines}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 8: Error -', e.message);
        testsFailed++;
    }

    // Test 9: Changing rule updates critical lines (switch to Rule 110 which should have transitions)
    try {
        await page.fill('#phaseRuleInput', '110');
        await page.evaluate(() => {
            document.getElementById('phaseRuleInput').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(4000); // Wait for sweep

        const rule110Lines = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            if (!svg) return 0;
            return svg.querySelectorAll('.critical-lines line').length;
        });
        if (rule110Lines > 0) {
            console.log(`✓ Test 9: Rule 110 shows critical lines (${rule110Lines} found)`);
            testsPassed++;
        } else {
            console.log('✗ Test 9: Rule 110 should show critical lines, found 0');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 9: Error -', e.message);
        testsFailed++;
    }

    // Test 10: Critical density values are within valid range (0% to 100%)
    try {
        const validRange = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const labels = svg.querySelectorAll('.critical-lines text');
            return Array.from(labels).every(t => {
                const pctMatch = t.textContent.match(/(\d+)%/);
                if (!pctMatch) return false;
                const pct = parseInt(pctMatch[1]);
                return pct >= 0 && pct <= 100;
            });
        });
        if (validRange) {
            console.log('✓ Test 10: All critical density values in valid range (0-100%)');
            testsPassed++;
        } else {
            console.log('✗ Test 10: Some critical density values out of range');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 10: Error -', e.message);
        testsFailed++;
    }

    // Screenshot
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'phase-critical-points.png'),
        fullPage: true
    });
    console.log(`\nScreenshot saved to: ${path.join(SCREENSHOT_DIR, 'phase-critical-points.png')}`);

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
