# Sprint v3 Review: Metric Tooltips

**Date**: 2026-02-09
**Sprint scope**: Add hover tooltips explaining all 10 CA metrics across 4 UI surfaces
**Commits**: `f3eb814` (PRD), `d4a7955` (implementation)
**Files modified**: `src/v2-research-tools.html` (+124 lines), `tests/metric-tooltips.js` (new, 361 lines)

## Features Completed (5/5)

| # | Category | Description | Status |
|---|----------|-------------|--------|
| 1 | Tooltip Definitions | Centralized `metricTooltips` object with 10 keys | Pass |
| 2 | Tooltip CSS Component | Pure-CSS hover tooltip with delay, caret, theme matching | Pass |
| 3 | Integration — Rule Cards | Tooltips on 7 elements per card (class badge + 6 metrics) | Pass |
| 4 | Integration — Modal | Tooltips on all 10 metric name cells in detail modal | Pass |
| 5 | Integration — Phase/Rule Map | Tooltips on 6 phase checkboxes + 2 rule map info icons | Pass |

---

## Executive Summary

This sprint added a tooltip system that explains every metric in the 1D CA explorer to users on hover. A centralized JavaScript object (`metricTooltips`) stores plain-English definitions for all 10 metrics. A pure-CSS component using `::after`/`::before` pseudo-elements renders themed tooltip popups with a green-bordered dark box and a caret arrow. The definitions were wired into all 4 UI surfaces where metrics appear: rule cards, modal detail view, phase explorer checkboxes, and rule map dropdowns. The entire sprint was implemented in a single commit with 21 Playwright tests covering definitions, CSS behavior, and all integration points.

---

## Per-Feature Deep Dive

### Feature 1: Tooltip Definitions

**What it does**: Provides a single source of truth for metric explanations. Any UI surface that needs to explain a metric looks up the text from this object rather than hardcoding strings.

**File**: `src/v2-research-tools.html` (lines 682–693)

**Key data structure**:

```js
const metricTooltips = {
    entropy:        "Shannon entropy of cell states across..." (217 chars)
    density:        "Fraction of cells that are alive..."     (132 chars)
    meanField:      "Average density of alive cells..."       (171 chars)
    wolframClass:   "Wolfram behavioral classification..."    (228 chars)
    symmetry:       "Left-right mirror symmetry..."           (189 chars)
    lyapunov:       "Lyapunov exponent — measures..."         (206 chars)
    compressibility:"Run-length encoding compression..."      (216 chars)
    period:         "Temporal repetition period..."            (186 chars)
    entropyRate:    "Entropy rate (h) — bits of new..."       (213 chars)
    excessEntropy:  "Excess entropy (E) — total stored..."    (213 chars)
};
```

**Content structure per tooltip**: Each explains (1) what the metric measures, (2) its value range, and (3) what high/low values mean for CA behavior. All written in 1–3 sentences for a curious non-expert.

**Design decision**: The object is a `const` at module scope (not inside a function), so it's available to both the card renderer, modal builder, phase checkbox builder, and the rule map axis helper. Using metric keys (`entropy`, `lyapunov`, etc.) rather than display labels ensures consistency even if display names change.

---

### Feature 2: Tooltip CSS Component

**What it does**: A reusable, zero-JS tooltip that any element can opt into by adding `class="has-tooltip"` and `data-tooltip="..."`.

**File**: `src/v2-research-tools.html` (lines 442–494, CSS section)

**CSS rules**:

| Selector | Purpose | Key Properties |
|----------|---------|----------------|
| `.has-tooltip` | Base style for tooltip-enabled elements | `position: relative`, `cursor: help`, `border-bottom: 1px dotted #555` |
| `.has-tooltip::after` | The tooltip text box | `content: attr(data-tooltip)`, `position: absolute`, `bottom: calc(100% + 8px)`, `background: #1a1a1a`, `border: 1px solid #00ff88`, `max-width: 280px`, `z-index: 10000`, `opacity: 0`, `pointer-events: none`, `transition: ... 0.25s` |
| `.has-tooltip::before` | The caret arrow pointing down | `border: 6px solid transparent`, `border-top-color: #00ff88`, `z-index: 10001` |
| `.has-tooltip:hover::after/::before` | Show on hover | `opacity: 1`, `visibility: visible` |

