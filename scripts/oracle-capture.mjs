// One command to ask the oracle a question: walk it through steps with real input, read it in one
// format at each `read`, and write parity/findings/<name>.json. Always ends with Exit Without
// Saving (O1). Refuses to overwrite a finding unless given --again. Recipes: scripts/oracle/recipes.mjs.
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-capture.mjs <recipe> [--again]
//   ... node scripts/oracle-capture.mjs --list
//   ... node scripts/oracle-capture.mjs --name WHAT --question '...' --steps '[["enter"],["select",2,2],["read","a",{"block":[2,2],"controls":true}]]'
// Steps: enter | exit | view Mobile|Desktop | frame w h | unframe | pause ms | listen
//   hover i | hoverBlock i k | select i k (a real click) | pick i k (selects a text block without writing) | deselect i
//   blank (adds an empty section) | toPage title | add i type | panel i | editText i k | sectionDrag i dy (hover first; dy 0 is a click)
//   click label | clickIf label | press key | keys text | fill label value | fillValue shown value | rightClick i k
//   groupDrag i dx dy | stubClipboard | synthClip copy|paste [frame|top] | clickAt x y | dragAt x y x2 y2 (window pixels) |
//   hold i k part dx dy [mods] | holdRaw i k part dx dy | shiftClick i k | move dx dy | release [home] | drag i k part dx dy {pointerType}
//   touch i k part dx dy {holdMs} | pasteMid i k html | undoWalk name [n] | shot name
//   read name { block: [i,k], inside: [i,k], html: [i,k], section: i, sectionHandle: i, areas: i, stack: i (type, both areas and both z of each block in DOM order), zs: i, hit: [i,k,[[fx,fy],..]], clip: true, sections: true, has: [labels], textH: [i,k], checks: true, sel: selector, layers: i, controls: true, thin: true }
// k is a block's place in its section, or "new" for the block `add` made. part is "middle", a handle, or fractions [x, y] of the block.
// A recipe that changes content names its page ({ page: 'Gestures Probe' }, 0006). Nothing is saved on any page.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { browser, evalJs, mouse, cdp, goto, pause, reload, waitFor, engine } from './lib/cmux.mjs';
import { enterEdit, exitWithoutSaving, hoverSection, openSectionPanel, addBlock, addSection, blockIds, escape, select } from './oracle/ui.mjs';
import { RECIPES } from './oracle/recipes.mjs';

const S = process.env.ORACLE_SURFACE;
if (!S?.startsWith('cdp:')) { console.error('oracle-capture drives a headless Chrome: set ORACLE_SURFACE=cdp:<port> (scripts/oracle-headless.mjs).'); process.exit(2); }
const args = process.argv.slice(2);
const opt = (n) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : null);
if (args.includes('--list')) { for (const [k, r] of Object.entries(RECIPES)) console.log(k.padEnd(18), r.question); process.exit(0); }
const name = opt('name') || args[0];
const recipe = opt('steps') ? { question: opt('question') || name, steps: JSON.parse(opt('steps')) } : RECIPES[name];
if (!recipe) { console.error(`no recipe ${name}; --list shows them`); process.exit(2); }
const file = new URL(`../parity/findings/${name}.json`, import.meta.url);
if (existsSync(file) && !args.includes('--again')) { console.error(`parity/findings/${name}.json exists; pass --again only if it is yours to replace.`); process.exit(2); }

const FRAME = `const f = document.getElementById('sqs-site-frame'); const d = f.contentDocument; const W = f.contentWindow;`;
const round = `const rnd = (v) => Math.round(v * 10) / 10; const box = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map(rnd); };`;
// Labels and classes only: never picture sources, and no addresses from other hosts (O2).
const PROPS = ['display', 'position', 'zIndex', 'opacity', 'transform', 'color', 'backgroundColor', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'borderRadius', 'outlineWidth', 'outlineStyle', 'outlineColor', 'boxShadow', 'fontSize', 'gridArea', 'alignSelf', 'justifySelf', 'mixBlendMode', 'flexDirection', 'gap', 'justifyContent', 'alignItems'];
const CSS = `const css = (c) => Object.fromEntries(${JSON.stringify(PROPS)}.map((p) => [p, c[p]]).filter(([, v]) => v && !['none', 'auto', 'normal', '0px', 'rgba(0, 0, 0, 0)', 'static', 'medium'].includes(v)));`;
const cls = `const cls = (e) => [...e.classList].filter((c) => !/^[A-Za-z0-9_]{16}$|^fe-block-|^fluid-engine-[a-z0-9]{5,7}$|^yui/.test(c)).join(' ').slice(0, 90);`;
const BLOCK = (i, id) => `d.querySelectorAll('main#page .fluid-engine')[${i}].querySelector('.fe-block[data-block-id="${id}"]')`;

