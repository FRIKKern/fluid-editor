# Quality

## The gates

| Gate | Compares | Passes when |
|---|---|---|
| A | Captured section CSS against our render of the same model | Equal after collapsing whitespace, for every fixture |
| B | Every `.fe-block` box on the oracle page against our page | Within 1px at 375, 767, 768, 1280 and 1920px |
| C | A gesture recorded on the oracle against the same gesture in our editor | Same `grid-area`, z-index and row count for every block afterwards |

## The bar

| Rule | Check |
|---|---|
| An item is done only when its gate passes and its evidence is named in `parity/items.json` | `npm run check` |
| An unknown item becomes buildable only after its trace or capture is stored | review |
| No check skips and passes. An empty corpus fails | each gate counts its cases |
| A fixture whose sha256 does not match `fixtures/index.json` fails | Gate A |
| Every fixture and trace records its capture date. Recapture before trusting one older than 30 days | review |
| A change that lowers a gate's pass count does not merge | CI |
| A journey is signed off by someone other than its builder, naming the sha | issue comment |

## Oracle rules

| # | Rule |
|---|---|
| O1 | Read state, do one gesture, read state, undo. Never press Save on the trial site unless the milestone step says so |
| O2 | Black box only. No Squarespace JavaScript, CSS files, fonts or images are copied into this repo |
| O3 | Fixtures in git hold CSS only: ids and grid numbers. Raw pages with other people's content stay in `fixtures/raw/`, which git ignores |
| O4 | A Squarespace change that breaks a gate is a finding, not a failure to hide. Recapture and record it |

## Docs

- Picture first: README, docs and decisions open with a picture, a table or a diagram.
- README stays at or under 80 lines. `npm run check` enforces it and checks links.
- One fact, one home. Milestone status lives on the board, item status in `parity/items.json`, never in prose.
- Generated files are never edited by hand: `docs/images/roadmap.svg`, `docs/images/parity.svg`, `docs/PARITY.md` and the README timeline.
- Plain words. Name the file, the number or the mechanism.
