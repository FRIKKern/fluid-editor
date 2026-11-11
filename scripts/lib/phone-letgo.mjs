// X2 on a phone: which handle pulls leave a block selected in the phone view, by the mouse and by touch
// (CAP-X2PHONE.json, read twice: R1 and R2). The desktop rules are HANDLEUP.json, CAP-X2EDGES.json, CAP-X2UNREAD.json,
// CAP-X2LEFT.json and the touch reads (CAP-X2TOUCHPROBE.json, CAP-R2X2LAST.json). The phone block fills the phone's
// width, so pulls that would leave the frame go left instead. Each case: [name, type, part, dx, dy, how].
import { evalJs, cdp, pause } from './cmux.mjs';

export const PHONE_LETGO = [
  ['Shape south 30 down', 'shape', 's', 0, 30, 'mouse'],
  ['Shape south 40 down', 'shape', 's', 0, 40, 'mouse'],
  ['Shape corner 60 left, 60 down', 'shape', 'se', -60, 60, 'mouse'],
  ['Shape corner 60 left, 60 down by touch', 'shape', 'se', -60, 60, 'touch'],
  ['Shape south 65 down by touch', 'shape', 's', 0, 65, 'touch'],
  ['Text corner 60 down', 'text', 'se', 0, 60, 'mouse'],
  ['Text corner 60 left', 'text', 'se', -60, 0, 'mouse'],
  ['Text north-east 60 up', 'text', 'ne', 0, -60, 'mouse'],
  ['Text north-east 60 down', 'text', 'ne', 0, 60, 'mouse'],
  ['Text north-west pressed, no move', 'text', 'nw', 0, 0, 'mouse'],
  ['Text east 60 left', 'text', 'e', -60, 0, 'mouse'],
  ['Text corner 60 down by touch', 'text', 'se', 0, 60, 'touch'],
  ['Text north-east 60 up by touch', 'text', 'ne', 0, -60, 'touch'],
  // CAP-X2PHONE-C.json: where the Shape's line is on a phone, since 30 down lets it go there (CAP-X2PHONE-A.json).
  ['Shape south 10 down', 'shape', 's', 0, 10, 'mouse'],
  ['Shape south 20 down', 'shape', 's', 0, 20, 'mouse'],
  ['Shape south 30 up', 'shape', 's', 0, -30, 'mouse'],
  ['Shape north 60 down', 'shape', 'n', 0, 60, 'mouse'],
  ['Shape east 60 left', 'shape', 'e', -60, 0, 'mouse'],
  ['Shape west 60 right', 'shape', 'w', 60, 0, 'mouse'],
  // CAP-X2PHONE-D.json, the phone rule's first round (fitted on A to C): the line at the old bottom, any Text corner.
  ['Shape south 5 down', 'shape', 's', 0, 5, 'mouse'],
  ['Shape south 5 up', 'shape', 's', 0, -5, 'mouse'],
  ['Shape south pressed, no move', 'shape', 's', 0, 0, 'mouse'],
  ['Text north-east 60 left', 'text', 'ne', -60, 0, 'mouse'],
  ['Text north-west 60 down', 'text', 'nw', 0, 60, 'mouse'],
  // CAP-X2PHONE-E.json, refit 1 (rule Q, fitted on A to D).
  ['Shape east pressed, no move', 'shape', 'e', 0, 0, 'mouse'],
  ['Shape east 5 left', 'shape', 'e', -5, 0, 'mouse'],
  ['Shape north 60 up', 'shape', 'n', 0, -60, 'mouse'],
  ['Line south 20 down', 'line', 's', 0, 20, 'mouse'],
  ['Text north-east 100 down', 'text', 'ne', 0, 100, 'mouse'],
  ['Text north-west 100 down', 'text', 'nw', 0, 100, 'mouse'],
  ['Text east pressed, no move', 'text', 'e', 0, 0, 'mouse'],
];

// Ours: the block alone in a section under an empty one (the oracle's site header keeps a pull up inside the frame), phone view,
// pressed where the capture presses, on the block's own edge or corner. Returns whether it is selected after the let go.
export async function phoneLetGo(S, [, type, part, dx, dy, how]) {
  const area = type === 'text' ? [1, 2, 5, 10] : [1, 2, 7, 10];
  evalJs(S, `(async () => { const sec = (id, blocks, n) => ({ id, theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: n, mobile: n }, blocks }); fe.setBp('desktop'); fe.load({ version: 1, title: 't', sections: [sec('s0', [], 2), sec('s', [{ id: 'k', type: '${type}', label: 'k', fill: '#ccc', html: '${type === 'text' ? '<p>Some text</p>' : ''}', layout: { desktop: { area: [1, 5, 7, 11], z: 1, justify: 'flex-start', align: 'flex-start' }, mobile: { area: ${JSON.stringify(area)}, z: 1, justify: 'flex-start', align: 'flex-start' } } }], 24)] }); fe.setBp('mobile'); await new Promise((r) => setTimeout(r, 200)); fe.select('s', 'k'); await new Promise((r) => setTimeout(r, 120)); return 1; })()`);
  await pause(40);
  const p = evalJs(S, `(() => { const f = document.getElementById('site-frame'), q = f.getBoundingClientRect(), W = f.contentWindow, el = f.contentDocument.querySelector('.fe-block[data-block-id="k"]'); let r = el.getBoundingClientRect(); if (r.top < 150 || r.bottom > W.innerHeight - 150) { W.scrollTo({ top: W.scrollY + r.top - 200, behavior: 'instant' }); r = el.getBoundingClientRect(); } const part = '${part}'; const x = part.includes('w') ? r.left : part.includes('e') ? r.right : r.left + r.width / 2, y = part.includes('n') ? r.top : part.includes('s') ? r.bottom : r.top + r.height / 2; return JSON.stringify([q.left + x, q.top + y]); })()`);
  const to = [p[0] + dx, p[1] + dy];
  if (how === 'touch') cdp(S, { op: 'touch', from: p, to, steps: dx || dy ? 12 : 0, holdMs: 150 });
  else cdp(S, { op: 'drag', from: p, to, steps: 12, holdMs: 200 });
  await pause(150);
  const got = evalJs(S, `JSON.stringify(document.getElementById('site-frame').contentDocument.querySelectorAll('.fe-handle').length > 0)`);
  evalJs(S, `(fe.select(null), fe.setBp('desktop'), document.getElementById('site-frame').contentWindow.scrollTo(0, 0), 1)`);
  return got;
}
