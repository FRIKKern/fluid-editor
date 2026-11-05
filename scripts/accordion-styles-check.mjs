// T12: an accordion's Icon, Title, Description, Dividers, more buttons and reorder grip through real
// presses, against parity/findings/ACCORDIONSTYLES.json. Writes parity/accordion-styles-check.json.
// Usage: npm run accordion-styles-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, mouse, cdp } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/ACCORDIONSTYLES.json', import.meta.url)));
const ID = 'probe-accordion';
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail = '') => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(44)} ${ok ? 'match' : `DIFF ${detail}`}`); };
const near = (a, b, d = 1) => Math.abs(a - b) <= d;

viewport(S, 1600, 1000);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);
// A new accordion, on a known section and area, at the oracle's 8 by 8 (ACCORDION.json).
evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = [{ id: '${ID}', type: 'accordion', items: [1, 2, 3].map((n) => ({ title: 'Accordion Item ' + n, description: 'Description text goes here' })), layout: { desktop: { area: [1, 2, 9, 10] }, mobile: { area: [1, 2, 9, 10] } } }]; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await sleep(400); fe.select(s.id, '${ID}'); await sleep(250); document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(350); return 'true'; })()`);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
const M = `fe.model.sections[1].blocks.find((b) => b.id === '${ID}')`;
const PX = `const P = document.getElementById('block-panel'), P0 = P.getBoundingClientRect(); const fr = document.getElementById('site-frame'), d = fr.contentDocument, W = fr.contentWindow; const root = d.querySelector('.fe-block[data-block-id="${ID}"]'), ul = root.querySelector('.accordion-items-container'), q = root.getBoundingClientRect(); const cs = (e) => W.getComputedStyle(e);`;
const R = (js) => evalJs(S, `(() => { ${PX} return JSON.stringify(${js}); })()`);
const press = async (sel, wait = 320) => { const c = R(`(() => { const e = ${sel}; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`); mouse(S, 'move', c[0], c[1]); await pause(30); mouse(S, 'down', c[0], c[1], { buttons: 1 }); await pause(30); mouse(S, 'up', c[0], c[1]); await pause(wait); };
const btn = (label, n = 0) => `[...P.querySelectorAll('button')].filter((e) => e.getBoundingClientRect().width > 0 && (e.getAttribute('aria-label') === '${label}' || e.textContent.trim() === '${label}'))[${n}]`;
const pick = (t) => press(`[...document.querySelectorAll('#shape-pop [role=option]')].find((e) => e.textContent.trim() === '${t}')`);
const tab = (t) => press(`P.querySelector('[data-btab="${t}"]')`);
const undo = async () => { evalJs(S, `(() => { document.getElementById('undo').click(); return 'true'; })()`); await pause(280); };
const typed = async (sel, v) => { evalJs(S, `(() => { ${PX} const e = ${sel}; e.scrollIntoView({ block: 'nearest' }); e.value = '${v}'; e.dispatchEvent(new Event('change', { bubbles: true })); return 'true'; })()`); await pause(320); };
const labelsAt = () => R(`[...P.querySelectorAll('.bp-cap, .sp-label, .bp-acc-pick span, .bp-sub span, .bp-back, .bp-chip-v, .bp-sml .bp-mode')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return [e.textContent.trim(), r.top - P0.top + r.height / 2]; })`);
const rowsMatch = (name, want, skip = []) => {
  const got = labelsAt(), used = new Set();
  const miss = want.filter(([t]) => !skip.includes(t)).filter(([t, , top, , h]) => { const i = got.findIndex((g, n) => !used.has(n) && g[0].replace(/\s+/g, ' ') === t && Math.abs(g[1] - (top + h / 2)) <= 3); if (i >= 0) used.add(i); return i < 0; });
  add(`Rows on ${name}`, !miss.length, JSON.stringify(miss.map((m) => [m[0], m[2] + m[4] / 2])) + ' got ' + JSON.stringify(got.map((g) => [g[0], Math.round(g[1])])));
};

await tab('Design');
rowsMatch('Design', F.design, ['Content', 'Design', 'Icon Thickness', 'Icon Placement', 'Row Padding', 'Background', 'Stroke', 'Blend Mode', 'Blur', 'No Stroke', 'Solid', 'Dashed', 'Normal']);

