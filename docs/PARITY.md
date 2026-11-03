# Parity

[![Parity: one cell per item, done, partial, open or unknown](images/parity.svg)](../README.md)

37 of 107 items done, 23 partial, 29 open, 18 unknown.
Generated from [`parity/items.json`](../parity/items.json) by `npm run parity`. Edit the JSON, never this page.

## Harness and oracle

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| H1 | CSS round trip check, `scripts/check-render.mjs` | M0 Harness | ✓ done | Gate: 351 of 351 sections match. Evidence: parity/gate-a.json |
| H2 | Fixture capture tool: URL list in, section CSS, markup, URL, date and sha256 out | M0 Harness | ✓ done | Gate: recapturing a page gives the same sha. Evidence: scripts/capture.mjs: robots.txt for "*", sitemap, 1 request per second. Recapture of alignflow-fluid-demo home: 11 of 11 section shas match fixtures/index.json, 2026-11-03 |
| H3 | Corpus of at least 300 sections from at least 30 public sites | M0 Harness | ◐ partial | Gate: covers gap 0 and 11, bleed blocks, overlap, every block type in area 3. Evidence: parity/corpus.json: 351 sections, 55 sites, gaps 0/11/20/27, 61 bleed blocks, 53 sections with overlap, 16 block types. Missing: gallery and map blocks |
| H4 | Box diff: load an oracle page and our render, compare every `.fe-block` rect | M0 Harness | ✓ done | Gate: reports pass or fail per block per width. Evidence: parity/gate-b.json: achromatic-fluid-demo home, our CSS swapped in, 70 of 70 boxes at 5 widths. With --fault the gate fails 0 of 14 at 1280px |
| H5 | Trace format, `traces/<id>.json`: before state, gesture, after state, oracle URL, date | M0 Harness | ✓ done | Gate: schema written and one trace stored. Evidence: scripts/lib/trace.mjs (format and Gate C diff), scripts/check-traces.mjs in npm run check |
| H6 | Trace recorder through cmux on the trial site | M0 Harness | ✓ done | Gate: records one keyboard move and undoes it. Evidence: traces/T0001-key-right.json: recorded by scripts/oracle-record.mjs; oracle back to the saved layout after reload |
| H7 | Trace replay in our editor through cmux | M0 Harness | ✓ done | Gate: replays H6's trace and diffs the end state. Evidence: scripts/replay.mjs replays T0001 in our editor and writes parity/gate-c.json (0 of 1: text height, see P6) |
| H8 | Status report: `npm run status` prints counts per area and milestone | M0 Harness | ✓ done | Gate: runs in CI or by hand with no errors. Evidence: npm run status prints milestones and areas with board state |
| H9 | Git repo with fixtures and traces kept out of history | M0 Harness | ✓ done | Gate: first commit made. Evidence: FRIKKern/fluid-editor, first commit 383848b, checks and housekeeping green |
| O1 | Build the 8 demo sections on the trial site with the same grid areas as `src/demo.js`. Needs approval: this saves the trial site | M1 Oracle page | ○ open |  |
| O2 | Capture the 8 sections as fixtures, both layouts | M1 Oracle page | ○ open |  |
| O3 | Copy measured section padding, fonts and type sizes into `src/site.css` | M1 Oracle page | ○ open |  |

## Published grid CSS

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| C1 | 26 tracks, 24 or 8 content columns plus 2 gutter tracks | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C2 | `--cell-max-width` from site max width and gap | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C3 | Row minimum: container width times 0.0215 on desktop, 24px on phones | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C4 | Gap subtracted from the outer gutter | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C5 | Mobile-first CSS, switch at `min-width: 768px` | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C6 | `grid-area` start and end lines and z-index per layout | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C7 | `justify-content` and `align-items` per layout | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C8 | `overflow-x: clip` | M2 Renderer | ✓ done | Evidence: parity/gate-a.json |
| C9 | Inset content width: CSS emitted, no setting yet | M2 Renderer | ◐ partial |  |
| C10 | Content of the `@media (max-width: 767px)` block inside each block rule | M2 Renderer | ✓ done | Evidence: Empty in all 1347 block rules of 351 captured sections; Gate A 351 of 351 |
| C11 | Other per-block CSS for other block types and settings | M2 Renderer | ✓ done | Evidence: Gate A 351 of 351: the only other per-block CSS is sticky (C12). Gallery and map blocks not in the corpus yet (H3) |
| C12 | Sticky blocks: position sticky with a top, center or bottom anchor and an offset, desktop only | M2 Renderer | ✓ done | Evidence: Found in 11 blocks of the corpus; Gate A 351 of 351 |
| C13 | Separate row gap and column gap; the column gap sets the gutter and cell width | M2 Renderer | ✓ done | Evidence: just-my-type and river demos use 11px rows with 27px and 20px columns; Gate A 351 of 351 |

