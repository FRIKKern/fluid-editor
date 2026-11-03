# Fixtures

| What | Where |
|---|---|
| One captured Fluid Engine section `<style>` per file, CSS only | `css/<host>--<sectionId>.css` |
| Source URL, section id, capture date and sha256 for each file | `index.json` |
| Raw pages, with other people's content; never committed | `raw/<host>.html` |

Add a site: save the page as `raw/<host>.html`, then run `node scripts/extract-fixtures.mjs`. Gate A fails on a file whose sha256 does not match `index.json` (QUALITY.md, O3).
