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

## Future Research Directions

Potential explorations organized by depth, from immediately actionable to longer-term investigations.

### Tier 1: Highest insight-to-effort ratio

1. **Rule Space Map & Clustering** — Use the existing 8 metrics to embed all 256 rules in a 2D scatter plot (e.g. entropy vs Lyapunov, or PCA over all metrics). Color by Wolfram class. Reveals whether 4 classes capture the real structure, exposes anomalous rules, and gives an interactive "where does this rule live?" overview.

2. **Perturbation Light Cones** — For each rule, flip one cell and track how damage spreads through spacetime. Render as a heatmap showing the causal cone. Reveals information propagation speed and whether a rule absorbs or amplifies perturbations.

3. **Phase Transition Explorer (Density Sweeps)** — Sweep initial density from 0% to 100% and plot how each metric changes. Many rules undergo sharp phase transitions at specific densities, creating per-rule "phase diagrams" that reveal sensitivity to initial conditions.

4. **Block Entropy & Excess Entropy** — Compute entropy H(L) of length-L blocks along time slices and derive excess entropy E = lim(H(L) − hL). This separates randomness from structure and is the key metric for distinguishing Class III (random) from Class IV (complex).

### Tier 2: Deep structure analysis

5. **Rule Equivalence Classes** — The 256 rules collapse into 88 equivalence classes under complement, reflection, and conjugacy. Displaying this structure reduces redundancy and reveals the true space of distinct behaviors.

6. **De Bruijn Graph Analysis** — Build the de Bruijn graph (4 nodes for ECA) for each rule. Analyze cycle structure, transient lengths, and reachable configurations. Gives a structural explanation for periodicity and Garden-of-Eden states (configurations with no predecessor).

7. **Spectral Analysis (2D FFT)** — Run a 2D FFT on each rule's spacetime grid and summarize the power spectrum. Reveals hidden periodicities, glider frequencies, and quasi-periodic regimes invisible to the naked eye.

### Tier 3: Extensions beyond elementary CA

8. **Totalistic Rules (radius-2)** — Rules depend only on the sum of neighbors rather than full lookup tables. Dramatically richer behavior with fewer parameters; a natural stepping stone to general CAs.

9. **Probabilistic CAs** — Rules output probabilities instead of deterministic states. Explore phase transitions as noise level varies. Direct link to statistical physics (Ising model, contact process).

10. **Reversible (Second-Order) CAs** — State depends on the previous two time steps, making evolution invertible. Explicitly conserves information; comparing entropy over time with standard vs reversible rules is illuminating.

### Tier 4: Meta-analysis & advanced information theory

11. **Transfer Entropy (Directed Information Flow)** — Measure information transfer from left-neighbor to center vs right-neighbor to center. Reveals asymmetric information flow in non-symmetric rules.

12. **Mutual Information Decay Curves** — Plot spatial mutual information I(X(i); X(i+d)) across distance d, and temporal mutual information I(X_t; X_{t+τ}) across time lag. Quantifies correlation length and memory depth per rule.

13. **Predictive Model: Metrics as Wolfram Class Predictors** — Train a simple classifier (e.g. decision tree) on computed metrics to predict Wolfram class. Feature importance analysis reveals which metrics actually explain the classification.
