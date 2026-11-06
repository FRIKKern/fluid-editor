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
| `npm run text-check` | The HTML of each text toolbar action on the oracle (`parity/findings/TEXTOPS.json`), the Custom color tab and the look of quotes, lists and monospace (`parity/findings/TEXTCOLOR.json`) and, with real keys and presses, a caret, nesting, Clear Formatting and undo steps by time (`CAP-E4*.json`, all of them with `npm run text-check -- --full`, 5 to 10 min; the default run has CAP-E4CARET and is under 2 min) against the same action in our editor | Equal after dropping a bare `white-space: pre-wrap` style |
| `npm run paste-check` | The HTML the oracle keeps from 15 pasted samples (`parity/findings/PASTE.json`) against our paste of the same samples, and pastes into a paragraph and a heading; `-- --full` adds a list item, a quote, monospace and a selection | Equal after dropping a bare `white-space: pre-wrap` style |
| `npm run autoscroll-check` | The oracle's auto-scroll total for 29 held pointer positions (`parity/findings/AUTOSCROLL.json`) against the same holds in our editor | Within one 10px step |
| `npm run near-check` | Which blocks the oracle flags near a held drag (`parity/findings/NEAR.json`) against our flags for the same holds | Equal for every block |
| `npm run mid-check` | What the blocks say while held in each recorded drag and resize (`traces/`, mid state), the target ring, center line and center snap (`parity/findings/GUIDES.json`), group handles (`parity/findings/GROUPRESIZE.json`) the marquee (`parity/findings/X13.json`), Layers rows (`parity/findings/LAYERS.json`) and where a held block sits (`parity/findings/HOLD.json`), against the same holds in our editor | Same flags on every block, grid shown in one section, same target area, ring and block size within 1px, same line style |
| `npm run snap-check` | Where a held drag and resize change target, walked 1px at a time on the oracle (`parity/findings/SNAP.json`), against the same walks in our editor | Same targets, each within 1px |
| `npm run chrome-check` | The oracle's block toolbar and selection rings for 5 selected blocks (`parity/findings/TOOLBARGEO.json`) against ours on the same blocks; Move Forward and Backward with real presses (`CAP-U4ZPRESS.json`, `CAP-U4ZSTACK.json`, `CAP-U4ZPIN.json`) | Toolbar, button and separator boxes within 1px, same labels, same ring colors |
| `node scripts/check-chrome.mjs` (in `npm run check`) | The section buttons we draw when hovering, on phones and with a block selected | The list the oracle shows in each view |
| `node scripts/check-markdown.mjs` (in `npm run check`) | Our Markdown parser against the oracle's HTML for 19 samples (`parity/findings/CAP-T10MD.json`), and 38 unsafe inputs | Equal HTML, no script, handler or script link left |
| `node scripts/check-design.mjs` (in `npm run check`) | The 111 block design rules of the corpus (`fixtures/design.json`) against our render of the same values | Equal after collapsing white space |
| `npm run design-edit-check` | The styles 10 Edit > Design values gave on the oracle (`parity/findings/DESIGN.json`) against the same values set in our editor | Equal computed opacity, transform, backdrop filter and background |
| `npm run image-check` | Where the picture sits for Fit, Fill and Shape on the oracle (`parity/findings/IMAGEMODES.json`) against the same buttons in our editor | Picture box within 1px of the measured rule, block size unchanged, one undo step |
| `npm run image-design-check` | Focal point, Corner, Overlay, Lightbox and Stretch on a new image with a picture, through real presses, against `parity/findings/IMAGEDESIGN.json`: card and row positions, what the canvas draws, the lightbox in preview | Boxes within 1.5px, rows within 2px, one undo step each |
| `npm run image-effect-check` | Image Effect on a new image with a picture, through real presses, against `parity/findings/IMAGEEFFECT.json`: the tiles, each effect's rows, presets, Interaction, what a seg, slider and field do, the canvas on the picture, the saved page | Boxes within 1.5px, row tops within 3px, names, ranges and defaults exact, one undo step each |
| `npm run image-editor-check` | The Edit menu and the full-screen image editor on a new image, through real presses, against `parity/findings/IMAGEEDITOR.json`: bar, rows, frames at each ratio, drags, flips, turns, Filter order and Strength, Cancel and Save; the filter curves and slider rules against the measured pixel values | Boxes within 1.5 to 3px, filters within 4 levels on average, one undo step each |
| `npm run image-import-check` | What the importer takes from an image on a page, against `parity/findings/IMAGEIMPORT.json`: each field from the oracle's reads, then all 15 saved images on the imported pages by picture box, corner, mode and clip. Writes `parity/image-import-check.json`. |
| `npm run image-shape-check` | An image's Shape picker (`parity/findings/IMAGESHAPES.json`) against a new image with a picture in our editor, with real presses | Equal names, order and boxes, the clip follows the pick, one undo step, a new image opens on Fit |
| `npm run site-styles-check` | What each style pack and Base Size press set on the oracle's page, its popovers and the five disclosure views (`parity/findings/SITESTYLES2.json`) against the same controls in our editor | Same page values for all 38 packs and each Base Size press, popover boxes equal, view labels within 3px, one undo step |
| `npm run marks-check` | Small marks of the editor chrome as read on the oracle (`parity/findings/MARKS.json`): where a dragged block panel can go, how the grid is drawn, hover, handles, pill, layers, the custom height's field and held slider (`parity/findings/CAP-P3FIELD.json`) | The same limits, the panel back at its first place after Escape, the grid's box, tile, cell and look at 1600, 1280 and on phones; rings, pill, handle boxes and z values in every state |
| `npm run accordion-check` | The accordion's markup, sizes, icon and padding choices, rows after add, delete and expand (`parity/findings/ACCORDION.json`) against a new accordion in our editor, with real keys | Equal boxes and rows, one undo step |
| `npm run accordion-styles-check` | An accordion's Icon, Title, Description, Dividers, more buttons and reorder grip (`parity/findings/ACCORDIONSTYLES.json`) against a new accordion in our editor, with real presses | Equal row tops, styles and boxes, one undo step |
| `npm run button-check` | A new button through the menu: Design tab rows, Fit, Fill and Alignment boxes, the style list, pulls with the mouse, the phone's own container and least width, against `parity/findings/BUTTONDESIGN.json`, `CAP-T5HANDLES.json` and `CAP-T5PHONE.json` | Boxes within 1px, same classes and grid areas |
| `npm run shape-check` | A new shape through the menu: the rows, all 29 Shape styles, Stretch off boxes, Individual corners, Color with its custom picker, Stroke, against `parity/findings/SHAPESTYLES.json` and `CAP-SHAPEWIDE.json`. Curves are ours (O2) and not compared | Boxes within 1px, same names, proportions and values, one undo step |
| `npm run anim-check` | The Animation tab on a new Text block through real clicks: list, picker, every preset's values, Timing rows, scrub, Reset, Preview frames and On Hover, On Press in preview mode against `parity/findings/ANIMFLOW.json` | Boxes within 1px, same values and labels, Preview curves within .08 (`parity/anim-check.json`) |
| `npm run block-design-check` | A new text block through the menu: Stroke, Stroke Color, Thickness, Background, Background Color, Corner, Padding, Blur and More actions in the oracle's order, with the rows they add, against `parity/findings/BLOCKDESIGN.json`; no row under the panel's tabs after Tab, Shift+Tab or a scroll | Heights and paddings within 0.6px, same rows, areas and values, one undo step |
| `npm run t11-check` | A new Line, Map and Social Links through the menu: boxes, classes, sizes, borders, styles, rows, labels, the grip, the list and its dialog, the Map fields, styles, Zoom ladder, typed Zoom and switches, how narrow Social Links goes, its Thickness field, each on a phone too, against `parity/findings/T11.json`, `CAP-T11ZOOM.json` and `CAP-T11SOCIAL.json` | Boxes within 1px, same words and values, 170 of 170 |
| `npm run video-check` | A video from a real file picked in the panel (nothing uploaded): the markup, Content rows, Aspect ratio, Lazy Loading, the three buttons, Player controls, Align Vertically, Corner, Remove and the published player against `parity/findings/VIDEOPLAYER.json` |
| `npm run resize-check` | Each block type we build, added through the menu and pulled by three handles with the mouse, and a picture in Fit, Fill and Shape, against `parity/findings/BLOCKTYPES.json` | Equal grid areas |
| `npm run x6-check` | Pulls per type against the oracle's reads, with width floors on both layouts (`parity/findings/CAP-X6*.json`) | Equal grid areas, rows named where a stand-in has no content |
| `npm run standin-check` | Quote, Chart, SoundCloud, Flickr and Instagram: boxes inside, the least rows at each width, rows after widening, against `parity/findings/STANDINS.json` | Boxes within 1.5px, same rows, 45 of 45 |
| `npm run form-check` | Add Block > Form through the menu: its area, every field's box and look, the panel's rows, Form Name and Button Text, against `parity/findings/FORMADD.json` | Boxes within 1.5px, same words and values |
| `npm run code-check` | What each code mode, Display Source Code and Embed data wrote on the oracle (`parity/findings/CODEEMBED.json`), and the rows after each step of the `CAP-T10*.json` walks, with 31 sequences read after their predictions were pushed (`CAP-T10FRESH.json`), against the same input in our editor, with real keys | Equal HTML, same rows and panel size, one undo step |

