# 0007 A written daily News replaces the README timeline

Date: 2026-11-16 · Status: accepted · Supersedes in part: [0003](0003-tracking.md) (the README timeline)

```
merged PRs, their descriptions and reviews ──► daily news run ──► README News (two newest days)
                                                              └─► docs/news/YYYY-MM-DD.md (the full day)
```

## Context

README's "What happened" listed raw PR titles from `git log` under Today, Yesterday and This week. The owner, 2026-11-16, wants "a true feeling what happened each day in more detail ... holistic and interesting".

## Decision

README carries **News** between `<!-- news:start -->` and `<!-- news:end -->`: the two newest days, each in 2 to 4 plain sentences, then the day's changes grouped by meaning, every PR linked. A quiet day is one line. Each day has a full page in `docs/news/`: what changed in the editor, which checks got harder to fool, where it was slow, and how it fits the roadmap. Insider words (oracle, check, gate) are explained where they appear.

The daily news run writes the block and the pages and opens one PR a day; never edit them by hand. `scripts/readme-timeline.mjs` is removed, and `housekeeping` no longer touches README, so two writers never fight over it.

## Considered

- **Keep the timeline beside News.** Rejected: two blocks telling the same days, and two writers on one file.
