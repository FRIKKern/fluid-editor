// T7: a video through the real menu and a real file picked in the panel, nothing uploaded, then
// every setting against parity/findings/VIDEOPLAYER.json. The file is a short clip the page records itself.
// Writes parity/video-check.json. Usage: FLUID_SURFACE=cdp:<port> npm run video-check.
import { readFileSync, writeFileSync } from 'node:fs';
import { evalJs, goto, viewport, pause, ensureVisible, mouse } from './lib/cmux.mjs';
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
const id = evalJs(S, `(async () => { const sleep = (ms) => new Promise((res) => setTimeout(res, ms)); document.querySelector('[data-sc="add-block"]').click(); await sleep(200); document.querySelector('button[data-add="Video"]').click(); await sleep(400); return JSON.stringify(fe.model.sections[1].blocks.at(-1)?.id ?? null); })()`);
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
  add(`${label}: the area stays 6/6/20/22`, got.area.join() === '6,6,20,22', got.area.join());
  add(`${label}: block never shorter than the player`, got.block[1] >= got.player[3] - 0.5, got.block.join());
}
await setSelect('aspect', '16/9');
// Keep the style the oracle writes for a ratio it names.
add('16:9 writes aspect-ratio:16/9;', size().style.replace(/\s/g, '') === 'aspect-ratio:16/9;', size().style);

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
q(`document.querySelector('[data-btab="Design"]').click(); await sleep(150); const c = panel.querySelector('input[data-design="corner"]'); c.value = 20; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); await sleep(250); return 'true';`);
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

// Remove: back to the placeholder, Lazy Loading kept.
await openPanel();
await setSelect('lazy', 'eager');
q(`panel.querySelector('[data-video-act="remove"]').click(); await sleep(300); return 'true';`);
const gone = q(`const b = block().getBoundingClientRect(); return JSON.stringify({ ph: !!block().querySelector('.sqs-block-video-placeholder--empty'), player: !!block().querySelector('.native-video-player'), w: b.width, h: b.height, add: !!panel.querySelector('[aria-label="Add a Video"]'), lazy: panel.querySelector('[data-video="lazy"]')?.value, aspect: !!panel.querySelector('[data-video="aspect"]'), controls: !!panel.querySelector('[data-video="controls"]'), toggles: !!panel.querySelector('.bp-vtoggles') });`);
add('Remove brings the placeholder back', gone.ph && !gone.player && gone.add, JSON.stringify(gone));
add('The empty block goes to the oracle\'s size', near(gone.w, F.remove.box[0]) && near(gone.h, F.remove.box[1]), `${gone.w} by ${gone.h}`);
add('Lazy Loading keeps its value', gone.lazy === 'eager', gone.lazy);
add('Aspect, buttons and controls go', !gone.aspect && !gone.toggles && !gone.controls, JSON.stringify(gone));

writeFileSync(new URL('../parity/video-check.json', import.meta.url), JSON.stringify({ pass, total, results }, null, 2) + '\n');
console.log(`\nVideo: ${pass}/${total}`);
console.log(JSON.stringify(heights));
process.exit(pass === total ? 0 : 1);
