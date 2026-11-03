# Parity

[![Parity: one cell per item, done, partial, open or unknown](images/parity.svg)](../README.md)

56 of 108 items done, 39 partial, 13 open, 0 unknown.
Generated from [`parity/items.json`](../parity/items.json) by `npm run parity`. Edit the JSON, never this page.

## Harness and oracle

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| H1 | CSS round trip check, `scripts/check-render.mjs` | M0 Harness | ✓ done | Gate: 351 of 351 sections match. Evidence: parity/gate-a.json |
| H2 | Fixture capture tool: URL list in, section CSS, markup, URL, date and sha256 out | M0 Harness | ✓ done | Gate: recapturing a page gives the same sha. Evidence: scripts/capture.mjs: robots.txt for "*", sitemap, 1 request per second. Recapture of alignflow-fluid-demo home: 11 of 11 section shas match fixtures/index.json, 2026-11-03 |
| H3 | Corpus of at least 300 sections from at least 30 public sites | M0 Harness | ◐ partial | Gate: covers gap 0 and 11, bleed blocks, overlap, every block type in area 3. Evidence: parity/corpus.json: 359 sections from 56 sites incl. the oracle demo page; gaps 0/11/20/27, bleed, overlap, sticky. Missing: gallery and map blocks |
| H4 | Box diff: load an oracle page and our render, compare every `.fe-block` rect | M0 Harness | ✓ done | Gate: reports pass or fail per block per width. Evidence: parity/gate-b.json: achromatic-fluid-demo home, our CSS swapped in, 70 of 70 boxes at 5 widths. With --fault the gate fails 0 of 14 at 1280px |
| H5 | Trace format, `traces/<id>.json`: before state, gesture, after state, oracle URL, date | M0 Harness | ✓ done | Gate: schema written and one trace stored. Evidence: scripts/lib/trace.mjs (format and Gate C diff), scripts/check-traces.mjs in npm run check |
| H6 | Trace recorder through cmux on the trial site | M0 Harness | ✓ done | Gate: records one keyboard move and undoes it. Evidence: traces/T0001-key-right.json: recorded by scripts/oracle-record.mjs; oracle back to the saved layout after reload |
| H7 | Trace replay in our editor through cmux | M0 Harness | ✓ done | Gate: replays H6's trace and diffs the end state. Evidence: scripts/replay.mjs: Gate C 2 of 2 traces, undo 2 of 2 (parity/gate-c.json) |
| H8 | Status report: `npm run status` prints counts per area and milestone | M0 Harness | ✓ done | Gate: runs in CI or by hand with no errors. Evidence: npm run status prints milestones and areas with board state |
| H9 | Git repo with fixtures and traces kept out of history | M0 Harness | ✓ done | Gate: first commit made. Evidence: FRIKKern/fluid-editor, first commit 383848b, checks and housekeeping green |
| O1 | Build the 8 demo sections on the trial site, page "How Fluid Engine works" | M1 Oracle page | ✓ done | Evidence: scripts/oracle-build.mjs and scripts/oracle/demo-spec.mjs; parity/oracle-build.json: 56 blocks, 54 at the spec area, 2 text blocks grown by the oracle's content guard; saved 2026-11-03 |
| O2 | Capture the 8 sections as fixtures, both layouts | M1 Oracle page | ✓ done | Evidence: scripts/oracle-import.mjs: fixtures/oracle/demo-page.json, 8 section CSS files in fixtures/css, app/src/demo-data.js; Gate A 359 of 359 |
| O3 | Match the oracle fonts, type sizes and button sizing in app/src/site.css | M1 Oracle page | ✓ done | Evidence: Trial site fonts switched to Poppins (Google Fonts) for headings, paragraphs, misc and 3 button styles. Gate B 280 of 280 block boxes at 375, 767, 768, 1280, 1920 on the demo page (parity/gate-b.json) |

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
| C12 | Sticky blocks: position sticky with a top, center or bottom anchor and an offset, desktop only | M2 Renderer | ✓ done | Evidence: Found in 11 corpus blocks; Gate A 359 of 359. The oracle block toolbar has a Pin button, likely the sticky setting (not tried) |
| C13 | Separate row gap and column gap; the column gap sets the gutter and cell width | M2 Renderer | ✓ done | Evidence: just-my-type and river demos use 11px rows with 27px and 20px columns; Gate A 351 of 351 |

