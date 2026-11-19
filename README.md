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
**Wednesday 18 November.** 18 pull requests merged, one of them Tuesday's News. A new trial started: a fresh Squarespace trial site is now the oracle, the real editor our checks compare with, and its 10 small differences from the old site were stored. Four changes reached the editor, each matching a fresh oracle read: Strike shows as on as soon as it is pressed at a caret, Float's opening play starts from the click, and the font list gains a name and room under its last row. Ten checks got harder to fool, and Monday's one real gap, Save after an Undo, turned out to be the check's. [The full day](docs/news/2026-11-18.md)
- **New trial:** a fresh trial site is the oracle; the stored reads were taken again from it; the setup steps are written down for an agent; the copied login lasts one browser session ([#706](https://github.com/FRIKKern/fluid-editor/pull/706), [#707](https://github.com/FRIKKern/fluid-editor/pull/707), [#712](https://github.com/FRIKKern/fluid-editor/pull/712), [#721](https://github.com/FRIKKern/fluid-editor/pull/721))
- **Editor:** Strike shows as on at once when pressed at a caret; Float's opening play starts 470 ms after the click; the font list has Adelle Sans and 33 px under its last row ([#711](https://github.com/FRIKKern/fluid-editor/pull/711), [#710](https://github.com/FRIKKern/fluid-editor/pull/710), [#706](https://github.com/FRIKKern/fluid-editor/pull/706), [#708](https://github.com/FRIKKern/fluid-editor/pull/708))
- **Checks:** Save after an Undo back to the loaded page is compared and matches; the Float row tells a click from a pointerdown; an outline fade fails if it starts late, loses its outline or hides it; Shapes' Spread and a re-selected panel are compared ([#709](https://github.com/FRIKKern/fluid-editor/pull/709), [#713](https://github.com/FRIKKern/fluid-editor/pull/713), [#716](https://github.com/FRIKKern/fluid-editor/pull/716), [#718](https://github.com/FRIKKern/fluid-editor/pull/718), [#722](https://github.com/FRIKKern/fluid-editor/pull/722), [#714](https://github.com/FRIKKern/fluid-editor/pull/714), [#715](https://github.com/FRIKKern/fluid-editor/pull/715), [#717](https://github.com/FRIKKern/fluid-editor/pull/717), [#719](https://github.com/FRIKKern/fluid-editor/pull/719), [#720](https://github.com/FRIKKern/fluid-editor/pull/720))

**Tuesday 17 November.** 14 pull requests merged, and none changed the editor. Eleven made a check harder to fool, two let a check run on a slowed CPU, and one started this News. A check runs our editor through recorded steps and compares it with what Squarespace's real editor, the oracle, was seen to do. Today's rows now fail when a Link press opens an empty popover, when an undo leaves the page changed, when a panel never closes, or when an outline fade snaps off after one frame. [The full day](docs/news/2026-11-17.md)
- **Undo and panels:** an undo of a palette pick or a Base Size press must bring the page back, not only the button; a panel must close on Escape and open again on Edit; a panel that stays put must keep the block's top where the oracle's did ([#697](https://github.com/FRIKKern/fluid-editor/pull/697), [#703](https://github.com/FRIKKern/fluid-editor/pull/703), [#704](https://github.com/FRIKKern/fluid-editor/pull/704), [#696](https://github.com/FRIKKern/fluid-editor/pull/696))
- **Text, links and resizing:** a Link press must open the popover or the Add Link form; known misses must keep their markup; named resize rows still compare rows and columns ([#695](https://github.com/FRIKKern/fluid-editor/pull/695), [#691](https://github.com/FRIKKern/fluid-editor/pull/691), [#692](https://github.com/FRIKKern/fluid-editor/pull/692), [#702](https://github.com/FRIKKern/fluid-editor/pull/702), [#698](https://github.com/FRIKKern/fluid-editor/pull/698))
- **Fades and timing:** an outline fade-out must follow the 0.2 s curve to its cut; marks-check can run with the page's CPU slowed down, and fails instead of hanging if that link drops ([#693](https://github.com/FRIKKern/fluid-editor/pull/693), [#701](https://github.com/FRIKKern/fluid-editor/pull/701), [#694](https://github.com/FRIKKern/fluid-editor/pull/694), [#700](https://github.com/FRIKKern/fluid-editor/pull/700))
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
