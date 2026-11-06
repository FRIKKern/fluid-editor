// The read-back's comparison can't pass a narrowed read: oracle-readback.mjs is only as honest as this.
import { THEMES, NAMES, colorsOf, compareRows, comparePalette, FINDING } from './oracle/readback.mjs';

const full = (t) => NAMES.map((n, i) => [n, colorsOf(t)[i]]);
const bad = [];
const is = (what, ok) => { if (!ok) bad.push(what); };
is('ten themes stored', THEMES.length === 10);
is('a color for every row of every theme', THEMES.every((t) => colorsOf(t).length === NAMES.length && colorsOf(t).every((c) => c !== undefined)));
is('names on two lines are in the stored list', NAMES.includes('Side Nav Active Lesson Background Color'));
is('a full read passes', THEMES.every((t) => compareRows(t, full(t)).length === 0));
const t = THEMES[0], rows = full(t);
is('a read that drops a row fails', compareRows(t, rows.filter(([n]) => n !== 'Side Nav Active Lesson Background Color')).length > 0);
is('an extra row fails', compareRows(t, [...rows, ['New', '']]).length > 0);
is('a renamed row fails', compareRows(t, rows.map(([n, c], i) => [i === 5 ? 'x' : n, c])).length > 0);
is('a recolored row fails', compareRows(t, rows.map(([n, c], i) => [n, i === 5 ? 'rgb(1, 2, 3)' : c])).length > 0);
is('the stored palette passes', comparePalette(FINDING.palette.vars0).length === 0);
is('a changed palette fails', comparePalette({ ...FINDING.palette.vars0, accent: '10, 10%, 10%' }).length > 0);
is('a missing palette value fails', comparePalette({ ...FINDING.palette.vars0, accent: '' }).length > 0);
if (bad.length) { console.error(`read-back compare: ${bad.join('; ')}`); process.exit(1); }
console.log(`read-back compare ok: ${NAMES.length} rows, ${THEMES.length} themes`);
