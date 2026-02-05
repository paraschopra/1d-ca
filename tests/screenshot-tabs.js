const { chromium } = require('playwright');
const path = require('path');

async function takeScreenshots() {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

    const filePath = 'file://' + path.resolve(__dirname, '../src/v2-research-tools.html');

    console.log('Taking screenshots of tab navigation...\n');

    // Screenshot 1: Default state (Grid View)
    await page.goto(filePath);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.resolve(__dirname, '../scratchpad/tab-grid-view.png'), fullPage: true });
    console.log('✓ Screenshot 1: Grid View (default)');

    // Screenshot 2: Rule Map tab
    await page.click('.tab[data-tab="map"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, '../scratchpad/tab-rule-map.png'), fullPage: false });
    console.log('✓ Screenshot 2: Rule Map tab');

    // Screenshot 3: Phase Explorer tab
    await page.click('.tab[data-tab="phase"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, '../scratchpad/tab-phase-explorer.png'), fullPage: false });
    console.log('✓ Screenshot 3: Phase Explorer tab');

    // Screenshot 4: Light Cones tab
    await page.click('.tab[data-tab="lightcone"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, '../scratchpad/tab-light-cones.png'), fullPage: false });
    console.log('✓ Screenshot 4: Light Cones tab');

    // Screenshot 5: URL hash routing test
    await page.goto(filePath + '#map');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.resolve(__dirname, '../scratchpad/tab-hash-routing.png'), fullPage: false });
    console.log('✓ Screenshot 5: Hash routing (#map)');

    await browser.close();
    console.log('\n✓ All screenshots saved to scratchpad/');
}

takeScreenshots().catch(error => {
    console.error('Screenshot error:', error);
    process.exit(1);
});
