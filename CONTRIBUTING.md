# Contributing

```
item in parity/items.json ─► trace on the oracle (if unknown) ─► branch + PR ─► checks green
        ▲                                                                          │
        └──── status + evidence in items.json ◄──── review by someone else ◄───────┘
```

## How we work

- **Milestones are issues.** Goal issue [#1](https://github.com/FRIKKern/fluid-editor/issues/1) holds M0–M6 as sub-issues. Label `status:in_progress` while one is underway; close it when its exit gate in [`docs/ROADMAP.md`](docs/ROADMAP.md) passes.
- **Items live in [`parity/items.json`](parity/items.json).** Statuses are `done`, `partial`, `open` and `unknown`. A done item names its evidence: a gate report, a trace file or a screenshot.
- **One item per PR** where it fits. Name the item in the title: `G5: snap to other blocks' edges`.
- **Evidence on close:** what ran, where to see it, screenshots for anything visible.
- **Fixtures arrive only through the scripts.** Save the raw page in `fixtures/raw/<host>.html`, then `node scripts/extract-fixtures.mjs`.

## Before you push

```sh
npm run check
```

## Decisions

A decision gets its own page in `docs/decisions/NNNN-title.md`. A page is superseded by a new page, never edited.
