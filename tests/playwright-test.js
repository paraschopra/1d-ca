const { chromium } = require('playwright');
const path = require('path');

const FILE_URL = 'file://' + path.resolve(__dirname, '..', 'src', 'index.html');

let browser, page;
let passed = 0, failed = 0;
const failures = [];

async function assert(condition, testName) {
    if (condition) {
        console.log(`  ✓ ${testName}`);
        passed++;
    } else {
        console.log(`  ✗ ${testName}`);
        failed++;
        failures.push(testName);
    }
}

async function assertApprox(actual, expected, tolerance, testName) {
    const cond = Math.abs(actual - expected) <= tolerance;
    if (cond) {
        console.log(`  ✓ ${testName} (${actual})`);
        passed++;
    } else {
        console.log(`  ✗ ${testName} (expected ~${expected}, got ${actual})`);
        failed++;
        failures.push(testName);
    }
}

// ============================================
// TEST SUITE
// ============================================

async function testPageLoads() {
    console.log('\n--- Page Loading ---');
    const title = await page.title();
    await assert(title === '1D Cellular Automata Explorer', `Page title is correct: "${title}"`);

    const h1 = await page.textContent('h1');
    await assert(h1 === '1D Cellular Automata Explorer', `H1 heading is correct`);
}

async function testHeaderPresent() {
    console.log('\n--- Header ---');
    const header = await page.$('header');
    await assert(header !== null, 'Header element exists');

    const h1Color = await page.$eval('h1', el => getComputedStyle(el).color);
    await assert(h1Color !== '', 'H1 has color styling');
}

async function testControlsPanel() {
    console.log('\n--- Controls Panel ---');
    const controls = await page.$('.controls');
    await assert(controls !== null, 'Controls panel exists');

    // Mode toggle buttons
    const modeButtons = await page.$$('#modeToggle button');
    await assert(modeButtons.length === 2, `Mode toggle has 2 buttons (got ${modeButtons.length})`);

    const centerBtn = await page.$('#modeToggle button[data-mode="center"]');
    const randomBtn = await page.$('#modeToggle button[data-mode="random"]');
    await assert(centerBtn !== null, 'Center Cell button exists');
    await assert(randomBtn !== null, 'Random button exists');

    // Center button should be active by default
    const centerActive = await centerBtn.evaluate(el => el.classList.contains('active'));
    await assert(centerActive, 'Center Cell button is active by default');

    const randomActive = await randomBtn.evaluate(el => el.classList.contains('active'));
    await assert(!randomActive, 'Random button is NOT active by default');

    // Density control
    const densityControl = await page.$('#densityControl');
    await assert(densityControl !== null, 'Density control exists');

    const densityDisabled = await densityControl.evaluate(el => el.classList.contains('disabled'));
    await assert(densityDisabled, 'Density control is disabled in center mode');

    // Density slider
    const slider = await page.$('#densitySlider');
    await assert(slider !== null, 'Density slider exists');
    const sliderVal = await slider.evaluate(el => el.value);
    await assert(sliderVal === '50', `Density slider default is 50 (got ${sliderVal})`);

    // Density value display
    const densityValueText = await page.textContent('#densityValue');
    await assert(densityValueText === '50%', `Density value shows 50% (got "${densityValueText}")`);

    // Randomize button
    const randomizeBtn = await page.$('#randomizeBtn');
    await assert(randomizeBtn !== null, 'Randomize button exists');
    const randomizeBtnDisabled = await randomizeBtn.evaluate(el => el.classList.contains('disabled'));
    await assert(randomizeBtnDisabled, 'Randomize button is disabled in center mode');
}