let added = null;
// The section's bottom handle: a row-resize box, wider than a block's 10px handle.
const SECTION_HANDLE = (i) => `[...d.querySelectorAll('main#page .page-section')[${i}].querySelectorAll('*')].find((e) => { const q = e.getBoundingClientRect(); return q.width >= 20 && q.width <= 60 && q.height >= 20 && q.height <= 40 && W.getComputedStyle(e).cursor === 'row-resize'; })`;
const blockId = (i, k) => (k === 'new' ? added : blockIds(i)[k]);
// Puts block i, k in the middle of the frame, tags it, and gives the point of `part` in frame coordinates.
function point(i, k, part = 'middle') {
  const id = blockId(i, k);
  return evalJs(S, `(() => { ${FRAME} const b = ${BLOCK(i, id)}; document.querySelectorAll('#fx-b').forEach((x) => x.removeAttribute('id')); d.querySelectorAll('#fx-b').forEach((x) => x.removeAttribute('id')); b.id = 'fx-b';
    let q = b.getBoundingClientRect(); if (q.top < 150 || q.bottom > W.innerHeight - 150) { W.scrollTo({ top: W.scrollY + q.top - 200, behavior: 'instant' }); q = b.getBoundingClientRect(); }
    const part = ${JSON.stringify(part)}; const x = q.left + q.width * (Array.isArray(part) ? part[0] : part === 'middle' ? 0.5 : part.includes('w') ? 0 : part.includes('e') ? 1 : 0.5), y = q.top + q.height * (Array.isArray(part) ? part[1] : part === 'middle' ? 0.5 : part.includes('n') ? 0 : part.includes('s') ? 1 : 0.5);
    return JSON.stringify([x, y]); })()`);
}
const inFrame = async (fn) => { browser(S, 'frame', '#sqs-site-frame'); try { return await fn(); } finally { browser(S, 'frame', 'main'); } };

const CONTROLS = `(() => { const vis = (e) => { const q = e.getBoundingClientRect(); if (q.width < 2 || q.height < 2 || q.bottom < 0 || q.top > innerHeight) return false; const c = getComputedStyle(e); if (c.visibility === 'hidden' || Number(c.opacity) <= 0.05 || e.closest('#sqs-site-frame')) return false; const top = document.elementFromPoint(Math.min(q.left + q.width / 2, innerWidth - 1), Math.min(Math.max(q.top + q.height / 2, 0), innerHeight - 1)); return !!top && (top === e || e.contains(top) || top.contains(e)); };
  const clean = (t) => (t || '').replace(/\\s+/g, ' ').trim().slice(0, 48);
  return [...document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], [role=switch], [role=slider], [role=checkbox], [role=option], [role=radio]')].filter(vis).map((e) => { const q = e.getBoundingClientRect(); return { role: e.getAttribute('role') || (e.tagName === 'INPUT' ? 'input:' + e.type : e.tagName.toLowerCase()), label: clean(e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('placeholder') || e.textContent), ...(e.value !== undefined && e.tagName !== 'BUTTON' && { value: e.type === 'checkbox' ? e.checked : e.value }), ...(e.min && { min: e.min }), ...(e.max && { max: e.max }), ...(e.step && { step: e.step }), ...(e.getAttribute('aria-valuemin') && { min: e.getAttribute('aria-valuemin'), max: e.getAttribute('aria-valuemax'), now: e.getAttribute('aria-valuenow') }), ...(e.getAttribute('aria-pressed') && { pressed: e.getAttribute('aria-pressed') }), box: [q.left, q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10) }; }); })()`;

