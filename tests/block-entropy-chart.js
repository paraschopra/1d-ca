/**
 * Test Suite: Block Entropy H(L) vs L Chart in Modal (Task 31)
 *
 * Tests the block entropy line chart with linear fit overlay in the modal.
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
    await page.waitForSelector('.rule-card', { timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open modal for a rule with interesting block entropy (Rule 30)
    await page.evaluate(() => openModal(30));
    await page.waitForTimeout(500);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Block Entropy Chart Tests (Task 31) ===\n');

    // Test 1: Block entropy chart container exists and has SVG
    try {
        const hasSvg = await page.evaluate(() => {
            const container = document.getElementById('blockEntropyChart');
            return container && !!container.querySelector('svg');
        });
        if (hasSvg) {
            console.log('✓ Test 1: Block entropy chart SVG exists in modal');
            testsPassed++;
        } else {
            console.log('✗ Test 1: Block entropy chart SVG not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: Chart has 8 data points (circles for L=1..8)
    try {
        const circleCount = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            return svg.querySelectorAll('circle').length;
        });
        if (circleCount === 8) {
            console.log('✓ Test 2: Chart has 8 data points (L=1..8)');
            testsPassed++;
        } else {
            console.log(`✗ Test 2: Expected 8 data points, found ${circleCount}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: Chart has a data line (path with class 'data-line')
    try {
        const hasDataLine = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            const path = svg.querySelector('path.data-line');
            return path && path.getAttribute('stroke') === '#00ff88';
        });
        if (hasDataLine) {
            console.log('✓ Test 3: Data line path exists with green stroke');
            testsPassed++;
        } else {
            console.log('✗ Test 3: Data line not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: Chart has a dashed linear fit line
    try {
        const hasFitLine = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            const line = svg.querySelector('line.fit-line');
            if (!line) return false;
            const dasharray = line.getAttribute('stroke-dasharray');
            return dasharray && dasharray.length > 0;
        });
        if (hasFitLine) {
            console.log('✓ Test 4: Dashed linear fit line exists');
            testsPassed++;
        } else {
            console.log('✗ Test 4: Dashed fit line not found');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Test 5: Annotations show h and E values
    try {
        const annotations = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            const annots = svg.querySelector('.annotations');
            if (!annots) return null;
            const texts = Array.from(annots.querySelectorAll('text')).map(t => t.textContent);
            return texts;
        });
        const hasH = annotations && annotations.some(t => t.includes('h ='));
        const hasE = annotations && annotations.some(t => t.includes('E ='));
        if (hasH && hasE) {
            console.log(`✓ Test 5: Annotations show h and E values: ${annotations.join(', ')}`);
            testsPassed++;
        } else {
            console.log(`✗ Test 5: Missing annotations. Found: ${JSON.stringify(annotations)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: Chart has axis labels 'Block Length L' and 'H(L)'
    try {
        const labels = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            const texts = Array.from(svg.querySelectorAll('text')).map(t => t.textContent);
            return texts;
        });
        const hasXLabel = labels.includes('Block Length L');
        const hasYLabel = labels.includes('H(L)');
        if (hasXLabel && hasYLabel) {
            console.log('✓ Test 6: Axis labels present (Block Length L, H(L))');
            testsPassed++;
        } else {
            console.log(`✗ Test 6: Missing labels. HasX: ${hasXLabel}, HasY: ${hasYLabel}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: Chart uses dark theme
    try {
        const bgColor = await page.evaluate(() => {
            const svg = document.querySelector('#blockEntropyChart svg');
            return svg.style.background;
        });
        if (bgColor.includes('1a1a1a') || bgColor.includes('rgb(26, 26, 26)')) {
            console.log('✓ Test 7: Chart uses dark theme background');
            testsPassed++;
        } else {
            console.log(`✗ Test 7: Background is "${bgColor}", expected #1a1a1a`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: Chart updates when opening a different rule
    try {
        // Close modal
        await page.click('#modalClose');
        await page.waitForTimeout(300);

        // Open modal for Rule 110
        await page.evaluate(() => openModal(110));
        await page.waitForTimeout(500);

        const hasSvg = await page.evaluate(() => {
            const container = document.getElementById('blockEntropyChart');
            return container && !!container.querySelector('svg');
        });
        if (hasSvg) {
            console.log('✓ Test 8: Chart updates for different rule (Rule 110)');
            testsPassed++;
        } else {
            console.log('✗ Test 8: Chart not rendered for Rule 110');
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 8: Error -', e.message);
        testsFailed++;
    }

    // Screenshot
    await page.screenshot({
        path: path.join(SCREENSHOT_DIR, 'block-entropy-chart.png'),
        fullPage: true
    });
    console.log(`\nScreenshot saved to: ${path.join(SCREENSHOT_DIR, 'block-entropy-chart.png')}`);

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
