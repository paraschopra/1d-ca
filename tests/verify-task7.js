const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function verifyTask7() {
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

    // Wait for chunked rendering to complete (give enough time for all animation frames)
    await new Promise(resolve => setTimeout(resolve, 3000));

    const document = dom.window.document;
    let passed = 0;
    let failed = 0;

    // Test 1: All 256 cards present
    const cards = document.querySelectorAll('.rule-card');
    if (cards.length === 256) { passed++; console.log('PASS: All 256 cards present'); }
    else { failed++; console.log('FAIL: Expected 256 cards, got ' + cards.length); }

    // Test 2: All canvases rendered (have image data)
    let renderedCount = 0;
    for (const card of cards) {
        const canvas = card.querySelector('canvas');
        if (canvas && canvas._mockContext && canvas._mockContext.imageData) {
            renderedCount++;
        }
    }
    if (renderedCount === 256) { passed++; console.log('PASS: All 256 canvases rendered'); }
    else { failed++; console.log('FAIL: Only ' + renderedCount + ' canvases rendered'); }

    // Test 3: Spot-check specific rules
    const spotChecks = [0, 30, 90, 110, 184, 255];
    let spotPass = true;
    for (const ruleNum of spotChecks) {
        const card = document.querySelector('[data-rule="' + ruleNum + '"]');
        if (!card) { spotPass = false; console.log('FAIL: Rule ' + ruleNum + ' card missing'); }
        else {
            const canvas = card.querySelector('canvas');
            if (!canvas || !canvas._mockContext || !canvas._mockContext.imageData) {
                spotPass = false;
                console.log('FAIL: Rule ' + ruleNum + ' not rendered');
            }
        }
    }
    if (spotPass) { passed++; console.log('PASS: Spot-check rules all rendered (0, 30, 90, 110, 184, 255)'); }

    // Test 4: Uses chunked rendering (requestAnimationFrame or CHUNK_SIZE)
    const usesChunking = html.includes('requestAnimationFrame') && html.includes('CHUNK_SIZE');
    if (usesChunking) { passed++; console.log('PASS: Uses chunked rendering with requestAnimationFrame'); }
    else { failed++; console.log('FAIL: No chunked rendering detected'); }

    // Test 5: No blank canvases (check a few for non-zero image data)
    let nonBlankCount = 0;
    for (const card of [cards[30], cards[90], cards[110]]) {
        if (card) {
            const canvas = card.querySelector('canvas');
            if (canvas && canvas._mockContext && canvas._mockContext.imageData) {
                const data = canvas._mockContext.imageData.data;
                let hasBlack = false;
                for (let i = 0; i < data.length; i += 4) {
                    if (data[i] === 0 && data[i + 3] === 255) { hasBlack = true; break; }
                }
                if (hasBlack) nonBlankCount++;
            }
        }
    }
    if (nonBlankCount === 3) { passed++; console.log('PASS: Non-trivial rules have visible patterns'); }
    else { failed++; console.log('FAIL: Some non-trivial rules appear blank'); }

    console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' TESTS FAILED'));
    process.exit(failed === 0 ? 0 : 1);
}

verifyTask7();
