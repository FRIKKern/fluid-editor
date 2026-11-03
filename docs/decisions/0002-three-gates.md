# 0002 Three gates turn "1:1" into numbers

Date: 2026-11-03 · Status: accepted

| Gate | Input | Output | Script |
|---|---|---|---|
| A | Captured section CSS | Same CSS from our model | `scripts/check-render.mjs` |
| B | Oracle page and our page | Block boxes within 1px at 5 widths | M0 step H4 |
| C | Recorded gesture | Same block areas after replay | M0 steps H6 and H7 |

## Context

"Looks the same" is an opinion. Matching decompilation projects solved this by making correctness a test a machine decides, then iterating against it. We do the same for an editor.

## Decision

Gate A checks the published CSS text. It is exact and cheap, and the first run passed 24 of 24 sections from 3 sites.

Gate B checks layout. It compares block boxes, not pixels, so font rendering and image loading do not cause false failures. For each section it swaps only the grid CSS and keeps the page's own fonts and block styles, so a failure points at the grid.

Gate C checks the editor. A trace stores the state before a gesture, the gesture and the state after, on the oracle. Replaying it in our editor must give the same `grid-area`, z-index and row count for every block.

Each gate writes a report to `parity/`. An empty corpus fails. A change that lowers a pass count does not merge.

## Considered

- **Pixel diff screenshots.** Kept for chrome only (J12): for layout it fails on antialiasing and late images.
- **Unit tests per function.** Too far from what a person sees; they pass while the editor feels wrong.
