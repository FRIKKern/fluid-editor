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
- **The Upgrade note in a Code block's panel (T10).** It shows when a script is in the code and is about the trial's plan, not the editor. Ours leaves it out.
- **Subscribe in the Site Styles panel (U12).** It is the trial account's billing button. It is not part of the editor.
- **Gallery blocks in the corpus (H3).** Fluid Engine offers no Gallery block (parity/findings/T8.json).
- **Answers that need a Save or an upload on the trial site (T7, P5, L5, T12, T15).** Uploaded video, how an uploaded section picture fits, the published CSS of a hidden block, the published accordion, and what a published page does with a block's animations (T15, the lead's ruling, like the accordion). Probes never save or upload (O1). Ours is built from what the editor shows; what ours publishes is our own.
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
- **A form's Additional Storage and reCAPTCHA (T9), and Newsletter's storage rows (T12).** Outside services, and storage writes outside the page, so a probe reads them and never presses them. Ours shows these rows faded: on Newsletter, Squarespace and Other Storage Options.
- **A form's stored submissions (T9).** Manage Submissions and Export need stored submissions, which ours does not have, and a submit writes to form storage. Ours shows both rows faded.
- **What a form draws after a real submit (T9), and a Newsletter's (T12).** Reading it means a submit, which writes to form storage. The editor's Edit Post-Submit view is read and built, and Newsletter's Post-Submit view too. Ours draws the same after a submit, or follows the redirect, and that part is inferred.
- **The phone order of a saved section after an edit (A2).** Holding a section saved needs a Save, which a probe never presses. A saved page keeps its order on load, which is ours.
- **What an open form lightbox draws (T9).** The oracle opens it only after a Save, which a probe never presses. The button, its rows and the block's rows are read and built. The open view in ours is plain and our own.
- **A Form Style choice (T9).** Pressing one writes to every form on the site. The list opens on the oracle with six unnamed tiles and is read, opened twice with no row pressed. Ours doesn't draw it, because what a choice does can't be read without writing to every form. Ours shows the tile as read, and it opens nothing.
- **Email Notification (T9).** It holds the owner's address and writes outside the page, so a probe never presses it. Ours shows it faded.
- **Send confirmation email, SMS Marketing Opt-in and View plans (T9).** The first two write outside the page, and View plans reaches a paid plan, so a probe reads the rows and never presses them. Ours shows them faded.
- **Edit with AI and Reshoot on an image (T4).** They need an AI service, and the dialog's OK accepts AI Terms on the owner's account, so a probe never presses it and nothing past the dialog is read. Ours shows both rows faded.
- **Edit Site Header and AI Terms in Add Section (U9).** The lead's ruling. The header reaches the whole site, has no safe read, and is not the grid. AI Terms are never accepted. Ours draws no Edit Site Header button, and keeps Add a Section's "AI Terms apply" as words with no link.
- **Upload and Learn More in Site Styles' font list (U12).** The lead's ruling. Upload needs an uploaded file, which a probe may not do, and a store for fonts. Learn More is a link out to the host's help, not the grid. Both stay faded in ours, and the repo holds no link.
- **Stand-in panel rows that need an account, a lookup or a collection (T12).** The lead's ruling, row by row. A stand-in's row stays in scope if a read shows it changes the block with none of these. Out: the account menu on Instagram and Flickr (Choose, Add an account), and Items, which does nothing without an account; Bandsintown's Band Name, Zola's Registry Name and OpenTable's Restaurant ID, which look up an outside service, so a probe types nothing there; SoundCloud's URL; every row of Scheduling (the Acuity frame) and Tock (Join Tock), which need an outside account, so both blocks stay sized stand-ins; Product's Create new product, Pricing Plan's Get started, Donation's Set Up Payment Processor and Funds, which reach a store or payments; Audio's Upload File; the collection menus of Summary, Archive (Collection) and Search Field (Page); the rows on Calendar, Page Link and RSS, which show help only until the site has a collection; Tag Cloud's two menus, which change nothing with no tags. In scope, because a read showed a change: Aspect Ratio, Crop Images and Open Links in New Window on Instagram and Flickr, Show Title on Flickr, Tag Cloud's Tags. Bandsintown's Timeframe sits behind Band Name and is named not read, not ruled out. Ours may leave the out rows out or show them faded; no real content comes from them. A later row joins this list only by name.
- **Learn More in the link editor (E7), and on Newsletter (T12).** The lead's ruling. It opens the host's help in a new tab and closes the editor; that's a link out, not the grid. Ours keeps the row, and a press only closes the editor. Newsletter's Learn More on Content and Storage is the same link out; ours keeps both as faded words. The repo holds no link.
- **The system clipboard as the store for copied properties (U11).** The lead's ruling. The oracle writes and reads the Mac clipboard as text; ours keeps the clip in the page, because a probe may not touch the owner's clipboard and the grid doesn't need it. Read behind a stubbed clipboard: CAP-U11TRANSFORMS.json, CAP-U11TRANSFORMS2.json, CAP-U11TRIG-PRESS.json.

## Considered

- **A fifth status, out.** Rejected: most of these items have parts that are in scope, and a new status splits the heatmap.
- **Delete the items.** Rejected: the parts stay visible, and a later decision can bring one back.
