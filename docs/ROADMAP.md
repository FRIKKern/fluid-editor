# Roadmap

[![Fluid editor roadmap](images/roadmap.svg)](../README.md)

Every milestone ships a reward you can see. Status lives on the board, the goal issue [#1](https://github.com/FRIKKern/fluid-editor/issues/1) and its sub-issues. Item status lives in [`parity/items.json`](../parity/items.json). This page is the list `scripts/generate-roadmap.mjs` draws.

```
M0 Harness ─► M1 Oracle page ─┬─► M2 Renderer ──────────────┬─► M5 Chrome and blocks ─► M6 Save and polish
                              └─► M3 Unknowns ─► M4 Editor ─┘
```

| Id | Milestone | Reward | Done when |
|---|---|---|---|
| M0 | Harness | 1:1 becomes a number | Box diff, trace recorder and trace replay each run on one example |
| M1 | Oracle page | The demo page exists on real Squarespace | All 8 sections built on the trial site and captured as fixtures |
| M2 | Renderer | The published page matches | Gate A 100% on 300+ sections, Gate B 100% at 5 widths |
| M3 | Unknowns | Nothing left to guess | Zero unknown items; each one answered by a stored trace or capture |
| M4 | Editor core | Drag, resize and edit feel the same | Every trace in `traces/` replays to the same end state |
| M5 | Chrome and blocks | It looks like the real editor | Toolbars, menus and block types match in screenshots and DOM reads |
| M6 | Save and polish | Ready for real work | History, publish and accessibility pass the checklist in QUALITY.md |

Box widths for every Gate B run: 375, 767, 768, 1280 and 1920px.