## Page and site context

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| P1 | Site variables for the trial site | M2 Renderer | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| P2 | Section wrapper styles | M2 Renderer | ✓ done | Evidence: Section markup, min-height, wrapper padding and vertical centering match: every section's height and grid offset within 1px (parity/gate-b.json: 320 of 320 boxes incl. 8 section boxes at 375, 767, 768, 1280, 1920; parity/gate-b-600-767.json 192 of 192) |
| P3 | Section height settings and padding | M2 Renderer | ◐ partial | Evidence: parity/findings/P3.json: height S/M/L = min-height 33/66/100vh, wrapper padding 3.3/6.6/10vmax; custom height N = inline min-height Nvh with 1vmax padding (footer, all 5 widths). Matched: Gate B 365 of 365. Fill Screen not modelled |
| P4 | Section content width, full or inset | M2 Renderer | ○ open | Evidence: Oracle classes: content-width--wide (100%), --medium (75%), --narrow (50% from 768px) from the trial site stylesheet; our CSS has the same three. No content-width control found in the Edit Section panel |
| P5 | Section alignment, color themes, background image and video, dividers | M2 Renderer | ◐ partial | Evidence: Edit Section panel: Background, Colors, Grid (Row Count, Gap zero/medium/custom), Section (Fill Screen, Height S/M/L/custom, vertical alignment top/center/bottom), Divider, Anchor Link. Our sections render height, vertical alignment, content width and horizontal alignment classes; top/bottom alignment CSS is ours (not measured), backgrounds, themes and dividers not built |
| P6 | Fonts and type scale, including how sizes follow viewport width | M2 Renderer | ✓ done | Evidence: Heading and body sizes follow min((v-1)*1.2vw+1rem, max((v-1)*0.012*maxPageWidth+1rem, v*1rem)) above 767px and (v-1)*0.012*min(100vh,900px)+1rem on portrait phones; h1 60.71px at a 1242px frame matches. Gate B 280 of 280 with text wrapping at 375px |
| P7 | Header and footer | M2 Renderer | ✓ done | Evidence: Header: parity/findings/P7.json, built to the measured rule. Footer: the oracle footer is one Fluid Engine section (custom height 10vh, padding 1vmax, black theme, 7 text blocks and social links), imported and rendered. Gate B 365 of 365 boxes incl. header offset and footer at 375, 767, 768, 1280, 1920 (parity/gate-b.json). The header switch width (817px) is stored, not derived |

## Block types

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| T1 | Wrapper chain `.fe-block > .sqs-block > .sqs-block-content` | M2 Renderer | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| T2 | `.sqs-block-alignment-wrapper` on the right block types | M2 Renderer | ◐ partial |  |
| T3 | Text block | M2 Renderer | ✓ done | Evidence: Text block markup and margins (headings 2rem, paragraphs 1em, first and last child 0) match: Gate B 280 of 280 |
| T4 | Image block: fit, fill, crop, focal point, stretched | M5 Chrome and blocks | ○ open |  |
| T5 | Button block: sizes, styles, stretch | M2 Renderer | ◐ partial | Evidence: Button fills its block height (59px at 768, 61.6px at 1280), 56px side padding, Poppins 500 16px. Sizes small and large not measured |
| T6 | Shape block and the Squarespace shape set | M2 Renderer | ◐ partial | Evidence: Oracle shape Edit panel: Design tab with shape style picker, square or rounded corners with a px radius, Stretch toggle, Color, Blend Mode, Stroke; Animation tab. Default shape: white square filling its block. Ours renders a filled div |
| T7 | Video block | M5 Chrome and blocks | ○ open |  |
| T8 | Gallery block | M5 Chrome and blocks | ○ open |  |
| T9 | Form block | M5 Chrome and blocks | ○ open |  |
| T10 | Embed and code blocks | M5 Chrome and blocks | ○ open |  |
| T11 | Line, map and social links blocks | M5 Chrome and blocks | ◐ partial | Evidence: Social links: three 20px icons, 12px apart, right-aligned in the footer, rendered and box-matched (Gate B). Icons are placeholders; line and map blocks not built |
| T12 | Remaining block types from the add-block menu | M5 Chrome and blocks | ○ open |  |
| T13 | Default and minimum size per block type | M2 Renderer | ◐ partial | Evidence: A new Text block lands at 1/2/3/10 (8 columns by 2 rows) in an empty section; a blank section starts with 8 rows. Other block types not measured |
| T14 | Which types keep an aspect ratio and which follow content | M2 Renderer | ◐ partial | Evidence: Shapes do not keep an aspect ratio: a corner resize of 2 columns and 1 row changes both freely (T0008). Images not tested |

