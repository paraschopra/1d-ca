const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

async function runTests(testFile) {
    try {
        const testPath = path.resolve(__dirname, testFile);
        const html = fs.readFileSync(testPath, 'utf8');

        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            url: `file://${testPath}`
        });

        // Wait for document to be ready and scripts to execute
        await new Promise((resolve) => {
            dom.window.addEventListener('load', () => {
                // Give scripts extra time to run
                setTimeout(resolve, 100);
            });
        });

        // Extract test results
        const document = dom.window.document;
        const summaryDiv = document.getElementById('summary');
        const resultsDiv = document.getElementById('results');

        if (!summaryDiv || !resultsDiv) {
            throw new Error('Test results not found - tests may not have run');
        }

        const passed = resultsDiv.querySelectorAll('.pass').length;
        const failed = resultsDiv.querySelectorAll('.fail').length;
        const total = passed + failed;

        console.log('\n' + '='.repeat(60));
        console.log(`Test Results for ${testFile}`);
        console.log('='.repeat(60));

        // Print individual results
        const results = resultsDiv.querySelectorAll('.test-result');
        results.forEach(result => {
            console.log(result.textContent);
        });

        console.log('\n' + '='.repeat(60));
        console.log(`Total: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${failed}`);
        console.log(`Success Rate: ${total > 0 ? ((passed/total)*100).toFixed(1) : 0}%`);
        console.log('='.repeat(60) + '\n');

        return failed === 0 ? 0 : 1;

    } catch (error) {
        console.error('Test execution failed:', error);
        return 1;
    }
}

// Run the test file passed as argument, or default to ca-engine.test.html
const testFile = process.argv[2] || 'ca-engine.test.html';
runTests(testFile).then(exitCode => {
    process.exit(exitCode);
});
