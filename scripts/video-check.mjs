// T7: a video through the real menu and a real file picked in the panel, nothing uploaded, then
// every setting against parity/findings/VIDEOPLAYER.json. The file is a short clip the page records itself.
// Writes parity/video-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run video-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse, drag } from './lib/cmux.mjs';
import { BASE } from './lib/base.mjs';

const S = process.env.FLUID_SURFACE || 'surface:59';
const F = JSON.parse(readFileSync(new URL('../parity/findings/VIDEOPLAYER.json', import.meta.url)));
let pass = 0, total = 0;
const results = [];
const add = (what, ok, detail) => { total++; if (ok) pass++; results.push({ what, ok }); console.log(`${what.padEnd(44)} ${ok ? 'match' : `DIFF ${detail ?? ''}`}`); };
const near = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

ensureVisible(S);
viewport(S, 1600, 1400);
goto(S, `${BASE}/index.html`); await pause(1000);
evalJs(S, `(() => { localStorage.clear(); return 'true'; })()`);
goto(S, `${BASE}/index.html`); await pause(1800);

// A new section's empty spot, then Add Block > Video, as a person would.
const spot = evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; s.blocks = []; s.rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((res) => setTimeout(res, 350)); const f = document.getElementById('site-frame'), sec = f.contentDocument.querySelectorAll('.page-section')[1]; sec.scrollIntoView(); await new Promise((res) => setTimeout(res, 200)); const r = sec.getBoundingClientRect(), o = f.getBoundingClientRect(); return JSON.stringify([o.left + r.left + 40, Math.max(o.top + r.top + 30, 120)]); })()`);
const sid = evalJs(S, `(() => JSON.stringify(fe.model.sections[1].id))()`);
mouse(S, 'move', spot[0], spot[1]); await pause(350);
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const had = new Set(fe.model.sections[1].blocks.map((x) => x.id)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Video"]').click(); await sleep(400); return JSON.stringify(fe.model.sections[1].blocks.find((x) => !had.has(x.id))?.id ?? null); })()`);
if (!id) { console.log('Add Block > Video did not make a block'); process.exit(1); }
const q = (body) => evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); const panel = document.getElementById('block-panel'); const block = () => document.getElementById('site-frame').contentDocument.querySelector('.fe-block-${id}'); const model = () => fe.model.sections[1].blocks.find((b) => b.id === '${id}'); ${body} })()`);
const settle = (ms = 300) => pause(ms);
const select = async () => { q(`fe.select('${sid}', '${id}'); await sleep(150); return 'true';`); await settle(); };
const openPanel = async () => { await select(); q(`if (panel.hidden) document.querySelector('#block-toolbar [data-tb="edit"]')?.click(); await sleep(150); document.querySelector('[data-btab="Content"]')?.click(); await sleep(100); return 'true';`); await settle(); };
const toolbar = () => q(`return JSON.stringify([...document.querySelectorAll('#block-toolbar [data-tb]')].map((x) => x.dataset.tb));`);
// The bar hides while the panel is open: a fresh select closes the panel.
const closed = async () => { q(`fe.load(JSON.parse(JSON.stringify(fe.model))); await sleep(300); fe.select('${sid}', '${id}'); await sleep(200); return 'true';`); await settle(); };
const fileBox = () => q(`return JSON.stringify(panel.querySelector('input[data-video-file]')?.accept ?? null);`);

await openPanel();
add('The empty block has an Add a Video box', q(`return JSON.stringify(!!panel.querySelector('button[data-video-act="add"][aria-label="Add a Video"]'));`));
add('The file picker takes the oracle\'s types', fileBox() === F.fileAccept, fileBox());
await closed();
const emptyBar = toolbar();
await openPanel();

// A real file through the panel's own input.
const added = q(`const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d'); const rec = new MediaRecorder(c.captureStream(20)); const parts = []; rec.ondataavailable = (e) => parts.push(e.data); rec.start(); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#a33' : '#3a3'; g.fillRect(0, 0, 640, 360); await sleep(60); } await new Promise((res) => { rec.onstop = res; rec.stop(); });
  const file = new File(parts, 'my clip.webm', { type: 'video/webm' }); const dt = new DataTransfer(); dt.items.add(file); const input = panel.querySelector('input[data-video-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); for (let i = 0; i < 40 && !model().video?.src; i++) await sleep(100); await sleep(200); return JSON.stringify(!!model().video?.src);`);
add('A picked file becomes the block\'s video', added);
const size = () => q(`const p = block().querySelector('.native-video-player'); const b = block().getBoundingClientRect(); const r = p.getBoundingClientRect(); return JSON.stringify({ block: [b.width, b.height], player: [r.left - b.left, r.top - b.top, r.width, r.height], area: model().layout.desktop.area, style: p.getAttribute('style'), settings: JSON.parse(block().querySelector('.sqs-native-video').dataset.configSettings), loading: block().querySelector('.sqs-native-video').dataset.configLoading });`);
add('The markup is the oracle\'s', q(`return JSON.stringify(!!block().querySelector('.sqs-block-content > div > .intrinsic > .embed-block-wrapper > .sqs-native-video[data-config-settings][data-config-loading] > .native-video-player.video-player[style*="aspect-ratio"] > video'));`));
add('The video does not hold up the page: it plays', q(`const v = block().querySelector('video'); for (let i = 0; i < 20 && v.readyState < 2; i++) await sleep(100); return JSON.stringify(v.readyState >= 2 && v.videoWidth === 640);`));
add('The name and length show in the panel', q(`return JSON.stringify(panel.querySelector('.bp-vid-name')?.textContent === 'my clip.webm' && /^Video · \\d+:\\d\\d$/.test(panel.querySelector('.bp-vid-meta')?.textContent));`));

// The Content tab's rows, in order.
const order = q(`const at = (s) => { const e = panel.querySelector(s); return e ? e.getBoundingClientRect().top : -1; }; return JSON.stringify(['.bp-vid-prev', '.bp-vid-name', '.bp-vid-meta', '[data-video-act="add"]', '.bp-video-store', '[data-video="thumb"]', '[data-video="aspect"]', '[data-video="lazy"]', '.bp-help', '.bp-vtoggles', '.bp-vtoggles + .bp-help', '.bp-video-head', '[data-video="controls"]', '[data-content="description"]'].map(at));`);
add('Content rows in the oracle\'s order', order.every((v, i) => v >= 0 && (i === 0 || v >= order[i - 1])), order.join());
await closed();
add('Toolbar with a video', toolbar().filter((x) => F.toolbar.map((n) => n.split(' ')[0].toLowerCase()).includes(x)).join() === 'edit,align,pin,duplicate,remove', toolbar().join());
add('Toolbar without one has no Align', !emptyBar.includes('align'), emptyBar.join());
await openPanel();

// Aspect ratio at the oracle's block: 929.5 wide at 6/6/20/22.
const setSelect = async (key, value) => { q(`const s = panel.querySelector('[data-video="${key}"]'); s.value = ${JSON.stringify(value)}; s.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return 'true';`); await settle(150); };
const labels = (key) => q(`return JSON.stringify([...panel.querySelector('[data-video="${key}"]').options].map((o) => o.textContent));`);
add('Aspect ratio lists', labels('aspect').join() === F.aspect.options.join(), labels('aspect').join());
q(`const before = JSON.parse(JSON.stringify(fe.model)); before.sections[1].blocks.find((b) => b.id === '${id}').layout.desktop.area = [6, 6, 20, 22]; fe.load(before); await sleep(300); return 'true';`);
await openPanel();
const heights = {};
for (const [label, want] of Object.entries(F.aspect.values)) {
  const opt = q(`const s = panel.querySelector('[data-video="aspect"]'); return JSON.stringify([...s.options].find((o) => o.textContent === ${JSON.stringify(label)}).value);`);
  await setSelect('aspect', opt);
  const got = size();
  heights[label] = [got.block[1], got.player[3]];
  add(`${label}: writes ${want.settings}`, got.settings.aspectRatio === want.settings, got.settings.aspectRatio);
  // Auto-detect writes this clip's own shape: 640 by 360 is the oracle's clip's too.
  add(`${label}: player ${want.player[3]} tall`, near(got.player[3], want.player[3]) && near(got.player[2], want.player[2]), got.player.join());
  add(`${label}: stays at the block's top`, near(got.player[1], 0, 0.1), got.player.join());
  add(`${label}: block never shorter than the player`, got.block[1] >= got.player[3] - 0.5, got.block.join());
}
await setSelect('aspect', '16/9');
// Keep the style the oracle writes for a ratio it names.
add('16:9 writes aspect-ratio:16/9;', size().style.replace(/\s/g, '') === 'aspect-ratio:16/9;', size().style);

// The rows, each ratio by a Code block's rule, and what is below goes along: three orders (CAP-T7ORDER.json, predictions first).
const ORDER = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T7ORDER.json', import.meta.url)));
const place = () => q(`const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1]; const v = s.blocks.find((b) => b.id === '${id}'); v.layout.desktop.area = [6, 6, 20, 22]; v.video = { ...v.video, aspect: '16/9' }; s.blocks = [v, { id: 'below-a', type: 'shape', layout: { desktop: { area: [20, 9, 21, 19], z: 1 }, mobile: { area: [14, 2, 15, 10], z: 1 } } }, { id: 'below-b', type: 'shape', layout: { desktop: { area: [22, 11, 24, 17], z: 1 }, mobile: { area: [16, 2, 18, 10], z: 1 } } }]; s.rows.desktop = 30; fe.load(next); await sleep(300); return 'true';`);
const areas = () => q(`return JSON.stringify(fe.model.sections[1].blocks.map((b) => b.layout.desktop.area.join('/')));`);
for (const [n, list] of [[1, ['9:16', '1:1', '4:3', '3:2', '16:9']], [2, ['1:1', '9:16', '16:9']], [3, ['3:2', '16:9', '1:1', '4:3']]]) {
  place(); await openPanel();
  for (const ratio of list) {
    await setSelect('aspect', ratio.replace(':', '/'));
    const r = ORDER.reads[`order ${n} ${ratio}`], want = [r.areas[1][0], r.areas[2][0], r.areas[3][0]], tall = r.inside[0].box[3], got = areas();
    add(`Order ${n}, ${ratio}: ${want[0]}, ${tall} tall`, got.join() === want.join() && near(size().block[1], tall, 0.6), `${got.join()}, ${size().block[1]}`);
  }
}
place(); await openPanel();

// Lazy Loading.
add('Lazy Loading lists', labels('lazy').join() === F.lazy.options.join(), labels('lazy').join());
for (const [label, want] of Object.entries(F.lazy.values)) {
  const opt = q(`const s = panel.querySelector('[data-video="lazy"]'); return JSON.stringify([...s.options].find((o) => o.textContent === ${JSON.stringify(label)}).value);`);
  await setSelect('lazy', opt);
  const got = size();
  add(`Lazy ${label}: ${want.settings}, attribute ${want.attribute}`, got.settings.loading === want.settings && got.loading === want.attribute, `${got.settings.loading} ${got.loading}`);
}

// The three buttons: the name says what a press will do.
F.toggles.writes.forEach((k, i) => {
  const name = () => q(`return JSON.stringify(panel.querySelector('[data-video-toggle="${k}"]').getAttribute('aria-label'));`);
  add(`${k} starts on, named ${F.toggles.on[i]}`, name() === F.toggles.on[i] && size().settings[k] === true, name());
  q(`panel.querySelector('[data-video-toggle="${k}"]').click(); await sleep(200); return 'true';`);
  add(`${k} off, named ${F.toggles.off[i]}`, name() === F.toggles.off[i] && size().settings[k] === false, name());
  q(`panel.querySelector('[data-video-toggle="${k}"]').click(); await sleep(200); return 'true';`);
});

// Player controls.
add('Player controls lists', labels('controls').join() === F.controls.options.join(), labels('controls').join());
const SHOWN = { play: '[data-vp="play"]', mute: '[data-vp="mute"]', volume: '[data-vp="volume"]', settings: '[aria-label="Settings"]', fullscreen: '[data-vp="fullscreen"]', seek: '[data-vp="seek"]' };
for (const [label, want] of Object.entries(F.controls.values)) {
  const opt = q(`const s = panel.querySelector('[data-video="controls"]'); return JSON.stringify([...s.options].find((o) => o.textContent === ${JSON.stringify(label)}).value);`);
  await setSelect('controls', opt);
  const shown = q(`const m = ${JSON.stringify(SHOWN)}; return JSON.stringify(Object.keys(m).filter((k) => block().querySelector(m[k])));`);
  add(`Controls ${label}: ${want.shown.join(' ') || 'nothing'}`, size().settings.controls === want.settings && shown.join() === Object.keys(SHOWN).filter((k) => want.shown.includes(k)).join(), shown.join());
}
await setSelect('controls', 'minimal');

// Custom thumbnail.
const thumb = (on) => q(`const c = panel.querySelector('[data-video="thumb"]'); c.checked = ${on}; c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(200); return JSON.stringify(!!panel.querySelector('[aria-label="Add an Image"]'));`);
const before = size().player;
add('Thumbnail on adds the box', thumb(true) === true);
add('The player does not change', size().player.join() === before.join(), size().player.join());
add('Off takes it away', thumb(false) === false);
// Ours only: the oracle's picture needs an upload (0005). A picture picked here becomes the poster.
thumb(true);
add('A picked picture becomes the poster', q(`const c = document.createElement('canvas'); c.width = 16; c.height = 9; const blob = await new Promise((res) => c.toBlob(res)); const dt = new DataTransfer(); dt.items.add(new File([blob], 't.png', { type: 'image/png' })); const input = panel.querySelector('input[data-video-thumb-file]'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); for (let i = 0; i < 30 && !model().video.thumbSrc; i++) await sleep(100); await sleep(200); return JSON.stringify(!!block().querySelector('video').getAttribute('poster') && !!panel.querySelector('.bp-pic-img'));`));
thumb(false);

// Corner on the player, one undo step for a change.
q(`document.querySelector('[data-btab="Design"]').click(); await sleep(150); const c = panel.querySelector('input[data-stack-field="corner"]'); c.value = 20; c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
const corner = q(`const i = block().querySelector('.intrinsic'); const s = getComputedStyle(i); const rad = (x) => getComputedStyle(x).borderTopLeftRadius; return JSON.stringify({ cls: i.classList.contains('sqs-border-radius-enabled'), radius: s.borderTopLeftRadius, overflow: s.overflow, block: rad(block().querySelector('.sqs-block')), content: rad(block().querySelector('.sqs-block-content')) });`);
add('Corner 20 clips the player', corner.cls && corner.radius === '20px' && corner.overflow === 'hidden', JSON.stringify(corner));
add('Corner 20 on the block and its content too', corner.block === '20px' && corner.content === '20px', JSON.stringify(corner));
q(`document.querySelector('[data-btab="Content"]').click(); await sleep(150); return 'true';`);

// Align Vertically, from the toolbar: the block's value changes, the player stays at the top.
await closed();
for (const [i, name] of F.alignVertically.items.entries()) {
  const value = ['flex-start', 'center', 'flex-end'][i];
  const got = q(`if (!document.querySelector('#block-toolbar [data-tb^="valign:"]')) document.querySelector('#block-toolbar [data-tb="align"]').click(); await sleep(150); const item = document.querySelector('#block-toolbar [data-tb="valign:${value}"]'); if (!item) return JSON.stringify(null); item.click(); await sleep(250); return JSON.stringify(getComputedStyle(block().querySelector('.sqs-block')).justifyContent);`);
  add(`${name} writes on the block, player at top`, got === value && near(size().player[1], 0, 0.1), `${got} ${size().player.join()}`);
}

// In the editor a click on the player selects the block: its buttons take no click.
add('The buttons take no click in the editor', q(`return JSON.stringify(getComputedStyle(block().querySelector('.vp-play')).pointerEvents === 'none');`));

// On the published page the buttons work. An iframe, so the file stays alive with this tab.
await openPanel();
await setSelect('controls', 'full');
const live = q(`localStorage.setItem('fluid-editor:model:v2', JSON.stringify(fe.model)); const fr = document.createElement('iframe'); fr.style.cssText = 'position:fixed;left:0;top:0;width:1200px;height:900px'; fr.src = 'page.html?saved'; document.body.append(fr); await new Promise((res) => { fr.onload = res; }); for (let i = 0; i < 40 && !fr.contentDocument.querySelector('.native-video-player video'); i++) await sleep(100); const d = fr.contentDocument, v = d.querySelector('.native-video-player video'); if (!v) { fr.remove(); return JSON.stringify(null); } for (let i = 0; i < 20 && v.readyState < 2; i++) await sleep(100); const out = { hover: getComputedStyle(d.querySelector('.vp-play')).pointerEvents !== 'none', placeholder: !!d.querySelector('.sqs-block-video-placeholder--empty') }; const was = v.paused; d.querySelector('[data-vp="play"]').click(); await sleep(150); out.play = v.paused !== was; const m = v.muted; d.querySelector('[data-vp="mute"]').click(); out.mute = v.muted !== m; const vol = d.querySelector('[data-vp="volume"]'); vol.value = 0.25; vol.dispatchEvent(new Event('input', { bubbles: true })); out.volume = v.volume === 0.25; fr.remove(); return JSON.stringify(out);`);
add('Published: the player shows, no placeholder', live && live.hover && !live.placeholder, JSON.stringify(live));
add('Published: Play pauses and plays', live?.play, JSON.stringify(live));
add('Published: Mute and Volume work', live?.mute && live?.volume, JSON.stringify(live));
await setSelect('controls', 'minimal');
await openPanel();

// One undo step: a change comes back with a single undo.
const undoOne = q(`const was = model().video.loop; panel.querySelector('[data-video-toggle="loop"]').click(); await sleep(200); const off = model().video.loop; fe.undo(); await sleep(250); return JSON.stringify(off === false && model().video?.loop === was);`);
add('A setting is one undo step', undoOne);

// T7, 25. The player's Settings, in preview only (CAP-T7SETTINGS.json). The look is ours; the sizes are the oracle's.
await openPanel();
await setSelect('controls', 'full');
const shown = () => q(`const s = (x) => { const c = getComputedStyle(block().querySelector(x)); return [c.opacity, c.pointerEvents]; }; return JSON.stringify({ play: s('.vp-play'), bar: s('.vp-bar') });`);
add('Edit mode: the controls do not show', shown().play.join() === '0,none' && shown().bar.join() === '0,none', JSON.stringify(shown()));
const inPlayer = (body) => q(`const d = document.getElementById('site-frame').contentDocument, p = block().querySelector('.native-video-player'), v = p.querySelector('video'), m = p.querySelector('.vp-menu'), set = p.querySelector('[data-vp="settings"]'), box = (x) => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.width, r.height, r.right, r.bottom]; }, press = async (x) => { p.querySelector(x).click(); await sleep(120); }; ${body}`);
q(`document.getElementById('preview').click(); await sleep(350); return 'true';`);
add('Preview: the controls show and take a press', inPlayer(`v.pause(); set.scrollIntoView({ block: 'center' }); await sleep(150); const r = set.getBoundingClientRect(), on = d.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return JSON.stringify(!!on?.closest('[data-vp="settings"]') && getComputedStyle(p.querySelector('.vp-bar')).opacity === '1');`));
const home = inPlayer(`v.pause(); await sleep(100); await press('[data-vp="settings"]'); const M = box(m), b = box(p.querySelector('.vp-bar')), last = box([...p.querySelectorAll('.vp-bar .vp-btn')].pop()), row = m.querySelector('.vp-home .vp-row'); return JSON.stringify({ open: !m.hidden, exp: set.getAttribute('aria-expanded'), w: M[2], h: M[3], right: M[4] - last[4], above: last[1] - M[5], row: row.getBoundingClientRect().height, rowAt: row.getBoundingClientRect().top - M[1], text: row.innerText.split(/\\s+/).join(' '), playing: !v.paused });`);
add('Settings opens a menu, expanded', home.open && home.exp === 'true', JSON.stringify(home));
add('Menu 164 by 48.4, one row 32.4 at +8', near(home.w, 164) && near(home.h, 48.4) && near(home.row, 32.4) && near(home.rowAt, 8), JSON.stringify(home));
add('Its right edge is the last button\'s, 12 above', near(home.right, 0) && near(home.above, 12), JSON.stringify(home));
add('The row says Speed Normal, and play stays off', home.text === 'Speed Normal' && !home.playing, JSON.stringify(home));
const list = inPlayer(`await press('[data-vp-menu="speed"]'); const M = box(m); return JSON.stringify({ w: M[2], h: M[3], labels: [...m.querySelectorAll('.vp-speeds [data-vp-rate]')].map((x) => x.textContent), on: m.querySelector('[aria-checked="true"]').textContent, home: m.querySelector('.vp-home').hidden, back: !!m.querySelector('.vp-back'), open: !m.hidden, playing: !v.paused });`);
add('Speed swaps to the list, 160 by 275.1', list.home && list.back && near(list.w, 160) && near(list.h, 275.1), JSON.stringify(list));
add('The speeds, Normal on', list.labels.join() === '0.5x,0.75x,Normal,1.25x,1.5x,1.75x,2x' && list.on === 'Normal' && list.open && !list.playing, JSON.stringify(list));
const picked = inPlayer(`await press('[data-vp-rate="1.5"]'); const r = v.playbackRate, t = m.querySelector('.vp-home .vp-row').innerText.split(/\\s+/).join(' '), shownHome = !m.querySelector('.vp-home').hidden; await press('[data-vp-rate="1"]'); return JSON.stringify({ r, t, shownHome, back: v.playbackRate });`);
add('A pick sets the speed and goes home (inferred)', picked.r === 1.5 && picked.t === 'Speed 1.5x' && picked.shownHome && picked.back === 1, JSON.stringify(picked));
const esc = inPlayer(`d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(120); return JSON.stringify({ open: !m.hidden, exp: set.getAttribute('aria-expanded'), preview: document.body.classList.contains('is-preview') });`);
add('Escape closes the menu', !esc.open && esc.exp === 'false', JSON.stringify(esc));
mouse(S, 'move', 2, 2); await pause(200);
const run = inPlayer(`v.muted = true; await v.play(); await sleep(250); const c = getComputedStyle(p.querySelector('.vp-bar')).opacity, big = getComputedStyle(p.querySelector('.vp-play')).display, cls = p.classList.contains('is-playing'); v.pause(); await sleep(150); const c2 = getComputedStyle(p.querySelector('.vp-bar')).opacity, big2 = getComputedStyle(p.querySelector('.vp-play')).display; v.muted = false; return JSON.stringify({ c, big, cls, c2, big2 });`);
add('Playing hides them, paused shows them', run.cls && run.c === '0' && run.big === 'none' && run.c2 === '1' && run.big2 !== 'none', JSON.stringify(run));
q(`document.getElementById('preview').click(); await sleep(350); return 'true';`);
add('Back in edit mode a press selects: no menu, no play', inPlayer(`p.querySelector('[data-vp="settings"]').click(); await sleep(120); return JSON.stringify(m.hidden && v.paused);`));
await openPanel();
await setSelect('controls', 'minimal');
add('Minimal controls have no Settings menu', q(`return JSON.stringify(!block().querySelector('.vp-menu'));`));

// T7, 24. The ? by Video Storage (CAP-T7TIP.json, CAP-T7TIP2.json). The words are ours.
await openPanel();
const tip = (body) => q(`const t = panel.querySelector('.bp-video-store [aria-label="Open storage dialog"]'), o = () => document.querySelector('.video-tip-over'), x = () => document.querySelector('.video-tip-box'); ${body}`);
const tipAt = tip(`const P = panel.getBoundingClientRect(), r = t.getBoundingClientRect(); t.focus(); return JSON.stringify({ x: r.left - P.left, w: r.width, h: r.height, tip: !!o() });`);
add('The ? is a named button, 36 by 36', tipAt.w === 36 && tipAt.h === 36 && near(tipAt.x, 247), JSON.stringify(tipAt));
const store = tip(`const b = panel.querySelector('.bp-video-store'), B = b.getBoundingClientRect(), r = t.getBoundingClientRect(), left = b.querySelectorAll('span')[1].getBoundingClientRect(), line = getComputedStyle(b, '::after'); return JSON.stringify({ y: r.top - B.top, gap: r.left - left.right, tall: B.height, line: line.height, under: B.height - parseFloat(line.bottom) });`);
add('The ? sits 9 down, clear of the minutes left', near(store.y, 9) && store.gap >= 0, JSON.stringify(store));
add('A line under the text, as tall as the store is', near(store.tall, 78) && store.line === '1px' && near(store.under, 56), JSON.stringify(store));
const tipOpen = tip(`t.click(); await sleep(150); const P = panel.getBoundingClientRect(), r = t.getBoundingClientRect(), b = x().getBoundingClientRect(), O = o().getBoundingClientRect(), c = getComputedStyle(o()); return JSON.stringify({ over: [O.left, O.top, O.width === innerWidth, O.height === innerHeight], bg: c.backgroundColor, top: !!document.elementFromPoint(20, 20)?.closest('.video-tip-over'), left: b.left - P.left, w: b.width, h: b.height, past: b.bottom - r.top, words: x().textContent });`);
add('A press: a dark overlay over everything', tipOpen.over.join() === '0,0,true,true' && tipOpen.bg === 'rgba(43, 43, 43, 0.6)' && tipOpen.top, JSON.stringify(tipOpen));
add('The tip sits on the button, 320 by 66', near(tipOpen.left, 10) && tipOpen.w === 320 && tipOpen.h === 66 && near(tipOpen.past, 2), JSON.stringify(tipOpen));
add('The tip has no Learn more, and our words', !/learn more/i.test(tipOpen.words) && tipOpen.words.length > 0, tipOpen.words);
const tipEsc = tip(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(150); return JSON.stringify({ tip: !!o() || !!x(), panel: !panel.hidden, focus: document.activeElement === panel.querySelector('[aria-label="Open storage dialog"]'), sel: !!block().closest('.fe-block') });`);
add('Escape closes it; the panel and the focus stay', !tipEsc.tip && tipEsc.panel && tipEsc.focus, JSON.stringify(tipEsc));
const tipOver = tip(`const was = JSON.stringify(fe.model); t.click(); await sleep(100); o().click(); await sleep(100); return JSON.stringify({ tip: !!o() || !!x(), panel: !panel.hidden, same: was === JSON.stringify(fe.model) });`);
add('A press on the overlay closes it (inferred); nothing changes', !tipOver.tip && tipOver.panel && tipOver.same, JSON.stringify(tipOver));

