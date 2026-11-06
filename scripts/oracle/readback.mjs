// What a read-back of Edit Color Theme compares, kept apart from the browser so check-readback.mjs can test it.
// The stored list is parity/findings/CAP-THEMEROWS.json: rowGroups for the names, rows.A and rows.colors for the colors.
import { readFileSync } from 'node:fs';

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