// Icon: Plus or Arrow.
await press(`P.querySelector('[data-acc-menu="icon"]')`);
const menu = R(`(() => { const p = document.getElementById('shape-pop'), b = P.querySelector('[data-acc-menu="icon"]').getBoundingClientRect(), r = p.getBoundingClientRect(); return { names: [...p.querySelectorAll('[role=option]')].map((e) => e.textContent.trim()), left: r.left - P0.left, top: r.top - b.top, width: r.width, row: p.querySelector('[role=option]').getBoundingClientRect().height, cur: p.querySelector('.is-cur').textContent.trim() }; })()`);
add('Icon menu has Plus and Arrow', JSON.stringify(menu.names) === JSON.stringify(F.icon.menu), JSON.stringify(menu));
add('Icon menu lies over the row', near(menu.left, F.icon.menuRow.left, 1.5) && near(menu.top, 0, 1.5) && near(menu.width, F.icon.menuRow.width) && near(menu.row, F.icon.menuRow.pitch) && menu.cur === 'Plus', JSON.stringify(menu));
await pick('Arrow');
const arrow = () => R(`(() => { const a = root.querySelector('.arrow'), c = root.querySelector('.arrow-container'); if (!a) return null; const s = cs(a), t = cs(c); return { w: parseFloat(s.width), br: s.borderRightWidth, bb: s.borderBottomWidth, bt: s.borderTopWidth, tr: s.transform, ctr: t.transform, tn: t.transitionDuration, plus: !!root.querySelector('.plus') }; })()`);
let a = arrow();
add('Arrow replaces the plus', a && !a.plus, JSON.stringify(a));
add('Arrow size at 14', a && near(a.w, F.icon.arrow.size14, 0.1), JSON.stringify(a));
const m = a?.tr.match(/matrix\(([^)]+)\)/)?.[1].split(',').map(Number);
add('Arrow is turned 45 and up a quarter', m && near(m[0], 0.7071, 0.001) && near(m[5], -a.w / 4, 0.05), a?.tr);
add('Arrow lines take the thickness', a?.br === '1px' && a.bb === '1px' && a.bt === '0px', JSON.stringify(a));
add('The row reads Arrow', R(`P.querySelector('[data-acc-menu="icon"] .bp-chip-v').textContent`) === 'Arrow');
await press(btn('M', 1));
add('Icon Thickness M on the arrow', arrow()?.br === F.icon.arrow.thickness.M, JSON.stringify(arrow()));
await press(btn('S', 1));
await press(btn('L', 0));
add('Arrow size at 30', near(arrow()?.w, F.icon.arrow.size30, 0.1), JSON.stringify(arrow()));
await press(btn('S', 0));
await press(`P.querySelector('input[aria-label="Expand first item"]').closest('label')`);
add('Open: the arrow turns over', arrow()?.ctr === 'matrix(-1, 0, 0, -1, 0, 0)' && arrow()?.tn === '0.25s', JSON.stringify(arrow()));
await press(`P.querySelector('input[aria-label="Expand first item"]').closest('label')`);
for (let i = 0; i < 6; i++) await undo();
add('Six undos keep the arrow', R(`!!root.querySelector('.arrow')`) === true);
await undo();
add('The seventh returns to the plus', R(`!!root.querySelector('.plus') && !root.querySelector('.arrow')`) === true, R(`root.querySelector('.accordion-icon-container').innerHTML`));

// More on Icon Size, Row Padding.
await press(`P.querySelector('[aria-label="More Icon Size"]')`);
const size = R(`(() => { const r = P.querySelector('[data-acc-range="iconSize"]'), f = P.querySelector('[data-acc-field="iconSize"]'); return r && [r.min, r.max, r.value, f.value]; })()`);
add('Icon Size more: 10 to 40, from 14', size && Number(size[0]) === F.iconSizeMore.min && Number(size[1]) === F.iconSizeMore.max && size[2] === '14' && size[3] === '14px', JSON.stringify(size));
await typed(`P.querySelector('[data-acc-field="iconSize"]')`, '20px');
const iconBox = R(`(() => { const r = root.querySelector('.accordion-icon-container').getBoundingClientRect(); return [r.width, r.height]; })()`);
add('Icon Size 20 draws at 20', near(iconBox[0], 20, 0.1) && near(iconBox[1], 20, 0.1), JSON.stringify(iconBox));
await press(btn('S', 0));

