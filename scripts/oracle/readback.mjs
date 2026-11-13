// What a read-back of Edit Color Theme compares, kept apart from the browser so check-readback.mjs can test it.
// The stored list is parity/findings/CAP-THEMEROWS.json: rowGroups for the names, rows.A and rows.colors for the colors.
import { existsSync, readFileSync } from 'node:fs';

export const THEME_FILE = new URL('../../parity/findings/CAP-THEMEROWS.json', import.meta.url);
export const FINDING = JSON.parse(readFileSync(THEME_FILE));
export const THEMES = Object.keys(FINDING.rows.A);
export const NAMES = FINDING.rowGroups.flatMap(([, rows]) => rows);
export const colorsOf = (theme) => FINDING.rows.A[theme].split(',').map((i) => FINDING.rows.colors[Number(i)]);

// rows: [[name, color], ...] as read, the list's head row left out. Any missing, extra, renamed or
// recolored row is a difference, so a read that drops rows can't pass.
export function compareRows(theme, rows) {
  const colors = colorsOf(theme), out = [];
  if (rows.length !== NAMES.length) out.push(`${theme}: ${rows.length} rows, stored ${NAMES.length}`);
  for (let i = 0; i < Math.max(rows.length, NAMES.length); i++) {
    const [name, color] = rows[i] || [];
    if (name !== NAMES[i]) out.push(`${theme} row ${i}: named ${JSON.stringify(name)}, stored ${JSON.stringify(NAMES[i])}`);
    else if (color !== colors[i]) out.push(`${theme} ${name}: ${JSON.stringify(color)}, stored ${JSON.stringify(colors[i])}`);
  }
  return out;
}

// Palette values as hue, saturation, lightness text. The stored ones have 2 decimals.
const nums = (v) => String(v).split(',').map((x) => Number.parseFloat(x));
export function comparePalette(vars) {
  const want = FINDING.palette.vars0, out = [];
  for (const k of Object.keys(want)) {
    const a = nums(vars[k]), b = nums(want[k]);
    if (a.length !== b.length || a.some((x, i) => !(Math.abs(x - b[i]) <= 0.01))) out.push(`palette ${k}: ${vars[k]}, stored ${want[k]}`);
  }
  return out;
}

// The other Site Styles views, one row list per view, in parity/findings/CAP-STYLEROWS.json.
export const STYLE_FILE = new URL('../../parity/findings/CAP-STYLEROWS.json', import.meta.url);
export const STYLES = existsSync(STYLE_FILE) ? JSON.parse(readFileSync(STYLE_FILE)) : { views: {} };
export function compareView(view, rows, stored = STYLES.views[view]) {
  if (!stored) return [`${view}: nothing stored`];
  const out = [];
  if (rows.length !== stored.length) out.push(`${view}: ${rows.length} controls, stored ${stored.length}`);
  for (let i = 0; i < Math.max(rows.length, stored.length); i++) {
    if (JSON.stringify(rows[i]) !== JSON.stringify(stored[i])) out.push(`${view} ${i}: ${JSON.stringify(rows[i])}, stored ${JSON.stringify(stored[i])}`);
  }
  return out;
}

// The Themes popover and the closed lists, and the names in the font list. The same rule: anything missing, extra or changed differs.
export function compareLists(name, read, stored = STYLES.lists?.[name]) {
  if (!stored) return [`${name} lists: nothing stored`];
  return JSON.stringify(read) === JSON.stringify(stored) ? [] : [`${name} lists: ${JSON.stringify(read).slice(0, 400)}, stored ${JSON.stringify(stored).slice(0, 400)}`];
}
export function compareFamilies(names, stored = STYLES.families) {
  if (!stored) return ['font list: nothing stored'];
  const out = [];
  if (names.length !== stored.length) out.push(`font list: ${names.length} names, stored ${stored.length}`);
  const first = names.findIndex((n, i) => n !== stored[i]);
  if (first >= 0) out.push(`font list ${first}: ${JSON.stringify(names[first])}, stored ${JSON.stringify(stored[first])}`);
  return out;
}

// Forms > Colors as read on one theme, against the stored read.
export function compareFormColors(theme, read, stored = STYLES.formColors?.[theme]) {
  if (!stored) return [`Forms > Colors on ${theme}: nothing stored`];
  return JSON.stringify(read) === JSON.stringify(stored) ? [] : [`Forms > Colors on ${theme}: ${JSON.stringify(read).slice(0, 400)}, stored ${JSON.stringify(stored).slice(0, 400)}`];
}

