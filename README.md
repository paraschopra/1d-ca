# 1D Cellular Automata Playground

A self-contained HTML application for exploring all 256 elementary cellular automata rules.

## Project Structure

```
1d-ca/
├── index.html                         # Main app (single self-contained HTML/CSS/JS file)
├── tests/                             # Playwright headless browser tests
├── sprints/
│   ├── initial/                       # v1 sprint tracking
│   ├── v2/                            # v2 sprint tracking (prd.json, progress.txt)
│   └── v3/                            # v3 sprint tracking (tooltips, metric fixes, UI improvements)
└── README.md
```

## Features

### Grid View
- All 256 elementary CA rules displayed in responsive grid
- 128x128 grid per rule with wrap-around (periodic) boundaries
- Center cell or random initial configurations with density slider
- Sticky tab bar and controls bar for easy navigation while scrolling
- Click to expand: 512x512 high-res view with truth table, detailed metrics, and block entropy chart
- Modal density slider and randomize button for exploring different initial conditions per rule

### Metrics
- **Entropy**: Shannon entropy of cell states (0 = uniform, 1 = random)
- **Density / Mean Field**: Fraction of alive cells (global and time-averaged)
- **Wolfram Class**: 4-class behavioral classification (I–IV)
- **Symmetry**: Spatial mirror symmetry score
- **Lyapunov Exponent**: Perturbation sensitivity (positive = chaotic, negative = stable). Floors distance at 0.5 for absorbing rules
- **Compressibility**: RLE compression ratio (range [-1, 1]; negative for alternating patterns)
- **Period**: Temporal repetition detection
- **Block Entropy H(L)**: Shannon entropy of length-L patterns (L=1–8), with entropy rate h and excess entropy E
- Hover tooltips on all metric labels across all UI surfaces

### Block Entropy Chart
- Plots measured H(L) vs block length L with linear fit line (h·L + E)
- Legend distinguishing measured data from fit line
- Descriptive annotations for slope (h) and intercept (E) with qualitative labels

### Rule Space Map
- 2D scatter plot of all 256 rules by selectable metrics
- Color-coded by Wolfram class
- Click any point to open rule detail modal

### Phase Transition Explorer
- Density sweep from 0% to 100% with multi-series line chart
- Critical density detection for phase transitions

### Perturbation Light Cones
- Side-by-side comparison of two rules
- Difference heatmap showing perturbation propagation speed

## Running Tests

Playwright tests (headless browser):
```bash
npx playwright test
```

## Credits

Project by [@paraschopra](https://x.com/paraschopra)
