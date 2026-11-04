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
| `npm run mid-check` | What the blocks say while held in each recorded drag and resize (`traces/`, mid state), the target ring, center line and center snap (`parity/findings/GUIDES.json`), and group handles (`parity/findings/GROUPRESIZE.json`), against the same holds in our editor | Same flags on every block, grid shown in one section, same target area, ring and block size within 1px, same line style |
| `npm run chrome-check` | The oracle's block toolbar and selection rings for 5 selected blocks (`parity/findings/TOOLBARGEO.json`) against ours on the same blocks | Toolbar, button and separator boxes within 1px, same labels, same ring colors |
| `node scripts/check-chrome.mjs` (in `npm run check`) | The section buttons we draw when hovering, on phones and with a block selected | The list the oracle shows in each view |
| `node scripts/check-design.mjs` (in `npm run check`) | The 111 block design rules of the corpus (`fixtures/design.json`) against our render of the same values | Equal after collapsing white space |
| `npm run design-edit-check` | The styles 10 Edit > Design values gave on the oracle (`parity/findings/DESIGN.json`) against the same values set in our editor | Equal computed opacity, transform, backdrop filter and background |
| `npm run image-check` | Where the picture sits for Fit, Fill and Shape on the oracle (`parity/findings/IMAGEMODES.json`) against the same buttons in our editor | Picture box within 1px of the measured rule, block size unchanged, one undo step |
| `npm run site-styles-check` | What each style pack and Base Size press set on the oracle's page, its popovers and the five disclosure views (`parity/findings/SITESTYLES2.json`) against the same controls in our editor | Same page values for all 38 packs and each Base Size press, popover boxes equal, view labels within 3px, one undo step |
| `npm run accordion-check` | The accordion's markup, sizes, icon and padding choices, rows after add, delete and expand (`parity/findings/ACCORDION.json`) against a new accordion in our editor, with real keys | Equal boxes and rows, one undo step |
| `npm run code-check` | What each code mode, Display Source Code and Embed data wrote on the oracle (`parity/findings/CODEEMBED.json`) against the same input in our editor, with real keys | Equal HTML, same rows and panel size, one undo step |

The dev server (`npm run dev`, scripts/serve.mjs) sends `Cache-Control: no-store`. Set `FLUID_PORT` to run a checkout on its own port (default 5178), and `CDP_PORT` to give it its own headless Chrome: `FLUID_PORT=5201 CDP_PORT=9341`. Under python's http.server a WebKit tab kept old modules, so a check could measure code older than the checkout.

Geometry is compared with the oracle as WebKit draws it, so Gate B, Gate C, chrome-check, section-check, design-edit-check and the inventory run on a cmux tab. The functional checks (text-check, paste-check, near-check, mid-check, autoscroll-check, image-check, code-check, accordion-check, site-styles-check) also run on a headless Chrome that never shows on screen: `eval "$(node scripts/headless.mjs)"` sets `FLUID_SURFACE=cdp:9333`. The geometry checks refuse that surface.

For cmux tabs, run `eval "$(npm run -s surfaces)"` first: it finds or opens the oracle and editor tabs and exports `ORACLE_SURFACE` and `FLUID_SURFACE`.

The oracle also runs in headless Chrome, one per lane, in edit mode at the same time (docs/decisions/0006): `eval "$(CDP_PORT=<port> node scripts/oracle-headless.mjs)"` exports `ORACLE_SURFACE=cdp:<port>` and copies the login from a cmux tab. Stop your own `ORACLE_CHROME_PID` when done.

## Finding what is missing

The gates check what we built. The inventory finds what we did not think of:

```
npm run inventory -- --shots <dir>   drive the oracle and ours through the same editor states,
                                      list every visible control and label, keep what ours lacks
npm run missing                       docs/MISSING.md from parity/inventory.json
npm run visual-diff -- --shots <dir>  per state, the canvas pixels that differ, and an
                                      oracle | ours | difference image for the paper
npm run publish-review -- --shots <dir>   the same, with screenshot pairs, as a Barkpark paper
```

`npm run review` runs all four in order.

Every gap is matched against `parity/items.json`. An item lists the oracle labels it covers in `controls`; a gap no item lists or names is UNTRACKED, and a new item is due.

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
| O1 | Read state, do one gesture, read state, then leave with `exitWithoutSaving()` in `scripts/oracle/ui.mjs`, because undo can leave a page dirty. Never press Save on the trial site unless the milestone step says so. New experiments go on a new page, never an old one (docs/decisions/0006) |
| O2 | Black box only. No Squarespace JavaScript, CSS files, fonts or images are copied into this repo |
| O3 | Fixtures in git hold CSS only: ids and grid numbers. Raw pages with other people's content stay in `fixtures/raw/`, which git ignores |
| O4 | A Squarespace change that breaks a gate is a finding, not a failure to hide. Recapture and record it |

## Docs

- Picture first: README, docs and decisions open with a picture, a table or a diagram.
- README stays at or under 80 lines. `npm run check` enforces it and checks links.
- One fact, one home. Milestone status lives on the board, item status in `parity/items.json`, never in prose.
- Generated files are never edited by hand: `docs/images/roadmap.svg`, `docs/images/parity.svg`, `docs/PARITY.md` and the README timeline.
- Plain words. Name the file, the number or the mechanism.
