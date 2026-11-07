// What a read-back of Edit Color Theme compares, kept apart from the browser so check-readback.mjs can test it.
// The stored list is parity/findings/CAP-THEMEROWS.json: rowGroups for the names, rows.A and rows.colors for the colors.
import { existsSync, readFileSync } from 'node:fs';

export const FINDING = JSON.parse(readFileSync(new URL('../../parity/findings/CAP-THEMEROWS.json', import.meta.url)));
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
export async function settledRead(read, wait, tries = 6) {
  let last = read();
  for (let n = 1; n < tries; n++) {
    await wait();
    const next = read();
    if (JSON.stringify(next) === JSON.stringify(last)) return { rows: next, settled: true };
    last = next;
  }
  return { rows: last, settled: false };
}
