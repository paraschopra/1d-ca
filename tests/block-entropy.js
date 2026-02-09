/**
 * Test Suite: Block Entropy & Excess Entropy (Tasks 25-28)
 *
 * Tests block frequency counter, H(L), entropy rate, and excess entropy.
 */

const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '../index.html');

async function runTests() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(`file://${HTML_PATH}`);
    await page.waitForTimeout(1000);

    let testsPassed = 0;
    let testsFailed = 0;

    console.log('\n=== Block Entropy Tests (Tasks 25-28) ===\n');

    // Task 25: Block Frequency Counter

    // Test 1: L=1 counts match simple tally
    try {
        const result = await page.evaluate(() => {
            const row = [1, 0, 1, 1, 0, 0, 1, 0]; // 4 ones, 4 zeros
            const counts = countBlockFrequencies(row, 1);
            return { zeros: counts.get(0), ones: counts.get(1) };
        });
        if (result.zeros === 4 && result.ones === 4) {
            console.log('✓ Test 1: L=1 block counts match simple tally (4 zeros, 4 ones)');
            testsPassed++;
        } else {
            console.log(`✗ Test 1: Expected {0:4, 1:4}, got {0:${result.zeros}, 1:${result.ones}}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 1: Error -', e.message);
        testsFailed++;
    }

    // Test 2: L=2 counts 4 patterns with wrap-around
    try {
        const result = await page.evaluate(() => {
            const row = [1, 0, 1, 0]; // patterns: 10, 01, 10, 01 (with wrap)
            const counts = countBlockFrequencies(row, 2);
            const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
            return {
                total,
                p10: counts.get(2) || 0, // binary 10 = 2
                p01: counts.get(1) || 0  // binary 01 = 1
            };
        });
        if (result.total === 4 && result.p10 === 2 && result.p01 === 2) {
            console.log('✓ Test 2: L=2 block counts correct with wrap-around');
            testsPassed++;
        } else {
            console.log(`✗ Test 2: total=${result.total}, 10=${result.p10}, 01=${result.p01}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 2: Error -', e.message);
        testsFailed++;
    }

    // Test 3: Total count equals row length (sliding window with wrap)
    try {
        const result = await page.evaluate(() => {
            const row = new Array(128).fill(0).map(() => Math.round(Math.random()));
            const results = [];
            for (let L = 1; L <= 8; L++) {
                const counts = countBlockFrequencies(row, L);
                const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
                results.push({ L, total, expected: row.length });
            }
            return results;
        });
        const allCorrect = result.every(r => r.total === r.expected);
        if (allCorrect) {
            console.log('✓ Test 3: Total count equals row length for all L=1..8');
            testsPassed++;
        } else {
            const bad = result.find(r => r.total !== r.expected);
            console.log(`✗ Test 3: L=${bad.L} total=${bad.total}, expected=${bad.expected}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 3: Error -', e.message);
        testsFailed++;
    }

    // Test 4: L=8 works on 128-cell row
    try {
        const result = await page.evaluate(() => {
            const row = new Array(128).fill(0).map(() => Math.round(Math.random()));
            const counts = countBlockFrequencies(row, 8);
            const total = Array.from(counts.values()).reduce((a, b) => a + b, 0);
            const numPatterns = counts.size;
            return { total, numPatterns };
        });
        if (result.total === 128 && result.numPatterns > 0 && result.numPatterns <= 256) {
            console.log(`✓ Test 4: L=8 on 128 cells: ${result.numPatterns} distinct patterns`);
            testsPassed++;
        } else {
            console.log(`✗ Test 4: total=${result.total}, patterns=${result.numPatterns}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 4: Error -', e.message);
        testsFailed++;
    }

    // Task 26: H(L) Computation

    // Test 5: All-zeros grid → H(L) = 0 for all L
    try {
        const result = await page.evaluate(() => {
            const grid = Array.from({ length: 128 }, () => new Array(128).fill(0));
            const HL = computeBlockEntropyArray(grid);
            return HL;
        });
        const allZero = result.every(h => Math.abs(h) < 0.001);
        if (allZero) {
            console.log('✓ Test 5: All-zeros grid gives H(L)=0 for all L');
            testsPassed++;
        } else {
            console.log(`✗ Test 5: H(L) = [${result.map(h => h.toFixed(4)).join(', ')}]`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 5: Error -', e.message);
        testsFailed++;
    }

    // Test 6: H(L) is monotonically non-decreasing
    try {
        const result = await page.evaluate(() => {
            // Use Rule 30 grid for interesting data
            const ic = generateCenterCell(128);
            const grid = generateGrid(30, 128, 128, ic);
            const HL = computeBlockEntropyArray(grid);
            return HL;
        });
        let monotonic = true;
        for (let i = 1; i < result.length; i++) {
            if (result[i] < result[i - 1] - 0.001) { // Small tolerance for rounding
                monotonic = false;
                break;
            }
        }
        if (monotonic) {
            console.log(`✓ Test 6: H(L) is monotonically non-decreasing: [${result.map(h => h.toFixed(3)).join(', ')}]`);
            testsPassed++;
        } else {
            console.log(`✗ Test 6: H(L) NOT monotonic: [${result.map(h => h.toFixed(3)).join(', ')}]`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 6: Error -', e.message);
        testsFailed++;
    }

    // Test 7: H(1) approximately matches existing computeEntropy
    try {
        const result = await page.evaluate(() => {
            const ic = generateCenterCell(128);
            const grid = generateGrid(30, 128, 128, ic);
            const H1 = computeBlockEntropyArray(grid)[0];
            const existingEntropy = computeEntropy(grid);
            return { H1, existingEntropy, diff: Math.abs(H1 - existingEntropy) };
        });
        if (result.diff < 0.1) {
            console.log(`✓ Test 7: H(1)=${result.H1.toFixed(4)} ≈ computeEntropy=${result.existingEntropy.toFixed(4)} (diff=${result.diff.toFixed(4)})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 7: H(1)=${result.H1.toFixed(4)} vs computeEntropy=${result.existingEntropy.toFixed(4)} (diff=${result.diff.toFixed(4)})`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 7: Error -', e.message);
        testsFailed++;
    }

    // Test 8: H(L) produces 8 values
    try {
        const result = await page.evaluate(() => {
            const ic = generateCenterCell(128);
            const grid = generateGrid(110, 128, 128, ic);
            return computeBlockEntropyArray(grid).length;
        });
        if (result === 8) {
            console.log('✓ Test 8: H(L) returns array of exactly 8 values');
            testsPassed++;
        } else {
            console.log(`✗ Test 8: Expected 8 values, got ${result}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 8: Error -', e.message);
        testsFailed++;
    }

    // Task 27: Entropy Rate

    // Test 9: Random grid has higher entropy rate than Rule 0
    // Note: with 128 cells and L=8, finite-size bias prevents h from reaching 1.0
    try {
        const result = await page.evaluate(() => {
            const gridRand = Array.from({ length: 128 }, () =>
                Array.from({ length: 128 }, () => Math.round(Math.random()))
            );
            const HLRand = computeBlockEntropyArray(gridRand);
            const hRand = computeEntropyRate(HLRand);

            const ic0 = generateCenterCell(128);
            const grid0 = generateGrid(0, 128, 128, ic0);
            const HL0 = computeBlockEntropyArray(grid0);
            const h0 = computeEntropyRate(HL0);

            return { hRand, h0 };
        });
        if (result.hRand > result.h0 && result.hRand > 0) {
            console.log(`✓ Test 9: Random entropy rate (${result.hRand.toFixed(4)}) > Rule 0 (${result.h0.toFixed(4)})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 9: Random h=${result.hRand.toFixed(4)}, Rule 0 h=${result.h0.toFixed(4)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 9: Error -', e.message);
        testsFailed++;
    }

    // Test 10: Rule 0 (all die) → entropy rate close to 0
    try {
        const result = await page.evaluate(() => {
            const ic = generateCenterCell(128);
            const grid = generateGrid(0, 128, 128, ic);
            const HL = computeBlockEntropyArray(grid);
            return computeEntropyRate(HL);
        });
        if (result >= 0 && result < 0.1) {
            console.log(`✓ Test 10: Rule 0 entropy rate ≈ 0 (got ${result.toFixed(4)})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 10: Rule 0 entropy rate = ${result.toFixed(4)}, expected ~0`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 10: Error -', e.message);
        testsFailed++;
    }

    // Test 11: Entropy rate is non-negative
    try {
        const result = await page.evaluate(() => {
            const rates = [];
            for (const rule of [0, 30, 90, 110, 150, 184, 250]) {
                const ic = generateCenterCell(128);
                const grid = generateGrid(rule, 128, 128, ic);
                const HL = computeBlockEntropyArray(grid);
                rates.push({ rule, h: computeEntropyRate(HL) });
            }
            return rates;
        });
        const allNonNeg = result.every(r => r.h >= 0);
        if (allNonNeg) {
            console.log(`✓ Test 11: Entropy rate non-negative for all tested rules`);
            testsPassed++;
        } else {
            const bad = result.find(r => r.h < 0);
            console.log(`✗ Test 11: Rule ${bad.rule} has negative rate: ${bad.h.toFixed(4)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 11: Error -', e.message);
        testsFailed++;
    }

    // Task 28: Excess Entropy

    // Test 12: All-zeros grid → excess entropy = 0
    try {
        const result = await page.evaluate(() => {
            const grid = Array.from({ length: 128 }, () => new Array(128).fill(0));
            const HL = computeBlockEntropyArray(grid);
            const h = computeEntropyRate(HL);
            return computeExcessEntropy(HL, h);
        });
        if (result >= 0 && result < 0.01) {
            console.log(`✓ Test 12: All-zeros grid excess entropy = ${result.toFixed(4)} ≈ 0`);
            testsPassed++;
        } else {
            console.log(`✗ Test 12: All-zeros grid excess entropy = ${result.toFixed(4)}, expected ~0`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 12: Error -', e.message);
        testsFailed++;
    }

    // Test 13: Rule 110 (complex) → higher excess entropy than Rule 0 (trivial)
    try {
        const result = await page.evaluate(() => {
            const ic = generateCenterCell(128);

            const grid110 = generateGrid(110, 128, 128, ic);
            const HL110 = computeBlockEntropyArray(grid110);
            const h110 = computeEntropyRate(HL110);
            const E110 = computeExcessEntropy(HL110, h110);

            const grid0 = generateGrid(0, 128, 128, ic);
            const HL0 = computeBlockEntropyArray(grid0);
            const h0 = computeEntropyRate(HL0);
            const E0 = computeExcessEntropy(HL0, h0);

            return { E110, E0 };
        });
        if (result.E110 > result.E0) {
            console.log(`✓ Test 13: Rule 110 excess entropy (${result.E110.toFixed(4)}) > Rule 0 (${result.E0.toFixed(4)})`);
            testsPassed++;
        } else {
            console.log(`✗ Test 13: Rule 110 E=${result.E110.toFixed(4)} not > Rule 0 E=${result.E0.toFixed(4)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 13: Error -', e.message);
        testsFailed++;
    }

    // Test 14: Excess entropy is non-negative (clamped)
    try {
        const result = await page.evaluate(() => {
            const values = [];
            for (const rule of [0, 30, 90, 110, 150, 184, 250]) {
                const ic = generateCenterCell(128);
                const grid = generateGrid(rule, 128, 128, ic);
                const HL = computeBlockEntropyArray(grid);
                const h = computeEntropyRate(HL);
                values.push({ rule, E: computeExcessEntropy(HL, h) });
            }
            return values;
        });
        const allNonNeg = result.every(r => r.E >= 0);
        if (allNonNeg) {
            console.log('✓ Test 14: Excess entropy non-negative for all tested rules');
            testsPassed++;
        } else {
            const bad = result.find(r => r.E < 0);
            console.log(`✗ Test 14: Rule ${bad.rule} has negative E: ${bad.E.toFixed(4)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 14: Error -', e.message);
        testsFailed++;
    }

    // Test 15: computeAllMetrics includes new fields
    try {
        const result = await page.evaluate(() => {
            const ic = generateCenterCell(128);
            const grid = generateGrid(30, 128, 128, ic);
            const metrics = computeAllMetrics(30, grid, ic);
            return {
                hasBlockEntropy: Array.isArray(metrics.blockEntropy) && metrics.blockEntropy.length === 8,
                hasEntropyRate: typeof metrics.entropyRate === 'number' && isFinite(metrics.entropyRate),
                hasExcessEntropy: typeof metrics.excessEntropy === 'number' && isFinite(metrics.excessEntropy),
                // Check existing metrics still work
                hasEntropy: typeof metrics.entropy === 'number',
                hasDensity: typeof metrics.density === 'number',
                hasWolframClass: typeof metrics.wolframClass === 'string'
            };
        });
        const allPresent = result.hasBlockEntropy && result.hasEntropyRate && result.hasExcessEntropy
            && result.hasEntropy && result.hasDensity && result.hasWolframClass;
        if (allPresent) {
            console.log('✓ Test 15: computeAllMetrics includes blockEntropy, entropyRate, excessEntropy + existing fields');
            testsPassed++;
        } else {
            console.log(`✗ Test 15: Missing fields: ${JSON.stringify(result)}`);
            testsFailed++;
        }
    } catch (e) {
        console.log('✗ Test 15: Error -', e.message);
        testsFailed++;
    }

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
