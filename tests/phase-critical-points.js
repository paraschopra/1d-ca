/**
 * Test Suite: Phase Transition Explorer - Critical Density Points (Task 23)
 *
 * Tests that vertical dashed lines mark where metric derivatives are steepest,
 * colored to match metrics, with density labels, updating on toggle.
 *
 * Note: Density sweeps use random ICs, so critical line counts can vary.
 * Tests are designed to verify structure/properties rather than exact counts.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '../index.html');
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

    // Switch to Rule 110 which often shows critical density points
    await page.fill('#phaseRuleInput', '110');
    await page.evaluate(() => document.getElementById('phaseRuleInput').dispatchEvent(new Event('change')));
    await page.waitForSelector('#phase-chart-container svg', { timeout: 60000 });
    await page.waitForTimeout(2000);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Phase Explorer Critical Density Points Tests ===\n');

    // Test 1: Critical lines group exists in SVG (always present, even if empty)
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

    // Test 2: If critical lines exist, they are dashed
    try {
        const result = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return { count: 0, allDashed: true }; // vacuously true
            const allDashed = Array.from(lines).every(l => {
                const dasharray = l.getAttribute('stroke-dasharray');
                return dasharray && dasharray.length > 0;
            });
            return { count: lines.length, allDashed };
        });
        if (result.allDashed) {
            console.log(`✓ Test 2: Critical lines are dashed (${result.count} lines)`);
            testsPassed++;
        } else {
            console.log('✗ Test 2: Critical lines are not dashed');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: If critical lines exist, they are vertical (x1 === x2)
    try {
        const result = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return { count: 0, allVertical: true };
            const allVertical = Array.from(lines).every(l => l.getAttribute('x1') === l.getAttribute('x2'));
            return { count: lines.length, allVertical };
        });
        if (result.allVertical) {
            console.log(`✓ Test 3: Critical lines are vertical (${result.count} lines)`);
            testsPassed++;
        } else {
            console.log('✗ Test 3: Critical lines are not vertical');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: If critical lines exist, colors match metric colors
    try {
        const result = await page.evaluate(() => {
            const metricColors = ['#ff6666', '#6666ff', '#ffcc00', '#cc66ff', '#00ff88', '#ff9966'];
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            if (lines.length === 0) return { count: 0, allMatch: true };
            const allMatch = Array.from(lines).every(l => metricColors.includes(l.getAttribute('stroke')));
            return { count: lines.length, allMatch };
        });
        if (result.allMatch) {
            console.log(`✓ Test 4: Critical line colors match metric colors (${result.count} lines)`);
            testsPassed++;
        } else {
            console.log('✗ Test 4: Critical line colors do not match');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: If critical lines exist, each has a density percentage label
    try {
        const result = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const labels = svg.querySelectorAll('.critical-lines text');
            if (labels.length === 0) return { count: 0, allHavePct: true };
            const allHavePct = Array.from(labels).every(t => t.textContent.includes('%'));
            return { count: labels.length, allHavePct };
        });
        if (result.allHavePct) {
            console.log(`✓ Test 5: Critical lines have density labels (${result.count} labels)`);
            testsPassed++;
        } else {
            console.log('✗ Test 5: Critical lines missing density labels');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: Critical line count ≤ number of visible metrics
    try {
        const counts = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const lines = svg.querySelectorAll('.critical-lines line');
            const paths = svg.querySelectorAll('path[data-series]');
            return { lines: lines.length, paths: paths.length };
        });
        if (counts.lines <= counts.paths) {
            console.log(`✓ Test 6: Critical line count (${counts.lines}) ≤ metric count (${counts.paths})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 6: Too many critical lines: ${counts.lines} for ${counts.paths} metrics`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: Toggling all metrics off removes all critical lines
    try {
        const checkboxes = await page.$$('#phase-metric-checkboxes input[type="checkbox"]');
        for (const cb of checkboxes) await cb.click();
        await page.waitForTimeout(300);

        const zeroCount = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            return svg.querySelectorAll('.critical-lines line').length;
        });

        // Re-check all
        for (const cb of checkboxes) await cb.click();
        await page.waitForTimeout(300);

        if (zeroCount === 0) {
            console.log('✓ Test 7: All metrics unchecked → 0 critical lines');
            testsPassed++;
        } else {
            console.log(`✗ Test 7: Expected 0 lines with all unchecked, got ${zeroCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: Class I rule (Rule 0) shows no critical lines
    try {
        await page.fill('#phaseRuleInput', '0');
        await page.evaluate(() => {
            document.getElementById('phaseRuleInput').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(1000);
        await page.waitForFunction(() => {
            const container = document.getElementById('phase-progress-container');
            return container && container.style.display === 'none';
        }, { timeout: 15000 });
        await page.waitForTimeout(500);

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

    // Test 9: findCriticalDensity algorithm works correctly on synthetic data
    try {
        const result = await page.evaluate(() => {
            // Synthetic sweep: entropy jumps sharply at density=0.5
            const syntheticResults = [];
            for (let i = 0; i <= 50; i++) {
                const d = i / 50;
                syntheticResults.push({
                    density: d,
                    entropy: d < 0.5 ? 0.1 : 0.9 // step function at 0.5
                });
            }
            const critical = findCriticalDensity(syntheticResults, 'entropy');
            if (!critical) return { found: false };
            return { found: true, density: critical.density };
        });
        if (result.found && Math.abs(result.density - 0.5) < 0.05) {
            console.log(`✓ Test 9: Algorithm finds critical point at density ${result.density} (expected ~0.5)`);
            testsPassed++;
        } else {
            console.log(`✗ Test 9: Algorithm failed on synthetic data: ${JSON.stringify(result)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 9: Error -', e.message);
        testsFailed++;
    }

    // Test 10: Critical density values are within valid range (0% to 100%)
    try {
        // Switch to Rule 110 for this test
        await page.fill('#phaseRuleInput', '110');
        await page.evaluate(() => {
            document.getElementById('phaseRuleInput').dispatchEvent(new Event('change'));
        });
        await page.waitForTimeout(1000);
        await page.waitForFunction(() => {
            const container = document.getElementById('phase-progress-container');
            return container && container.style.display === 'none';
        }, { timeout: 15000 });
        await page.waitForTimeout(500);

        const validRange = await page.evaluate(() => {
            const svg = document.querySelector('#phase-chart-container svg');
            const labels = svg.querySelectorAll('.critical-lines text');
            if (labels.length === 0) return true; // vacuously true
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
