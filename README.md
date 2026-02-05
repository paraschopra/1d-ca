# 1D Cellular Automata Explorer

A self-contained HTML application for exploring all 256 elementary cellular automata rules.

## Project Structure

```
1d-ca/
├── src/
│   └── index.html          # Main application (self-contained HTML/CSS/JS)
├── tests/
│   └── ca-engine.test.html # Test suite for CA engine functions
├── sprints/
│   └── initial/            # Sprint tracking (prd.json, progress.txt)
└── README.md               # This file
```

## Features

- All 256 elementary CA rules displayed in responsive grid
- 128x128 grid per rule with wrap-around boundaries
- Center cell or random initial configurations
- Metrics: entropy, density, Wolfram class, symmetry, Lyapunov exponent, etc.
- Click to expand for detailed view with truth tables

## Development

Tests are located in `tests/` directory. Open test HTML files in a browser to run them.
