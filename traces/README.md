# Traces

One recorded gesture per file, `<id>.json`. The format and the Gate C comparison live in [`scripts/lib/trace.mjs`](../scripts/lib/trace.mjs).

| Step | Script |
|---|---|
| Record on the oracle: read, one gesture, read, undo, reload, check the saved layout came back | `scripts/oracle-record.mjs` |
| Replay in our editor and compare the end state | `scripts/replay.mjs`, writes `parity/gate-c.json` |

`npm run check` validates every trace and fails when there are none.

A trace recorded since 2026-11-03 has `view`: the target block's top in the canvas window and the window size when the gesture began. Replay scrolls the target to the same height, so edge effects such as auto-scroll happen at the same distance. Older traces have no `view` and replay centres the target.
