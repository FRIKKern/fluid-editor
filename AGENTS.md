# AGENTS.md

Lead with a picture, then the fewest words that carry the point.

## Where things live

```
milestone status ─► goal issue #1 and its sub-issues (M0–M6)
item status      ─► parity/items.json (one row per item, evidence on done)
what "works"     ─► JOURNEYS.md (J01–J14)
how good         ─► QUALITY.md (gates A, B, C and oracle rules O1–O4)
why              ─► docs/decisions/NNNN-*.md (supersede, never edit)
the oracle       ─► halibut-keyboard-jlhd.squarespace.com, headless: scripts/oracle-headless.mjs
```

## Loop

1. Take the next open item of the current milestone in `docs/PARITY.md`.
2. If it is unknown, record the trace on the oracle first (O1). Store it, then build.
3. Work on a branch. The main checkout stays on `main`.
4. Name the item in the commit: `X6: handles per block type`.
5. `npm run check` before every commit.
6. Set the item's status in `parity/items.json` with its evidence, then `npm run parity`. A part the repo will not build goes in the item's `outOfScope` list with the decision that says so (docs/decisions/0005).
7. After a merge, read `gh run list --workflow browser-checks.yml --branch main`. A red job is a red main: one fixer, who first checks that nobody else has a fix open.

## Rules

- **Unrun means unrun.** Never report a check you did not run.
- **Nobody signs off their own journey.**
- **No skip-pass.** A check with nothing to check fails.
- **Black box only** (O2). Watch Squarespace; never copy its code or assets.
- **Never press Save on the trial site** unless the step says so (O1).
- **No secrets** in prompts, files or output.
- **Ask before pushing** or anything destructive.
