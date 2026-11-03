# Journeys

The spec of "works". Each journey runs on the oracle and on our editor, and passes when both end the same way. Nobody signs off their own journey.

```
oracle (trial site) ─► record: before, gesture, after ─► traces/<id>.json
our editor          ─► replay the same gesture         ─► same after? pass
```

## Published page

| Id | Milestone | Journey | Proof |
|---|---|---|---|
| J01 | M2 | Any captured section reads into our model and renders back to the same CSS | Gate A report |
| J02 | M2 | The demo page renders with every block box within 1px of the oracle at 375, 767, 768, 1280 and 1920px | Gate B report |
| J03 | M2 | A long heading wraps on a narrow window and pushes the blocks below it down, as on the oracle | Gate B at 375px |

## Editor

| Id | Milestone | Journey | Proof |
|---|---|---|---|
| J04 | M4 | Drag a block in a section with stretched rows: rows go uniform when the drag starts, and the block lands where the outline showed | trace |
| J05 | M4 | Resize from each of the 8 handles: the opposite edge stays, and text cannot go below its content | 8 traces |
| J06 | M4 | Type into a text block until it wraps: the end row grows and no row stretches | trace |
| J07 | M4 | Arrow keys move one cell; Esc cancels a drag; one undo restores the whole gesture | traces |
| J08 | M4 | Overlap two blocks and change their order with Bring forward and Send backward | trace |
| J09 | M4 | Edit the phone layout and the desktop layout stays the same; add a block on desktop and see where it lands on phones | traces |
| J10 | M4 | Change a section's row count and spacing | trace |
| J11 | M5 | Every block in the add menu inserts with its default size and renders as on the oracle | screenshot grid + Gate B |
| J12 | M5 | Hover, selection, handles, toolbar and grid overlay look the same | side-by-side screenshots |
| J13 | M6 | Save, reload and publish: the published page equals the preview | Gate B |
| J14 | M6 | Every journey above works with the keyboard alone | recording |