## Page and site context

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| P1 | Site variables for the trial site | M2 Renderer | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| P2 | Section wrapper styles | M2 Renderer | ◐ partial |  |
| P3 | Section height settings and padding | M2 Renderer | ○ open |  |
| P4 | Section content width, full or inset | M2 Renderer | ○ open |  |
| P5 | Section alignment, color themes, background image and video, dividers | M2 Renderer | ○ open |  |
| P6 | Fonts and type scale, including how sizes follow viewport width | M2 Renderer | ○ open | Evidence: Oracle heading uses Adobe font "obviously" 66.4px at 1600px; it cannot be copied (O2), so M1 must switch the trial site to Google Fonts both sides load |
| P7 | Header and footer | M2 Renderer | ○ open |  |

## Block types

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| T1 | Wrapper chain `.fe-block > .sqs-block > .sqs-block-content` | M2 Renderer | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| T2 | `.sqs-block-alignment-wrapper` on the right block types | M2 Renderer | ◐ partial |  |
| T3 | Text block | M2 Renderer | ◐ partial |  |
| T4 | Image block: fit, fill, crop, focal point, stretched | M5 Chrome and blocks | ○ open |  |
| T5 | Button block: sizes, styles, stretch | M2 Renderer | ◐ partial |  |
| T6 | Shape block and the Squarespace shape set | M2 Renderer | ◐ partial |  |
| T7 | Video block | M5 Chrome and blocks | ○ open |  |
| T8 | Gallery block | M5 Chrome and blocks | ○ open |  |
| T9 | Form block | M5 Chrome and blocks | ○ open |  |
| T10 | Embed and code blocks | M5 Chrome and blocks | ○ open |  |
| T11 | Line, map and social links blocks | M5 Chrome and blocks | ○ open |  |
| T12 | Remaining block types from the add-block menu | M5 Chrome and blocks | ○ open |  |
| T13 | Default and minimum size per block type | M2 Renderer | ? unknown |  |
| T14 | Which types keep an aspect ratio and which follow content | M2 Renderer | ? unknown |  |

## Geometry and snapping

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| G1 | Snap to measured column lines, gutter tracks included | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G2 | Uniform row pitch after normalization | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G3 | Grab offset kept during a drag | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G4 | Snap threshold and dead zone | M4 Editor core | ? unknown |  |
| G5 | Snap to other blocks' edges and centers, `data-is-matching-width` and `data-is-matching-height` | M4 Editor core | ? unknown |  |
| G6 | Alignment guide lines | M4 Editor core | ○ open |  |
| G7 | Auto-scroll near the top and bottom edge during a drag | M4 Editor core | ○ open |  |
| G8 | Editor zoom or scaled preview | M4 Editor core | ? unknown |  |

## Gestures

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| X1 | Move threshold before a drag starts, 4px in the prototype | M4 Editor core | ◐ partial |  |
| X2 | How the block follows the pointer and how the target shows | M4 Editor core | ◐ partial |  |
| X3 | Original-position outline during a drag | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| X4 | What happens to nearby blocks, `data-is-near-dragged-block` | M4 Editor core | ? unknown |  |
| X5 | Resize from 8 handles with the opposite edge fixed | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| X6 | Which handles each block type shows | M4 Editor core | ◐ partial | Evidence: Oracle text block shows all 8 handles (screenshot 2026-11-03). Other block types not checked |
| X7 | Shift and Alt modifiers | M4 Editor core | ? unknown |  |
| X8 | Multi-select and group move | M4 Editor core | ○ open |  |
| X9 | Dragging a block into another section | M4 Editor core | ? unknown |  |
| X10 | Locked blocks, `data-is-locked` | M4 Editor core | ○ open |  |
| X11 | Touch and pen input | M4 Editor core | ◐ partial |  |
| X12 | Esc cancels, one gesture is one undo step | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |

## Row stretch

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| R1 | Normalize at the start of a drag or keyboard move | M4 Editor core | ✓ done | Evidence: traces/T0001-key-right.json: one ArrowRight on the oracle remapped a 1-row heading to 6 rows and moved the image 5 rows down |
| R2 | Whether normalization also runs on select, resize or edit start | M4 Editor core | ◐ partial | Evidence: Keyboard: yes (traces/T0001-key-right.json). Select: 1 of 2 oracle runs normalized, 2026-11-03; cause not proven |
| R3 | Exact pixel to grid conversion | M4 Editor core | ◐ partial |  |
| R4 | Whether the row count shrinks after normalization or a drag | M4 Editor core | ◐ partial | Evidence: traces/T0001-key-right.json: row count grows on normalization (24 to 29) and stays after undo. Shrinking not seen yet |
| R5 | Behaviour when viewport width or a font change stretches rows | M4 Editor core | ? unknown |  |

## Text editing

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| E1 | How editing starts: double-click or click on a selected block | M4 Editor core | ◐ partial |  |
| E2 | End row grows while typing | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| E3 | Whether the block shrinks when text is deleted | M4 Editor core | ? unknown |  |
| E4 | Text toolbar: styles, bold, italic, links, alignment, color, size | M5 Chrome and blocks | ○ open |  |
| E5 | Paste handling and HTML cleanup | M5 Chrome and blocks | ○ open |  |
| E6 | Whether a desktop text edit changes the phone layout's height | M4 Editor core | ? unknown |  |

## Overlap and layers

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| Z1 | Overlap allowed | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| Z2 | How Bring forward and Send backward change z | M4 Editor core | ? unknown |  |
| Z3 | Bring to front and Send to back | M4 Editor core | ○ open |  |
| Z4 | Selecting a block covered by another | M4 Editor core | ○ open |  |
| Z5 | Editor layer z-index of about 10000 + z and 100000 + z | M5 Chrome and blocks | ◐ partial |  |

## Phone layout

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| L1 | Separate area and z per block, row count per layout | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| L2 | Shared content | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| L3 | Where a new block lands on phones | M4 Editor core | ? unknown |  |
| L4 | Whether phone edits survive later desktop edits | M4 Editor core | ? unknown |  |
| L5 | Hiding a block on one layout | M4 Editor core | ? unknown |  |
| L6 | Phone-only overrides such as font size | M4 Editor core | ○ open |  |
| L7 | Behaviour between 600 and 767px | M4 Editor core | ? unknown |  |

## Section settings and Stacks

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| S1 | Row count per layout, and whether it is the only per-layout section setting | M4 Editor core | ◐ partial |  |
| S2 | Spacing values allowed | M4 Editor core | ◐ partial |  |
| S3 | Stacks: grouped blocks with their own order and spacing | M5 Chrome and blocks | ○ open |  |

## Editor chrome

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| U1 | Grid overlay only during a gesture | M5 Chrome and blocks | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| U2 | Grid look: SVG pattern, `#B7B7B7`, `#F2F2F240`, radius 3 | M5 Chrome and blocks | ◐ partial |  |
| U3 | Hover and selection outlines, handles, label pill | M5 Chrome and blocks | ◐ partial | Evidence: Handles measured on the oracle: 10px squares, white, 2px rgb(2,122,255), cursors nw/ne/se/sw-resize, row-resize, col-resize. Applied in app/src/editor-frame.css. Hover and label pill not measured |
| U4 | Block toolbar: edit, design, duplicate, delete, layers | M5 Chrome and blocks | ○ open |  |
| U5 | Add block menu and default placement | M5 Chrome and blocks | ○ open |  |
| U6 | Top bar: Save, Exit, undo, redo, device toggle, preview | M5 Chrome and blocks | ◐ partial |  |
| U7 | Animation timings, `is-transitioning-visibility` | M5 Chrome and blocks | ? unknown |  |

## History, save and publish

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| Y1 | One undo step per gesture; normalization is not undone and does not mark the page changed | M6 Save and polish | ✓ done | Evidence: traces/T0001-key-right.json: oracle undo has 1 step and keeps the normalization, Save stays disabled. Our editor does the same since m0-harness; replay leaves only the text height diff |
| Y2 | Undo grouping while typing | M6 Save and polish | ◐ partial |  |
| Y3 | Save versus publish, drafts, revision conflicts | M6 Save and polish | ○ open |  |
| Y4 | Copy and paste between sections and pages | M6 Save and polish | ○ open |  |
| Y5 | Published page has no layout JavaScript | M6 Save and polish | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |

## Accessibility and order

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| A1 | ARIA roles grid and gridcell | M6 Save and polish | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| A2 | DOM order of blocks | M6 Save and polish | ? unknown |  |
| A3 | Keyboard: Tab order, arrow moves, resize with keys | M6 Save and polish | ◐ partial |  |