## Geometry and snapping

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| G1 | Snap to measured column lines, gutter tracks included | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G2 | Uniform row pitch after normalization | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G3 | Grab offset kept during a drag | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| G4 | Snap threshold and dead zone | M4 Editor core | ✓ done | Evidence: Drags of 0.3 and 0.5 columns stay, 0.7 moves one column (traces T0004, T0005, T0006); our editor replays all three (parity/gate-c.json) |
| G5 | Snap to other blocks' edges and centers, `data-is-matching-width` and `data-is-matching-height` | M4 Editor core | ◐ partial | Evidence: Our editor sets data-is-matching-width and -height during a resize on blocks of the same size, as on the oracle (T0007), with a dashed outline. The oracle look is not measured |
| G6 | Alignment guide lines | M4 Editor core | ◐ partial | Evidence: During a drag the oracle showed no guide-line elements (class names with guide, alignment-line or snap-line: 0, T0004 to T0010); the equal-size highlight (G5) is the visible alignment aid seen so far |
| G7 | Auto-scroll near the top and bottom edge during a drag | M4 Editor core | ◐ partial | Evidence: The oracle auto-scrolls while the pointer is held near the bottom edge inside the window (T0010: the block moved 30px more than the pointer) and not when the pointer is below the window (T0013). Our editor scrolls in an 80px band at up to 600px/s; band and speed are not measured, so T0010 still fails by one row |
| G8 | Editor zoom or scaled preview | M4 Editor core | ✓ done | Evidence: The oracle editor does not scale its preview: the frame is as wide as the window at 1100 and 1600px, transform identity. Our editor does not scale either |

## Gestures

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| X1 | Move threshold before a drag starts, 4px in the prototype | M4 Editor core | ◐ partial |  |
| X2 | How the block follows the pointer and how the target shows | M4 Editor core | ◐ partial | Evidence: While held, the block follows the pointer exactly: transform translate equals the pointer distance (T0004 to T0006 mid). The dragged block wrapper gets z-index 999999 and the grid shows only in its own section. Target outline look not measured |
| X3 | Original-position outline during a drag | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| X4 | What happens to nearby blocks, `data-is-near-dragged-block` | M4 Editor core | ◐ partial | Evidence: Our editor sets data-is-near-dragged-block on blocks within 2 tracks of the target, as seen on the oracle (T0004 to T0007). The oracle distance rule is not measured exactly, and nothing is drawn for it |
| X5 | Resize from 8 handles with the opposite edge fixed | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| X6 | Which handles each block type shows | M4 Editor core | ◐ partial | Evidence: Text and shape blocks show all 8 handles on the oracle (screenshot, T0007 used the east handle of a shape). Buttons and other types not checked |
| X7 | Shift and Alt modifiers | M4 Editor core | ◐ partial | Evidence: Shift has no effect on a shape corner resize (T0008, T0009 end the same); our editor replays both (parity/gate-c.json). Alt and images not tested |
| X8 | Multi-select and group move | M4 Editor core | ◐ partial | Evidence: Shift-click multi-select, group drag and arrows (round 1). Align Group: Left, Horizontal Center, Right, Top, Vertical Center, Bottom line up on the group bounding box (T0018 Align Left, T0019 Align Vertical Center); our panel has the same six and replays both. Group toolbar Duplicate and Remove not built |
| X9 | Dragging a block into another section | M4 Editor core | ✓ done | Evidence: Dragging past the bottom grows the section and the block stays (T0010, T0013); rows past the edge use the normal pitch (T0013 drag of 20 rows, T0014 resize of 8 rows). Our editor replays T0013 and T0014 (parity/gate-c.json, 12 of 13) |
| X10 | Locked blocks, `data-is-locked` | M4 Editor core | ○ open | Evidence: No lock control found in the block toolbar, the group toolbar or the Layers rows; data-is-locked stays false |
| X11 | Touch and pen input | M4 Editor core | ◐ partial |  |
| X12 | Esc cancels, one gesture is one undo step | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |

