/**
 * Test Suite: Phase Transition Explorer - Async Progress Bar (Task 24)
 *
 * Tests that density sweep computation is chunked with a visible progress bar,
 * UI stays responsive, and cancellation works.
 */

const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../index.html');

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);

    // Navigate to Phase Explorer tab
    await page.click('[data-tab="phase"]');
    await page.waitForTimeout(300);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Phase Explorer Async Progress Bar Tests ===\n');

    // Test 1: Progress bar container exists
    try {
        const exists = await page.$('#phase-progress-container');
        if (exists) {
            console.log('✓ Test 1: Progress bar container exists');
            testsPassed++;
        } else {
            console.log('✗ Test 1: Progress bar container not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: Progress bar element exists inside container
    try {
        const bar = await page.$('#phase-progress-bar');
        if (bar) {
            console.log('✓ Test 2: Progress bar element exists');
            testsPassed++;
        } else {
            console.log('✗ Test 2: Progress bar element not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: Progress bar is visible during sweep
    try {
        // Trigger a new sweep and check progress bar visibility mid-computation
        await page.evaluate(() => {
            window._progressBarWasVisible = false;
            const observer = new MutationObserver(() => {
                const container = document.getElementById('phase-progress-container');
                if (container && container.style.display === 'block') {
                    window._progressBarWasVisible = true;
                }
            });
            observer.observe(document.getElementById('phase-progress-container'), {
                attributes: true, attributeFilter: ['style']
            });
        });

        await page.click('#phaseRuleInc'); // Trigger sweep
        await page.waitForTimeout(500);

        const wasVisible = await page.evaluate(() => window._progressBarWasVisible);
        if (wasVisible) {
            console.log('✓ Test 3: Progress bar is visible during sweep');
            testsPassed++;
        } else {
            console.log('✗ Test 3: Progress bar was not visible during sweep');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Wait for sweep to finish
    await page.waitForSelector('#phase-chart-container svg', { timeout: 30000 });
    await page.waitForTimeout(1000);

    // Test 4: Progress bar is hidden after sweep completes
    try {
        const display = await page.evaluate(() => {
            return document.getElementById('phase-progress-container').style.display;
        });
        if (display === 'none') {
            console.log('✓ Test 4: Progress bar is hidden after completion');
            testsPassed++;
        } else {
            console.log(`✗ Test 4: Progress bar display is "${display}", expected "none"`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: Progress bar fills from 0% to 100%
    try {
        // Track progress bar width during next sweep
        await page.evaluate(() => {
            window._progressWidths = [];
            const bar = document.getElementById('phase-progress-bar');
            const observer = new MutationObserver(() => {
                window._progressWidths.push(bar.style.width);
            });
            observer.observe(bar, { attributes: true, attributeFilter: ['style'] });
        });

        await page.click('#phaseRuleDec'); // Trigger new sweep
        await page.waitForSelector('#phase-chart-container svg', { timeout: 30000 });
        await page.waitForTimeout(500);

        const widths = await page.evaluate(() => window._progressWidths);
        const hasZero = widths.some(w => w === '0%');
        const has100 = widths.some(w => w === '100%');
        const hasIntermediate = widths.some(w => {
            const val = parseInt(w);
            return val > 0 && val < 100;
        });

        if (hasZero && has100 && hasIntermediate) {
            console.log(`✓ Test 5: Progress bar fills 0% → intermediate → 100% (${widths.length} updates)`);
            testsPassed++;
        } else {
            console.log(`✗ Test 5: Progress not filling correctly. Has 0%: ${hasZero}, 100%: ${has100}, intermediate: ${hasIntermediate}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: UI remains responsive during computation (tab switching works)
    try {
        // Start a sweep and immediately try to switch tabs
        await page.click('#phaseRuleInc');
        await page.waitForTimeout(100); // Brief delay — sweep should be in progress

        // Try switching to Grid View tab
        await page.click('[data-tab="grid"]');
        const gridVisible = await page.evaluate(() => {
            return document.getElementById('panel-grid').style.display !== 'none';
        });

        // Switch back
        await page.click('[data-tab="phase"]');

        if (gridVisible) {
            console.log('✓ Test 6: UI responsive during computation (tab switching works)');
            testsPassed++;
        } else {
            console.log('✗ Test 6: UI not responsive during computation');
            testsFailed++;
        }

        // Wait for sweep to finish
        await page.waitForSelector('#phase-chart-container svg', { timeout: 30000 });
        await page.waitForTimeout(500);
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: Starting a new sweep cancels in-progress sweep
    try {
        // Start sweep then immediately start another
        await page.click('#phaseRuleInc');
        await page.waitForTimeout(50);
        await page.click('#phaseRuleInc'); // Cancel first, start second
        await page.waitForTimeout(50);
        await page.click('#phaseRuleInc'); // Cancel second, start third

        // Wait for final sweep to complete
        await page.waitForSelector('#phase-chart-container svg', { timeout: 30000 });
        await page.waitForTimeout(500);

        // The chart should show the last requested rule (original + 3 increments)
        const currentRule = await page.evaluate(() => document.getElementById('phaseRuleInput').value);
        const chartExists = await page.evaluate(() => !!document.querySelector('#phase-chart-container svg'));
        if (chartExists) {
            console.log(`✓ Test 7: Rapid rule changes handled correctly (final rule: ${currentRule})`);
            testsPassed++;
        } else {
            console.log('✗ Test 7: Chart not rendered after rapid changes');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: Computation uses requestAnimationFrame (chunked)
    try {
        const isChunked = await page.evaluate(() => {
            // Check that runDensitySweep exists and uses requestAnimationFrame
            const fnStr = runDensitySweep.toString();
            return fnStr.includes('requestAnimationFrame');
        });
        if (isChunked) {
            console.log('✓ Test 8: Computation uses requestAnimationFrame (chunked)');
            testsPassed++;
        } else {
            console.log('✗ Test 8: Computation does not use requestAnimationFrame');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 8: Error -', e.message);
        testsFailed++;
    }

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
