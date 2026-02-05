# 1D Cellular Automata Explorer

A self-contained HTML application for exploring all 256 elementary cellular automata rules.

## Project Structure

```
1d-ca/
├── src/
│   └── index.html              # Main application (self-contained HTML/CSS/JS)
├── tests/
│   ├── ca-engine.test.html     # Core engine + metrics test suite (53 tests)
│   ├── run-tests-jsdom.js      # JSDOM test runner
│   ├── verify-all.js           # Full feature verification (41 checks)
│   └── update-prd.js           # Helper to update PRD task status
├── sprints/
│   └── initial/                # Sprint tracking (prd.json, progress.txt)
└── README.md
```

## Features

- All 256 elementary CA rules displayed in responsive grid
- 128x128 grid per rule with wrap-around (periodic) boundaries
- Center cell or random initial configurations with density slider
- Metrics: entropy, density, mean field, Wolfram class, symmetry, Lyapunov exponent, compressibility, period detection
- Click to expand: 512x512 high-res view with truth table and detailed metrics
- Chunked rendering with requestAnimationFrame for responsiveness

## Running Tests

```bash
cd tests && node run-tests-jsdom.js    # Core engine + metrics tests
cd tests && node verify-all.js         # Full feature verification
```
