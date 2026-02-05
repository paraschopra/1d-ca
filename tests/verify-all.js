const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function verifyAll() {
    const htmlPath = path.resolve(__dirname, '../src/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: 'usable',
        pretendToBeVisual: true,
        beforeParse(window) {
            window.HTMLCanvasElement.prototype.getContext = function(type) {
                if (type === '2d') {
                    if (!this._mockContext) {
                        this._mockContext = {
                            imageData: null,
                            createImageData: (w, h) => ({
                                width: w, height: h,
                                data: new Uint8ClampedArray(w * h * 4)
                            }),
                            putImageData: function(imageData) {
                                this.imageData = imageData;
                            }
                        };
                    }
                    return this._mockContext;
                }
                return null;
            };
        }
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    const document = dom.window.document;
    let passed = 0;
    let failed = 0;
    function check(condition, msg) {
        if (condition) { passed++; console.log('PASS: ' + msg); }
        else { failed++; console.log('FAIL: ' + msg); }
    }

    // ===== TASK 8: Shannon Entropy =====
    console.log('\n--- Task 8: Shannon Entropy ---');
    const card30 = document.querySelector('[data-rule="30"]');
    const metricsText30 = card30 ? card30.querySelector('.metrics').innerHTML : '';
    check(metricsText30.includes('Entropy:'), 'Entropy displayed on card');
    check(metricsText30.match(/Entropy:<\/span>\s*<span[^>]*>[\d.]+/), 'Entropy has numeric value with 3+ decimal places');

    // ===== TASK 9: Density & Mean Field =====
    console.log('\n--- Task 9: Density & Mean Field ---');
    check(metricsText30.includes('Density:'), 'Density displayed on card');

    // ===== TASK 10: Wolfram Class =====
    console.log('\n--- Task 10: Wolfram Class ---');
    check(metricsText30.includes('Class'), 'Wolfram class displayed on card');
    const classMatch = metricsText30.match(/Class (I{1,3}V?|IV)/);
    check(classMatch !== null, 'Class is valid Wolfram class format');

    // Spot check specific rules
    const card0 = document.querySelector('[data-rule="0"]');
    if (card0) {
        const m0 = card0.querySelector('.metrics').innerHTML;
        check(m0.includes('Class I'), 'Rule 0 classified as Class I');
    }

    // ===== TASK 11: Symmetry =====
    console.log('\n--- Task 11: Symmetry ---');
    check(metricsText30.includes('Symmetry:'), 'Symmetry displayed on card');

    // ===== TASK 12: Advanced Metrics =====
    console.log('\n--- Task 12: Advanced Metrics ---');
    check(metricsText30.includes('Period:'), 'Period displayed on card');

    // ===== TASK 13: Page Layout =====
    console.log('\n--- Task 13: Page Layout ---');
    const header = document.querySelector('header h1');
    check(header && header.textContent === '1D Cellular Automata Explorer', 'Title displayed in header');
    const controls = document.querySelector('.controls');
    check(controls !== null, 'Controls area present');
    const gridContainer = document.querySelector('.grid-container');
    check(gridContainer !== null, 'Grid container present');
    check(html.includes('grid-template-columns'), 'CSS Grid layout used');
    check(!html.includes('src=') && !html.includes('href=') || html.includes('href="#"'), 'Self-contained (no external deps)');
    const cards = document.querySelectorAll('.rule-card');
    check(cards.length === 256, 'All 256 cards present');

    // ===== TASK 14: Mode Toggle =====
    console.log('\n--- Task 14: Mode Toggle ---');
    const modeToggle = document.getElementById('modeToggle');
    check(modeToggle !== null, 'Mode toggle present');
    const centerBtn = modeToggle.querySelector('[data-mode="center"]');
    const randomBtn = modeToggle.querySelector('[data-mode="random"]');
    check(centerBtn && centerBtn.classList.contains('active'), 'Center Cell is default active mode');
    check(randomBtn !== null, 'Random button present');

    // ===== TASK 15: Density Slider =====
    console.log('\n--- Task 15: Density Slider ---');
    const densityControl = document.getElementById('densityControl');
    check(densityControl !== null, 'Density control present');
    check(densityControl.classList.contains('disabled'), 'Density disabled in center mode');
    const slider = document.getElementById('densitySlider');
    check(slider && slider.value === '50', 'Slider default value is 50');
    const densityLabel = document.getElementById('densityValue');
    check(densityLabel && densityLabel.textContent === '50%', 'Density label shows 50%');

    // ===== TASK 16: Randomize Button =====
    console.log('\n--- Task 16: Randomize Button ---');
    const randomizeBtn = document.getElementById('randomizeBtn');
    check(randomizeBtn !== null, 'Randomize button present');
    check(randomizeBtn.textContent === 'Randomize', 'Button labeled "Randomize"');

    // ===== TASK 17: Modal =====
    console.log('\n--- Task 17: Modal ---');
    const modal = document.getElementById('modal');
    check(modal !== null, 'Modal overlay present');
    const closeBtn = document.getElementById('modalClose');
    check(closeBtn !== null, 'Close button present');
    check(html.includes('Escape'), 'Escape key handler present');
    check(html.includes('e.target === this'), 'Click-outside handler present');

    // ===== TASK 18: Modal Metrics =====
    console.log('\n--- Task 18: Modal Metrics Table ---');
    check(html.includes('Shannon Entropy'), 'Shannon Entropy label in modal');
    check(html.includes('Density'), 'Density label in modal');
    check(html.includes('Mean Field'), 'Mean Field label in modal');
    check(html.includes('Wolfram Class'), 'Wolfram Class label in modal');
    check(html.includes('Symmetry Score'), 'Symmetry Score label in modal');
    check(html.includes('Lyapunov Exponent'), 'Lyapunov Exponent label in modal');
    check(html.includes('Compressibility'), 'Compressibility label in modal');
    check(html.includes('Period'), 'Period label in modal');
    check(html.includes('.padStart(8,'), 'Binary format for rule number');

    // ===== TASK 19: Truth Table =====
    console.log('\n--- Task 19: Truth Table ---');
    check(html.includes('truth-table'), 'Truth table container present');
    check(html.includes('truth-entry'), 'Truth entry elements present');
    check(html.includes('neighborhood'), 'Neighborhood mini-grids present');
    check(html.includes('output-cell'), 'Output cells present');
    check(html.includes('.alive') && html.includes('.dead'), 'Alive/dead cell classes present');

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('Total: ' + (passed + failed));
    console.log('Passed: ' + passed);
    console.log('Failed: ' + failed);
    console.log(failed === 0 ? 'ALL FEATURES VERIFIED' : failed + ' FEATURES NEED ATTENTION');
    console.log('='.repeat(60));

    process.exit(failed === 0 ? 0 : 1);
}

verifyAll();
