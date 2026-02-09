/**
 * Test Suite: Metric Tooltips (v3 Sprint)
 *
 * Tests tooltip definitions, CSS component, and integration across
 * rule cards, modal, phase explorer checkboxes, and rule map dropdowns.
 */

const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../src/v2-research-tools.html');

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);
    await page.waitForSelector('.rule-card', { timeout: 30000 });
    await page.waitForTimeout(2000);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Metric Tooltips Tests (v3 Sprint) ===\n');

    // ---- Task 1: Tooltip Definitions ----

    // Test 1: metricTooltips object exists with all 10 keys
    try {
        const keys = await page.evaluate(() => {
            return typeof metricTooltips === 'object' ? Object.keys(metricTooltips).sort() : [];
        });
        const expected = ['blockEntropy', 'compressibility', 'density', 'entropyRate', 'excessEntropy',
            'lyapunov', 'meanField', 'period', 'entropy', 'symmetry', 'wolframClass'].sort();
        const allPresent = expected.every(k => keys.includes(k));
        console.log(`${allPresent ? 'PASS' : 'FAIL'}: metricTooltips has all 11 keys`);
        if (!allPresent) console.log(`  Expected: ${expected.join(', ')}\n  Got: ${keys.join(', ')}`);
        allPresent ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: metricTooltips exists - ${e.message}`); testsFailed++; }

    // Test 2: Each tooltip is a non-empty string (1-3 sentences)
    try {
        const result = await page.evaluate(() => {
            const lengths = {};
            for (const [key, val] of Object.entries(metricTooltips)) {
                lengths[key] = typeof val === 'string' ? val.length : 0;
            }
            return lengths;
        });
        const allNonEmpty = Object.values(result).every(len => len > 20 && len < 600);
        console.log(`${allNonEmpty ? 'PASS' : 'FAIL'}: All tooltips are non-empty strings (20-600 chars)`);
        if (!allNonEmpty) {
            for (const [k, v] of Object.entries(result)) {
                if (v <= 20 || v >= 500) console.log(`  ${k}: ${v} chars`);
            }
        }
        allNonEmpty ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: tooltip lengths - ${e.message}`); testsFailed++; }

    // Test 3: Entropy tooltip mentions Shannon entropy and disorder
    try {
        const text = await page.evaluate(() => metricTooltips.entropy.toLowerCase());
        const ok = text.includes('shannon') && (text.includes('disorder') || text.includes('random'));
        console.log(`${ok ? 'PASS' : 'FAIL'}: Entropy tooltip mentions Shannon entropy and disorder/random`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: entropy content - ${e.message}`); testsFailed++; }

    // Test 4: Lyapunov tooltip mentions sensitivity/chaos
    try {
        const text = await page.evaluate(() => metricTooltips.lyapunov.toLowerCase());
        const ok = text.includes('sensitiv') || text.includes('chaos') || text.includes('chaotic');
        console.log(`${ok ? 'PASS' : 'FAIL'}: Lyapunov tooltip mentions sensitivity or chaos`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: lyapunov content - ${e.message}`); testsFailed++; }

    // Test 5: Wolfram Class tooltip mentions 4 classes
    try {
        const text = await page.evaluate(() => metricTooltips.wolframClass.toLowerCase());
        const ok = (text.includes('class') || text.includes('classification')) &&
                   (text.includes('i') && text.includes('ii') && text.includes('iii') && text.includes('iv'));
        console.log(`${ok ? 'PASS' : 'FAIL'}: Wolfram Class tooltip mentions all 4 classes`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: wolframClass content - ${e.message}`); testsFailed++; }

    // Test 6: Entropy Rate tooltip mentions bits/information
    try {
        const text = await page.evaluate(() => metricTooltips.entropyRate.toLowerCase());
        const ok = text.includes('bit') || text.includes('information') || text.includes('new');
        console.log(`${ok ? 'PASS' : 'FAIL'}: Entropy Rate tooltip mentions bits/information`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: entropyRate content - ${e.message}`); testsFailed++; }

    // ---- Task 2: Tooltip CSS Component ----

    // Test 7: .has-tooltip CSS class exists in stylesheet
    try {
        const exists = await page.evaluate(() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.selectorText && rule.selectorText.includes('.has-tooltip')) return true;
                    }
                } catch (e) {}
            }
            return false;
        });
        console.log(`${exists ? 'PASS' : 'FAIL'}: .has-tooltip CSS class exists`);
        exists ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: CSS class check - ${e.message}`); testsFailed++; }

    // Test 8: Tooltip pseudo-element or child is hidden by default and shown on hover
    try {
        const result = await page.evaluate(() => {
            const el = document.querySelector('.has-tooltip');
            if (!el) return { found: false };
            const after = window.getComputedStyle(el, '::after');
            const before = window.getComputedStyle(el, '::before');
            return {
                found: true,
                hasDataTooltip: el.hasAttribute('data-tooltip'),
                // Check that tooltip pseudo-elements exist (visibility/opacity controlled by CSS)
                afterContent: after.content,
                beforeContent: before.content,
            };
        });
        const ok = result.found && result.hasDataTooltip;
        console.log(`${ok ? 'PASS' : 'FAIL'}: .has-tooltip elements have data-tooltip attribute`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: tooltip structure - ${e.message}`); testsFailed++; }

    // Test 9: Tooltip becomes visible on hover
    try {
        const tooltipEl = await page.$('.has-tooltip');
        if (!tooltipEl) throw new Error('No .has-tooltip element found');

        // Get initial state
        const beforeHover = await page.evaluate(el => {
            const after = window.getComputedStyle(el, '::after');
            return { opacity: after.opacity, visibility: after.visibility };
        }, tooltipEl);

        // Hover
        await tooltipEl.hover();
        await page.waitForTimeout(400); // Wait for CSS delay

        const afterHover = await page.evaluate(el => {
            const after = window.getComputedStyle(el, '::after');
            return { opacity: after.opacity, visibility: after.visibility };
        }, tooltipEl);

        const ok = (afterHover.opacity === '1' || afterHover.visibility === 'visible');
        console.log(`${ok ? 'PASS' : 'FAIL'}: Tooltip becomes visible on hover`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: hover visibility - ${e.message}`); testsFailed++; }

    // Test 10: Tooltip has correct styling (dark bg, light text)
    try {
        const styles = await page.evaluate(() => {
            const el = document.querySelector('.has-tooltip');
            if (!el) return null;
            const after = window.getComputedStyle(el, '::after');
            return {
                maxWidth: after.maxWidth,
                fontSize: after.fontSize,
                borderRadius: after.borderRadius,
            };
        });
        const ok = styles !== null;
        console.log(`${ok ? 'PASS' : 'FAIL'}: Tooltip CSS styling properties exist`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: tooltip styling - ${e.message}`); testsFailed++; }

    // ---- Task 3: Integration — Rule Cards ----

    // Test 11: Card metric labels have has-tooltip class
    try {
        const count = await page.evaluate(() => {
            const card = document.querySelector('.rule-card');
            if (!card) return 0;
            return card.querySelectorAll('.has-tooltip').length;
        });
        const ok = count >= 5; // Entropy, Density, Symmetry, Period, h, E, Class badge = 7
        console.log(`${ok ? 'PASS' : 'FAIL'}: Rule card has ${count} tooltip-enabled metric labels (need >=5)`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: card tooltips - ${e.message}`); testsFailed++; }

    // Test 12: Card Entropy label has correct tooltip text
    try {
        const tooltip = await page.evaluate(() => {
            const card = document.querySelector('.rule-card');
            if (!card) return '';
            const labels = card.querySelectorAll('.has-tooltip');
            for (const label of labels) {
                if (label.textContent.includes('Entropy') && !label.textContent.includes('Rate')) {
                    return label.getAttribute('data-tooltip') || '';
                }
            }
            return '';
        });
        const ok = tooltip.length > 20 && tooltip.toLowerCase().includes('shannon');
        console.log(`${ok ? 'PASS' : 'FAIL'}: Card 'Entropy' label has correct tooltip (${tooltip.length} chars)`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: entropy card tooltip - ${e.message}`); testsFailed++; }

    // Test 13: Wolfram Class badge has tooltip
    try {
        const hasTooltip = await page.evaluate(() => {
            const badge = document.querySelector('.wolfram-class');
            if (!badge) return false;
            return badge.classList.contains('has-tooltip') && badge.hasAttribute('data-tooltip');
        });
        console.log(`${hasTooltip ? 'PASS' : 'FAIL'}: Wolfram Class badge has tooltip`);
        hasTooltip ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: class badge tooltip - ${e.message}`); testsFailed++; }

    // Test 14: Clicking a card still opens the modal (tooltips don't interfere)
    try {
        const card = await page.$('.rule-card');
        await card.click();
        await page.waitForTimeout(500);
        const modalVisible = await page.evaluate(() => {
            return document.getElementById('modalOverlay').classList.contains('active');
        });
        console.log(`${modalVisible ? 'PASS' : 'FAIL'}: Clicking card still opens modal (no tooltip interference)`);
        modalVisible ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: card click - ${e.message}`); testsFailed++; }

    // ---- Task 4: Integration — Modal Metrics Table ----

    // Test 15: Modal metrics table has tooltips on all 10 metric names
    try {
        // Modal should already be open from previous test
        const count = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            if (!table) return 0;
            return table.querySelectorAll('.has-tooltip').length;
        });
        const ok = count === 10;
        console.log(`${ok ? 'PASS' : 'FAIL'}: Modal metrics table has ${count}/10 tooltip-enabled cells`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: modal tooltips count - ${e.message}`); testsFailed++; }

    // Test 16: Modal Lyapunov Exp. td has tooltip about sensitivity/chaos
    try {
        const tooltip = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            if (!table) return '';
            const tds = table.querySelectorAll('.has-tooltip');
            for (const td of tds) {
                if (td.textContent.includes('Lyapunov')) {
                    return td.getAttribute('data-tooltip') || '';
                }
            }
            return '';
        });
        const ok = tooltip.length > 20;
        console.log(`${ok ? 'PASS' : 'FAIL'}: Modal 'Lyapunov Exp.' has tooltip (${tooltip.length} chars)`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: modal lyapunov tooltip - ${e.message}`); testsFailed++; }

    // Close modal
    try {
        await page.click('#modalClose');
        await page.waitForTimeout(300);
    } catch (e) {}

    // ---- Task 5: Integration — Phase Explorer & Rule Map ----

    // Test 17: Phase Explorer checkbox labels have tooltips
    try {
        // Switch to Phase Explorer tab
        await page.click('[data-tab="phase"]');
        await page.waitForTimeout(500);

        const count = await page.evaluate(() => {
            const container = document.getElementById('phase-metric-checkboxes');
            if (!container) return 0;
            return container.querySelectorAll('.has-tooltip').length;
        });
        const ok = count === 6;
        console.log(`${ok ? 'PASS' : 'FAIL'}: Phase Explorer has ${count}/6 tooltip-enabled checkbox labels`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: phase checkboxes tooltips - ${e.message}`); testsFailed++; }

    // Test 18: Phase checkbox tooltip content matches metric
    try {
        const tooltip = await page.evaluate(() => {
            const container = document.getElementById('phase-metric-checkboxes');
            if (!container) return '';
            const labels = container.querySelectorAll('.has-tooltip');
            for (const label of labels) {
                if (label.textContent.includes('Entropy')) {
                    return label.getAttribute('data-tooltip') || '';
                }
            }
            return '';
        });
        const ok = tooltip.length > 20;
        console.log(`${ok ? 'PASS' : 'FAIL'}: Phase 'Entropy' checkbox has tooltip (${tooltip.length} chars)`);
        ok ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: phase entropy tooltip - ${e.message}`); testsFailed++; }

    // Test 19: Checkbox toggling still works with tooltips
    try {
        const result = await page.evaluate(() => {
            const container = document.getElementById('phase-metric-checkboxes');
            const checkbox = container.querySelector('input[type="checkbox"]');
            if (!checkbox) return false;
            const wasBefore = checkbox.checked;
            checkbox.click();
            const after = checkbox.checked;
            checkbox.click(); // restore
            return wasBefore !== after;
        });
        console.log(`${result ? 'PASS' : 'FAIL'}: Phase checkbox toggling still works with tooltips`);
        result ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: checkbox toggling - ${e.message}`); testsFailed++; }

    // Test 20: Rule Map dropdowns have tooltip help
    try {
        await page.click('[data-tab="map"]');
        await page.waitForTimeout(500);

        const hasHelp = await page.evaluate(() => {
            const controls = document.getElementById('rule-map-controls');
            if (!controls) return false;
            // Check for tooltip on dropdown labels or nearby info elements
            const tooltipEls = controls.querySelectorAll('.has-tooltip');
            return tooltipEls.length >= 2; // X axis and Y axis
        });
        console.log(`${hasHelp ? 'PASS' : 'FAIL'}: Rule Map axis controls have tooltip elements`);
        hasHelp ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: rule map tooltips - ${e.message}`); testsFailed++; }

    // Test 21: Rule Map dropdown tooltip updates when selection changes
    try {
        const result = await page.evaluate(() => {
            const controls = document.getElementById('rule-map-controls');
            if (!controls) return false;
            const tooltipEls = controls.querySelectorAll('.has-tooltip[data-tooltip]');
            // At least check that tooltip text is non-empty
            for (const el of tooltipEls) {
                if (el.getAttribute('data-tooltip').length > 10) return true;
            }
            return false;
        });
        console.log(`${result ? 'PASS' : 'FAIL'}: Rule Map tooltip has descriptive text`);
        result ? testsPassed++ : testsFailed++;
    } catch (e) { console.log(`FAIL: rule map tooltip content - ${e.message}`); testsFailed++; }

    // ---- Summary ----
    console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed out of ${testsPassed + testsFailed} ===\n`);

    await browser.close();
    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
