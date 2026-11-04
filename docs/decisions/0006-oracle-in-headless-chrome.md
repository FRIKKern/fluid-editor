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

## Considered

- **One Chrome shared by all lanes.** Rejected: lanes would fight over selection, pointer and edit mode.
- **Keep the cmux tab.** Rejected: one lane at a time, and it needs the owner's screen.

## Limits

Headless Chrome is not WebKit. Whether geometry can be compared Chrome against Chrome is decided separately and recorded here when it is measured.
