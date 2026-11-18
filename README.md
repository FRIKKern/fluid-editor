[![Fluid editor roadmap: milestones M0 to M6, each with the reward it ships, its item count and its status on the board](docs/images/roadmap.svg)](docs/ROADMAP.md)

[![Parity: every item that has to match Fluid Engine, one cell each, done, partial, open or unknown](docs/images/parity.svg)](docs/PARITY.md)

## Vision

A grid editor that behaves like Squarespace Fluid Engine, 1:1. Same grid, same published CSS, same feel when you drag, resize and type. We copy behaviour by watching it, never by copying Squarespace code ([0001](docs/decisions/0001-black-box-oracle.md)).

"1:1" is a number here. A real Squarespace trial site is the oracle, and three gates compare against it: CSS round trip, block boxes at 5 widths, and recorded gestures replayed in both editors ([0002](docs/decisions/0002-three-gates.md)).

![The editor during a drag: the grid shows, a dashed outline marks where the block was, the blue area shows where it will land](docs/images/editor/drag-desktop.png)

## What we get

| Reward | Milestone |
|---|---|
| 1:1 becomes a number we can watch go up | M0 |
| The demo page exists on real Squarespace to compare against | M1 |
| Published pages match the oracle at every width | M2 |
| Nothing left to guess: every unknown has a recorded answer | M3 |
| Drag, resize and type feel the same | M4 |
| It looks like the real editor, with every block type | M5 |
| Save, publish and keyboard use are ready for real work | M6 |

## News