// Reads until two reads in a row agree, since a list read during a slow load can move with nothing changed on the site.
// What it settles on still goes to the comparison, and a list that never settles is a difference.
// want: the rows a full read holds. A shorter read must hold still for 8 reads in a row before it counts (under load a list
// paused half drawn once read as 11 rows of 29). With no want, two reads alike will do.
export async function settledRead(read, wait, tries = 6, want = 0) {
  let last = read(), same = 0;
  const limit = want ? Math.max(tries, 24) : tries;
  for (let n = 1; n < limit; n++) {
    await wait();
    const next = read();
    if (JSON.stringify(next) === JSON.stringify(last)) { same++; if (!want || (next?.length ?? 0) >= want || same >= 8) return { rows: next, settled: true }; } else same = 0;
    last = next;
  }
  return { rows: last, settled: false };
}

// A set that fails keeps only these of its diffs: a Save that turned on is never dropped.
export const SAFETY = /Save is not off|unsaved|still being edited/;
// Each set in turn, each from a page brought back by restart(): before the first set, and after any set that failed. A set
// that throws is listed as not read and the run goes on; its partial compares are dropped. If restart() fails `tries` times
// in a row, the sets left are listed as not reached and the run ends. begin(sink) hands each set its own diff list.
export async function runSets(sets, { restart, begin = () => {}, log = () => {}, tries = 3 }) {
  const diffs = [], notRead = [];
  let fresh = false;
  for (let k = 0; k < sets.length; k++) {
    const [name, fn] = sets[k];
    if (!fresh) {
      let ok = false;
      for (let n = 0; n < tries && !ok; n++) { try { await restart(); ok = true; } catch (e) { log(`  bringing the page back: ${e.message}`); } }
      if (!ok) { for (const [m] of sets.slice(k)) notRead.push(`${m}: not reached, the page could not be brought back`); break; }
      fresh = true;
    }
    const sink = []; begin(sink);
    try { await fn(); diffs.push(...sink); } catch (e) {
      const kept = sink.filter((x) => SAFETY.test(x)); diffs.push(...kept);
      notRead.push(`${name}: ${String(e.message).slice(0, 160)}${sink.length > kept.length ? ` (${sink.length - kept.length} partial compares dropped)` : ''}`);
      log(`${name}: not read: ${e.message}`); fresh = false;
    }
  }
  return { diffs, notRead };
}
// --store and --store-themes: why a run stores nothing, or null. A Save that turned on at any read or at Exit means a
// read may be of a change and not of the site; a set not read leaves the base part old.
export function storeRefusal({ diffs, notRead }) {
  const unsafe = diffs.filter((x) => SAFETY.test(x));
  if (unsafe.length) return `not stored: Save turned on (${unsafe.length}): ${unsafe[0]}`;
  return notRead.length ? 'not stored: sets not read' : null;
}
// 0: all read and the same. 1: any difference. 2: the same where read, with sets not read.
export const exitCode = ({ diffs, notRead }) => (diffs.length ? 1 : notRead.length ? 2 : 0);

// --store-themes: CAP-THEMEROWS with the palette and every theme's rows as read, and today's capturedAt. Only rows.A,
// rows.colors and palette.vars0 change: colors already listed keep their index, so the older reads (rows.B, C, Q) still
// point at the right colors. rowGroups can't be rebuilt from a read, so a theme missing, or a row renamed, added or
// dropped, stores nothing: the names are a finding to record (O4), not a store.
export function themeStore(finding, { vars, rows }, date) {
  const themes = Object.keys(finding.rows.A), names = finding.rowGroups.flatMap(([, r]) => r);
  if (!vars || Object.keys(finding.palette.vars0).some((k) => !vars[k])) throw new Error('not stored: the palette was not read in full');
  for (const t of themes) {
    const got = rows[t];
    if (!got) throw new Error(`not stored: ${t} was not read`);
    if (got.length !== names.length || got.some(([n], i) => n !== names[i])) throw new Error(`not stored: ${t}'s row names differ from rowGroups`);
  }
  const colors = [...finding.rows.colors], at = (c) => { if (!colors.includes(c)) colors.push(c); return colors.indexOf(c); };
  const A = Object.fromEntries(themes.map((t) => [t, rows[t].map(([, c]) => at(c)).join(',')]));
  const vars0 = Object.fromEntries(Object.keys(finding.palette.vars0).map((k) => [k, vars[k]]));
  return { ...finding, capturedAt: date, palette: { ...finding.palette, vars0 }, rows: { ...finding.rows, A, colors } };
}
