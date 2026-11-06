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
- **What needs an uploaded file in Site Styles and on a section video (U12, P5).** From Image's drop in the palette editor, and how an uploaded video fits a section with its Filter strength. Probes never upload (O1). Ours keeps the row and reads nothing from it.
- **File links (E7).** Choosing a file means an upload on the trial site, and we have no file store. Ours shows File in the link menu, turned off.
- **Section templates and Made with Classic Editor (U10).** They are Squarespace's pictures and words (O2). Ours lists them with empty tiles. View Layouts is not part of this: it lays out the section's own blocks, and it is built.
- **The WebGL art pictures (P5).** They are Squarespace's pictures. Ours are named CSS stand-ins from the same colors and do not follow the rows. Art's rows and the Aa chips are controls, and they are built.
- **Pressing buttons that write outside the page (U10, U12, P5).** Save Section, Reset and Reset Color Theme on the trial site. A probe does not press them, so what they do there stays unread. Ours keeps its own behaviour.
- **Map tiles and the address lookup (T11).** A hosted service. Ours draws a plain local map with a pin, copies nothing from the host's or the service's tiles and leaves out their legal note; every panel control works. Whether the address fields write outside the block is unknown: nobody read it, and they are not typed into on the trial site.
- **The social rows' writes on the trial site (T11).** The rows are one list for the whole site, written at once with no Save. What Add, edit, hide, delete and reorder do there beyond the reads in `parity/findings/T11.json` stays unread. Ours keeps the list in the browser.
- **Zola and Bandsintown's content (T12).** Zola is a frame from its service and Bandsintown a tour list from its own, and real content needs an account or listing. The same pull reads differently from run to run: Zola `s -2` kept 17 rows on 2026-11-04 and went to 18 on 2026-11-06; Bandsintown `se +2,+1` read 22 rows on 2026-11-04 and 5 on 2026-11-06. Ours are stand-ins of the right size. Their 5 misses stay named in resize-check, marked out of scope.
- **A form's Additional Storage and reCAPTCHA (T9).** Outside services, and storage writes outside the page, so a probe reads them and never presses them. Ours shows both rows faded.
- **A form's stored submissions (T9).** Manage Submissions and Export need stored submissions, which ours does not have, and a submit writes to form storage. Ours shows both rows faded.
- **What a form draws after a real submit (T9).** Reading it means a submit, which writes to form storage. The editor's Edit Post-Submit view is read and built. Ours draws the same after a submit, or follows the redirect, and that part is inferred.
- **The phone order of a saved section after an edit (A2).** Holding a section saved needs a Save, which a probe never presses. A saved page keeps its order on load, which is ours.
- **What an open form lightbox draws (T9).** The oracle opens it only after a Save, which a probe never presses. The button, its rows and the block's rows are read and built. The open view in ours is plain and our own.
- **Send confirmation email, SMS Marketing Opt-in and View plans (T9).** The first two write outside the page, and View plans reaches a paid plan, so a probe reads the rows and never presses them. Ours shows them faded.
- **Edit with AI and Reshoot on an image (T4).** They need an AI service, and the dialog's OK accepts AI Terms on the owner's account, so a probe never presses it and nothing past the dialog is read. Ours shows both rows faded.

## Considered

- **A fifth status, out.** Rejected: most of these items have parts that are in scope, and a new status splits the heatmap.
- **Delete the items.** Rejected: the parts stay visible, and a later decision can bring one back.