async function testGridRendering() {
    console.log('\n--- Grid Rendering (256 Rule Cards) ---');

    // Wait for all cards to be rendered
    await page.waitForFunction(() => {
        const cards = document.querySelectorAll('.rule-card');
        return cards.length === 256;
    }, { timeout: 10000 });

    const cards = await page.$$('.rule-card');
    await assert(cards.length === 256, `All 256 rule cards rendered (got ${cards.length})`);

    // Verify grid container exists
    const gridContainer = await page.$('.grid-container');
    await assert(gridContainer !== null, 'Grid container exists');

    // Check first card
    const firstCardRule = await page.$eval('.rule-card:first-child .rule-number', el => el.textContent);
    await assert(firstCardRule === 'Rule 0', `First card is Rule 0 (got "${firstCardRule}")`);

    // Check last card
    const lastCardRule = await page.$eval('.rule-card:last-child .rule-number', el => el.textContent);
    await assert(lastCardRule === 'Rule 255', `Last card is Rule 255 (got "${lastCardRule}")`);

    // Each card should have a canvas
    const canvases = await page.$$('.rule-card canvas');
    await assert(canvases.length === 256, `All 256 canvases present (got ${canvases.length})`);
}

async function testCanvasRendering() {
    console.log('\n--- Canvas Rendering ---');

    // Wait for rendering to complete (all cards have metrics)
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });

    // Check canvas dimensions (should be 128x128)
    const canvasSize = await page.$eval('.rule-card:first-child canvas', el => ({
        width: el.width,
        height: el.height
    }));
    await assert(canvasSize.width === 128, `Canvas width is 128 (got ${canvasSize.width})`);
    await assert(canvasSize.height === 128, `Canvas height is 128 (got ${canvasSize.height})`);

    // Verify Rule 0 canvas has pixels (should be mostly white/empty - all cells die)
    const rule0HasData = await page.$eval('.rule-card[data-rule="0"] canvas', el => {
        const ctx = el.getContext('2d');
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        // Check that pixel data exists (not all zeros = has been drawn)
        let nonZero = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 0 || data[i + 1] > 0 || data[i + 2] > 0) nonZero++;
        }
        return nonZero > 0;
    });
    await assert(rule0HasData, 'Rule 0 canvas has rendered pixel data');

    // Verify Rule 110 canvas has a mix of black and white pixels
    const rule110Data = await page.$eval('.rule-card[data-rule="110"] canvas', el => {
        const ctx = el.getContext('2d');
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        let black = 0, white = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) black++;
            else if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) white++;
        }
        return { black, white, total: el.width * el.height };
    });
    await assert(rule110Data.black > 0 && rule110Data.white > 0,
        `Rule 110 has mix of black (${rule110Data.black}) and white (${rule110Data.white}) pixels`);
}

async function testMetricsDisplay() {
    console.log('\n--- Metrics Display ---');

    // Wait for all metrics to render
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });

    // Check metrics on a card
    const metricsHTML = await page.$eval('.rule-card[data-rule="30"] .metrics', el => el.innerHTML);
    await assert(metricsHTML.includes('Class'), 'Rule 30 metrics include Wolfram Class');
    await assert(metricsHTML.includes('Entropy'), 'Rule 30 metrics include Entropy');
    await assert(metricsHTML.includes('Density'), 'Rule 30 metrics include Density');
    await assert(metricsHTML.includes('Symmetry'), 'Rule 30 metrics include Symmetry');
    await assert(metricsHTML.includes('Period'), 'Rule 30 metrics include Period');

    // Verify Wolfram class badge exists
    const wolframBadge = await page.$('.rule-card[data-rule="30"] .wolfram-class');
    await assert(wolframBadge !== null, 'Rule 30 has a Wolfram class badge');

    // Rule 0 should be Class I (converges to uniform)
    const rule0Class = await page.$eval('.rule-card[data-rule="0"] .wolfram-class', el => el.textContent);
    await assert(rule0Class.includes('Class I'), `Rule 0 classified as Class I (got "${rule0Class}")`);
}