**How it works**:

```
                    ┌──────────────────────────┐
                    │  Tooltip text from        │  ← ::after pseudo-element
                    │  data-tooltip attribute   │     (dark bg, green border)
                    └────────────┬─────────────┘
                                 ▼                   ← ::before (caret arrow)
                        [Entropy:]                   ← .has-tooltip element
```

**Key design choices**:
- **Pure CSS**: No JavaScript event handlers needed. The `content: attr(data-tooltip)` CSS function reads directly from the HTML attribute.
- **250ms delay**: The `transition: opacity 0.2s ease 0.25s` adds a 250ms delay before the tooltip appears, preventing flickering on casual mouse sweeps.
- **`pointer-events: none`**: The tooltip box doesn't capture mouse events, so it can't steal hover or cause flicker when the cursor crosses the tooltip area (addresses a concern Codex raised in the design review).
- **`z-index: 10000`**: High enough to render above the modal overlay (which is typically z-index 1000–9999).
- **Centered with `left: 50%; transform: translateX(-50%)`**: The tooltip appears centered above its trigger element.
- **`max-width: 280px` + `white-space: normal`**: Long text wraps naturally within the box.

**Tradeoffs**:
- **No viewport collision detection**: Pure CSS can't dynamically reposition if the tooltip overflows the viewport edge. This was an accepted tradeoff for simplicity — most metric labels are not near viewport edges.
- **No touch/keyboard support**: Hover-only. Acceptable for a desktop research tool.

---

### Feature 3: Integration — Rule Cards

**What it does**: Every rule card (256 total) now has 7 tooltip-enabled metric labels.

**File**: `src/v2-research-tools.html`, `formatMetricsHTML()` function (lines 1792–1804)

**Before → After**:

```html
<!-- Before -->
<span class="metric-label">Entropy:</span>

<!-- After -->
<span class="metric-label has-tooltip" data-tooltip="Shannon entropy of...">Entropy:</span>
```

**Elements with tooltips per card**:
1. Wolfram Class badge (`.wolfram-class` span)
2. Entropy label
3. Density label
4. Symmetry label
5. Period label
6. `h:` (entropy rate) label
7. `E:` (excess entropy) label

**Data flow**:

```
metricTooltips.entropy ──→ data-tooltip attribute ──→ CSS ::after content
     (JS object)              (HTML attribute)         (rendered on hover)
```

The `formatMetricsHTML(m)` function is called once per card during the chunked grid rendering loop. Since tooltip text is injected via template literal at card creation time, there's no runtime overhead from 256 × 7 = 1,792 tooltip-enabled elements — the CSS pseudo-elements are only created on hover.

---

### Feature 4: Integration — Modal Metrics Table

**What it does**: All 10 metric name cells in the modal detail view have tooltips.

**File**: `src/v2-research-tools.html`, `openModal()` function (lines 2011–2022)

**Before → After**:

```html
<!-- Before -->
<tr><td>Lyapunov Exp.</td><td>0.4321</td></tr>

<!-- After -->
<tr><td class="has-tooltip" data-tooltip="Lyapunov exponent — measures...">Lyapunov Exp.</td><td>0.4321</td></tr>
```

All 10 metrics in the table: Entropy, Density, Mean Field, Wolfram Class, Symmetry, Lyapunov Exp., Compressibility, Period, Entropy Rate, Excess Entropy.

**z-index consideration**: The tooltip `z-index: 10000` is above the modal overlay (which uses z-index values in the 1000 range), so tooltips render correctly inside the modal.

---

### Feature 5: Integration — Phase Explorer & Rule Map

**What it does**: Two separate integration points:

