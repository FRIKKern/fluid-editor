# Quality

## The gates

| Gate | Compares | Passes when |
|---|---|---|
| A | Captured section CSS against our render of the same model | Equal after collapsing whitespace, for every fixture |
| B | Every `.fe-block` box on the oracle page against our page | Within 1px at 375, 767, 768, 1280 and 1920px |
| C | A gesture recorded on the oracle against the same gesture in our editor | Same `grid-area`, z-index and row count for every block afterwards |

Two narrower checks run beside the gates:

| Check | Compares | Passes when |
|---|---|---|
| `scripts/color-diff.mjs` | Section background, heading, paragraph and button colors on each oracle page against ours | Equal for every section |
| `npm run section-check` | Each Edit Section option measured on the oracle (`parity/findings/SETTINGS.json`, `VALIGN-TOP.json`, `FILL-SCREEN.json`) against our section with the same setting | Section height, wrapper padding and grid height within 1px, theme colors equal |
| `npm run text-check` | The HTML of each text toolbar action on the oracle (`parity/findings/TEXTOPS.json`) against the same action in our editor | Equal after dropping a bare `white-space: pre-wrap` style |
| `npm run paste-check` | The HTML the oracle keeps from 15 pasted samples (`parity/findings/PASTE.json`) against our paste of the same samples | Equal after dropping a bare `white-space: pre-wrap` style |
| `npm run autoscroll-check` | The oracle's auto-scroll total for 29 held pointer positions (`parity/findings/AUTOSCROLL.json`) against the same holds in our editor | Within one 10px step |
| `npm run near-check` | Which blocks the oracle flags near a held drag (`parity/findings/NEAR.json`) against our flags for the same holds | Equal for every block |

Run `eval "$(npm run -s surfaces)"` first: it finds or opens the oracle and editor tabs and exports `ORACLE_SURFACE` and `FLUID_SURFACE`.

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
