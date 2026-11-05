# 0005 Some parts of items are out of scope

Date: 2026-11-03 · Status: accepted

```
item in parity/items.json ── outOfScope: ["0005: …"] ──► done when everything else is done
```

## Context

Several partial items could never become done. They name parts that need a Squarespace service or a real save on the trial site, and the black-box rules forbid that (0001, QUALITY.md O1). Others name a block Fluid Engine does not offer. Leaving them partial hides the work that is still possible.

## Decision

An item can carry `outOfScope`: a list of parts this repo will not build or measure, each starting with the decision that says so. An item is done when every part outside that list is done. `npm run check` requires each entry to name a decision file. `docs/PARITY.md` lists the entries.

Out of scope now:

- **Squarespace AI in the text toolbar (E4).** It is a hosted text service. Our toolbar has no AI button.
- **What Save does on the live site, drafts, and revision conflicts (Y3).** Measuring them means saving the trial site, or two editors at once. Probes never save (O1). Our editor saves to the browser.
- **The Sell group of the Add Block menu (U5).** Product, donation and member blocks need a Squarespace store or account.
- **What is behind Pricing Plan and Scheduling (U5).** Pricing Plan needs a pricing plan on the account and Scheduling is an Acuity frame. Ours has both tiles and their default sizes, with a stand-in block.
- **Subscribe in the Site Styles panel (U12).** It is the trial account's billing button. It is not part of the editor.
- **Gallery blocks in the corpus (H3).** Fluid Engine offers no Gallery block (parity/findings/T8.json).
- **Answers that need a Save or an upload on the trial site (T7, P5, L5, T12).** Uploaded video, how an uploaded section picture fits, the published CSS of a hidden block, the published accordion. Probes never save or upload (O1). Ours is built from what the editor shows.
- **A link that finds real content in an embed block (T10).** It goes through a lookup service of the host. Ours ends every link in the error text, and Custom thumbnail, which only an embedded video enables, stays off.
- **What an embed's Description publishes (T10).** Reading it needs a Save.
- **File links (E7).** Choosing a file means an upload on the trial site, and we have no file store. Ours shows File in the link menu, turned off.
- **Section templates and Made with Classic Editor (U10).** They are Squarespace's pictures and words (O2). Ours lists them with empty tiles. View Layouts is not part of this: it lays out the section's own blocks, and it is built.
- **The WebGL art pictures (P5).** They are Squarespace's pictures. Ours are named CSS stand-ins from the same colors and do not follow the rows. Art's rows and the Aa chips are controls, and they are built.
- **Pressing buttons that write outside the page (U10, U12).** Save Section, Reset and Reset Color Theme on the trial site. A probe does not press them, so what they do there stays unread. Ours keeps its own behaviour.

## Considered

- **A fifth status, out.** Rejected: most of these items have parts that are in scope, and a new status splits the heatmap.
- **Delete the items.** Rejected: the parts stay visible, and a later decision can bring one back.