## Row stretch

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| R1 | Normalize at the start of a drag or keyboard move | M4 Editor core | ✓ done | Evidence: traces/T0002-demo-hero-right.json and traces/T0003-section4-button-down.json replay with the same end state (parity/gate-c.json 2 of 2). History: traces/retired/T0001-key-right.json |
| R2 | Whether normalization also runs on select, resize or edit start | M4 Editor core | ◐ partial | Evidence: Keyboard: yes (traces/T0001-key-right.json). Select: 1 of 2 oracle runs normalized, 2026-11-03; cause not proven |
| R3 | Exact pixel to grid conversion | M4 Editor core | ◐ partial | Evidence: While building section 1 the oracle remapped the heading from 3/2/7/16 to 4/2/7/16 and the paragraph from 7/2/11/14 to 7/2/10/14 during later drags: normalization can move start rows too |
| R4 | Whether the row count shrinks after normalization or a drag | M4 Editor core | ◐ partial | Evidence: traces/T0001-key-right.json: row count grows on normalization (24 to 29) and stays after undo. Shrinking not seen yet |
| R5 | Behaviour when viewport width or a font change stretches rows | M4 Editor core | ✓ done | Evidence: Published rows stretch with the width exactly as on the oracle: Gate B 280 of 280 at 375 to 1920px and 168 of 168 at 600 to 700px (parity/gate-b.json, parity/gate-b-600-767.json). The editor removes stretch at the next gesture (T0003) |

## Text editing

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| E1 | How editing starts: double-click or click on a selected block | M4 Editor core | ◐ partial |  |
| E2 | End row grows while typing | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| E3 | Whether the block shrinks when text is deleted | M4 Editor core | ✓ done | Evidence: parity/findings/E3.json: on the oracle a paragraph replaced with one short sentence went from 3/2/8/13 to 3/2/5/13. Our editor gives the same 3/2/5/13 for the same edit (end row follows the text both ways, minimum 2 rows) |
| E4 | Text toolbar: styles, bold, italic, links, alignment, color, size | M5 Chrome and blocks | ○ open |  |
| E5 | Paste handling and HTML cleanup | M5 Chrome and blocks | ○ open |  |
| E6 | Whether a desktop text edit changes the phone layout's height | M4 Editor core | ✓ done | Evidence: parity/findings/E6.json: a desktop text edit left the phone area 3/2/5/10 unchanged. Our editor changes only the current layout when text grows |

## Overlap and layers

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| Z1 | Overlap allowed | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| Z2 | How Bring forward and Send backward change z | M4 Editor core | ✓ done | Evidence: Move Forward and Move Backward swap z-index with the next block up or down (T0011, T0012); our editor does the same since m3-unknowns and replays both (parity/gate-c.json) |
| Z3 | Bring to front and Send to back | M4 Editor core | ◐ partial | Evidence: The oracle has no Bring to front button: you drag a row in the sortable Layers list. Our Layers list reorders by drag and hands out the section z values in the new order; the oracle renumbering is not traced |
| Z4 | Selecting a block covered by another | M4 Editor core | ✓ done | Evidence: Oracle Layers panel (section toolbar): the blocks front to back, text blocks by their first words, others by type; rows are sortable. Our panel has the same list; a click selects a covered block |
| Z5 | Editor layer z-index of about 10000 + z and 100000 + z | M5 Chrome and blocks | ◐ partial |  |

## Phone layout

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| L1 | Separate area and z per block, row count per layout | M4 Editor core | ✓ done | Evidence: Separate area and z per layout (Gate A, Gate B); phone traces T0015 to T0017 replay in our 428px phone canvas |
| L2 | Shared content | M4 Editor core | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| L3 | Where a new block lands on phones | M4 Editor core | ◐ partial | Evidence: On the demo page the oracle generated phone layouts by stacking blocks over columns 2 to 10: text and buttons 2 rows, shapes 6 rows (fixtures/oracle/demo-page.json, app/src/demo-data.js) |
| L4 | Whether phone edits survive later desktop edits | M4 Editor core | ✓ done | Evidence: parity/findings/L4.json: a phone move down, then a desktop move right of the same block, left the phone area as edited. Our editor keeps the two layouts separate |
| L5 | Hiding a block on one layout | M4 Editor core | ◐ partial | Evidence: No hide control found on the oracle: not in the desktop or phone block toolbars, and not in the shape Edit panel (Design: shape style, corner radius, Stretch, Color, Blend Mode, Stroke; Animation). Other block types and help pages not checked |
| L6 | Phone-only overrides such as font size | M4 Editor core | ○ open |  |
| L7 | Behaviour between 600 and 767px | M4 Editor core | ✓ done | Evidence: Gate B 168 of 168 block boxes at 600, 650 and 700px (parity/gate-b-600-767.json); the third-party report of extra space in this range did not reproduce on the demo page |
| L8 | Phone layout edits on demo section 7, traced and replayed | M4 Editor core | ✓ done | Gate: A trace of a phone-layout move replays to the same end state. Evidence: Phone-view traces T0015 (arrow), T0016 (drag), T0017 (resize from the west handle) replay in our 428px phone canvas, undo included (parity/gate-c.json). The phone view normalizes stretched rows at a gesture too. The oracle phone layout stays its generated stacking; a hand-made stagger was not saved |