function read(what) {
  const out = {};
  if (what.controls) out.controls = evalJs(S, `JSON.stringify(${CONTROLS})`);
  if (what.thin) out.thin = evalJs(S, `(() => { ${round} return JSON.stringify([...document.querySelectorAll('body *')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.width <= 2 && q.height >= 8 && q.height <= 80 && !e.closest('#sqs-site-frame'); }).map((e) => ({ box: box(e), bg: getComputedStyle(e).backgroundColor }))); })()`);
  if (what.block) {
    const [i, k] = what.block; const id = blockId(i, k);
    out.block = evalJs(S, `(() => { ${FRAME} ${round} ${CSS} ${cls} const b = ${BLOCK(i, id)}; if (!b) return JSON.stringify({ gone: true });
      const st = b.querySelector('style[data-test="fluid-engine-grid-css"]'); const [m, dk] = st ? st.textContent.split('@media (min-width: 768px)') : ['', ''];
      const area = (t) => (t.match(/grid-area:\\s*([\\d/ -]+)/) || [])[1]?.trim();
      return JSON.stringify({ desktop: area(dk), mobile: area(m), box: box(b), cls: cls(b), data: Object.fromEntries([...b.attributes].filter((a) => a.name.startsWith('data-') && !/block-id|block-json|definition/.test(a.name)).map((a) => [a.name, a.value.slice(0, 40)])), css: css(W.getComputedStyle(b)),
        handles: [...d.querySelectorAll('.fluid-engine *')].filter((e) => { const q = e.getBoundingClientRect(), o = b.getBoundingClientRect(); return q.width > 0 && q.width <= 24 && q.height <= 24 && /resize/.test(W.getComputedStyle(e).cursor) && q.right > o.left - 12 && q.left < o.right + 12 && q.bottom > o.top - 12 && q.top < o.bottom + 12; }).map((e) => { const q = e.getBoundingClientRect(); return W.getComputedStyle(e).cursor.replace('-resize', '') + ' ' + rnd(q.width) + 'x' + rnd(q.height) + ' at ' + rnd(q.left - b.getBoundingClientRect().left) + ',' + rnd(q.top - b.getBoundingClientRect().top); }).sort() }); })()`);
  }
  if (what.checks) {
    out.checks = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('input[type=checkbox]')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.left >= 0; }).map((e) => { const q = e.getBoundingClientRect(); return { box: [q.left, q.top, q.width, q.height].map(Math.round), checked: e.checked ?? e.getAttribute('aria-checked'), text: (e.closest('label')?.textContent || e.parentElement?.parentElement?.textContent || '').trim().slice(0, 40) }; })))()`);
  }
  if (what.sectionHandle !== undefined) {
    out.sectionHandle = evalJs(S, `(() => { ${FRAME} ${round} ${CSS} ${cls} const h = ${SECTION_HANDLE(what.sectionHandle)}; return JSON.stringify(h ? { box: box(h), section: box(d.querySelectorAll('main#page .page-section')[${what.sectionHandle}]), css: css(W.getComputedStyle(h)) } : null); })()`);
  }
  if (what.zs !== undefined) {
    out.zs = evalJs(S, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${what.zs}]; return JSON.stringify([...fe.querySelectorAll(':scope > .fe-block')].map((b) => W.getComputedStyle(b).zIndex)); })()`);
  }
  if (what.hit) {
    // What is on top at fractions of a block: the element a press would land on.
    const [i, k, pts] = what.hit; const id = blockId(i, k);
    out.hit = evalJs(S, `(() => { ${FRAME} ${cls} const b = ${BLOCK(i, id)}; const q = b.getBoundingClientRect(); return JSON.stringify(${JSON.stringify(pts)}.map(([fx, fy]) => { const e = d.elementFromPoint(q.left + q.width * fx, q.top + q.height * fy); return { at: [fx, fy], tag: e && e.tagName.toLowerCase(), cls: e && cls(e).slice(0, 80), cursor: e && W.getComputedStyle(e).cursor, inBlock: !!(e && b.contains(e)) }; })); })()`);
  }
  if (what.clip) out.clip = evalJs(S, `(() => { const a = window.__fxClip, b = document.getElementById('sqs-site-frame').contentWindow.__fxClip; return JSON.stringify({ top: a && a.log, frame: b && b.log, frameKind: b && typeof b.data, topKind: a && typeof a.data }); })()`);
  if (what.sections) out.sections = evalJs(S, `(() => { ${FRAME} return JSON.stringify([...d.querySelectorAll('main#page .page-section')].map((s) => { const fe = s.querySelector('.fluid-engine'); const c = fe && W.getComputedStyle(fe); return { id: (s.getAttribute('data-section-id') || '').slice(-6), classes: [...s.classList].filter((x) => /section-height|vertical-alignment|content-width|background-width/.test(x)).join(' '), rows: c ? c.gridTemplateRows.split(' ').length : null, blocks: fe ? [...fe.querySelectorAll(':scope > .fe-block')].map((b) => (b.getAttribute('data-block-id') || b.id || '').slice(-6)) : [], h: Math.round(s.getBoundingClientRect().height * 10) / 10 }; })); })()`);
  // Labels present in the panel even when its scroll clips them, which the controls list leaves out.
  if (what.has) out.has = Object.fromEntries(what.has.map((l) => [l, tag(LABEL(l))]));
  if (what.textH) { const [i, k] = what.textH; const id = blockId(i, k); out.textH = evalJs(S, `(() => { ${FRAME} ${round} const t = ${BLOCK(i, id)}.querySelector('.sqs-html-content'); return JSON.stringify(t ? rnd(t.getBoundingClientRect().height) : null); })()`); }
  if (what.inside) {
    const [i, k] = what.inside; const id = blockId(i, k);
    out.inside = evalJs(S, `(() => { ${FRAME} ${round} ${CSS} ${cls} const b = ${BLOCK(i, id)}; return JSON.stringify([...b.querySelectorAll('*')].filter((e) => !['STYLE', 'SCRIPT', 'NOSCRIPT', 'DEFS', 'CLIPPATH'].includes(e.tagName.toUpperCase()) && e.getBoundingClientRect().width > 0).slice(0, 24).map((e) => ({ tag: e.tagName.toLowerCase(), cls: cls(e), box: box(e), css: css(W.getComputedStyle(e)) }))); })()`);
  }
  if (what.html) {
    const [i, k] = what.html; const id = blockId(i, k);
    out.html = evalJs(S, `(() => { ${FRAME} const b = ${BLOCK(i, id)}; const t = b.querySelector('.ProseMirror') || b.querySelector('.sqs-html-content') || b; return JSON.stringify(t.innerHTML.replace(/(https?):\\/\\/([^"' )]+)/g, (m, sch, rest) => (/squarespace|sqsp/.test(rest) ? '<url>' : '<' + sch + '>' + rest)).slice(0, 1600)); })()`);
  }
  if (what.section !== undefined) {
    out.section = evalJs(S, `(() => { ${FRAME} ${round} const s = d.querySelectorAll('main#page .page-section')[${what.section}]; const fe = s.querySelector('.fluid-engine'); const c = W.getComputedStyle(fe); return JSON.stringify({ frame: [W.innerWidth, W.innerHeight], box: box(s), rows: c.gridTemplateRows.split(' ').length, rowSizes: c.gridTemplateRows.split(' ').map((v) => rnd(parseFloat(v))).reduce((a, v) => { const l = a.at(-1); if (l && l[0] === v) l[1]++; else a.push([v, 1]); return a; }, []).map(([v, n]) => (n > 1 ? v + 'x' + n : String(v))).join(' '), rowGap: c.rowGap, columnGap: c.columnGap, scrollY: W.scrollY, blocks: fe.querySelectorAll(':scope > .fe-block').length }); })()`);
  }
  if (what.areas !== undefined) {
    out.areas = evalJs(S, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${what.areas}]; return JSON.stringify([...fe.querySelectorAll(':scope > .fe-block')].map((b) => { const st = b.querySelector('style[data-test="fluid-engine-grid-css"]'); const [m, dk] = st ? st.textContent.split('@media (min-width: 768px)') : ['', '']; const a = (t) => (t.match(/grid-area:\\s*([\\d/ -]+)/) || [])[1]?.trim(); return [a(dk), a(m)]; })); })()`);
  }
  if (what.stack !== undefined) {
    out.stack = evalJs(S, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${what.stack}]; return JSON.stringify([...fe.querySelectorAll(':scope > .fe-block')].map((b) => { const st = b.querySelector('style[data-test="fluid-engine-grid-css"]'); const [m, dk] = st ? st.textContent.split('@media (min-width: 768px)') : ['', '']; const a = (t) => (t.match(/grid-area:\\s*([\\d/ -]+)/) || [])[1]?.trim(); const z = (t) => (t.match(/z-index:\\s*(\\d+)/) || [])[1]; return { id: b.dataset.blockId?.slice(-5), type: (b.querySelector('.sqs-block')?.className.match(/sqs-block-(?!alignment|content|html-)([a-z-]+)/) || [])[1], desktop: a(dk), phone: a(m), z: [z(dk), z(m)] }; })); })()`);
  }
  if (what.sel) {
    out.sel = evalJs(S, `(() => { ${FRAME} ${round} ${CSS} ${cls} return JSON.stringify([...d.querySelectorAll(${JSON.stringify(what.sel)})].filter((e) => e.getBoundingClientRect().width > 0).slice(0, 30).map((e) => ({ tag: e.tagName.toLowerCase(), cls: cls(e), box: box(e), css: css(W.getComputedStyle(e)) }))); })()`);
  }
  if (what.layers !== undefined) {
    out.layers = evalJs(S, `(() => { ${FRAME} ${round} ${CSS} ${cls} const fe = d.querySelectorAll('main#page .fluid-engine')[${what.layers}]; return JSON.stringify([...fe.children].filter((e) => !e.classList.contains('fe-block') && !e.classList.contains('fe-grid-row') && !e.classList.contains('fe-grid-column') && e.tagName !== 'STYLE').slice(0, 20).map((e) => ({ tag: e.tagName.toLowerCase(), cls: cls(e), box: box(e), css: css(W.getComputedStyle(e)) }))); })()`);
  }
  out.path = evalJs(S, `(() => { ${FRAME} return JSON.stringify(d.location.pathname); })()`);
  out.save = evalJs(S, `(() => JSON.stringify([...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Save')?.disabled === true ? 'clean' : 'changed'))()`);
  out.events = evalJs(S, `(() => { ${FRAME} const e = W.__fxEvents; W.__fxEvents = []; return JSON.stringify(e || []); })()`);
  if (!out.events.length) delete out.events;
  return out;
}