// Title.
await press(btn('Navigate to Title'));
rowsMatch('Title', F.title.view);
const titleProps = () => R(`(() => { const w = root.querySelector('.accordion-item__title-wrapper'), t = root.querySelector('.accordion-item__title'); return { tag: w.tagName, cls: w.className.replace('accordion-item__title-wrapper', '').trim(), size: cs(t).fontSize, ls: cs(t).letterSpacing, align: cs(t).textAlign, pad: cs(t).padding, h: q.height }; })()`);
await press(`P.querySelector('[data-acc-menu="titleStyle"]')`);
const list = R(`[...document.querySelectorAll('#shape-pop [role=option]')].map((e) => e.textContent.trim())`);
add('Title style list', JSON.stringify(list) === JSON.stringify(F.title.menu), JSON.stringify(list));
const over = R(`(() => { const c = document.querySelector('#shape-pop .is-cur').getBoundingClientRect(), b = P.querySelector('[data-acc-menu="titleStyle"]').getBoundingClientRect(); return c.top - b.top; })()`);
add('The chosen style lies over the button', near(over, 0, 1.5), String(over));
let open = true;
for (const [name, w] of Object.entries(F.title.styles)) {
  if (!open) await press(`P.querySelector('[data-acc-menu="titleStyle"]')`);
  await pick(name); open = false;
  const t = titleProps();
  add(`Title ${name}`, t.tag === w.tag && t.cls === w.cls && near(parseFloat(t.size), parseFloat(w.size), 0.05) && t.ls === w.ls, JSON.stringify([t, w]));
}
await press(`P.querySelector('[data-acc-menu="titleStyle"]')`); await pick('Heading 4');
await press(btn('center'));
let t = titleProps();
add('Title center', t.align === 'center' && t.pad === F.title.center.padding, JSON.stringify(t));
await press(btn('right'));
t = titleProps();
add('Title right', t.align === 'right' && t.pad === F.title.right.padding, JSON.stringify(t));
add('Alignment writes the attribute', R(`ul.dataset.accordionTitleAlignment`) === 'right');
await press(btn('left'));
await press(btn('Back'));

