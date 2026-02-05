const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function visualTest() {
    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();

        // Set viewport
        await page.setViewportSize({ width: 1400, height: 2000 });

        // Navigate to index.html
        const htmlPath = path.resolve(__dirname, '../src/index.html');
        await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle' });

        // Wait a bit for rendering to complete
        await page.waitForTimeout(2000);

        // Count rendered canvases
        const canvasCount = await page.evaluate(() => {
            return document.querySelectorAll('canvas').length;
        });

        console.log(`Rendered ${canvasCount} canvases`);

        // Check specific rules
        const rules = [0, 30, 90, 110, 184, 255];
        for (const ruleNum of rules) {
            const hasCanvas = await page.evaluate((rule) => {
                const cards = document.querySelectorAll('.rule-card');
                for (const card of cards) {
                    const label = card.querySelector('.rule-number');
                    if (label && label.textContent === `Rule ${rule}`) {
                        const canvas = card.querySelector('canvas');
                        return canvas && canvas.width > 0 && canvas.height > 0;
                    }
                }
                return false;
            }, ruleNum);

            console.log(`Rule ${ruleNum}: ${hasCanvas ? '✓ rendered' : '✗ missing'}`);
        }

        // Take screenshot
        const screenshotPath = path.resolve(__dirname, '../src/screenshot.png');
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`\nScreenshot saved to: ${screenshotPath}`);

        // Check Rule 30 pattern visually
        const rule30Data = await page.evaluate(() => {
            const cards = document.querySelectorAll('.rule-card');
            for (const card of cards) {
                const label = card.querySelector('.rule-number');
                if (label && label.textContent === 'Rule 30') {
                    const canvas = card.querySelector('canvas');
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        // Check if there's a mix of black and white pixels (not all uniform)
                        let blackPixels = 0;
                        let whitePixels = 0;

                        for (let i = 0; i < imageData.data.length; i += 4) {
                            if (imageData.data[i] === 0) blackPixels++;
                            else if (imageData.data[i] === 255) whitePixels++;
                        }

                        return { blackPixels, whitePixels, total: canvas.width * canvas.height };
                    }
                }
            }
            return null;
        });

        if (rule30Data) {
            const density = rule30Data.blackPixels / rule30Data.total;
            console.log(`\nRule 30 pattern analysis:`);
            console.log(`  Black pixels: ${rule30Data.blackPixels}`);
            console.log(`  White pixels: ${rule30Data.whitePixels}`);
            console.log(`  Density: ${(density * 100).toFixed(2)}%`);
            console.log(`  Pattern verified: ${density > 0.1 && density < 0.9 ? '✓' : '✗'}`);
        }

        await browser.close();

        return canvasCount === 256 ? 0 : 1;

    } catch (error) {
        console.error('Visual test failed:', error);
        await browser.close();
        return 1;
    }
}

visualTest().then(exitCode => {
    process.exit(exitCode);
});