async function testModeToggle() {
    console.log('\n--- Mode Toggle ---');

    // Switch to Random mode
    await page.click('#modeToggle button[data-mode="random"]');

    const randomActive = await page.$eval('#modeToggle button[data-mode="random"]', el => el.classList.contains('active'));
    await assert(randomActive, 'Random button becomes active after click');

    const centerActive = await page.$eval('#modeToggle button[data-mode="center"]', el => el.classList.contains('active'));
    await assert(!centerActive, 'Center button becomes inactive after switching to random');

    // Density control should be enabled
    const densityEnabled = await page.$eval('#densityControl', el => !el.classList.contains('disabled'));
    await assert(densityEnabled, 'Density control is enabled in random mode');

    // Randomize button should be enabled
    const randomizeEnabled = await page.$eval('#randomizeBtn', el => !el.classList.contains('disabled'));
    await assert(randomizeEnabled, 'Randomize button is enabled in random mode');

    // Wait for re-render
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });

    // Cards should still be present
    const cardsAfter = await page.$$('.rule-card');
    await assert(cardsAfter.length === 256, `Still 256 cards after mode switch (got ${cardsAfter.length})`);

    // Switch back to Center mode
    await page.click('#modeToggle button[data-mode="center"]');

    const centerActiveAgain = await page.$eval('#modeToggle button[data-mode="center"]', el => el.classList.contains('active'));
    await assert(centerActiveAgain, 'Center button active again after switching back');

    const densityDisabledAgain = await page.$eval('#densityControl', el => el.classList.contains('disabled'));
    await assert(densityDisabledAgain, 'Density control disabled again in center mode');

    // Wait for re-render
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });
}

async function testDensitySlider() {
    console.log('\n--- Density Slider ---');

    // Switch to random mode first
    await page.click('#modeToggle button[data-mode="random"]');
    await page.waitForTimeout(100);

    // Change density slider
    await page.$eval('#densitySlider', el => {
        el.value = '75';
        el.dispatchEvent(new Event('input'));
    });

    const newValue = await page.textContent('#densityValue');
    await assert(newValue === '75%', `Density value updates to 75% (got "${newValue}")`);

    // Change to 25%
    await page.$eval('#densitySlider', el => {
        el.value = '25';
        el.dispatchEvent(new Event('input'));
    });

    const newValue2 = await page.textContent('#densityValue');
    await assert(newValue2 === '25%', `Density value updates to 25% (got "${newValue2}")`);

    // Switch back
    await page.click('#modeToggle button[data-mode="center"]');
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });
}

async function testRandomizeButton() {
    console.log('\n--- Randomize Button ---');

    // Switch to random mode
    await page.click('#modeToggle button[data-mode="random"]');
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });

    // Get a sample of specific pixel values from Rule 30's canvas before randomize
    const before = await page.$eval('.rule-card[data-rule="30"] canvas', el => {
        const ctx = el.getContext('2d');
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        // Sample first row pixels (row 0 = the random initial config itself)
        const sample = [];
        for (let x = 0; x < el.width; x++) {
            sample.push(data[x * 4]); // R channel of row 0
        }
        return sample.join(',');
    });

    // Click Randomize — grid gets rebuilt (innerHTML cleared then re-populated)
    await page.click('#randomizeBtn');
    // Wait for grid to clear (cards removed) then re-appear with metrics
    await page.waitForFunction(() => {
        const cards = document.querySelectorAll('.rule-card');
        return cards.length === 0 || cards[0].querySelector('.metrics').innerHTML.trim() === '';
    }, { timeout: 5000 }).catch(() => {}); // may be too fast to catch
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });

    // Get the same sample after randomize — first row should differ since it's a new random config
    const after = await page.$eval('.rule-card[data-rule="30"] canvas', el => {
        const ctx = el.getContext('2d');
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        const sample = [];
        for (let x = 0; x < el.width; x++) {
            sample.push(data[x * 4]);
        }
        return sample.join(',');
    });

    // The first row (random initial config) should differ between two randomizations
    await assert(before !== after, `Randomize button changes the rendering (first-row pixels differ)`);

    // Switch back to center
    await page.click('#modeToggle button[data-mode="center"]');
    await page.waitForFunction(() => {
        const metrics = document.querySelectorAll('.rule-card .metrics');
        let filled = 0;
        metrics.forEach(m => { if (m.innerHTML.trim() !== '') filled++; });
        return filled === 256;
    }, { timeout: 30000 });
}