// Description, with the first item open.
await press(`P.querySelector('input[aria-label="Expand first item"]').closest('label')`);
await press(btn('Navigate to Description'));
rowsMatch('Description', F.description.view);
const desc = () => R(`(() => { const e = root.querySelector('.accordion-item__description'), r = e.getBoundingClientRect(); return { size: cs(e).fontSize, lh: cs(e).lineHeight, margin: cs(e).margin, pad: cs(e).padding, align: cs(e).textAlign, cls: e.className.replace('accordion-item__description', '').trim(), box: [r.left - q.left, r.width] }; })()`);
await press(`P.querySelector('[data-acc-menu="descStyle"]')`);
const dl = R(`[...document.querySelectorAll('#shape-pop [role=option]')].map((e) => e.textContent.trim())`);
add('Description style list', JSON.stringify(dl) === JSON.stringify(F.description.menu), JSON.stringify(dl));
await pick('Paragraph 1');
let dd = desc(), w = F.description.styles['Paragraph 1'];
add('Description Paragraph 1', dd.cls === w.cls && near(parseFloat(dd.size), parseFloat(w.size), 0.05) && near(parseFloat(dd.lh), parseFloat(w.lh), 0.05) && dd.margin === w.margin, JSON.stringify([dd, w]));
await press(`P.querySelector('[data-acc-menu="descStyle"]')`); await pick('Paragraph 3');
dd = desc(); w = F.description.styles['Paragraph 3'];
add('Description Paragraph 3', dd.cls === w.cls && near(parseFloat(dd.size), parseFloat(w.size), 0.05) && near(parseFloat(dd.lh), parseFloat(w.lh), 0.05) && dd.margin === w.margin, JSON.stringify([dd, w]));
await press(`P.querySelector('[data-acc-menu="descStyle"]')`); await pick('Paragraph 2');
dd = desc(); w = F.description.styles['Paragraph 2'];
add('Description back on Paragraph 2', near(parseFloat(dd.size), parseFloat(w.size), 0.05) && dd.margin === w.margin && near(dd.box[1], F.description.width.M), JSON.stringify(dd));
await press(btn('S', 0)); add('Width S', near(desc().box[1], F.description.width.S), JSON.stringify(desc()));
await press(btn('L', 0)); add('Width L', near(desc().box[1], F.description.width.L), JSON.stringify(desc()));
add('L has no Placement', R(`!P.textContent.includes('Placement')`) === true);
await press(btn('M', 0)); add('Width M', near(desc().box[1], F.description.width.M), JSON.stringify(desc()));
add('M has Placement', R(`P.textContent.includes('Placement')`) === true);
await press(`P.querySelector('[aria-label="More Width"]')`);
const wr = R(`(() => { const e = P.querySelector('[data-acc-range="descWidth"]'), r = e.getBoundingClientRect(); return [e.min, e.max, e.value, r.left - P0.left, r.width, P.querySelector('[data-acc-field="descWidth"]').value]; })()`);
add('Width more: 25 to 100, from 70', Number(wr[0]) === F.description.width.more.min && Number(wr[1]) === F.description.width.more.max && wr[2] === String(F.description.width.moreFromM) && near(wr[3], 22, 1.5) && near(wr[4], 212, 1.5) && wr[5] === '70%', JSON.stringify(wr));
await typed(`P.querySelector('[data-acc-field="descWidth"]')`, '40%');
add('A typed 40% keeps 300', near(desc().box[1], F.description.width.more.typed40), JSON.stringify(desc()));
await press(btn('M', 0));
await press(btn('S', 1)); add('Padding S', desc().pad === F.description.padding.S, desc().pad);
await press(btn('L', 1)); add('Padding L', desc().pad === F.description.padding.L, desc().pad);
await press(btn('M', 1)); add('Padding M', desc().pad === F.description.padding.M, desc().pad);
await press(`P.querySelector('[aria-label="More Padding"]')`);
const p4 = R(`[...P.querySelectorAll('[data-acc-range^="descPad"]')].map((e) => [e.getAttribute('aria-label'), e.min, e.max, e.value])`);
add('Padding more: four rows, 0 to 50', JSON.stringify(p4.map((r) => r[0])) === JSON.stringify(F.description.padding.more.rows) && JSON.stringify(p4.map((r) => r[3])) === JSON.stringify(['0', '0', '30', '0']), JSON.stringify(p4));
await typed(`P.querySelector('[data-acc-field="descPad:0"]')`, '10px');
add('Padding Top 10', desc().pad === F.description.padding.more.top10, desc().pad);
await typed(`P.querySelector('[data-acc-field="descPad:1"]')`, '20px');
add('Padding Right 20', desc().pad === F.description.padding.more.right20, desc().pad);
await press(btn('M', 1));
await press(btn('center', 0)); add('Description center', desc().align === 'center', desc().align);
await press(btn('right', 0)); add('Description right', desc().align === 'right', desc().align);
await press(btn('left', 0));
await press(btn('center', 1)); add('Placement center', near(desc().box[0], F.description.placement.center), JSON.stringify(desc()));
await press(btn('right', 1)); add('Placement right', near(desc().box[0], F.description.placement.right), JSON.stringify(desc()));
await press(btn('S', 0)); await press(btn('center', 1)); add('Placement center at S', near(desc().box[0], F.description.placement.centerS), JSON.stringify(desc()));
await press(btn('left', 1)); await press(btn('M', 0));
await press(btn('Back'));
await press(`P.querySelector('input[aria-label="Expand first item"]').closest('label')`);

