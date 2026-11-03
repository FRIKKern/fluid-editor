# 0004 The oracle page uses Google Fonts and is measured in the editor's preview frame

Date: 2026-11-03 · Status: accepted

```
trial site Styles ─► Poppins (Google Fonts) ─► our site.css loads the same file
editor full-screen preview ─► #sqs-site-frame resized to 375…1920px ─► Gate B boxes
```

## Context

The trial site used the Adobe font "obviously". Its files are licensed and cannot be copied here (QUALITY.md, O2), and text height decides row stretch, so no text-heavy check could pass. The trial site is also private: a logged-in visit to a page URL redirects to the editor, and a logged-out visit gets 401.

## Decision

The trial site's headings, paragraphs, miscellaneous text and three button styles use Poppins, which both sides load from Google Fonts. Type sizes in `app/src/site.css` follow the formulas the oracle's pages compute, written as our own CSS.

The demo page "How Fluid Engine works" is built by `scripts/oracle-build.mjs` through the editor, imported by `scripts/oracle-import.mjs`, and our demo model is generated from that import, so both sides share block ids and areas.

Gate B measures the oracle inside the editor's full-screen preview, with the site frame element resized to each width and 1000px tall. Media queries inside the frame see that size, the same as a window. Our side is `app/page.html` in a cmux tab at the same width and height.

## Considered

- **Make the trial site public.** Rejected for now: it changes who can see the site, and the preview frame gives the same layout.
- **Keep the Adobe font and accept text failures.** Rejected: every text-heavy gate would fail for a reason that is not about the grid.