## Section settings and Stacks

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| S1 | Row count per layout, and whether it is the only per-layout section setting | M4 Editor core | ◐ partial |  |
| S2 | Spacing values allowed | M4 Editor core | ◐ partial | Evidence: Gap values seen: 0, 11, 20, 27px (corpus). Edit Section offers Zero gap, Medium gap and Custom gap |
| S3 | Stacks: grouped blocks with their own order and spacing | M5 Chrome and blocks | ◐ partial | Evidence: parity/findings/S3.json: Stack Blocks replaces the selected blocks with one block over their bounding box; inside, a flex column with a 20px gap, start-aligned, children stretched to full width, min 20px; toolbar Edit, link, Stack Options, Pin, Duplicate, Remove. Ours builds the same structure and values. Difference: the oracle stack grew to 1/2/7/18, ours is 1/2/6/18; the oracle children seem to keep their old block heights (112 + 20 + 112px needs 7 rows). Stack Options not explored |

## Editor chrome

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| U1 | Grid overlay only during a gesture | M5 Chrome and blocks | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| U2 | Grid look: SVG pattern, `#B7B7B7`, `#F2F2F240`, radius 3 | M5 Chrome and blocks | ◐ partial |  |
| U3 | Hover and selection outlines, handles, label pill | M5 Chrome and blocks | ◐ partial | Evidence: Handles: 10px squares, white, 2px rgb(2,122,255), cursors nw/ne/se/sw-resize, row-resize, col-resize (applied). Blocks carry a label pill with their type, e.g. "Text" (sqs-block-label-tag). Hover not measured |
| U4 | Block toolbar: edit, design, duplicate, delete, layers | M5 Chrome and blocks | ◐ partial | Evidence: Oracle toolbars. Text: Write, Edit, Align Vertically, Pin, Duplicate, Remove. Shape: Edit, Pin, Move Forward, Move Backward, Duplicate, Remove. Shape in phone view: Edit, Pin, Move Up, Move Down, Remove. Section: Add Block, Open Layers Panel, Edit Section, View Layouts, Duplicate, Save, Move Up, Move Down, Remove. Ours has Move Forward and Move Backward |
| U5 | Add block menu and default placement | M5 Chrome and blocks | ◐ partial | Evidence: Oracle Add Block menu: search box; Essentials: Text, Image, Button, Video, Form, Accordion, Shape, Scrolling, Line; Sell: Product, Pricing Plan, Donation, Scheduling, more. New blocks land top left |
| U6 | Top bar: Save, Exit, undo, redo, device toggle, preview | M5 Chrome and blocks | ◐ partial |  |
| U7 | Animation timings, `is-transitioning-visibility` | M5 Chrome and blocks | ✓ done | Evidence: Oracle: transition opacity 0.1s cubic-bezier(0.66, 0, 0.34, 1) on .fe-block in the editor. Our editor uses the same transition (app/src/editor-frame.css) |

## History, save and publish

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| Y1 | One undo step per gesture; normalization is not undone and does not mark the page changed | M6 Save and polish | ✓ done | Evidence: traces/retired/T0001-key-right.json: undo keeps the normalization and Save stays disabled. T0002 and T0003: undo restores the move in our editor as on the oracle (parity/gate-c.json, undo pass) |
| Y2 | Undo grouping while typing | M6 Save and polish | ◐ partial |  |
| Y3 | Save versus publish, drafts, revision conflicts | M6 Save and polish | ○ open |  |
| Y4 | Copy and paste between sections and pages | M6 Save and polish | ○ open |  |
| Y5 | Published page has no layout JavaScript | M6 Save and polish | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |

## Accessibility and order

| Id | Item | Milestone | Status | Gate or evidence |
|---|---|---|---|---|
| A1 | ARIA roles grid and gridcell | M6 Save and polish | ✓ done | Evidence: Scripted cmux run on the prototype, 2026-11-03. Not yet a stored trace |
| A2 | DOM order of blocks | M6 Save and polish | ◐ partial | Evidence: Block DOM order follows the phone layout row order: 8 of 8 demo sections, 248 of 286 corpus sections with 2+ blocks (desktop row order: 164). The exceptions are not explained yet |
| A3 | Keyboard: Tab order, arrow moves, resize with keys | M6 Save and polish | ◐ partial |  |
