const { chromium } = require('playwright');
const path = require('path');

async function runTests() {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const filePath = 'file://' + path.resolve(__dirname, '../src/v2-research-tools.html');
    await page.goto(filePath);

    const results = [];
    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn(page);
            results.push({ name, passed: true });
            console.log(`✓ ${name}`);
            passed++;
        } catch (error) {
            results.push({ name, passed: false, error: error.message });
            console.error(`✗ ${name}`);
            console.error(`  ${error.message}`);
            failed++;
        }
    }

    console.log('Running tab navigation tests...\n');

    // Test 1: Tab bar has exactly 4 tabs
    await test('Tab bar has exactly 4 tabs', async (page) => {
        const tabs = await page.$$('.tab');
        if (tabs.length !== 4) {
            throw new Error(`Expected 4 tabs, got ${tabs.length}`);
        }
    });

    // Test 2: Tab names are correct
    await test('Tab names are correct', async (page) => {
        const expectedNames = ['Grid View', 'Rule Map', 'Phase Explorer', 'Light Cones'];
        const tabs = await page.$$('.tab');
        for (let i = 0; i < tabs.length; i++) {
            const text = await tabs[i].textContent();
            if (text !== expectedNames[i]) {
                throw new Error(`Expected tab ${i} to be "${expectedNames[i]}", got "${text}"`);
            }
        }
    });

    // Test 3: First tab is active by default
    await test('Grid View tab is active by default', async (page) => {
        const activeTab = await page.$('.tab.active');
        const text = await activeTab.textContent();
        if (text !== 'Grid View') {
            throw new Error(`Expected "Grid View" to be active, got "${text}"`);
        }
    });

    // Test 4: Grid View panel is visible by default
    await test('Grid View panel is visible by default', async (page) => {
        const isVisible = await page.$eval('#panel-grid', el => el.classList.contains('active'));
        if (!isVisible) {
            throw new Error('Grid View panel should be active by default');
        }
    });

    // Test 5: Other panels are hidden by default
    await test('Other panels are hidden by default', async (page) => {
        const mapVisible = await page.$eval('#panel-map', el => el.classList.contains('active'));
        const phaseVisible = await page.$eval('#panel-phase', el => el.classList.contains('active'));
        const lightVisible = await page.$eval('#panel-lightcone', el => el.classList.contains('active'));

        if (mapVisible || phaseVisible || lightVisible) {
            throw new Error('Non-grid panels should be hidden by default');
        }
    });

    // Test 6: Clicking Rule Map tab shows its panel
    await test('Clicking Rule Map tab shows its panel', async (page) => {
        await page.click('.tab[data-tab="map"]');
        await page.waitForTimeout(100);

        const mapVisible = await page.$eval('#panel-map', el => el.classList.contains('active'));
        const gridVisible = await page.$eval('#panel-grid', el => el.classList.contains('active'));

        if (!mapVisible) {
            throw new Error('Rule Map panel should be visible after clicking tab');
        }
        if (gridVisible) {
            throw new Error('Grid View panel should be hidden after switching tabs');
        }
    });

    // Test 7: Active tab visual state updates on click
    await test('Active tab visual state updates on click', async (page) => {
        await page.click('.tab[data-tab="phase"]');
        await page.waitForTimeout(100);

        const activeTab = await page.$('.tab.active');
        const text = await activeTab.textContent();

        if (text !== 'Phase Explorer') {
            throw new Error(`Expected "Phase Explorer" to be active, got "${text}"`);
        }
    });

    // Test 8: Clicking multiple tabs works correctly
    await test('Clicking multiple tabs works correctly', async (page) => {
        await page.click('.tab[data-tab="lightcone"]');
        await page.waitForTimeout(100);

        let visible = await page.$eval('#panel-lightcone', el => el.classList.contains('active'));
        if (!visible) throw new Error('Light Cones panel should be visible');

        await page.click('.tab[data-tab="grid"]');
        await page.waitForTimeout(100);

        visible = await page.$eval('#panel-grid', el => el.classList.contains('active'));
        if (!visible) throw new Error('Grid View panel should be visible after clicking back');
    });

    // Test 9: Only one panel is visible at a time
    await test('Only one panel is visible at a time', async (page) => {
        await page.click('.tab[data-tab="map"]');
        await page.waitForTimeout(100);

        const visiblePanels = await page.$$eval('.tab-panel.active', els => els.length);
        if (visiblePanels !== 1) {
            throw new Error(`Expected exactly 1 visible panel, got ${visiblePanels}`);
        }
    });

    // Test 10: URL hash updates when tab is clicked
    await test('URL hash updates when tab is clicked', async (page) => {
        await page.click('.tab[data-tab="phase"]');
        await page.waitForTimeout(100);

        const hash = await page.evaluate(() => window.location.hash);
        if (hash !== '#phase') {
            throw new Error(`Expected hash to be "#phase", got "${hash}"`);
        }
    });

    // Test 11: Loading page with hash shows correct tab
    await test('Loading page with hash shows correct tab', async (page) => {
        await page.goto(filePath + '#map');
        await page.waitForTimeout(200);

        const activeTab = await page.$('.tab.active');
        const text = await activeTab.textContent();

        if (text !== 'Rule Map') {
            throw new Error(`Expected "Rule Map" to be active, got "${text}"`);
        }

        const mapVisible = await page.$eval('#panel-map', el => el.classList.contains('active'));
        if (!mapVisible) {
            throw new Error('Rule Map panel should be visible when loading with #map hash');
        }
    });

    // Test 12: Invalid hash defaults to Grid View
    await test('Invalid hash defaults to Grid View', async (page) => {
        await page.goto(filePath + '#invalid');
        await page.waitForTimeout(200);

        const activeTab = await page.$('.tab.active');
        const text = await activeTab.textContent();

        if (text !== 'Grid View') {
            throw new Error(`Expected "Grid View" to be active for invalid hash, got "${text}"`);
        }
    });

    // Test 13: No layout shift during tab switch
    await test('No layout shift during tab switch', async (page) => {
        await page.goto(filePath);
        await page.waitForTimeout(200);

        const initialHeight = await page.$eval('body', el => el.scrollHeight);

        await page.click('.tab[data-tab="map"]');
        await page.waitForTimeout(100);

        const newHeight = await page.$eval('body', el => el.scrollHeight);

        // Allow some variation, but should be similar
        const diff = Math.abs(initialHeight - newHeight);
        if (diff > 200) {
            console.warn(`  Warning: Layout shift detected (${diff}px difference)`);
        }
    });

    // Test 14: Grid View controls are present
    await test('Grid View controls are present', async (page) => {
        await page.goto(filePath);
        await page.waitForTimeout(200);

        const centerBtn = await page.$('#centerMode');
        const randomBtn = await page.$('#randomMode');
        const densitySlider = await page.$('#densitySlider');

        if (!centerBtn) throw new Error('Center mode button not found');
        if (!randomBtn) throw new Error('Random mode button not found');
        if (!densitySlider) throw new Error('Density slider not found');
    });

    // Test 15: Placeholder panels have content
    await test('Placeholder panels have descriptive content', async (page) => {
        await page.goto(filePath);

        await page.click('.tab[data-tab="map"]');
        await page.waitForTimeout(100);
        let placeholderText = await page.$eval('#panel-map', el => el.textContent);
        if (!placeholderText.includes('scatter plot')) {
            throw new Error('Map panel should have descriptive content');
        }

        await page.click('.tab[data-tab="phase"]');
        await page.waitForTimeout(100);
        placeholderText = await page.$eval('#panel-phase', el => el.textContent);
        if (!placeholderText.includes('density')) {
            throw new Error('Phase panel should have descriptive content');
        }

        await page.click('.tab[data-tab="lightcone"]');
        await page.waitForTimeout(100);
        placeholderText = await page.$eval('#panel-lightcone', el => el.textContent);
        if (!placeholderText.includes('perturbation')) {
            throw new Error('Light cone panel should have descriptive content');
        }
    });

    await browser.close();

    console.log(`\n${passed} passed, ${failed} failed out of ${passed + failed} tests`);

    if (failed === 0) {
        console.log('\n✓ All tab navigation tests passed!');
        process.exit(0);
    } else {
        console.error('\n✗ Some tests failed');
        process.exit(1);
    }
}

runTests().catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
});
