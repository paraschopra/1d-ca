const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function testRendering() {
    try {
        const htmlPath = path.resolve(__dirname, '../index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');

        // Mock HTMLCanvasElement
        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            beforeParse(window) {
                // Mock canvas element
                window.HTMLCanvasElement.prototype.getContext = function(type) {
                    if (type === '2d') {
                        if (!this._mockContext) {
                            this._mockContext = {
                                imageData: null,
                                createImageData: (w, h) => {
                                    return {
                                        width: w,
                                        height: h,
                                        data: new Uint8ClampedArray(w * h * 4)
                                    };
                                },
                                putImageData: function(imageData, x, y) {
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

        await new Promise(resolve => {
            dom.window.addEventListener('load', () => {
                setTimeout(resolve, 500);
            });
        });

        const document = dom.window.document;

        // Test 1: Check if all 256 canvases were created
        const canvases = document.querySelectorAll('canvas');
        console.log(`✓ Created ${canvases.length} canvases (expected: 256)`);
        const test1Pass = canvases.length === 256;

        // Test 2: Check if specific rules exist
        const testRules = [0, 30, 90, 110, 184, 255];
        let test2Pass = true;
        for (const rule of testRules) {
            const cards = document.querySelectorAll('.rule-card');
            let found = false;
            for (const card of cards) {
                const label = card.querySelector('.rule-number');
                if (label && label.textContent === `Rule ${rule}`) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`✗ Rule ${rule} not found`);
                test2Pass = false;
            }
        }
        if (test2Pass) {
            console.log(`✓ All test rules present (${testRules.join(', ')})`);
        }

        // Test 3: Check canvas dimensions
        let test3Pass = true;
        for (const canvas of canvases) {
            if (canvas.width !== 128 || canvas.height !== 128) {
                test3Pass = false;
                break;
            }
        }
        console.log(`✓ All canvases have correct dimensions (128x128): ${test3Pass}`);

        // Test 4: Check that canvases have been rendered (have context with image data)
        let renderedCount = 0;
        for (const canvas of canvases) {
            if (canvas._mockContext && canvas._mockContext.imageData) {
                renderedCount++;
            }
        }
        console.log(`✓ Rendered ${renderedCount} canvases with pixel data`);
        const test4Pass = renderedCount === 256;

        // Test 5: Check Rule 30 pattern (should have mix of black and white)
        const rule30Card = Array.from(document.querySelectorAll('.rule-card'))
            .find(card => card.querySelector('.rule-number').textContent === 'Rule 30');

        if (rule30Card) {
            const canvas = rule30Card.querySelector('canvas');
            if (canvas && canvas._mockContext && canvas._mockContext.imageData) {
                const imageData = canvas._mockContext.imageData;
                let blackPixels = 0;
                let whitePixels = 0;

                for (let i = 0; i < imageData.data.length; i += 4) {
                    if (imageData.data[i] === 0) blackPixels++;
                    else if (imageData.data[i] === 255) whitePixels++;
                }

                const total = canvas.width * canvas.height;
                const density = blackPixels / total;

                console.log(`\nRule 30 pattern analysis:`);
                console.log(`  Black pixels: ${blackPixels}`);
                console.log(`  White pixels: ${whitePixels}`);
                console.log(`  Density: ${(density * 100).toFixed(2)}%`);
                const test5Pass = density > 0.1 && density < 0.9;
                console.log(`  ${test5Pass ? '✓' : '✗'} Pattern has expected variation`);
            }
        }

        console.log('\n' + '='.repeat(60));
        const allPass = test1Pass && test2Pass && test3Pass && test4Pass;
        console.log(allPass ? 'All rendering tests PASSED' : 'Some tests FAILED');
        console.log('='.repeat(60));

        return allPass ? 0 : 1;

    } catch (error) {
        console.error('Rendering test failed:', error);
        return 1;
    }
}

testRendering().then(exitCode => {
    process.exit(exitCode);
});
