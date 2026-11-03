# 0003 Milestones on the board, items in one JSON file, pictures generated

Date: 2026-11-03 · Status: accepted

```
goal issue #1 ── sub-issues M0–M6 ──► scripts/generate-roadmap.mjs ──► docs/images/roadmap.svg
parity/items.json (105 items) ───────► scripts/generate-parity.mjs  ──► docs/images/parity.svg, docs/PARITY.md
git log + closed milestones ─────────► scripts/readme-timeline.mjs  ──► README timeline
```

## Context

We want anyone to see progress from the README in five seconds, the way the PortableDoc and Barkpark Studio repos do, and nothing should slip.

## Decision

Milestone status lives on GitHub. Goal issue #1 has one sub-issue per milestone, titled `M0: …`. Closed means delivered; the label `status:in_progress` means underway.

Item status lives in `parity/items.json`, one row per item with its area, milestone, status and evidence. `npm run check` refuses a done item without evidence.

The pictures and `docs/PARITY.md` are generated and never edited by hand. `.github/workflows/housekeeping.yml` redraws them and the timeline on every push to main and once a day.

## Considered

- **One issue per item.** Rejected for now: 105 issues bury the milestones. An item gets its own issue when it needs discussion.
- **Barkpark tasks.** Not yet: this repo has no Barkpark project. If it gets one, the board script reads from the bridge as PortableDoc does.