// 0006: anything that changes content runs on a page made for it. A recipe names that page by its
// title; with no title the step list only reads, on the demo page.
const pageTitle = recipe.page || opt('page') || 'How Fluid Engine works';
const pagePath = '/' + pageTitle.toLowerCase().replace(/\s+/g, '-');
// enter opens the page from the page list. If it times out the tab has hung, which happens now and then after leaving the editor: open a new tab in the same Chrome and close the old one.
{ const here = evalJs(S, 'JSON.stringify(location.href)'); if (/^http/.test(here)) { goto(S, new URL(here).origin + '/config/pages'); await pause(6000); } }
const finding = { item: name, oracle: pagePath, capturedAt: new Date().toISOString().slice(0, 10), engine: engine(S), question: recipe.question, steps: recipe.steps, reads: {}, errors: [] };
const LABEL = (label) => `() => { const L = ${JSON.stringify(label)}; const hits = [...document.querySelectorAll('[aria-label], [title], body *')].filter((e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && !e.closest('#sqs-site-frame') && (e.getAttribute('aria-label') === L || e.getAttribute('title') === L || (e.childElementCount === 0 && e.textContent.trim() === L)); }); const onTop = (e) => { const q = e.getBoundingClientRect(); const t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return t && (e === t || e.contains(t) || t.contains(e)); }; const hit = hits.filter(onTop).pop() || hits.pop(); return hit && (hit.closest('button, a, label, [role=radio], [role=button], [role=switch], [role=tab], [role=option], [role=menuitem]') || hit); }`;
const tag = (find) => evalJs(S, `(() => { const el = (${find})(); document.querySelectorAll('#fx-target').forEach((x) => x.removeAttribute('id')); if (!el) return JSON.stringify(false); el.id = 'fx-target'; return JSON.stringify(true); })()`) === true;
let held = null;
const booted = () => waitFor(S, `(() => { const f = document.getElementById('sqs-site-frame'); return !!(f && f.contentDocument && f.contentDocument.querySelector('.fluid-engine .fe-block')); })()`, 60);
const desktop = async () => { if (evalJs(S, `(() => JSON.stringify(document.getElementById('sqs-site-frame').contentWindow.innerWidth))()`) >= 768) return; if (tag(LABEL('Desktop View'))) { browser(S, 'click', '#fx-target'); await pause(2500); } };
const STEPS = {
  // The Mobile view outlives Exit, so a step could read the wrong layout: always start on Desktop.
  // After many runs Edit can open the bar and leave the canvas not editing: leave, reload, enter again.
  enter: async () => { booted(); const editing = () => tag(`() => [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Exit' && x.getBoundingClientRect().width > 0)`); try { await enterEdit(pageTitle); } catch (e) { if (!editing()) { await exitWithoutSaving().catch(() => {}); reload(S); booted(); await enterEdit(pageTitle); } } await desktop(); }, exit: () => exitWithoutSaving(), pause: (ms) => pause(ms),
  view: async (v) => { if (!tag(LABEL(`${v} View`))) throw new Error(`no ${v} View`); browser(S, 'click', '#fx-target'); await pause(2500); },
  frame: async (w, h) => { evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const [k, v] of [['width', '${w}px'], ['height', '${h}px'], ['max-width', 'none'], ['min-width', '0'], ['flex', 'none']]) f.style.setProperty(k, v, 'important'); return 'true'; })()`); await pause(1500); },
  unframe: async () => { evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame'); for (const k of ['width', 'height', 'max-width', 'min-width', 'flex']) f.style.removeProperty(k); return 'true'; })()`); await pause(800); },
  listen: () => evalJs(S, `(() => { ${FRAME} W.__fxEvents = []; if (!W.__fxListen) { W.__fxListen = true; for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchend', 'contextmenu', 'dragstart']) d.addEventListener(t, (e) => { const last = W.__fxEvents.at(-1); const name = t + (e.pointerType ? ':' + e.pointerType : ''); if (last && last[0] === name) last[1]++; else W.__fxEvents.push([name, 1]); }, true); } return 'true'; })()`),
  blank: () => addSection(),
  // Leaves the page without saving and enters another probe page: does a copied block survive it?
  toPage: async (title) => { await exitWithoutSaving().catch(() => {}); const o = evalJs(S, 'JSON.stringify(location.origin)'); goto(S, o + '/config/pages'); await pause(6000); booted(); try { await enterEdit(title); } catch { /* an empty page has no editing grid */ } finding.visited = title; await desktop(); },
  hover: (i) => hoverSection(i),
  hoverBlock: async (i, k) => { const [x, y] = point(i, k); await inFrame(() => mouse(S, 'move', x, y)); await pause(600); },
  sectionDrag: async (i, dy) => { const at = evalJs(S, `(() => { ${FRAME} const h = ${SECTION_HANDLE(i)}; if (!h) return JSON.stringify(null); const q = h.getBoundingClientRect(); return JSON.stringify([q.left + q.width / 2, q.top + q.height / 2]); })()`); if (!at) throw new Error('no section handle'); const [x, y] = at; await inFrame(() => cdp(S, { op: 'drag', from: [x, y], to: [x, y + dy], steps: 12, holdMs: 200, mods: [] })); await pause(800); },
  select: async (i, k) => { const [x, y] = point(i, k); await inFrame(() => { mouse(S, 'move', x, y); mouse(S, 'down', x, y); mouse(S, 'up', x, y); }); await pause(800); },
  deselect: async () => { await escape(); },
  pick: (i, k) => select(i, blockId(i, k)),
  add: async (i, type) => { added = await addBlock(i, type); await pause(800); },
  panel: (i) => openSectionPanel(i),
  editText: async (i, k) => { point(i, k); await inFrame(() => browser(S, 'dblclick', '#fx-b')); await pause(1000); },
  click: async (label) => { if (!tag(LABEL(label))) throw new Error(`nothing labelled ${label}`); browser(S, 'click', '#fx-target'); await pause(1200); },
  clickIf: async (label) => { if (tag(LABEL(label))) { browser(S, 'click', '#fx-target'); await pause(1200); } else finding.errors.push(`no ${label}`); },
  press: async (key) => { browser(S, 'press', key); await pause(500); },
  keys: async (text) => { for (const c of text) browser(S, 'press', c === ' ' ? 'Space' : c); await pause(300); },
  fill: async (label, value) => {
    const ok = tag(`() => { const L = ${JSON.stringify(label)}; const vis = (e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame'); const direct = [...document.querySelectorAll('input, textarea')].filter(vis).find((e) => e.getAttribute('aria-label') === L || e.getAttribute('placeholder') === L); if (direct) return direct; const t = [...document.querySelectorAll('body *')].filter((e) => e.childElementCount === 0 && e.textContent.trim() === L && vis(e)).pop(); let n = t; for (let u = 0; n && u < 6; u++, n = n.parentElement) { const i = [...n.querySelectorAll('input:not([type=checkbox]):not([type=radio]), textarea')].find(vis); if (i) return i; } return null; }`);
    if (!ok) throw new Error(`no field ${label}`);
    browser(S, 'fill', '#fx-target', String(value)); browser(S, 'press', 'Enter'); await pause(1200);
  },
  fillValue: async (now, value) => { if (!tag(`() => [...document.querySelectorAll('input')].filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('#sqs-site-frame') && e.value === ${JSON.stringify(now)})[0]`)) throw new Error(`no input holding ${now}`); browser(S, 'click', '#fx-target'); browser(S, 'press', 'Meta+a'); for (const c of String(value)) browser(S, 'press', c); browser(S, 'press', 'Enter'); await pause(800); },
  rightClick: async (i, k) => { const id = blockId(i, k); evalJs(S, `(() => { ${FRAME} const b = ${BLOCK(i, id)}; const q = b.getBoundingClientRect(); b.dispatchEvent(new W.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: q.left + q.width / 2, clientY: q.top + q.height / 2, button: 2, view: W })); return 'true'; })()`); await pause(1000); },
  // hold clicks first, and a second click on a selected text block starts editing it: holdRaw does not.
  holdRaw: async (i, k, part, dx, dy) => { const [x, y] = point(i, k, part); held = { x, y, mods: [] }; await inFrame(async () => { mouse(S, 'move', x, y); mouse(S, 'down', x, y); await pause(200); for (let n = 1; n <= 6; n++) { mouse(S, 'move', x + (dx * n) / 6, y + (dy * n) / 6, { buttons: 1 }); await pause(40); } }); await pause(300); },
  // Presses the south-east corner of the selected group, by the union of the selected blocks.
  groupDrag: async (i, dx, dy) => { const at = evalJs(S, `(() => { ${FRAME} const fe = d.querySelectorAll('main#page .fluid-engine')[${i}]; const qs = [...fe.querySelectorAll(':scope > .fe-block[data-is-selected="true"]')].map((b) => b.getBoundingClientRect()); if (qs.length < 2) return JSON.stringify(null); return JSON.stringify([Math.max(...qs.map((q) => q.right)), Math.max(...qs.map((q) => q.bottom))]); })()`); if (!at) throw new Error('no selected group'); const [x, y] = at; await inFrame(() => cdp(S, { op: 'drag', from: [x, y], to: [x + dx, y + dy], steps: 12, holdMs: 200, mods: [] })); await pause(800); },
  // Keeps the page's clipboard calls in memory, in the top window and the site frame, so a Copy cannot reach the machine's clipboard.
  // A copy or paste event with our own DataTransfer, in the frame or the top window. No key press, nothing reaches the machine's clipboard. Logs whether the page took it and the types, never the data.
  synthClip: (type, where = 'frame') => evalJs(S, `(() => { const f = document.getElementById('sqs-site-frame').contentWindow; const w = ${JSON.stringify(where)} === 'top' ? window : f; const d = w.document; f.__fxDt = f.__fxDt || new f.DataTransfer(); const dt = f.__fxDt; const t = d.activeElement && d.activeElement !== d.body ? d.activeElement : d; const ev = new w.ClipboardEvent(${JSON.stringify(type)}, { bubbles: true, cancelable: true, composed: true, clipboardData: dt }); const taken = !t.dispatchEvent(ev); f.__fxClip.log.push(${JSON.stringify(type + ':' + where + ':')} + (taken ? 'taken' : 'not taken') + ':' + [...dt.types].join(',')); return JSON.stringify(true); })()`),
  stubClipboard: () => { const stub = `(w) => { w.__fxClip = { log: [], data: null }; const c = w.__fxClip; const nav = { writeText: async (t) => { c.log.push('writeText'); c.data = t; }, readText: async () => { c.log.push('readText'); return typeof c.data === 'string' ? c.data : ''; }, write: async (items) => { c.log.push('write'); c.data = items; }, read: async () => { c.log.push('read'); return Array.isArray(c.data) ? c.data : []; } }; Object.defineProperty(w.navigator, 'clipboard', { value: nav, configurable: true }); const ex = w.document.execCommand.bind(w.document); w.document.execCommand = (cmd, ...rest) => { if (/^(copy|cut|paste)$/i.test(cmd)) { c.log.push('exec:' + cmd); return false; } return ex(cmd, ...rest); }; }`; return evalJs(S, `(() => { const f = ${stub}; f(window); f(document.getElementById('sqs-site-frame').contentWindow); return JSON.stringify(true); })()`); },
  shiftClick: async (i, k) => { const [x, y] = point(i, k); await inFrame(() => { mouse(S, 'move', x, y, { mods: ['Shift'] }); mouse(S, 'down', x, y, { mods: ['Shift'] }); mouse(S, 'up', x, y, { mods: ['Shift'] }); }); await pause(800); },
  hold: async (i, k, part, dx, dy, mods = []) => {
    await STEPS.select(i, k);
    const [x, y] = point(i, k, part); held = { x, y, mods };
    await inFrame(async () => { mouse(S, 'move', x, y, { mods }); mouse(S, 'down', x, y, { mods }); mouse(S, 'move', x + 14, y, { buttons: 1, mods }); await pause(150); for (let n = 1; n <= 6; n++) { mouse(S, 'move', x + (dx * n) / 6, y + (dy * n) / 6, { buttons: 1, mods }); await pause(40); } });
    held.dx = dx; held.dy = dy; await pause(300);
  },
  move: async (dx, dy) => { await inFrame(() => mouse(S, 'move', held.x + dx, held.y + dy, { buttons: 1, mods: held.mods })); held.dx = dx; held.dy = dy; await pause(300); },
  release: async (where) => { await inFrame(async () => { if (where === 'home') { mouse(S, 'move', held.x, held.y, { buttons: 1, mods: held.mods }); await pause(200); } mouse(S, 'up', where === 'home' ? held.x : held.x + held.dx, where === 'home' ? held.y : held.y + held.dy, { mods: held.mods }); }); held = null; await pause(700); },
  // In window pixels, for the editor's own panels.
  clickAt: async (x, y) => { cdp(S, { op: 'drag', from: [x, y], to: [x, y], steps: 1, holdMs: 50, mods: [] }); await pause(1000); },
  dragAt: async (x, y, x2, y2) => { cdp(S, { op: 'drag', from: [x, y], to: [x2, y2], steps: 12, holdMs: 200, mods: [] }); await pause(1000); },
  drag: async (i, k, part, dx, dy, o = {}) => { const [x, y] = point(i, k, part); await inFrame(() => cdp(S, { op: 'drag', from: [x, y], to: [x + dx, y + dy], steps: 12, holdMs: 200, mods: [], pointerType: o.pointerType })); await pause(800); },
  touch: async (i, k, part, dx, dy, o = {}) => { const [x, y] = point(i, k, part); await inFrame(() => cdp(S, { op: 'touch', from: [x, y], to: [x + dx, y + dy], steps: dx || dy ? 12 : 0, holdMs: o.holdMs || 0 })); await pause(1000); },
  pasteMid: async (i, k, html) => { const id = blockId(i, k); evalJs(S, `(async () => { ${FRAME} const pm = ${BLOCK(i, id)}.querySelector('.ProseMirror[contenteditable=true]'); if (!pm) return JSON.stringify('no editor'); pm.focus(); const w = d.createTreeWalker(pm, 4); const t = w.nextNode(); const r = d.createRange(); r.setStart(t, Math.floor(t.length / 2)); r.collapse(true); const s = W.getSelection(); s.removeAllRanges(); s.addRange(r); await new Promise((res) => setTimeout(res, 300)); const dt = new W.DataTransfer(); dt.setData('text/html', ${JSON.stringify(html)}); dt.setData('text/plain', ${JSON.stringify(html.replace(/<[^>]+>/g, ' '))}); pm.dispatchEvent(new W.ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })); await new Promise((res) => setTimeout(res, 400)); return 'true'; })()`); await pause(500); },
  // Undo by the top bar button until it stops, with the block's text at each step.
  undoWalk: async (label, i, k, n = 12) => {
    const id = blockId(i, k); const seen = [];
    const text = () => evalJs(S, `(() => { ${FRAME} const b = ${BLOCK(i, id)}; const t = b && (b.querySelector('.ProseMirror') || b.querySelector('.sqs-html-content')); return JSON.stringify(t ? t.textContent.replace(/\\s+/g, ' ').trim().slice(-60) : null); })()`);
    const can = () => evalJs(S, `(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Undo'); return JSON.stringify(!!b && !b.disabled); })()`);
    seen.push(['start', text()]);
    for (let u = 1; u <= n && can() === true; u++) { if (!tag(LABEL('Undo'))) break; browser(S, 'click', '#fx-target'); await pause(900); seen.push([u, text()]); }
    finding.reads[label] = { undo: seen, stillCan: can() };
  },
  shot: (label) => { if (process.env.SHOTS) { mkdirSync(process.env.SHOTS, { recursive: true }); browser(S, 'screenshot', '--out', `${process.env.SHOTS}/${name}-${label}.png`); } },
  read: (label, what) => { finding.reads[label] = read(what); },
};

try {
  for (const [op, ...a] of recipe.steps) {
    if (!STEPS[op]) throw new Error(`no step ${op}`);
    console.log(op, JSON.stringify(a).slice(0, 80));
    try { await STEPS[op](...a); } catch (e) {
      finding.errors.push(`${op} ${JSON.stringify(a).slice(0, 60)}: ${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 160)}`);
      console.log('  error:', finding.errors.at(-1));
      if (op === 'enter') break;
      if (held) await inFrame(() => mouse(S, 'up', held.x, held.y)).catch(() => {});
      held = null;
    }
  }
} finally {
  await desktop().catch(() => {});
  finding.leftDirty = await exitWithoutSaving().catch((e) => `exit failed: ${e.message}`);
}
const text = JSON.stringify(finding, null, 2).replace(/(https?):\/\/([^"' )]+)/g, (m, sch, rest) => (/squarespace|sqsp/.test(rest) ? '<url>' : `<${sch}>${rest}`)) + '\n';
writeFileSync(file, text);
console.log(`wrote parity/findings/${name}.json, ${Object.keys(finding.reads).length} reads, ${finding.errors.length} errors, left dirty: ${finding.leftDirty}`);