The dev server (`npm run dev`, scripts/serve.mjs) sends `Cache-Control: no-store`. Set `FLUID_PORT` to run a checkout on its own port (default 5178), and `CDP_PORT` to give it its own headless Chrome: `FLUID_PORT=5201 CDP_PORT=9341`. Under python's http.server a WebKit tab kept old modules, so a check could measure code older than the checkout.

Geometry is compared inside one engine, because WebKit draws a scrollbar that takes 15 or 17px of the canvas and headless Chrome draws none (docs/decisions/0006). Each finding says which engine read it, and Gate B, chrome-check, section-check, design-edit-check and the inventory refuse a mix. The stored geometry readings are from Chrome, so these run on a headless Chrome: `eval "$(node scripts/headless.mjs)"` sets `FLUID_SURFACE=cdp:9333`. Gate C replays grid units and runs on either. The functional checks (text-check, paste-check, near-check, mid-check, autoscroll-check, image-check, code-check, accordion-check, resize-check, video-check, button-check, shape-check, block-design-check, site-styles-check, anim-check) run on a headless Chrome too. Gate B: `node scripts/box-diff.mjs --surface cdp:<ours> --oracle-frame cdp:<oracle> --oracle-path /how-fluid-engine-works --ours http://127.0.0.1:<port>/page.html`.

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