<!-- news:start -->
**Tuesday 17 November.** 14 pull requests merged, and none changed the editor. Eleven made a check harder to fool, two let a check run on a slowed CPU, and one started this News. A check runs our editor through recorded steps and compares it with what Squarespace's real editor, the oracle, was seen to do. Today's rows now fail when a Link press opens an empty popover, when an undo leaves the page changed, when a panel never closes, or when an outline fade snaps off after one frame. [The full day](docs/news/2026-11-17.md)
- **Undo and panels:** an undo of a palette pick or a Base Size press must bring the page back, not only the button; a panel must close on Escape and open again on Edit; a panel that stays put must keep the block's top where the oracle's did ([#697](https://github.com/FRIKKern/fluid-editor/pull/697), [#703](https://github.com/FRIKKern/fluid-editor/pull/703), [#704](https://github.com/FRIKKern/fluid-editor/pull/704), [#696](https://github.com/FRIKKern/fluid-editor/pull/696))
- **Text, links and resizing:** a Link press must open the popover or the Add Link form; known misses must keep their markup; named resize rows still compare rows and columns ([#695](https://github.com/FRIKKern/fluid-editor/pull/695), [#691](https://github.com/FRIKKern/fluid-editor/pull/691), [#692](https://github.com/FRIKKern/fluid-editor/pull/692), [#702](https://github.com/FRIKKern/fluid-editor/pull/702), [#698](https://github.com/FRIKKern/fluid-editor/pull/698))
- **Fades and timing:** an outline fade-out must follow the 0.2 s curve to its cut; marks-check can run with the page's CPU slowed down, and fails instead of hanging if that link drops ([#693](https://github.com/FRIKKern/fluid-editor/pull/693), [#701](https://github.com/FRIKKern/fluid-editor/pull/701), [#694](https://github.com/FRIKKern/fluid-editor/pull/694), [#700](https://github.com/FRIKKern/fluid-editor/pull/700))

**Monday 16 November.** 14 pull requests merged, none of them changing the editor itself. Twelve made a check compare more of what Squarespace's real editor, the oracle, was seen to do; one steadied a typing row that went red by chance, and one started this News. The snap check, which drags blocks and compares where they land, grew from 188 rows to 264: it now walks blocks home, walks them up and down, and covers the right margin. One real gap now shows: after adding a Text block, writing and pressing Undo, our Save button turns off while Squarespace keeps it on. [The full day](docs/news/2026-11-16.md)
- **Snapping blocks:** the snap check compares every return home, the up-and-down walks and the right-margin moves it skipped before: 188 rows became 264 ([#681](https://github.com/FRIKKern/fluid-editor/pull/681), [#683](https://github.com/FRIKKern/fluid-editor/pull/683), [#685](https://github.com/FRIKKern/fluid-editor/pull/685), [#686](https://github.com/FRIKKern/fluid-editor/pull/686))
- **Typing, undo and Save:** replays now compare the Save button and the page they end on, undo walks compare where they stop, known misses may differ only by a set amount, and a typing row that went red by chance now measures its own timing ([#680](https://github.com/FRIKKern/fluid-editor/pull/680), [#687](https://github.com/FRIKKern/fluid-editor/pull/687), [#688](https://github.com/FRIKKern/fluid-editor/pull/688), [#689](https://github.com/FRIKKern/fluid-editor/pull/689), [#690](https://github.com/FRIKKern/fluid-editor/pull/690), [#679](https://github.com/FRIKKern/fluid-editor/pull/679))
- **Style panel:** Shuffle rows are judged against what the oracle saw, not the app's own table, and each switch it saw flip must be set; Layouts closing reads the real selection marks ([#678](https://github.com/FRIKKern/fluid-editor/pull/678), [#684](https://github.com/FRIKKern/fluid-editor/pull/684), [#677](https://github.com/FRIKKern/fluid-editor/pull/677))
<!-- news:end -->

## Where things live (one fact, one home)

| What | Where |
|---|---|
| Milestones | [`docs/ROADMAP.md`](docs/ROADMAP.md) |
| Every item and its status, with evidence | [`parity/items.json`](parity/items.json), listed in [`docs/PARITY.md`](docs/PARITY.md) |
| Status of milestones, who does what | Goal issue [#1](https://github.com/FRIKKern/fluid-editor/issues/1) and its sub-issues. Never in docs |
| The journeys (the spec of "works") | [`JOURNEYS.md`](JOURNEYS.md) |
| The quality bar and the gates | [`QUALITY.md`](QUALITY.md) |
| Captured oracle CSS, stamped | [`fixtures/`](fixtures/README.md) |
| Gate results; what the corpus covers | [`parity/`](parity/): `gate-a.json`, `gate-b.json`, `gate-c.json`, `corpus.json` |
| Recorded oracle gestures | [`traces/`](traces/README.md) |
| What the oracle shows that ours does not | `docs/MISSING.md`, from `npm run review` ([QUALITY.md](QUALITY.md#finding-what-is-missing)) |
| How we work | [`CONTRIBUTING.md`](CONTRIBUTING.md), [`AGENTS.md`](AGENTS.md) |
| Decisions | [`docs/decisions/`](docs/decisions/), one page each |

## Layout

```
app/          the editor: index.html shell, site.html canvas, src/ renderer + editor
fixtures/     oracle CSS per section (css/, index.json); raw pages stay local
parity/       items.json (one home for item status), gate results
scripts/      gates, generators for the pictures, doc checks
```

## Run it

```sh
npm run dev        # the editor on http://127.0.0.1:5178
npm run check      # Gate A, item, trace and doc rules
npm run status     # progress per milestone and area
npm run capture && npm run fixtures   # grow the corpus politely, then extract CSS
node scripts/box-diff.mjs --oracle <url> --swap      # Gate B in a cmux tab
node scripts/oracle-record.mjs --id T0002-… --keys ArrowDown   # H6, on the oracle
node scripts/replay.mjs           # Gate C: replay every trace in our editor
eval "$(npm run -s surfaces)"; npm run review   # gap inventory, pixel diff, Barkpark paper
```

The oracle is a Squarespace trial site, set by `FLUID_ORACLE_SITE` and driven through cmux. A new trial follows [QUALITY.md, "A new trial"](QUALITY.md#a-new-trial). Its page "How Fluid Engine works" is built by `scripts/oracle-build.mjs` ([0004](docs/decisions/0004-oracle-page-and-preview-frame.md)). `app/page.html` is our published version of it.