// Dividers.
await press(btn('Navigate to Dividers'));
rowsMatch('Dividers', F.dividers.view, ['Opacity']);
const div = () => R(`(() => { const e = root.querySelectorAll('.accordion-divider')[1]; return [cs(e).height, cs(e).opacity, ul.getBoundingClientRect().height]; })()`);
await press(btn('M')); add('Thickness M', div()[0] === F.dividers.M && near(div()[2], F.dividers.ulM), JSON.stringify(div()));
await press(btn('L')); add('Thickness L', div()[0] === F.dividers.L && near(div()[2], F.dividers.ulL), JSON.stringify(div()));
await press(btn('S'));
const op = R(`(() => { const e = P.querySelector('[data-acc-range="dividerOpacity"]'); return [e.min, e.max, e.step, e.value]; })()`);
add('Opacity range', Number(op[0]) === F.dividers.opacity.min && Number(op[1]) === F.dividers.opacity.max && Number(op[2]) === F.dividers.opacity.step && op[3] === '1', JSON.stringify(op));
await typed(`P.querySelector('[data-acc-field="dividerOpacity"]')`, '0.5');
add('Opacity 0.5', div()[1] === F.dividers.opacity.typed, JSON.stringify(div()));
await press(`P.querySelector('[aria-label="More Thickness"]')`);
await typed(`P.querySelector('[data-acc-field="dividerSize"]')`, '8px');
add('Thickness typed 8', div()[0] === F.dividers.more.typed8, JSON.stringify(div()));
add('Thickness more: 0 to 10', R(`(() => { const e = P.querySelector('[data-acc-range="dividerSize"]'); return e.min === '0' && e.max === '10'; })()`) === true);
await undo();
add('Undo is one step', div()[0] === '1px', JSON.stringify(div()));
await typed(`P.querySelector('[data-acc-field="dividerSize"]')`, '8px');
await press(btn('Back'));
await press(`P.querySelector('[aria-label="More Row Padding"]')`);
const rows4 = R(`[...P.querySelectorAll('[data-acc-range^="rowPadding"]')].map((e) => [e.getAttribute('aria-label'), e.min, e.max, e.value])`);
add('Row Padding more: four rows, 0 to 50', JSON.stringify(rows4.map((r) => r[0])) === JSON.stringify(F.rowPaddingMore.rows) && rows4.every((r) => Number(r[1]) === 0 && Number(r[2]) === 50) && JSON.stringify(rows4.map((r) => r[3])) === JSON.stringify(['30', '0', '30', '0']), JSON.stringify(rows4));
await typed(`P.querySelector('[data-acc-field="rowPadding:0"]')`, '10px');
const row = R(`[cs(root.querySelector('.accordion-item__click-target')).padding, ul.getBoundingClientRect().height]`);
add('Row Padding Top 10, Thickness 8', row[0] === F.rowPaddingMore.top10 && near(row[1], F.rowPaddingMore.ulTop10WithThickness8), JSON.stringify(row));
await press(btn('M', 2));

// The grip: first below third gives 2, 3, 1 and the canvas follows, one undo step.
await tab('Content');
const titles = () => R(`[...root.querySelectorAll('.accordion-item__title')].map((e) => e.textContent.trim())`);
const grip = R(`(() => { const r = P.querySelector('.bp-acc-grip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
mouse(S, 'move', grip[0], grip[1]); await pause(40); mouse(S, 'down', grip[0], grip[1], { buttons: 1 }); await pause(40);
for (let i = 1; i <= 6; i++) { mouse(S, 'move', grip[0], grip[1] + i * 21.5, { buttons: 1 }); await pause(30); }
mouse(S, 'up', grip[0], grip[1] + 129); await pause(400);
add('Grip: first below third', JSON.stringify(titles()) === JSON.stringify(['Accordion Item 2', 'Accordion Item 3', 'Accordion Item 1']), JSON.stringify(titles()));
add('The list follows', JSON.stringify(R(`[...P.querySelectorAll('.bp-acc-name')].map((e) => e.textContent)`)) === JSON.stringify(titles()));
await undo();
add('Grip is one undo step', JSON.stringify(titles()) === JSON.stringify(['Accordion Item 1', 'Accordion Item 2', 'Accordion Item 3']), JSON.stringify(titles()));

writeFileSync(new URL('../parity/accordion-styles-check.json', import.meta.url), `${JSON.stringify({ check: 'accordion Icon, Title, Description, Dividers, grip', pass, total, results }, null, 1)}\n`);
console.log(`Accordion styles: ${pass} of ${total} checks match`);
process.exit(pass === total ? 0 : 1);