**A. Phase Explorer checkboxes** (6 checkboxes)

**File**: `src/v2-research-tools.html`, `buildPhaseCheckboxes()` IIFE (lines 2520–2522)

Two lines added to the existing checkbox builder loop:
```js
label.classList.add('has-tooltip');
label.setAttribute('data-tooltip', metricTooltips[m.key] || '');
```

Each `PHASE_METRICS` entry has a `.key` property (e.g., `'entropy'`, `'lyapunov'`) that maps directly to a `metricTooltips` key. The `|| ''` fallback is defensive but never triggers since all 6 phase metrics exist in the tooltip object.

**B. Rule Map axis info icons** (2 icons)

**File**: `src/v2-research-tools.html`
- HTML: lines 552, 565 (new `<span>` elements)
- JS: `updateAxisInfoTooltips()` function (lines 2275–2291)

**HTML added**:
```html
<span id="xAxisInfo" class="has-tooltip" style="color: #888; font-size: 14px; cursor: help;"></span>
<!-- (similarly for yAxisInfo) -->
```

**JS function** `updateAxisInfoTooltips()` (line 2275):
- Reads current dropdown value via `document.getElementById('xAxisMetric').value`
- Looks up tooltip text: `metricTooltips[xKey]`
- Sets the span's `textContent` to `ⓘ` (Unicode circled-i, `\u24D8`)
- Sets `data-tooltip` attribute to the metric's explanation
- Called on page load and on each dropdown `change` event

```
User changes dropdown → 'change' event → updateAxisInfoTooltips()
                                              ↓
                              reads xAxisMetric.value (e.g., 'density')
                                              ↓
                              sets xAxisInfo data-tooltip = metricTooltips['density']
                                              ↓
                              hover on ⓘ shows "Fraction of cells that are alive..."
```

---

## Tests

**File**: `tests/metric-tooltips.js` (361 lines, 21 tests)

All tests run in headless Chromium via Playwright, loading the HTML file directly.

| # | Category | Test | What it verifies |
|---|----------|------|------------------|
| 1 | Definitions | `metricTooltips has all 10 keys` | Object exists with correct keys |
| 2 | Definitions | `All tooltips are non-empty strings (20-500 chars)` | Length bounds |
| 3 | Definitions | `Entropy tooltip mentions Shannon entropy and disorder/random` | Content accuracy |
| 4 | Definitions | `Lyapunov tooltip mentions sensitivity or chaos` | Content accuracy |
| 5 | Definitions | `Wolfram Class tooltip mentions all 4 classes` | Content completeness |
| 6 | Definitions | `Entropy Rate tooltip mentions bits/information` | Content accuracy |
| 7 | CSS | `.has-tooltip CSS class exists` | Stylesheet contains the rule |
| 8 | CSS | `.has-tooltip elements have data-tooltip attribute` | HTML structure correct |
| 9 | CSS | `Tooltip becomes visible on hover` | Hover triggers opacity=1 |
| 10 | CSS | `Tooltip CSS styling properties exist` | max-width, font-size, border-radius |
| 11 | Cards | `Rule card has 7 tooltip-enabled metric labels` | Count of .has-tooltip in card |
| 12 | Cards | `Card 'Entropy' label has correct tooltip` | data-tooltip contains "Shannon" |
| 13 | Cards | `Wolfram Class badge has tooltip` | Class badge has .has-tooltip |
| 14 | Cards | `Clicking card still opens modal` | No tooltip interference |
| 15 | Modal | `Modal metrics table has 10/10 tooltip-enabled cells` | All 10 metrics covered |
| 16 | Modal | `Modal 'Lyapunov Exp.' has tooltip` | Correct td has data-tooltip |
| 17 | Phase | `Phase Explorer has 6/6 tooltip-enabled checkbox labels` | All 6 checkboxes |
| 18 | Phase | `Phase 'Entropy' checkbox has tooltip` | Content present |
| 19 | Phase | `Phase checkbox toggling still works with tooltips` | No interaction interference |
| 20 | Rule Map | `Rule Map axis controls have tooltip elements` | >= 2 .has-tooltip in controls |
| 21 | Rule Map | `Rule Map tooltip has descriptive text` | Non-empty data-tooltip |

