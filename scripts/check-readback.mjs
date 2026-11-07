// The read-back's comparison can't pass a narrowed read: oracle-readback.mjs is only as honest as this.
import { readFileSync } from 'node:fs';
import { THEMES, NAMES, colorsOf, compareRows, comparePalette, compareView, compareLists, compareFamilies, compareFormColors, settledRead, STYLES, FINDING } from './oracle/readback.mjs';
import { VIEWS, DEEP, LISTS } from './oracle/style-views.mjs';
import { siteStylesHtml } from '../app/src/site-styles.js';
import { THEMES as OUR_THEMES } from '../app/src/site-style-packs.js';
import { SHAPES } from '../app/src/button-tiers.js';
import { FORM_SHAPES, FORM_FONT_SIZES } from '../app/src/form-rows.js';

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
// A list that moves once with nothing changed passes. A real change must still fail, however it settles.
const reads = (...lists) => { let n = 0; return () => lists[Math.min(n++, lists.length - 1)]; };
const noWait = async () => {};
const short = rows.slice(0, 40), recolored = rows.map(([n, c], i) => [n, i === 5 ? 'rgb(1, 2, 3)' : c]);
const moved = await settledRead(reads(short, rows, rows), noWait);
is('a list that moves once settles on the full read and passes', moved.settled && compareRows(t, moved.rows).length === 0);
const changed = await settledRead(reads(short, recolored, recolored), noWait);
is('a list that settles on a recolored row fails', changed.settled && compareRows(t, changed.rows).length > 0);
const dropped = await settledRead(reads(short, short), noWait);
is('a list that settles short fails', dropped.settled && compareRows(t, dropped.rows).length > 0);
const same = await settledRead(reads(rows, recolored, rows, rows), noWait);
is('reads of the same length that differ have not settled', same.settled && compareRows(t, same.rows).length === 0);
let flip = 0;
const never = await settledRead(() => (flip++ % 2 ? short : rows), noWait);
is('a list that never settles says so', !never.settled);
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
// The Themes popover and the closed lists: stored, a change fails, and ours offers the same.
const lists = STYLES.lists, eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
is('every closed list stored, and the Themes popover', Object.keys(LISTS).every((k) => lists[k]) && lists.Themes?.tiles.length === 14);
const heads = lists['Fonts > Headings'];
is('stored lists pass', compareLists('Fonts > Headings', heads).length === 0);
is('a list missing an option fails', compareLists('Fonts > Headings', { ...heads, combos: heads.combos.map((c, i) => (i ? c : [c[0], c[1].slice(1)])) }).length > 0);
is('a list with another pick on fails', compareLists('Fonts > Headings', { ...heads, combos: heads.combos.map((c, i) => (i ? c : [c[0], c[1].map(([n, on]) => [n, on === 'true' ? 'false' : 'true'])])) }).length > 0);
is('a list nothing is stored for fails', compareLists('Nowhere', heads).length > 0);
is('the stored font names pass', compareFamilies(STYLES.families).length === 0);
is('a font list short by a name fails', compareFamilies(STYLES.families.slice(0, -1)).length > 0);
is('a renamed font fails', compareFamilies(STYLES.families.map((n, i) => (i === 700 ? 'x' : n))).length > 0);
is('the font list starts with the first screen', eq(STYLES.families.slice(0, heads.family.first.length), heads.family.first));
const ourOptions = (view, key) => [...siteStylesHtml(null, view, [], { select: key }).matchAll(/role="option"[^>]*data-v="([^"]+)"/g)].map((m) => m[1]);
for (const [view, k] of [['Headings', 'h'], ['Paragraphs', 'p']]) {
  const read = lists[`Fonts > ${view}`].combos.map((c) => c[1].map(([n]) => n));
  is(`our ${view} lists offer what the oracle's do`, eq(read, ['style', 'weight', 'tt'].map((n) => ourOptions(view, `type.${k}.${n}`))));
}
const tileNames = (rows) => rows.filter((r) => r[0]).map((r) => r[0]);
for (const t of ['Primary', 'Secondary', 'Tertiary']) is(`our ${t} button Shape list offers the oracle's tiles`, eq(tileNames(lists[`Buttons > ${t} Button`].shape), SHAPES.map(([n]) => n)));
is('our Field Shape list offers the oracle\'s tiles', eq(tileNames(lists.Forms.shape), FORM_SHAPES.map(([n]) => n)));
is('our Themes popover holds the oracle\'s tiles and groups', eq(lists.Themes.tiles.map((x) => x[0]), OUR_THEMES.map((t) => `Site theme ${t.id}`)) && eq(lists.Themes.heads.slice(1), [...new Set(OUR_THEMES.map((t) => t.group))]));
if (bad.length) { console.error(`read-back compare: ${bad.join('; ')}`); process.exit(1); }
// Fonts > Buttons and Miscellaneous hold the same lists as Paragraphs, Buttons three times over; a form font holds Style and Size.
const para = lists['Fonts > Paragraphs'].combos.map((c) => c[1].map(([n]) => n));
is('Fonts > Buttons holds Paragraphs\' 3 lists for each of 3 buttons', eq(lists['Fonts > Buttons'].combos.map((c) => c[1].map(([n]) => n)), [...para, ...para, ...para]));
is('Fonts > Miscellaneous holds Paragraphs\' 3 lists', eq(lists['Fonts > Miscellaneous'].combos.map((c) => c[1].map(([n]) => n)), para));
is('our Fonts > Buttons offers those lists for each button', eq(['primary', 'secondary', 'tertiary'].flatMap((k) => ['style', 'weight', 'tt'].map((n) => ourOptions('FontButtons', `type.${k}.${n}`))), [...para, ...para, ...para]));
is('our Fonts > Miscellaneous offers those lists', eq(['style', 'weight', 'tt'].map((n) => ourOptions('FontMisc', `type.misc.${n}`)), para));
const sizes = FORM_FONT_SIZES.flatMap(([, names]) => names);
for (const f of DEEP['Forms > Fonts']) is(`our ${f} Style list offers the oracle's`, eq(lists[`Forms > Fonts > ${f}`].combos[0][1].map(([n]) => n), [...siteStylesHtml(null, 'FormFont', [], { select: `forms.fontStyle.${f}`, formFont: f }).matchAll(/role="option"[^>]*data-v="([^"]+)"/g)].map((m) => m[1])));
for (const f of DEEP['Forms > Fonts']) is(`our ${f} Size list offers the oracle's`, eq(lists[`Forms > Fonts > ${f}`].combos[1][1].map(([n]) => n), sizes));
// Forms > Colors on each theme: stored, a change fails, and it holds what Colors holds for that theme.
const fc = STYLES.formColors, formStart = NAMES.indexOf('Field Background');
is('Forms > Colors stored for all ten themes', THEMES.every((t) => fc[t]?.length === 29));
is('stored Forms > Colors pass', THEMES.every((t) => compareFormColors(t, fc[t]).length === 0));
is('Forms > Colors with a row changed fails', compareFormColors(THEMES[0], fc[THEMES[0]].map((r, i) => (i === 1 ? [r[0], r[1], r[2], r[3], 'rgb(1, 2, 3)', r[5]] : r))).length > 0);
is('a theme nothing is stored for fails', compareFormColors('Nowhere', fc[THEMES[0]]).length > 0);
is('Forms > Colors holds each theme\'s Form rows in CAP-THEMEROWS', THEMES.every((t) => { const c = colorsOf(t); return fc[t].slice(1, 27).every((r, i) => r[0] === NAMES[formStart + i] && r[4] === c[formStart + i]); }));
console.log(`read-back compare ok: ${NAMES.length} rows, ${THEMES.length} themes, ${expected.length} views, ${Object.keys(lists).length} sets of lists, ${STYLES.families.length} font names`);
