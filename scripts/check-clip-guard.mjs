// cdp-run.mjs's clipboard guard (scripts/lib/clip-guard.mjs): which keys it stops, and when the stub's marker lets one go.
// Runs the guard's own page check against stand-in windows, no Chrome. Usage: node scripts/check-clip-guard.mjs
import { readFileSync } from 'node:fs';
import { isClipKey, CLIP_EVENTS, STUBBED_JS, STUB_JS, ARM_JS, fireJs, refusal } from './lib/clip-guard.mjs';

let fails = 0, total = 0;
const is = (what, ok) => { total++; if (!ok) { fails++; console.log(`clip guard DIFF ${what}`); } };

for (const k of ['Meta+c', 'Meta+x', 'Meta+v', 'Control+c', 'Control+x', 'Control+v', 'Meta+Shift+v', 'Meta+C']) is(`${k} is stopped`, isClipKey(k));
for (const k of ['Meta+a', 'Meta+z', 'Meta+Shift+z', 'Meta+b', 'c', 'v', 'Shift+c', 'Alt+c', 'Meta+cc']) is(`${k} goes`, !isClipKey(k));

const win = (marked, frame) => ({ __fxClip: marked ? { log: [], data: null, texts: [] } : undefined, document: { querySelector: () => frame } });
const frameOf = (w) => ({ contentWindow: w });
const closed = { contentWindow: new Proxy({}, { get: () => { throw new Error('cross-origin'); } }) };
const run = (w) => new Function('window', 'document', `return ${STUBBED_JS}`)(w, w.document);
is('marked top and frame: goes', run(win(true, frameOf({ __fxClip: {} }))) === true);
is('no marker: stopped', run(win(false, frameOf({}))) === false);
is('top only: stopped', run(win(true, frameOf({}))) === false);
is('frame only: stopped', run(win(false, frameOf({ __fxClip: {} }))) === false);
is('no frame: stopped', run(win(true, null)) === false);
is('marker null: stopped', run(win(true, frameOf({ __fxClip: null }))) === false);
is('a frame it cannot read: stopped', run(win(true, closed)) === false);
is('the refusal names the key and the stub', /Meta\+c/.test(refusal('Meta+c')) && /__fxClip/.test(refusal('Meta+c')));

// Chrome's own copy, cut and paste never go: cdp-run's command list holds none, and only Meta+c, x, v get a stand-in event.
const commands = readFileSync(new URL('./lib/cdp-run.mjs', import.meta.url), 'utf8').match(/const COMMANDS = \{[^}]*\}/)?.[0] ?? '';
is('cdp-run has a command list', /selectAll/.test(commands));
is('no native copy, cut or paste in it', !/'(copy|cut|paste)'/.test(commands));
is('stand-in events for Meta+c, x, v only', JSON.stringify(CLIP_EVENTS) === JSON.stringify({ 'Meta+c': 'copy', 'Meta+x': 'cut', 'Meta+v': 'paste' }));
for (const [what, js] of [['stub', STUB_JS], ['arm', ARM_JS], ['copy', fireJs('copy')], ['cut', fireJs('cut')], ['paste', fireJs('paste')]]) { let ok = true; try { new Function(`return ${js}`); } catch { ok = false; } is(`the ${what} script parses`, ok); }

console.log(`clip guard ${fails ? 'FAILS' : 'ok'}: ${total - fails} of ${total}`);
process.exit(fails ? 1 : 0);
