const { chromium } = require('playwright');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const appPath = path.join(__dirname, '..', 'src', 'src/index.html');
    await page.goto(`file://${appPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('RULE MAP CLICK-TO-MODAL TESTS (Task 18)');
    console.log('='.repeat(60));

    // Wait for precomputation
    await page.evaluate(() => {
        return new Promise((resolve) => {
            if (window.precomputedMetrics && window.precomputedMetrics[255]) resolve();
            else window.addEventListener('metricsReady', () => resolve());
        });
    });
    await page.waitForTimeout(500);

    // Switch to Rule Map tab
    await page.click('text=Rule Map');
    await page.waitForTimeout(500);

    let allPassed = true;

    // Test 1: Click a dot to open modal
    console.log('Clicking a rule dot...');
    const circle = await page.locator('#rule-map-chart svg circle[data-label]').nth(30);
    await circle.click({ force: true });
    await page.waitForTimeout(1000);

    const modalVisible = await page.evaluate(() => {
        const overlay = document.getElementById('modalOverlay');
        return overlay && overlay.style.display !== 'none' && overlay.style.display !== '';
    });

    // Check if modal overlay is visible (could be via CSS class)
    const modalActuallyVisible = await page.evaluate(() => {
        const overlay = document.getElementById('modalOverlay');
        if (!overlay) return false;
        const style = window.getComputedStyle(overlay);
        return style.display !== 'none';
    });

    console.log(modalActuallyVisible ? '✓ Modal opens on dot click' : '✗ Modal did not open');
    if (!modalActuallyVisible) allPassed = false;

    // Test 2: Modal shows correct rule title
    const modalTitle = await page.evaluate(() => {
        return document.getElementById('modalTitle')?.textContent;
    });
    console.log(modalTitle ? `✓ Modal title: "${modalTitle}"` : '✗ No modal title');
    if (!modalTitle || !modalTitle.includes('Rule')) allPassed = false;

    // Test 3: Modal has canvas (512x512 rendering)
    const hasCanvas = await page.evaluate(() => {
        const canvas = document.getElementById('modalCanvas');
        return canvas && canvas.width > 0 && canvas.height > 0;
    });
    console.log(hasCanvas ? '✓ Modal has rendered canvas' : '✗ Modal canvas missing');
    if (!hasCanvas) allPassed = false;

    // Test 4: Modal has truth table
    const hasTruthTable = await page.evaluate(() => {
        const table = document.getElementById('truthTable');
        return table && table.children.length === 8;
    });
    console.log(hasTruthTable ? '✓ Modal has truth table (8 entries)' : '✗ Truth table missing');
    if (!hasTruthTable) allPassed = false;

    // Test 5: Modal has metrics table
    const hasMetrics = await page.evaluate(() => {
        const table = document.getElementById('metricsTable');
        return table && table.children.length > 0;
    });
    console.log(hasMetrics ? '✓ Modal has metrics table' : '✗ Metrics table missing');
    if (!hasMetrics) allPassed = false;

    // Screenshot
    const scratchpadDir = '/private/tmp/claude-501/-Users-paraschopra-Documents-Code-learning-notebooks-1d-ca/bac3df29-224a-47e6-817c-db70e042cad5/scratchpad';
    await page.screenshot({ path: path.join(scratchpadDir, 'rule-map-modal.png'), fullPage: true });
    console.log('\n✓ Screenshot saved: rule-map-modal.png');

    // Test 6: Close modal
    await page.click('#modalClose');
    await page.waitForTimeout(300);

    const modalClosed = await page.evaluate(() => {
        const overlay = document.getElementById('modalOverlay');
        const style = window.getComputedStyle(overlay);
        return style.display === 'none';
    });
    console.log(modalClosed ? '✓ Modal closes correctly' : '✗ Modal did not close');
    if (!modalClosed) allPassed = false;

    // Test 7: Still on Rule Map tab
    const onRuleMap = await page.evaluate(() => {
        const tab = document.querySelector('.tab.active');
        return tab && tab.dataset.tab === 'map';
    });
    console.log(onRuleMap ? '✓ Still on Rule Map tab after closing modal' : '✗ Tab changed');
    if (!onRuleMap) allPassed = false;

    console.log('='.repeat(60));
    await browser.close();

    console.log(allPassed ? '\n✓ ALL TESTS PASSED\n' : '\n✗ SOME TESTS FAILED\n');
    process.exit(allPassed ? 0 : 1);
})();
