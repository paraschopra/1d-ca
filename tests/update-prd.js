const fs = require('fs');
const path = require('path');

// Read PRD
const prdPath = path.resolve(__dirname, '../sprints/initial/prd.json');
const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));

// Task index to update (0-based)
const taskIndex = parseInt(process.argv[2]);
const passValue = process.argv[3] === 'true';

if (isNaN(taskIndex) || taskIndex < 0 || taskIndex >= prd.length) {
    console.error('Invalid task index');
    process.exit(1);
}

prd[taskIndex].passes = passValue;

// Write back
fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));
console.log(`Task ${taskIndex} updated: passes = ${passValue}`);
