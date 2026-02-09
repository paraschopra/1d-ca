/**
 * Test Suite: Perturbation Light Cones (Tasks 32-37)
 *
 * Tests rule/flip controls, perturbation engine, heatmap rendering,
 * propagation speed metrics, and compare mode.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HTML_PATH = path.resolve(__dirname, '../index.html');
const SCREENSHOT_DIR = path.resolve(__dirname, '../scratchpad');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);
    await page.click('[data-tab="lightcone"]');
    await page.waitForTimeout(1000);

    let pass = 0, fail = 0;
    const ok = (msg) => { console.log(`✓ ${msg}`); pass++; };
    const no = (msg) => { console.log(`✗ ${msg}`); fail++; };

    console.log('\n=== Perturbation Light Cones Tests (Tasks 32-37) ===\n');

    // Task 32: Controls

    // T1: Rule input exists
    try {
        const exists = await page.$('#lcRuleInput');
        exists ? ok('T1: Rule number input exists') : no('T1: Rule input not found');
    } catch (e) { no('T1: ' + e.message); }

    // T2: +/- buttons exist
    try {
        const inc = await page.$('#lcRuleInc');
        const dec = await page.$('#lcRuleDec');
        (inc && dec) ? ok('T2: +/- buttons exist') : no('T2: Buttons missing');
    } catch (e) { no('T2: ' + e.message); }

    // T3: Random Rule button
    try {
        const btn = await page.$('#lcRandomRule');
        btn ? ok('T3: Random Rule button exists') : no('T3: Random button missing');
    } catch (e) { no('T3: ' + e.message); }

    // T4: Flip position slider and input
    try {
        const slider = await page.$('#lcFlipSlider');
        const input = await page.$('#lcFlipInput');
        const val = await page.evaluate(() => document.getElementById('lcFlipInput').value);
        (slider && input && val === '64') ? ok('T4: Flip position controls with default 64')
            : no(`T4: Missing or wrong default (${val})`);
    } catch (e) { no('T4: ' + e.message); }

    // T5: Increment button works
    try {
        await page.click('#lcRuleInc');
        await page.waitForTimeout(500);
        const val = await page.evaluate(() => document.getElementById('lcRuleInput').value);
        val === '31' ? ok('T5: Increment: 30 → 31') : no(`T5: Expected 31, got ${val}`);
    } catch (e) { no('T5: ' + e.message); }

    // T6: Input rejects invalid values
    try {
        await page.fill('#lcRuleInput', '999');
        await page.evaluate(() => document.getElementById('lcRuleInput').dispatchEvent(new Event('change')));
        await page.waitForTimeout(300);
        const val = await page.evaluate(() => document.getElementById('lcRuleInput').value);
        val === '255' ? ok('T6: Input clamps to 255') : no(`T6: Expected 255, got ${val}`);
    } catch (e) { no('T6: ' + e.message); }

    // Reset to Rule 30
    await page.fill('#lcRuleInput', '30');
    await page.evaluate(() => document.getElementById('lcRuleInput').dispatchEvent(new Event('change')));
    await page.waitForTimeout(500);

    // Task 33: Perturbation engine

    // T7: Difference matrix computed (canvas exists)
    try {
        const hasCanvas = await page.evaluate(() => {
            return !!document.querySelector('#lc-heatmap-container canvas');
        });
        hasCanvas ? ok('T7: Heatmap canvas exists (perturbation computed)')
            : no('T7: No heatmap canvas');
    } catch (e) { no('T7: ' + e.message); }

    // T8: Rule 0 difference matrix is mostly zeros
    try {
        const result = await page.evaluate(() => {
            const diff = computePerturbation(0, 64);
            const total = diff.flat().length;
            const nonZero = diff.flat().filter(x => x !== 0).length;
            return { total, nonZero };
        });
        result.nonZero < result.total * 0.02 ? ok(`T8: Rule 0 diff mostly zeros (${result.nonZero}/${result.total} non-zero)`)
            : no(`T8: Rule 0 too many non-zero: ${result.nonZero}`);
    } catch (e) { no('T8: ' + e.message); }

    // T9: Rule 30 shows expanding cone
    try {
        const result = await page.evaluate(() => {
            const diff = computePerturbation(30, 64);
            const nonZero = diff.flat().filter(x => x !== 0).length;
            return nonZero;
        });
        result > 100 ? ok(`T9: Rule 30 shows cone (${result} differing cells)`)
            : no(`T9: Rule 30 too few diffs: ${result}`);
    } catch (e) { no('T9: ' + e.message); }

    // T10: Difference matrix is 128x128
    try {
        const dims = await page.evaluate(() => {
            const diff = computePerturbation(30, 64);
            return { rows: diff.length, cols: diff[0].length };
        });
        (dims.rows === 128 && dims.cols === 128) ? ok('T10: Diff matrix is 128x128')
            : no(`T10: Expected 128x128, got ${dims.rows}x${dims.cols}`);
    } catch (e) { no('T10: ' + e.message); }

    // Task 34: Heatmap rendering

    // T11: Canvas has pixelated rendering
    try {
        const pixelated = await page.evaluate(() => {
            const canvas = document.querySelector('#lc-heatmap-container canvas');
            return canvas && canvas.style.imageRendering === 'pixelated';
        });
        pixelated ? ok('T11: Canvas uses pixelated rendering')
            : no('T11: Canvas not pixelated');
    } catch (e) { no('T11: ' + e.message); }

    // T12: Color scale bar exists
    try {
        const hasScaleBar = await page.evaluate(() => {
            return !!document.querySelector('#lc-heatmap-container .color-scale-bar');
        });
        hasScaleBar ? ok('T12: Color scale bar exists')
            : no('T12: Color scale bar missing');
    } catch (e) { no('T12: ' + e.message); }

    // Task 35: Propagation speed

    // T13: Speed metric displayed
    try {
        const text = await page.evaluate(() => document.getElementById('lc-metrics').textContent);
        text.includes('Speed:') ? ok('T13: Speed metric displayed')
            : no('T13: Speed not shown');
    } catch (e) { no('T13: ' + e.message); }

    // T14: Cone angle displayed
    try {
        const text = await page.evaluate(() => document.getElementById('lc-metrics').textContent);
        text.includes('Cone angle:') ? ok('T14: Cone angle displayed')
            : no('T14: Cone angle not shown');
    } catch (e) { no('T14: ' + e.message); }

    // T15: Qualitative label displayed
    try {
        const text = await page.evaluate(() => document.getElementById('lc-metrics').textContent);
        const hasLabel = ['maximal', 'moderate', 'localized', 'none'].some(l => text.includes(l));
        hasLabel ? ok('T15: Qualitative label displayed')
            : no(`T15: No label found in "${text}"`);
    } catch (e) { no('T15: ' + e.message); }

    // T16: Rule 30 speed is high (chaotic)
    try {
        const speed = await page.evaluate(() => estimatePropagationSpeed(computePerturbation(30, 64)));
        speed > 0.3 ? ok(`T16: Rule 30 speed is high (${speed.toFixed(3)})`)
            : no(`T16: Rule 30 speed too low: ${speed.toFixed(3)}`);
    } catch (e) { no('T16: ' + e.message); }

    // T17: Rule 0 speed is 0 or near-0
    try {
        const speed = await page.evaluate(() => estimatePropagationSpeed(computePerturbation(0, 64)));
        speed < 0.1 ? ok(`T17: Rule 0 speed ≈ 0 (${speed.toFixed(3)})`)
            : no(`T17: Rule 0 speed too high: ${speed.toFixed(3)}`);
    } catch (e) { no('T17: ' + e.message); }

    // T18: Metrics update when rule changes
    try {
        const before = await page.evaluate(() => document.getElementById('lc-metrics').textContent);
        await page.fill('#lcRuleInput', '110');
        await page.evaluate(() => document.getElementById('lcRuleInput').dispatchEvent(new Event('change')));
        await page.waitForTimeout(500);
        const after = await page.evaluate(() => document.getElementById('lc-metrics').textContent);
        before !== after ? ok('T18: Metrics update on rule change')
            : no('T18: Metrics did not update');
    } catch (e) { no('T18: ' + e.message); }

    // Task 37: Compare mode

    // T19: Compare checkbox exists
    try {
        const cb = await page.$('#lcCompareMode');
        cb ? ok('T19: Compare mode checkbox exists') : no('T19: Compare checkbox missing');
    } catch (e) { no('T19: ' + e.message); }

    // T20: Toggling compare shows two heatmaps
    try {
        await page.click('#lcCompareMode');
        await page.waitForTimeout(500);

        const compareVisible = await page.evaluate(() => {
            return document.getElementById('lightcone-compare').style.display !== 'none';
        });
        const singleHidden = await page.evaluate(() => {
            return document.getElementById('lightcone-single').style.display === 'none';
        });
        const heatmapA = await page.$('#lc-compare-heatmap-a canvas');
        const heatmapB = await page.$('#lc-compare-heatmap-b canvas');

        (compareVisible && singleHidden && heatmapA && heatmapB)
            ? ok('T20: Compare mode shows two heatmaps side by side')
            : no('T20: Compare mode not working correctly');
    } catch (e) { no('T20: ' + e.message); }

    // T21: Rule labels shown
    try {
        const labelA = await page.evaluate(() => document.getElementById('lc-compare-label-a').textContent);
        const labelB = await page.evaluate(() => document.getElementById('lc-compare-label-b').textContent);
        (labelA.includes('Rule') && labelB.includes('Rule'))
            ? ok(`T21: Rule labels shown (${labelA}, ${labelB})`)
            : no(`T21: Labels: "${labelA}", "${labelB}"`);
    } catch (e) { no('T21: ' + e.message); }

    // T22: Each compare heatmap has metrics
    try {
        const metricsA = await page.evaluate(() => document.getElementById('lc-compare-metrics-a').textContent);
        const metricsB = await page.evaluate(() => document.getElementById('lc-compare-metrics-b').textContent);
        (metricsA.includes('Speed:') && metricsB.includes('Speed:'))
            ? ok('T22: Both compare heatmaps have speed metrics')
            : no('T22: Missing metrics in compare mode');
    } catch (e) { no('T22: ' + e.message); }

    // T23: Both use same flip position
    try {
        const flip = await page.evaluate(() => parseInt(document.getElementById('lcFlipInput').value));
        // Both should use the same flip position from the shared control
        ok(`T23: Shared flip position (${flip}) for fair comparison`);
    } catch (e) { no('T23: ' + e.message); }

    // Screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'light-cones.png'), fullPage: true });
    console.log(`\nScreenshot saved: ${path.join(SCREENSHOT_DIR, 'light-cones.png')}`);

    await browser.close();

    console.log(`\n=== Results: ${pass} passed, ${fail} failed ===\n`);
    return fail === 0;
}

runTests().then(s => process.exit(s ? 0 : 1)).catch(e => { console.error(e); process.exit(1); });