**Test output**: 21 passed, 0 failed.

**Regression testing**: Existing test suites (block-entropy-display: 7/7, tab-navigation: 15/15, phase-explorer: 13/13) all pass with no regressions.

---

## Cross-Feature Concerns

### Shared pattern: `has-tooltip` + `data-tooltip`

All 4 integration points use the same mechanism:
1. Add `class="has-tooltip"` to enable CSS tooltip behavior
2. Set `data-tooltip="..."` with the explanation text
3. CSS handles all rendering via pseudo-elements

This means adding tooltips to any future UI element requires zero JavaScript — just the two HTML attributes.

### Configuration & constants

| Constant | Location | Value | Purpose |
|----------|----------|-------|---------|
| `metricTooltips` | line 682 | Object with 10 keys | Single source of truth for all tooltip text |
| Tooltip max-width | CSS line 466 | `280px` | Controls text wrapping width |
| Tooltip delay | CSS line 475 | `0.25s` | Hover delay before showing |
| Tooltip z-index | CSS line 471 | `10000` | Ensures visibility above modal |
| Caret border | CSS line 484 | `6px` | Size of the pointing arrow |

### Performance

- **No runtime overhead for 256 cards**: Tooltip text is set as HTML attributes at card creation time. CSS `::after` pseudo-elements are only instantiated on hover (not in the DOM tree).
- **No event listeners added**: Pure CSS approach means zero JavaScript overhead per tooltip interaction.

---

## Design Decisions & Tradeoffs

| Decision | Why | Alternative not taken |
|----------|-----|----------------------|
| Pure CSS tooltips | Zero JS overhead, works everywhere `.has-tooltip` is added, matches project's no-external-deps philosophy | JS tooltip library (Tippy.js, etc.) — would add dependency |
| Centralized `metricTooltips` object | Single source of truth, easy to update text without touching 4 integration points | Inline tooltip text in each template — would cause drift between surfaces |
| `::after` pseudo-element with `content: attr()` | CSS reads tooltip text directly from HTML attribute — no JS rendering needed | Hidden child `<div>` toggled on hover — adds DOM weight |
| 250ms hover delay | Prevents flickering when user sweeps mouse across dense metric labels on cards | No delay (immediate) — would be distracting |
| Unicode ⓘ icon for rule map | Compact, doesn't break layout, universally recognizable | Text label "What is this?" — too verbose for inline placement |

---

## Open Questions & Suggestions

1. **Tooltip clipping near viewport edges**: If a card is near the top of the viewport, its tooltip (which appears above) could be cut off. A small JS helper could detect this and flip the tooltip below. Low priority since most interactions happen mid-viewport.

2. **Touch device support**: Tooltips are hover-only. If the app is ever used on tablets, a tap-to-toggle mechanism would be needed. The `data-tooltip` attribute is already in place, so adding a JS tap handler would be straightforward.

3. **Content consistency with actual computation**: The tooltip for compressibility says "run-length encoding compression ratio" which accurately describes `computeCompressibility()` at line 742. If the compression algorithm changes, the tooltip text needs to be updated manually. Consider adding a comment in `computeCompressibility()` pointing to the tooltip.

4. **Missing tooltips on Light Cones tab**: The Light Cones tab displays "Speed" and "Cone angle" metrics that don't have tooltips. These aren't part of the standard 10 metrics in `metricTooltips`, but could be added as `propagationSpeed` and `coneAngle` keys if desired.

5. **README.md is outdated**: The README still says "Phase Transition Explorer: (coming soon)" and "Block Entropy: (coming soon)" — both were completed in v2. It also doesn't mention the v3 tooltip feature or the new test file `tests/metric-tooltips.js`.