To ask the oracle one question, use one command. It never saves, and it leaves through Exit Without Saving:

```
ORACLE_SURFACE=cdp:<port> node scripts/oracle-capture.mjs --list     the questions in scripts/oracle/recipes.mjs
ORACLE_SURFACE=cdp:<port> node scripts/oracle-capture.mjs CAP-LINK   writes parity/findings/CAP-LINK.json
... --again to replace a finding, SHOTS=<dir> for screenshots, --name X --steps '[...]' for a new question
ORACLE_SURFACE=cdp:<port> node scripts/oracle-readback.mjs           after a probe: palette, theme rows, Fonts, Buttons, Forms against stored lists
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
| O1 | Read state, do one gesture, read state, then leave with `exitWithoutSaving()` in `scripts/oracle/ui.mjs`, because undo can leave a page dirty. Social Links rows (Add, the Display Social Icon switch, Delete) are not page state: they write the live site with no Save, so a probe does not press them (`parity/findings/T11.json`). Never press Save on the trial site unless the milestone step says so. New experiments go on a new page, never an old one (docs/decisions/0006) |
| O2 | Black box only. No Squarespace JavaScript, CSS files, fonts or images are copied into this repo |
| O3 | Fixtures in git hold CSS only: ids and grid numbers. Raw pages with other people's content stay in `fixtures/raw/`, which git ignores |
| O4 | A Squarespace change that breaks a gate is a finding, not a failure to hide. Recapture and record it |

## Docs

- Picture first: README, docs and decisions open with a picture, a table or a diagram.
- README stays at or under 80 lines. `npm run check` enforces it and checks links.
- One fact, one home. Milestone status lives on the board, item status in `parity/items.json`, never in prose.
- Generated files are never edited by hand: `docs/images/roadmap.svg`, `docs/images/parity.svg`, `docs/PARITY.md` and the README timeline.
- Plain words. Name the file, the number or the mechanism.
