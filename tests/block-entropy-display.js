/**
 * Test Suite: Block Entropy Display (Task 30)
 *
 * Tests that entropy rate and excess entropy are shown on cards and modal.
 */

const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../src/v2-research-tools.html');

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);
    await page.waitForTimeout(1000);

    // Wait for at least some cards to render
    await page.waitForSelector('.rule-card', { timeout: 30000 });
    await page.waitForTimeout(2000); // Let some cards render

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Block Entropy Display Tests (Task 30) ===\n');

    // Test 1: Card metrics show 'h:' (entropy rate)
    try {
        const hasH = await page.evaluate(() => {
            const cards = document.querySelectorAll('.rule-card .metrics');
            if (cards.length === 0) return false;
            // Check first rendered card
            return cards[0].innerHTML.includes('h:');
        });
        if (hasH) {
            console.log('✓ Test 1: Rule cards show entropy rate (h:)');
            testsPassed++;
        } else {
            console.log('✗ Test 1: Rule cards missing entropy rate');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: Card metrics show 'E:' (excess entropy)
    try {
        const hasE = await page.evaluate(() => {
            const cards = document.querySelectorAll('.rule-card .metrics');
            if (cards.length === 0) return false;
            return cards[0].innerHTML.includes('E:');
        });
        if (hasE) {
            console.log('✓ Test 2: Rule cards show excess entropy (E:)');
            testsPassed++;
        } else {
            console.log('✗ Test 2: Rule cards missing excess entropy');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: Open modal and check metrics table has Entropy Rate row
    try {
        // Click first card to open modal
        await page.click('.rule-card');
        await page.waitForTimeout(500);

        const hasEntropyRate = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            return table.innerHTML.includes('Entropy Rate');
        });
        if (hasEntropyRate) {
            console.log('✓ Test 3: Modal metrics table has Entropy Rate row');
            testsPassed++;
        } else {
            console.log('✗ Test 3: Modal metrics table missing Entropy Rate');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: Modal metrics table has Excess Entropy row
    try {
        const hasExcessEntropy = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            return table.innerHTML.includes('Excess Entropy');
        });
        if (hasExcessEntropy) {
            console.log('✓ Test 4: Modal metrics table has Excess Entropy row');
            testsPassed++;
        } else {
            console.log('✗ Test 4: Modal metrics table missing Excess Entropy');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: Modal entropy rate has 4 decimal places
    try {
        const value = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                if (row.textContent.includes('Entropy Rate')) {
                    const td = row.querySelectorAll('td')[1];
                    return td.textContent.trim();
                }
            }
            return null;
        });
        if (value && /^\d+\.\d{4}$/.test(value)) {
            console.log(`✓ Test 5: Modal entropy rate has 4 decimal places (${value})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 5: Modal entropy rate format unexpected: "${value}"`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: Modal excess entropy has 4 decimal places
    try {
        const value = await page.evaluate(() => {
            const table = document.getElementById('metricsTable');
            const rows = table.querySelectorAll('tr');
            for (const row of rows) {
                if (row.textContent.includes('Excess Entropy')) {
                    const td = row.querySelectorAll('td')[1];
                    return td.textContent.trim();
                }
            }
            return null;
        });
        if (value && /^\d+\.\d{4}$/.test(value)) {
            console.log(`✓ Test 6: Modal excess entropy has 4 decimal places (${value})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 6: Modal excess entropy format unexpected: "${value}"`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Close modal
    await page.click('#modalClose');
    await page.waitForTimeout(300);

    // Test 7: Existing metrics still present on cards
    try {
        const hasAll = await page.evaluate(() => {
            const card = document.querySelector('.rule-card .metrics');
            const html = card.innerHTML;
            return html.includes('Entropy:') && html.includes('Density:') &&
                   html.includes('Symmetry:') && html.includes('Period:') &&
                   html.includes('Class');
        });
        if (hasAll) {
            console.log('✓ Test 7: Existing metrics still present on cards (no regression)');
            testsPassed++;
        } else {
            console.log('✗ Test 7: Some existing metrics missing from cards');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
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
