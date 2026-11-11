// R2: a Text's rows when a handle changes its width, on a phone and from the corners of a taller Text (CAP-R2PHONE.json,
// CAP-R2CORNERS.json). Ours replays each run from the oracle's start: the Text alone in its section, pressed where the
// capture's handleDrag presses (the block's own edge or corner), 12 pointer steps, then Escape to let it go.
import { evalJs, mouse, browser, pause } from './cmux.mjs';

export const T3 = 'Short note about the mill road and the birch trees above it.';
export const PHONE_PITCH = 48.46; // (376.66 + 11) / 8: the phone's column pitch in a 428px frame
// The phone run: one column narrower four times, then one wider four times, by the east side.
export const PHONE_STEPS = [-1, -1, -1, -1, 1, 1, 1, 1].map((n, i) => [`${n < 0 ? 'narrower' : 'wider'} ${i < 4 ? i + 1 : i - 3}`, 'e', n * PHONE_PITCH]);
// The corner run on desktop at 1600: a taller Text narrowed two columns from each corner, each on a new Text.
export const CORNER_STEPS = [['sw', 2 * 58.78], ['nw', 2 * 58.78], ['ne', -2 * 58.78], ['se', -2 * 58.78]];

export function loadText(S, { html, desktop, mobile, rows, bp }) {
  return evalJs(S, `(async () => { fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: ${JSON.stringify(rows)}, blocks: [{ id: 't', type: 'text', label: 't', html: ${JSON.stringify(html)}, layout: { desktop: { area: ${JSON.stringify(desktop)}, z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: ${JSON.stringify(mobile)}, z: 1, justify: 'flex-start', align: 'flex-start' } } }] }] }); fe.setBp('${bp}'); await new Promise((r) => setTimeout(r, 250)); fe.select('s', 't'); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
}
export const readText = (S) => evalJs(S, `JSON.stringify({ desktop: fe.model.sections[0].blocks[0].layout.desktop.area.join('/'), phone: fe.model.sections[0].blocks[0].layout.mobile.area.join('/'), rows: fe.model.sections[0].rows[fe.bp], textH: Math.round(document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="t"] .sqs-html-content').getBoundingClientRect().height * 10) / 10 })`);

// A real drag from the block's own edge or corner, then the read at the drop and after Escape.
export async function pull(S, part, dx) {
  const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), r = f.contentDocument.querySelector('.fe-block[data-block-id="t"]').getBoundingClientRect(); const x = '${part}'.includes('w') ? r.left : '${part}'.includes('e') ? r.right : r.left + r.width / 2, y = '${part}'.includes('n') ? r.top : '${part}'.includes('s') ? r.bottom : r.top + r.height / 2; return JSON.stringify([q.left + x, q.top + y]); })()`);
  mouse(S, 'move', p[0], p[1]); await pause(30); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(30);
  for (let n = 1; n <= 12; n++) { mouse(S, 'move', p[0] + (dx * n) / 12, p[1], { buttons: 1 }); await pause(12); }
  mouse(S, 'up', p[0] + dx, p[1]); await pause(200);
  const held = readText(S);
  browser(S, 'press', 'Escape'); await pause(150);
  const letGo = readText(S);
  evalJs(S, `fe.select('s', 't')`); await pause(80);
  return { held, letGo };
}
