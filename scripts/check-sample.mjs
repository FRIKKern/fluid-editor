// The behaviour sample's score can't pass what differs (scripts/lib/sample-look.mjs), and the stored picks hold what the
// scoring needs.
import { readFileSync } from 'node:fs';
import { lookDiff, scoreOne } from './lib/sample-look.mjs';

const bad = [];
const is = (what, ok) => { if (!ok) bad.push(what); };
const a = { w: 100, h: 50, cl: 0, words: 'x', align: 'start', fills: [], opacity: 1 };
is('no change is no diff', Object.keys(lookDiff(a, { ...a })).length === 0);
is('under 1 px is no change', Object.keys(lookDiff(a, { ...a, h: 50.6 })).length === 0);
is('a height change is a diff', lookDiff(a, { ...a, h: 60 }).h?.[1] === 60);
is('a fill is a diff', !!lookDiff(a, { ...a, fills: ['rgb(1, 2, 3)'] }).fills);
is('a block gone is a diff', !!lookDiff(a, null).gone);
const up = lookDiff(a, { ...a, h: 60 }), down = lookDiff(a, { ...a, h: 40 });
is('the same change matches', scoreOne(up, { h: [50, 70] }).match);
is('nothing on both matches', scoreOne({}, {}).match);
is('a change on one side only misses', !scoreOne(up, {}).match && !scoreOne({}, up).match);
is('the other way misses', !scoreOne(up, down).match);
is('another alignment misses', !scoreOne({ align: ['start', 'center'] }, { align: ['start', 'right'] }).match);
is('another colour still matches', scoreOne({ color: ['a', 'b'] }, { color: ['a', 'c'] }).match);
const f = JSON.parse(readFileSync(new URL('../parity/findings/SAMPLE-ROWS.json', import.meta.url)));
is('picks hold tile, tab, kind, row and name', f.picks.every((p) => p.tile && p.tab && p.kind && p.row && p.name));
is('every oracle read has an ours prediction', f.picks.every((p) => !p.oracle?.diff || p.ours?.diff));
is('no more than three picks a tile', Object.values(f.picks.reduce((m, p) => ({ ...m, [p.tile]: (m[p.tile] || 0) + 1 }), {})).every((n) => n <= 3));
if (bad.length) { console.error(`sample check: ${bad.join('; ')}`); process.exit(1); }
console.log(`sample ok: ${f.picks.length} picks`);