// T7, with a file (CAP-T7DESIGN3.json): 929.5 wide, 14 rows. Blocks below are pushed by the rows it gains.
const design = async (area, others = []) => {
  q(`const next = JSON.parse(JSON.stringify(fe.model)); const s = next.sections[1], b = s.blocks.find((x) => x.id === '${id}'); delete b.design; delete b.designMobile; b.layout.desktop.area = ${JSON.stringify(area)}; const mk = (a, n) => ({ ...JSON.parse(JSON.stringify(next.sections[0].blocks.find((x) => x.type === 'text'))), id: 'below' + n, layout: { desktop: { area: a, zIndex: 1 }, mobile: { area: a, zIndex: 1 } } }); s.blocks = [b, ...${JSON.stringify(others)}.map(mk)]; s.rows.desktop = 60; fe.load(next); await sleep(300); return 'true';`);
  await openPanel();
  q(`document.querySelector('[data-btab="Design"]').click(); await sleep(150); return 'true';`);
};
const vr = () => q(`const bk = block(), B = bk.getBoundingClientRect(), i = bk.querySelector('.intrinsic'), R = i.getBoundingClientRect(), c = getComputedStyle(i), in_ = bk.querySelector('.sqs-block-video-placeholder--empty, .embed-block-wrapper').getBoundingClientRect(), sb = bk.querySelector('.sqs-block'), rad = (x) => getComputedStyle(x).borderRadius; return JSON.stringify({ area: model().layout.desktop.area.join('/'), phone: model().layout.mobile.area.join('/'), block: [B.width, B.height], sqs: sb.getBoundingClientRect().height, box: [R.width, R.height], border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor, bg: c.backgroundColor, radius: [rad(i), rad(sb), rad(bk.querySelector('.sqs-block-content'))], overflow: c.overflow, cls: i.className, inner: [in_.left - B.left, in_.top - B.top, in_.width, in_.height], rows: [...panel.querySelectorAll('.bp-pane .sp-label, .sp-label')].map((x) => x.textContent), others: fe.model.sections[1].blocks.filter((x) => x.id !== '${id}').map((x) => x.layout.desktop.area.join('/')) });`);
const press = (label) => q(`const c = panel.querySelector('[aria-label="${label}"]'); if (!c) return JSON.stringify('no ${label}'); c.click(); await sleep(250); return 'true';`);
const typeIn = (sel, v) => q(`const c = panel.querySelector('${sel}'); if (!c) return JSON.stringify('no field'); c.value = '${v}'; c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
const nearAll = (a, b, tol = 0.7) => a.length === b.length && a.every((v, i) => near(v, b[i], tol));
const startArea = size().area;
await design([6, 6, 20, 22], [[20, 9, 21, 19], [22, 11, 24, 17]]);
let r = vr();
add('File: 929.5 by 522.8, 14 rows', near(r.block[0], 929.5) && near(r.box[1], 522.8) && r.area === '6/6/20/22', JSON.stringify(r));
press('Solid Stroke'); r = vr();
add('File, Solid: .intrinsic 576.9, a 6px line', near(r.box[1], 576.9) && r.border === '6px solid rgb(255, 255, 255)', JSON.stringify(r));
add('File, Solid: the player 806 by 453.3, 61.7 in', nearAll(r.inner, [61.7, 61.7, 806, 453.3]), JSON.stringify(r.inner));
add('File, Solid: one row more, blocks below pushed', r.area === '6/6/21/22' && r.others.join() === '21/9/22/19,23/11/25/17', JSON.stringify([r.area, r.others]));
const undone = q(`fe.undo(); await sleep(300); const b = model(); return JSON.stringify({ a: b.layout.desktop.area.join('/'), s: b.design?.stroke ?? null, o: fe.model.sections[1].blocks.filter((x) => x.id !== '${id}').map((x) => x.layout.desktop.area.join('/')) });`);
add('One undo takes back the line, its row and the push', undone.a === '6/6/20/22' && undone.s === null && undone.o.join() === '20/9/21/19,22/11/24/17', JSON.stringify(undone));
await design([6, 6, 20, 22]);
press('Add fill'); r = vr();
add('File, fill: .intrinsic 571.6', near(r.box[1], 571.6) && r.bg === 'rgb(255, 255, 255)', JSON.stringify(r));
add('File, fill: the player 818 by 460.1, 55.7 in', nearAll(r.inner, [55.7, 55.7, 818, 460.1]), JSON.stringify(r.inner));
await design(startArea);
q(`document.querySelector('[data-btab="Content"]').click(); await sleep(150); return 'true';`);

// Remove: back to the placeholder, Lazy Loading kept.
await openPanel();
await setSelect('lazy', 'eager');
q(`panel.querySelector('[data-video-act="remove"]').click(); await sleep(300); return 'true';`);
const gone = q(`const b = block().getBoundingClientRect(); return JSON.stringify({ ph: !!block().querySelector('.sqs-block-video-placeholder--empty'), player: !!block().querySelector('.native-video-player'), w: b.width, h: b.height, add: !!panel.querySelector('[aria-label="Add a Video"]'), lazy: panel.querySelector('[data-video="lazy"]')?.value, aspect: !!panel.querySelector('[data-video="aspect"]'), controls: !!panel.querySelector('[data-video="controls"]'), toggles: !!panel.querySelector('.bp-vtoggles') });`);
add('Remove brings the placeholder back', gone.ph && !gone.player && gone.add, JSON.stringify(gone));
add('The empty block goes to the oracle\'s size', near(gone.w, F.remove.box[0]) && near(gone.h, F.remove.box[1]), `${gone.w} by ${gone.h}`);
add('Lazy Loading keeps its value', gone.lazy === 'eager', gone.lazy);
add('Aspect, buttons and controls go', !gone.aspect && !gone.toggles && !gone.controls, JSON.stringify(gone));

// T7, 22 and 23. The empty block's Design tab, 459.3 wide, 1/2/9/10 (CAP-T7CORNER.json, CAP-T7DESIGN.json, CAP-T7DESIGN2.json).
await design([1, 2, 9, 10]);
r = vr();
const fresh = { phone: r.phone };
const places = q(`const P = panel.getBoundingClientRect(), at = (x) => { const e = panel.querySelector(x); if (!e) return null; const c = e.getBoundingClientRect(); return [c.left - P.left, c.width, c.height, c.top - P.top]; }; return JSON.stringify({ fill: at('[aria-label="Add fill"]'), seg: at('[aria-label="No Stroke"]'), uni: at('[aria-label="Uniform corner radii"]'), ind: at('[aria-label="Individual corner radii"]'), field: at('input[data-stack-field="corner"]')?.length && at('.st-corner-field'), val: panel.querySelector('input[data-stack-field="corner"]')?.value, sw: !!panel.querySelector('[data-design="background"], [data-design="stroke"]'), lone: !!panel.querySelector('input[type="number"][data-design="corner"]'), reset: !!panel.querySelector('.st-corner-field [aria-label="Reset to default value"]'), segs: [...panel.querySelectorAll('[aria-label$="Stroke"]')].map((x) => x.getAttribute('aria-label')) });`);
add('Empty: 459.3 wide, .sqs-block 298.5, 1/2/9/10', near(r.block[0], 459.3) && near(r.sqs, 298.5) && r.area === '1/2/9/10', JSON.stringify(r));
add('Empty: Background, Stroke, Corner, in that order', r.rows.filter((x) => ['Background', 'Padding', 'Stroke', 'Thickness', 'Color', 'Corner'].includes(x)).join() === 'Background,Stroke,Corner', r.rows.join());
add('Background is a + button, no switch', places.fill && places.fill[1] === 36 && places.fill[2] === 36 && near(places.fill[0], 262) && !places.sw, JSON.stringify(places));
add('Stroke is three segments', places.segs.join() === 'No Stroke,Solid Stroke,Dashed Stroke' && places.seg && near(places.seg[0], 119) && near(places.seg[1], 56.7) && near(places.seg[2], 38), JSON.stringify(places));
add('Corner: Uniform, Individual and a 0px field', places.uni && near(places.uni[0], 119) && places.uni[1] === 41 && places.uni[2] === 38 && places.ind && places.val === '0px' && near(places.field[0], 210) && places.field[1] === 88 && places.field[2] === 44 && !places.lone, JSON.stringify(places));
add('The rows sit at the oracle\'s heights: 114, 164, 215, 212', places.fill && near(places.fill[3], 114, 1) && near(places.seg[3], 164, 1) && near(places.uni[3], 215, 1) && near(places.field[3], 212, 1), JSON.stringify(places));
add('Corner 0: no note', !q(`return JSON.stringify(!!panel.querySelector('.bp-vhint'));`));
add('No Reset while the corner is 0', !places.reset, JSON.stringify(places));

typeIn('input[data-stack-field="corner"]', '20'); r = vr();
add('Corner 20 rounds the dark placeholder', r.radius.join() === '20px,20px,20px' && r.cls.includes('sqs-border-radius-enabled') && r.overflow === 'hidden', JSON.stringify(r));
const hint = () => q(`return JSON.stringify(panel.querySelector('.bp-vhint')?.textContent ?? null);`);
add('Corner above 0: the note about the controls', hint() === 'Design settings may obscure video controls.', hint());
add('Corner 20 keeps its rows, and shows Reset', r.area === '1/2/9/10' && q(`return JSON.stringify(!!panel.querySelector('.st-corner-field [aria-label="Reset to default value"]') && panel.querySelector('input[data-stack-field="corner"]').value === '20px');`), r.area);
press('Individual corner radii');
const each = q(`const f = [...panel.querySelectorAll('.st-corners input')]; const vals = f.map((x) => x.value), names = f.map((x) => x.getAttribute('aria-label')); f[1].value = '5'; f[1].dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); const g = panel.querySelectorAll('.st-corners input')[2]; g.value = '40'; g.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return JSON.stringify({ vals, names, main: panel.querySelector('input[data-stack-field="corner"]').value, r: getComputedStyle(block().querySelector('.intrinsic')).borderRadius });`);
add('Individual: four fields from the one value', each.vals.join() === '20,20,20,20' && each.names.join() === 'Top left corner radius,Top right corner radius,Bottom right corner radius,Bottom left corner radius', JSON.stringify(each));
add('20, 5, 40, 20 on the placeholder, the field says Mixed', each.r === '20px 5px 40px' + ' 20px' && each.main === 'Mixed', JSON.stringify(each));
press('Uniform corner radii'); r = vr();
add('Uniform: back to the first value', r.radius[0] === '20px', JSON.stringify(r.radius));

press('Solid Stroke'); r = vr();
add('Solid: 1/2/10/10, the phone stays', r.area === '1/2/10/10' && r.phone === fresh.phone, JSON.stringify([r.area, r.phone, fresh.phone]));
add('Solid: 459.3 by 322, a white 6px line', nearAll(r.box, [459.3, 322]) && r.border === '6px solid rgb(255, 255, 255)' && r.cls.includes('sqs-stroke-enabled'), JSON.stringify(r));
add('Solid: the placeholder 33.6 in, 392.2 by 254.9', nearAll(r.inner, [33.6, 33.6, 392.2, 254.9]), JSON.stringify(r.inner));
add('Solid: the block is 358.8, the corner stays', near(r.block[1], 358.8) && r.radius[0] === '20px', JSON.stringify(r));
add('Solid: Padding, Thickness and Color rows', r.rows.filter((x) => ['Background', 'Padding', 'Stroke', 'Thickness', 'Color', 'Corner'].includes(x)).join() === 'Background,Padding,Stroke,Thickness,Color,Corner', r.rows.join());
const rowsAt = q(`const P = panel.getBoundingClientRect(), at = (x) => { const c = panel.querySelector(x).getBoundingClientRect(); return [c.left - P.left, c.top - P.top, c.width, c.height]; }; return JSON.stringify({ y: at('input[data-design="padY"]').slice(0, 1), pad: at('.st-pads .st-pad'), thick: at('.bp-vfield'), color: at('[aria-label="Color"]'), solid: at('[aria-label="Solid Stroke"]'), field: at('.st-corner-field') });`);
add('Solid: a row every 51, Thickness 182 wide, Color 44', nearAll(rowsAt.pad, [116, 161, 88, 44], 1) && near(rowsAt.solid[1], 215, 1) && nearAll(rowsAt.thick, [116, 263, 182, 44], 1) && nearAll(rowsAt.color, [254, 314, 44, 44], 1) && near(rowsAt.field[1], 365, 1), JSON.stringify(rowsAt));
add('Padding reads 6% 6%, Thickness 6px', q(`return JSON.stringify(panel.querySelector('input[data-design="padY"]').value === '6%' && panel.querySelector('input[data-design="padX"]').value === '6%' && panel.querySelector('input[data-design="strokePx"]').value === '6px');`));
press('Dashed Stroke'); r = vr();
add('Dashed: the same with dashes', r.border === '6px dashed rgb(255, 255, 255)' && r.area === '1/2/10/10' && near(r.box[1], 322), JSON.stringify(r));
press('Solid Stroke');
typeIn('input[data-design="strokePx"]', '10'); r = vr();
add('Thickness 10: 324.8, 37.6 in, same rows', near(r.box[1], 324.8) && nearAll(r.inner, [37.6, 37.6, 384.2, 249.7]) && r.area === '1/2/10/10', JSON.stringify(r));
// The <> on Thickness: shows on a hover, a pull moves the value 0.4 a pixel, down to 0 (CAP-T7THICK.json, CAP-T7THICK4.json).
const THICK4 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T7THICK4.json', import.meta.url)));
const thickAt = () => q(`const f = panel.querySelector('input[data-design="strokePx"]').parentElement.getBoundingClientRect(); return JSON.stringify([f.left + 40, f.top + f.height / 2]);`);
const grip = () => q(`const g = panel.querySelector('.bp-vscrub'); const c = g.getBoundingClientRect(); return JSON.stringify({ shown: getComputedStyle(g).display !== 'none', x: c.left + c.width / 2, y: c.top + c.height / 2, w: c.width, h: c.height }); `);
mouse(S, 'move', 5, 5); q(`document.activeElement?.blur(); await sleep(60); return 'true';`);
add('<>: none with no hover or focus', !grip().shown, JSON.stringify(grip()));
{ const [x, y] = thickAt(); mouse(S, 'move', x, y); await pause(150); }
add('<>: shows on a hover, 44 square', grip().shown && grip().w === 44 && grip().h === 44, JSON.stringify(grip()));
for (const [name, dx] of [['left 5', -5], ['right 5', 5], ['right 40', 40], ['left 12', -12], ['left 80', -80], ['right 12', 12]]) {
  { const [x, y] = thickAt(); mouse(S, 'move', x, y); await pause(100); }
  const g = grip();
  drag(S, [g.x, g.y], [g.x + dx, g.y], { steps: 12, holdMs: 100 }); await pause(200);
  const shows = q(`return JSON.stringify(panel.querySelector('input[data-design="strokePx"]').value);`), held = q(`return JSON.stringify(fe.model.sections[1].blocks.find((b) => b.id === '${id}').design?.strokePx ?? 6);`);
  add(`<> ${name}: ${THICK4.reads[name].rows.Thickness[0]}`, shows === THICK4.reads[name].rows.Thickness[0] && `${held}px` === shows, `${shows} ${held}`);
}
typeIn('input[data-design="strokePx"]', '10');
press('No Stroke'); r = vr();
add('No Stroke: back to 1/2/9/10, corner kept', r.area === '1/2/9/10' && r.radius[0] === '20px' && near(r.box[1], 298.5), JSON.stringify(r));
add('No Stroke: Padding and Thickness rows go', !r.rows.includes('Padding') && !r.rows.includes('Thickness'), r.rows.join());

await design([1, 2, 9, 10]);
press('Add fill'); r = vr();
add('Add fill opens the colours at once', q(`const p = document.getElementById('shape-pop'), x = panel.getBoundingClientRect(), c = p.getBoundingClientRect(); return JSON.stringify(!p.hidden && p.classList.contains('is-color') && c.left >= x.right - 1);`));
add('Fill: white, 317.8, rows stay 8', r.bg === 'rgb(255, 255, 255)' && near(r.box[1], 317.8) && near(r.sqs, 317.8) && r.area === '1/2/9/10', JSON.stringify(r));
add('Fill: the placeholder 27.6 in, 404.2 by 262.7', nearAll(r.inner, [27.6, 27.6, 404.2, 262.7]), JSON.stringify(r.inner));
add('Fill: a Padding row, a swatch named Color, Remove color', r.rows.includes('Padding') && q(`return JSON.stringify(!!panel.querySelector('button[aria-label="Color"]') && !!panel.querySelector('button[aria-label="Remove color"]') && !panel.querySelector('[aria-label="Add fill"]'));`), r.rows.join());
add('The Design tab closes the colours', q(`document.querySelector('[data-btab="Design"]').click(); await sleep(200); return JSON.stringify(document.getElementById('shape-pop').hidden);`));
typeIn('input[data-design="padY"]', '10'); r = vr();
add('Padding 10: 354.6, one row more', near(r.box[1], 354.6) && r.area === '1/2/10/10', JSON.stringify(r));
typeIn('input[data-design="padX"]', '20'); r = vr();
add('Padding 20 across: 271, 1/2/7/10', near(r.box[1], 271) && r.area === '1/2/7/10', JSON.stringify(r));
add('Padding 10 20: the placeholder', nearAll(r.inner, [91.9, 45.9, 275.6, 179.1]), JSON.stringify(r.inner));
press('Show individual padding controls');
const four = q(`const f = [...panel.querySelectorAll('.st-pads-four input')]; return JSON.stringify({ v: f.map((x) => x.value), names: f.map((x) => x.getAttribute('aria-label')), back: !!panel.querySelector('[aria-label="Show vertical and horizontal padding controls"]') });`);
add('Four fields: top, left, bottom, right', four.v.join() === '10%,20%,10%,20%' && four.names.join() === 'Padding top,Padding left,Padding bottom,Padding right' && four.back, JSON.stringify(four));
typeIn('input[data-design="padT"]', '0'); r = vr();
add('A field of the four moves its side alone', near(r.inner[1], 0) && near(r.inner[0], 91.9), JSON.stringify(r.inner));
press('Show vertical and horizontal padding controls');
add('Back to two fields (inferred)', q(`return JSON.stringify(!!panel.querySelector('input[data-design="padY"]') && !panel.querySelector('.st-pads-four'));`));
press('Remove color'); r = vr();
add('Remove color: + again, no white, no Padding (inferred)', r.bg === 'rgba(0, 0, 0, 0)' && !r.rows.includes('Padding') && q(`return JSON.stringify(!!panel.querySelector('[aria-label="Add fill"]'));`), JSON.stringify(r));
typeIn('input[data-stack-field="corner"]', '20'); q(`panel.querySelector('.st-corner-field [aria-label="Reset to default value"]').click(); await sleep(250); return 'true';`); r = vr();
add('Reset takes the corner back to 0', r.radius[0] === '0px' && !r.cls.includes('sqs-border-radius-enabled') && q(`return JSON.stringify(panel.querySelector('input[data-stack-field="corner"]').value === '0px');`), JSON.stringify(r.radius));
typeIn('input[data-stack-field="corner"]', '20');
q(`document.getElementById('preview').click(); await sleep(350); return 'true';`);
add('Preview: the placeholder stays, rounded', q(`const e = block().querySelector('.sqs-block-video-placeholder--empty'), c = getComputedStyle(e); return JSON.stringify(c.display !== 'none' && e.getBoundingClientRect().height > 100 && getComputedStyle(block().querySelector('.intrinsic')).borderRadius === '20px');`));
q(`document.getElementById('preview').click(); await sleep(350); return 'true';`);

writeFileSync(new URL('../parity/video-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nVideo: ${pass}/${total}`);
console.log(JSON.stringify(heights));
process.exit(pass === total ? 0 : 1);