async function testModalOpens() {
    console.log('\n--- Modal Open ---');

    // Verify modal is hidden initially
    const modalHidden = await page.$eval('#modal', el => !el.classList.contains('active'));
    await assert(modalHidden, 'Modal is hidden initially');

    // Click Rule 30 card
    await page.click('.rule-card[data-rule="30"]');
    await page.waitForTimeout(200);

    // Modal should be visible
    const modalVisible = await page.$eval('#modal', el => el.classList.contains('active'));
    await assert(modalVisible, 'Modal opens after clicking a card');

    // Check modal title
    const modalTitle = await page.textContent('#modalTitle');
    await assert(modalTitle === 'Rule 30', `Modal title shows "Rule 30" (got "${modalTitle}")`);

    // Check binary representation
    const binary = await page.textContent('#modalBinary');
    const expected30Binary = 'Binary: 00011110'; // 30 in binary padded to 8 bits
    await assert(binary === expected30Binary, `Binary is correct: "${binary}"`);

    // Check modal canvas exists and has content
    const modalCanvasSize = await page.$eval('#modalCanvas', el => ({
        width: el.width,
        height: el.height
    }));
    await assert(modalCanvasSize.width === 512, `Modal canvas width is 512 (got ${modalCanvasSize.width})`);
    await assert(modalCanvasSize.height === 512, `Modal canvas height is 512 (got ${modalCanvasSize.height})`);
}

async function testModalTruthTable() {
    console.log('\n--- Modal Truth Table ---');

    // Modal should still be open from previous test
    const truthEntries = await page.$$('.truth-table .truth-entry');
    await assert(truthEntries.length === 8, `Truth table has 8 entries (got ${truthEntries.length})`);

    // Each entry should have neighborhood cells and output
    const firstEntry = truthEntries[0];
    const neighborhoodCells = await firstEntry.$$('.neighborhood .cell');
    await assert(neighborhoodCells.length === 3, `Each truth entry has 3 neighborhood cells`);

    const outputCell = await firstEntry.$('.output-cell');
    await assert(outputCell !== null, 'Each truth entry has an output cell');

    const arrow = await firstEntry.$('.truth-arrow');
    await assert(arrow !== null, 'Each truth entry has an arrow');
}

async function testModalMetricsTable() {
    console.log('\n--- Modal Metrics Table ---');

    // Modal should still be open
    const metricsRows = await page.$$('#metricsTable tr');
    await assert(metricsRows.length === 8, `Metrics table has 8 rows (got ${metricsRows.length})`);

    const metricsHTML = await page.$eval('#metricsTable', el => el.textContent);
    await assert(metricsHTML.includes('Shannon Entropy'), 'Metrics include Shannon Entropy');
    await assert(metricsHTML.includes('Density'), 'Metrics include Density');
    await assert(metricsHTML.includes('Mean Field'), 'Metrics include Mean Field');
    await assert(metricsHTML.includes('Wolfram Class'), 'Metrics include Wolfram Class');
    await assert(metricsHTML.includes('Symmetry Score'), 'Metrics include Symmetry Score');
    await assert(metricsHTML.includes('Lyapunov Exponent'), 'Metrics include Lyapunov Exponent');
    await assert(metricsHTML.includes('Compressibility'), 'Metrics include Compressibility');
    await assert(metricsHTML.includes('Period'), 'Metrics include Period');
}

