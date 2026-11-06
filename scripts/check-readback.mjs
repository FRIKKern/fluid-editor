// The read-back's comparison can't pass a narrowed read: oracle-readback.mjs is only as honest as this.
import { readFileSync } from 'node:fs';
import { THEMES, NAMES, colorsOf, compareRows, comparePalette, compareView, STYLES, FINDING } from './oracle/readback.mjs';
import { VIEWS, DEEP } from './oracle/style-views.mjs';

const finding = (n) => JSON.parse(readFileSync(new URL(`../parity/findings/${n}.json`, import.meta.url)));

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
// The other views. The list was stored after the probes, so what older reads held anchors it.
const views = STYLES.views;
const expected = [...Object.entries(VIEWS).flatMap(([v, rs]) => [v, ...rs.map((r) => `${v} > ${r}`)]), ...Object.entries(DEEP).flatMap(([v, rs]) => rs.map((r) => `${v} > ${r}`))];
is('every view stored', expected.every((v) => views[v]?.length > 0));
const one = views['Forms > Form Spacing'];
is('a stored view passes', compareView('Forms > Form Spacing', one).length === 0);
is('a view missing a control fails', compareView('Forms > Form Spacing', one.slice(1)).length > 0);
is('a view with a changed value fails', compareView('Forms > Form Spacing', one.map((c, i) => (i === 0 ? [...c.slice(0, 2), 'text:99px', ...c.slice(3)] : c))).length > 0);
const input = (v, label) => views[v].find((c) => c[0] === label && c[2].startsWith('text:'))?.[2].slice(5);
const btn = finding('CAP-BUTTONROWS').defaultsEachType;
for (const t of ['Primary', 'Secondary', 'Tertiary']) {
  const v = `Buttons > ${t} Button`, words = views[v].map((c) => c[1]);
  is(`${t} button holds CAP-BUTTONROWS' defaults`, words.includes(`Font ${btn.font}`) && words.includes(`Shape ${btn.shape}`) && input(v, 'Outline') === `${btn.outline}px` && views[v].some((c) => c[0] === 'Padding Options' && c[3] === 'checked'));
}
const form = finding('CAP-FORMROWS'), row = (label) => views.Forms.find((c) => c[0] === label);
is('Forms holds CAP-FORMROWS\' defaults', views.Forms.some((c) => c[1] === `Field Shape ${form.defaults.shape}`) && views.Forms.some((c) => c[2] === `checkbox:${form.defaults.fill}`) && row('All')[3] === 'checked' && input('Forms', 'Border Thickness') === form.defaults.thick && row(form.defaults.pad)[3] === 'checked');
is('Form Spacing holds CAP-FORMROWS\' defaults', Object.entries(form.spacing.defaults).every(([k, n]) => input('Forms > Form Spacing', k) === `${n}px`));
const typed = (rows) => rows.filter((r) => r[0] === 'INPUT' && String(r[3]).startsWith('text')).map((r) => [r[1], r[2]]);
const site = finding('CAP-SITESTYLEROWS');
for (const [k, v] of [['headings', 'Fonts > Headings'], ['paragraphs', 'Fonts > Paragraphs'], ['spacing', 'Miscellaneous > Spacing']]) {
  const old = typed(site[k]);
  is(`${v} holds CAP-SITESTYLEROWS' values`, old.length > 0 && old.every(([l, val]) => input(v, l) === val));
}
// The full print CAP-ARTROWS holds.
const before = finding('CAP-ARTROWS').siteStylesBefore, text = (v) => views[v].filter((c) => c[2].startsWith('text:')).map((c) => c[2].slice(5));
is('base size as printed', text('Fonts')[0] === before.base);
is('Headings as printed', JSON.stringify(text('Fonts > Headings')) === JSON.stringify(before.headings));
is('Paragraphs as printed', JSON.stringify(text('Fonts > Paragraphs')) === JSON.stringify(before.paragraphs));
is('Spacing as printed', JSON.stringify(text('Miscellaneous > Spacing')) === JSON.stringify(before.spacing));
is('Animations as printed', JSON.stringify(views['Miscellaneous > Animations'].filter((c) => c[2].startsWith('checkbox:')).map((c) => c[2] === 'checkbox:true')) === JSON.stringify(before.animations));
const hex = (h) => `${Number.parseInt(h.slice(1, 3), 16)}, ${Number.parseInt(h.slice(3, 5), 16)}, ${Number.parseInt(h.slice(5, 7), 16)}`;
const hsl2rgb = ([h, s, l]) => { const a = (s / 100) * Math.min(l / 100, 1 - l / 100), f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return `${f(0)}, ${f(8)}, ${f(4)}`; };
const pal = FINDING.palette.vars0, stored = [pal.white, pal.lightAccent, pal.accent, pal.darkAccent, pal.black].map((v) => hsl2rgb(v.split(',').map((x) => Number.parseFloat(x))));
is('palette as printed', JSON.stringify(stored) === JSON.stringify(before.palette.map(hex)));
// What CAP-FORMSUBS holds.
const fs = finding('CAP-FORMSUBS');
is('form fonts hold CAP-FORMSUBS\' styles', Object.entries(fs.fonts.defaults).every(([k, style]) => views[`Forms > Fonts > ${k}`].at(-1)[1].endsWith(`Size | ${style}`)));
const LETTER = { w: pal.white, l: pal.lightAccent, a: pal.accent, d: pal.darkAccent, b: pal.black };
const formColor = Object.fromEntries(views['Forms > Colors'].map((c) => [c[0], c[4]]));
is('form colors hold CAP-FORMSUBS\' Darkest 2', fs.colors.rows.every((n, i) => formColor[n] === `rgb(${hsl2rgb(LETTER[fs.colors.themes['Darkest 2'][i]].split(',').map((x) => Number.parseFloat(x)))})`));
const on = views['Forms > Effects'].filter((c) => c[5] === 'rgb(0, 0, 0)').map((c) => c[0]);
is('Effects tiles on hold CAP-FORMSUBS\' defaults', JSON.stringify(on) === JSON.stringify([fs.effects.defaults.hover, fs.effects.defaults.submit]));
if (bad.length) { console.error(`read-back compare: ${bad.join('; ')}`); process.exit(1); }
console.log(`read-back compare ok: ${NAMES.length} rows, ${THEMES.length} themes, ${expected.length} views`);
