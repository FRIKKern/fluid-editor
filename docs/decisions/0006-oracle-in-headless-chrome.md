# 0006 The oracle runs in headless Chrome; new experiments go on a new page

Date: 2026-11-04 · Status: accepted

```
owner's cmux tab ─(*.squarespace.com cookies, once)─► headless Chrome on CDP_PORT
scripts/oracle/ui.mjs, oracle-probe, oracle-record ─► ORACLE_SURFACE=cdp:<port>
                                    real Input events ─► scripts/lib/cdp-run.mjs
```

## Context

The oracle lived in one visible cmux tab. A hidden tab stops the Squarespace editor from booting, the tab takes the owner's screen, and only one lane could use it. The trial ends around 2026-11-12, so several lanes need it at the same time.

## Decision

`eval "$(CDP_PORT=<port> node scripts/oracle-headless.mjs)"` starts or reuses a Chrome on that port, copies only the `*.squarespace.com` cookies from a cmux tab, and exports `ORACLE_SURFACE=cdp:<port>`. It prints no cookie values and writes none to a file of ours. Chrome keeps them in its profile under `/tmp/fluid-editor-chrome-<port>`.

Every oracle script drives either kind of surface through `browser()` in `scripts/lib/cmux.mjs`. On `cdp:` a click, hover, key, fill or drag is a real `Input.dispatch*` event (`isTrusted`), shifted by the box of the same-origin iframe it targets. A real click on an element labelled Save or Publish on the oracle is refused unless `ORACLE_ALLOW_SAVE` is set. A script can still call `el.click()` itself, so this catches accidents only.

**Several sessions may sit in edit mode at once.** Tested 2026-11-04 on the demo page with two Chromes: both entered edit mode, both had unsaved changes at the same time for two minutes, neither showed a lock, warning or kicked session, and each left with its own Exit Without Saving. After a reload both read the same saved page. This covers unsaved work only: nobody saves.

**Leaving edit mode:** `exitWithoutSaving()` in `scripts/oracle/ui.mjs`, which is Exit, then the Exit inside "Exit Without Saving?". Undo is not a way back: 8 undos left a page dirty on 2026-11-04.

**New page, never edit an old one.** Old pages feed Gate B and the traces, so a stray change there breaks the gates. A new experiment that changes content is run on a new page made for it. The stored recorders (`oracle-record`, `oracle-probe`) keep the demo page because the traces name its blocks, and they end with nothing saved. No old page is ever saved.

**Enforced since 2026-11-06.** `oracle-capture --steps` needs `--page` or a first `toPage`, and `toPage` sets the page a later `enter` returns to. The demo page takes only steps that can't write, and `--steps` needs `--demo-read-only` for it. Every step that acts stops the run if the frame is on another page. `oracle-probe` and `oracle-record` on the demo page need `ORACLE_DEMO_WRITES=1`. `enterEdit` has no default page.

**Break, 2026-11-06.** The chrome lane ran `oracle-capture --steps` with a first `toPage` and no `--page`. After `exit`, `enter` fell back to the demo page, so four runs added a section and pressed one control by position there. Nothing was saved: each left through Exit Without Saving. Checked on a fresh load outside edit mode: 8 sections, blocks as before, and `oracle-readback` the same. The result of `recorder`'s Gate B check goes here when it is in.

## Considered

- **One Chrome shared by all lanes.** Rejected: lanes would fight over selection, pointer and edit mode.
- **Keep the cmux tab.** Rejected: one lane at a time, and it needs the owner's screen.

## Geometry: compare inside one engine

Decided 2026-11-04, from a run of the oracle in headless Chrome against ours in headless Chrome, both with no layout scrollbar. **Geometry checks accept `cdp:` when the oracle readings are also from Chrome.** Every finding says which engine read it (`engine`; no field means WebKit), and box-diff, chrome-check, section-check, design-edit-check and the inventory refuse a mix. Gate C replays grid units, so it runs on either.

The old readings were WebKit with a 17px scrollbar, so a canvas was 1583px wide. In Chrome it is 1600px. That moves block x by 8, a centered thing by 8.5 and the right side by 17, which is what the re-recorded findings show. `recordedAgain` in each finding lists every old and new value.

| Check | Chrome against Chrome |
|---|---|
| Gate B, demo page | 375 of 375, also 330 of 330 without sections and 225 of 225 at 600, 650, 700 |
| Gate B, services | 115 of 115 |
| Gate B, home | 220 of 225: one picture block at 375 (below) |
| Gate B, about | 133 of 140: one picture block at 375 (below) |
| Gate B, contact | 65 of 65, since the form was re-read (below) |
| section-check | 35 of 35 |
| design-edit-check | 10 of 10 |
| Gate C | 23 of 23, after fixing a real bug T0005 found (G4) |
| chrome-check | 88 of 88, after building the measured Add Section rule (U10) |

The first Gate B run in Chrome, 352 of 365, found four real CSS bugs, all fixed here: a button wraps its text (`white-space: normal`, 50 not 41.4 tall at 768), the burger keeps the browser's button padding (37 not 40, so the phone header is 129.16 not 132.16), and `overflow-wrap: break-word` comes from the body ("email@example.com" in a 138.5px block is 67.2 tall, not 44.8). A screenshot then found a fourth that no check saw: at 768 the demo hero button is 158 wide in a 138.5 block, 10px over on each side, and ours was 138.5. Fixed, and Gate B now also compares the button inside each block, so its totals rose by one per button.

## Limits

WebKit was not run again, so these numbers say nothing about it. Named gaps, none hidden by a lower bar:

- **A picture block at 375, home and about.** The oracle block is taller than ours: 66.6 not 59 on home (picture 481 by 274), 245 not 234 on about (picture 1 by 1), and what is below moves down with it. The oracle reads differently on the same page at the same width: about at 375 read 245, then 234 after the frame went through other widths, and home passed in full on one run. So this is the oracle's lazy picture sizing, not a layout rule. Ours has no pictures (O2).
- **The form block, contact: closed.** It was 57 of 65: oracle against ours 1156.8 and 1144.7 at 375, 1055.2 and 1057.4 at 767, 1090.5 and 1095.3 at 768, 1049 and 1053.7 at 1280, because our form was sized from WebKit readings. With the form re-read in Chrome (T9, #182, #185), the live oracle and ours read 65 of 65 on 2026-11-06, Chrome on both sides, main at 11e3f9e.
- **In the editor, the frame can go back to its own page** after `src` is set, so box-diff checks that the page stays.