async function testModalCloseButton() {
    console.log('\n--- Modal Close (Button) ---');

    // Close via X button
    await page.click('#modalClose');
    await page.waitForTimeout(100);

    const modalHidden = await page.$eval('#modal', el => !el.classList.contains('active'));
    await assert(modalHidden, 'Modal closes when clicking X button');
}

async function testModalCloseOverlay() {
    console.log('\n--- Modal Close (Overlay Click) ---');

    // Re-open modal
    await page.click('.rule-card[data-rule="110"]');
    await page.waitForTimeout(200);

    const modalVisible = await page.$eval('#modal', el => el.classList.contains('active'));
    await assert(modalVisible, 'Modal opens for Rule 110');

    // Verify title for Rule 110
    const title110 = await page.textContent('#modalTitle');
    await assert(title110 === 'Rule 110', `Modal title shows "Rule 110" (got "${title110}")`);

    // Close by clicking overlay
    await page.click('#modal', { position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);

    const modalHiddenAgain = await page.$eval('#modal', el => !el.classList.contains('active'));
    await assert(modalHiddenAgain, 'Modal closes when clicking overlay');
}

async function testModalCloseEscape() {
    console.log('\n--- Modal Close (Escape Key) ---');

    // Re-open modal
    await page.click('.rule-card[data-rule="90"]');
    await page.waitForTimeout(200);

    const modalOpen = await page.$eval('#modal', el => el.classList.contains('active'));
    await assert(modalOpen, 'Modal opens for Rule 90');

    // Close with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    const modalClosed = await page.$eval('#modal', el => !el.classList.contains('active'));
    await assert(modalClosed, 'Modal closes when pressing Escape');
}

async function testCAEngine() {
    console.log('\n--- CA Engine (in-page) ---');

    // Test ruleToLookupTable
    const rule30Table = await page.evaluate(() => {
        const table = ruleToLookupTable(30);
        // Rule 30 = 00011110
        return [table[0], table[1], table[2], table[3], table[4], table[5], table[6], table[7]];
    });
    await assert(
        JSON.stringify(rule30Table) === JSON.stringify([0, 1, 1, 1, 1, 0, 0, 0]),
        `ruleToLookupTable(30) correct: [${rule30Table}]`
    );

    // Test Rule 0
    const rule0Table = await page.evaluate(() => {
        const table = ruleToLookupTable(0);
        return Object.values(table).every(v => v === 0);
    });
    await assert(rule0Table, 'ruleToLookupTable(0) all zeros');

    // Test Rule 255
    const rule255Table = await page.evaluate(() => {
        const table = ruleToLookupTable(255);
        return Object.values(table).every(v => v === 1);
    });
    await assert(rule255Table, 'ruleToLookupTable(255) all ones');

    // Test evolveRow
    const evolveResult = await page.evaluate(() => {
        const table = ruleToLookupTable(30);
        const row = [0, 0, 0, 0, 1, 0, 0, 0, 0];
        return evolveRow(row, table);
    });
    // With center cell 1 and rule 30, neighbors 0,1,0=010=2 -> table[2]=1, etc.
    await assert(evolveResult.length === 9, `evolveRow produces correct length (${evolveResult.length})`);
    await assert(evolveResult[3] === 1 && evolveResult[4] === 1 && evolveResult[5] === 1,
        `Rule 30 evolves center cell correctly`);

    // Test wrap-around
    const wrapResult = await page.evaluate(() => {
        const table = ruleToLookupTable(30);
        const row = [1, 0, 0, 0, 0];
        return evolveRow(row, table);
    });
    await assert(wrapResult[4] === 1, 'Wrap-around works: cell at end affected by cell at start');

    // Test generateGrid dimensions
    const gridDims = await page.evaluate(() => {
        const grid = generateGrid(30, 64, 32);
        return { rows: grid.length, cols: grid[0].length };
    });
    await assert(gridDims.rows === 32, `generateGrid rows = 32 (got ${gridDims.rows})`);
    await assert(gridDims.cols === 64, `generateGrid cols = 64 (got ${gridDims.cols})`);

    // Test generateCenterCell
    const centerCell = await page.evaluate(() => {
        const config = generateCenterCell(10);
        return config;
    });
    await assert(centerCell[5] === 1 && centerCell.filter(x => x === 1).length === 1,
        'generateCenterCell has single 1 at center');

    // Test generateRandom
    const randomConfig = await page.evaluate(() => {
        const config = generateRandom(1000, 0.5);
        const ones = config.filter(x => x === 1).length;
        return ones / config.length;
    });
    await assertApprox(randomConfig, 0.5, 0.1, 'generateRandom(0.5) produces ~50% density');
}

async function testMetricsFunctions() {
    console.log('\n--- Metrics Functions (in-page) ---');

    // Test computeEntropy
    const entropyAllZeros = await page.evaluate(() => computeEntropy([[0,0,0],[0,0,0]]));
    await assert(entropyAllZeros === 0, `Entropy of all-zeros grid = 0 (got ${entropyAllZeros})`);

    const entropyAllOnes = await page.evaluate(() => computeEntropy([[1,1,1],[1,1,1]]));
    await assert(entropyAllOnes === 0, `Entropy of all-ones grid = 0 (got ${entropyAllOnes})`);

    const entropyHalf = await page.evaluate(() => computeEntropy([[1,0],[0,1]]));
    await assertApprox(entropyHalf, 1.0, 0.01, 'Entropy of 50/50 grid ≈ 1.0');

    // Test computeDensity
    const densityAllZeros = await page.evaluate(() => computeDensity([[0,0],[0,0]]));
    await assert(densityAllZeros === 0, `Density of all-zeros = 0`);

    const densityAllOnes = await page.evaluate(() => computeDensity([[1,1],[1,1]]));
    await assert(densityAllOnes === 1, `Density of all-ones = 1`);

    const densityHalf = await page.evaluate(() => computeDensity([[1,0],[0,1]]));
    await assert(densityHalf === 0.5, `Density of 50/50 = 0.5 (got ${densityHalf})`);

    // Test computeSymmetry with symmetric grid
    const symPerfect = await page.evaluate(() => computeSymmetry([[1,0,1],[0,1,0]]));
    await assert(symPerfect === 1, `Perfectly symmetric grid has symmetry 1.0 (got ${symPerfect})`);

    // Test classifyWolfram returns valid class
    const class30 = await page.evaluate(() => {
        const grid = generateGrid(30, 128, 128);
        const m = computeAllMetrics(30, grid, generateCenterCell(128));
        return m.wolframClass;
    });
    await assert(['I', 'II', 'III', 'IV'].includes(class30), `Rule 30 classified as valid class (got ${class30})`);
    await assert(class30 === 'III', `Rule 30 classified as Class III (got ${class30})`);

    // Test detectPeriod
    const periodStatic = await page.evaluate(() => detectPeriod([[0,0,0],[0,0,0],[0,0,0]]));
    await assert(periodStatic === 1, `Static grid has period 1 (got ${periodStatic})`);
}

async function testDarkTheme() {
    console.log('\n--- Dark Theme ---');

    const bodyBg = await page.$eval('body', el => getComputedStyle(el).backgroundColor);
    await assert(bodyBg !== 'rgb(255, 255, 255)', `Body background is not white (is ${bodyBg})`);

    const cardBg = await page.$eval('.rule-card', el => getComputedStyle(el).backgroundColor);
    await assert(cardBg !== 'rgb(255, 255, 255)', `Card background is dark (is ${cardBg})`);
}

async function testResponsiveGrid() {
    console.log('\n--- Responsive Grid ---');

    const gridDisplay = await page.$eval('.grid-container', el => getComputedStyle(el).display);
    await assert(gridDisplay === 'grid', `Grid container uses CSS Grid (got ${gridDisplay})`);

    const gridCols = await page.$eval('.grid-container', el => getComputedStyle(el).gridTemplateColumns);
    await assert(gridCols !== '' && gridCols !== 'none', `Grid has column template (got ${gridCols})`);
}

async function testCardInteractivity() {
    console.log('\n--- Card Interactivity ---');

    // Cards should have cursor pointer
    const cursor = await page.$eval('.rule-card', el => getComputedStyle(el).cursor);
    await assert(cursor === 'pointer', `Cards have pointer cursor (got ${cursor})`);

    // Cards should have data-rule attribute
    const dataRule = await page.$eval('.rule-card:nth-child(31)', el => el.dataset.rule);
    await assert(dataRule === '30', `Card 31 has data-rule="30" (got "${dataRule}")`);
}

async function testNoConsoleErrors() {
    console.log('\n--- No Console Errors ---');
    // This check is done via the consoleErrors array populated during page load
    await assert(consoleErrors.length === 0,
        `No console errors (found ${consoleErrors.length}: ${consoleErrors.join(', ')})`);
}

async function testModalForDifferentRules() {
    console.log('\n--- Modal for Different Rules ---');

    // Test Rule 0
    await page.click('.rule-card[data-rule="0"]');
    await page.waitForTimeout(200);
    const title0 = await page.textContent('#modalTitle');
    await assert(title0 === 'Rule 0', `Modal works for Rule 0`);
    const binary0 = await page.textContent('#modalBinary');
    await assert(binary0 === 'Binary: 00000000', `Rule 0 binary correct (got "${binary0}")`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Test Rule 255
    await page.click('.rule-card[data-rule="255"]');
    await page.waitForTimeout(200);
    const title255 = await page.textContent('#modalTitle');
    await assert(title255 === 'Rule 255', `Modal works for Rule 255`);
    const binary255 = await page.textContent('#modalBinary');
    await assert(binary255 === 'Binary: 11111111', `Rule 255 binary correct (got "${binary255}")`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Test Rule 110
    await page.click('.rule-card[data-rule="110"]');
    await page.waitForTimeout(200);
    const title110 = await page.textContent('#modalTitle');
    await assert(title110 === 'Rule 110', `Modal works for Rule 110`);
    const binary110 = await page.textContent('#modalBinary');
    await assert(binary110 === 'Binary: 01101110', `Rule 110 binary correct (got "${binary110}")`);
    await page.keyboard.press('Escape');
}

// ============================================
// RUNNER
// ============================================

let consoleErrors = [];

async function run() {
    console.log('🧪 Playwright Test Suite for 1D Cellular Automata Explorer');
    console.log('='.repeat(60));

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();

    // Track console errors
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(err.message));

    try {
        await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

        // Run all tests
        await testPageLoads();
        await testHeaderPresent();
        await testControlsPanel();
        await testGridRendering();
        await testCanvasRendering();
        await testMetricsDisplay();
        await testDarkTheme();
        await testResponsiveGrid();
        await testCardInteractivity();
        await testCAEngine();
        await testMetricsFunctions();
        await testModeToggle();
        await testDensitySlider();
        await testRandomizeButton();
        await testModalOpens();
        await testModalTruthTable();
        await testModalMetricsTable();
        await testModalCloseButton();
        await testModalCloseOverlay();
        await testModalCloseEscape();
        await testModalForDifferentRules();
        await testNoConsoleErrors();

    } catch (err) {
        console.error('\n💥 Fatal error:', err.message);
        failed++;
    } finally {
        await browser.close();
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
    if (failures.length > 0) {
        console.log('\nFailed tests:');
        failures.forEach(f => console.log(`  - ${f}`));
    }
    console.log('='.repeat(60));

    process.exit(failed > 0 ? 1 : 0);
}

run();
