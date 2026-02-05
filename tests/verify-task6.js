const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function verifyTask6() {
    const htmlPath = path.resolve(__dirname, '../src/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const dom = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: 'usable',
        beforeParse(window) {
            window.HTMLCanvasElement.prototype.getContext = function(type) {
                if (type === '2d') {
                    if (!this._mockContext) {
                        this._mockContext = {
                            createImageData: (w, h) => ({
                                width: w, height: h,
                                data: new Uint8ClampedArray(w * h * 4)
                            }),
                            putImageData: function() {}
                        };
                    }
                    return this._mockContext;
                }
                return null;
            };
        }
    });

    await new Promise(resolve => {
        dom.window.addEventListener('load', () => setTimeout(resolve, 500));
    });

    const document = dom.window.document;
    let passed = 0;
    let failed = 0;

    // Test 1: Each card displays 'Rule N'
    const cards = document.querySelectorAll('.rule-card');
    let allLabelsCorrect = true;
    for (let i = 0; i < cards.length; i++) {
        const label = cards[i].querySelector('.rule-number');
        if (!label || label.textContent !== 'Rule ' + i) {
            allLabelsCorrect = false;
            break;
        }
    }
    if (allLabelsCorrect && cards.length === 256) { passed++; console.log('PASS: Each card displays Rule N'); }
    else { failed++; console.log('FAIL: Labels incorrect'); }

    // Test 2: Labels have distinct styling in CSS
    const hasLabelStyle = html.includes('.rule-number') && html.includes('font-size') && html.includes('font-weight');
    if (hasLabelStyle) { passed++; console.log('PASS: Labels have distinct styling'); }
    else { failed++; console.log('FAIL: Label styling missing'); }

    // Test 3: Cards have padding, border
    const hasCardStyle = html.includes('.rule-card') && html.includes('padding') && html.includes('border');
    if (hasCardStyle) { passed++; console.log('PASS: Cards have consistent padding/border'); }
    else { failed++; console.log('FAIL: Card styling missing'); }

    // Test 4: Label positioned above canvas
    let labelsAboveCanvas = true;
    for (const card of cards) {
        const children = Array.from(card.children);
        const labelIdx = children.findIndex(c => c.classList.contains('rule-number'));
        const canvasIdx = children.findIndex(c => c.tagName === 'CANVAS');
        if (labelIdx === -1 || canvasIdx === -1 || labelIdx > canvasIdx) {
            labelsAboveCanvas = false;
            break;
        }
    }
    if (labelsAboveCanvas) { passed++; console.log('PASS: Labels positioned above canvas'); }
    else { failed++; console.log('FAIL: Label positioning incorrect'); }

    // Test 5: No overlap (label has margin-bottom)
    const hasMargin = html.includes('margin-bottom') && html.includes('.rule-number');
    if (hasMargin) { passed++; console.log('PASS: No overlap (margin-bottom set)'); }
    else { failed++; console.log('FAIL: Potential overlap'); }

    console.log('\n' + (failed === 0 ? 'ALL TESTS PASSED' : failed + ' TESTS FAILED'));
    process.exit(failed === 0 ? 0 : 1);
}

verifyTask6();
