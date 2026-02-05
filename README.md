# 1D Cellular Automata Explorer

A self-contained HTML application for exploring all 256 elementary cellular automata rules.

## Project Structure

```
1d-ca/
├── src/
│   ├── index.html                  # Landing page linking to v1 and v2
│   ├── v1-initial-exploration.html # v1: 256 rule cards with metrics
│   └── v2-research-tools.html      # v2: tabbed research tools (Rule Map, Phase Explorer, Light Cones)
├── tests/
│   ├── ca-engine.test.html         # Core engine + metrics test suite (53 tests)
│   ├── run-tests-jsdom.js          # JSDOM test runner
│   ├── verify-all.js               # Full feature verification
│   ├── tab-navigation-playwright.js
│   ├── scatter-plot.test.html
│   ├── line-chart-legend-playwright.js
│   ├── heatmap-renderer-playwright.js
│   ├── color-scale-bar-playwright.js
│   ├── tooltip-playwright.js
│   ├── precompute-metrics-playwright.js
│   ├── rule-map-playwright.js
│   ├── rule-map-tooltip-playwright.js
│   └── rule-map-click-playwright.js
├── sprints/
│   ├── initial/                    # v1 sprint tracking
│   └── v2/                         # v2 sprint tracking (prd.json, progress.txt)
└── README.md
```

## Features

### v1 - Initial Exploration
- All 256 elementary CA rules displayed in responsive grid
- 128x128 grid per rule with wrap-around (periodic) boundaries
- Center cell or random initial configurations with density slider
- Metrics: entropy, density, mean field, Wolfram class, symmetry, Lyapunov exponent, compressibility, period detection
- Click to expand: 512x512 high-res view with truth table and detailed metrics

### v2 - Research Tools (in progress)
- **Tab Navigation**: 4 tabs with URL hash routing (Grid View, Rule Map, Phase Explorer, Light Cones)
- **Custom Charting Engine**: SVG scatter plot, line chart with legend, Canvas heatmap with color scale bar, hover tooltips
- **Rule Space Map**: 2D scatter plot of all 256 rules by selectable metrics, color-coded by Wolfram class, click-to-modal
- **Phase Transition Explorer**: (coming soon) Density sweep with multi-series line chart
- **Block Entropy**: (coming soon) H(L) computation, entropy rate, excess entropy
- **Perturbation Light Cones**: (coming soon) Difference heatmap with propagation speed

## Running Tests

```bash
cd tests && node run-tests-jsdom.js    # Core engine + metrics tests (53 tests)
cd tests && node verify-all.js         # Full feature verification
```

Playwright tests (headless browser):
```bash
cd tests && node rule-map-playwright.js           # Rule Space Map (14 tests)
cd tests && node precompute-metrics-playwright.js  # Precomputed metrics (9 tests)
cd tests && node tooltip-playwright.js             # Tooltip system (12 tests)
```
