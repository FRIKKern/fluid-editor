// X8 on a phone: does a pin count for a group's Move Forward and Backward, and for one block's bar, in the phone view
// (CAP-X8PINPHONE.json)? CAP-X8PIN2.json's three Shapes apart (z 1, 3, 2; stacked on the phone in that order), the right
// one pinned on desktop (A) or in the phone view (B). Ours: the bar's buttons, with ' off' on a disabled one, as read.
import { evalJs, pause } from './cmux.mjs';

const shape = (id, d, m, z) => ({ id, type: 'shape', fill: '#ccc', layout: { desktop: { area: d, z, justify: 'center', align: 'center' }, mobile: { area: m, z, justify: 'center', align: 'center' } } });
export const PIN_BLOCKS = [shape('l', [1, 2, 7, 8], [1, 2, 7, 10], 1), shape('m', [1, 8, 7, 14], [7, 2, 13, 10], 3), shape('r', [1, 14, 7, 20], [13, 2, 19, 10], 2)];
// What each read selects: the first block id, then any shift-clicked ones.
export const PIN_READS = { 'one, pin elsewhere': ['l'], 'pin outside': ['l', 'm'], 'pin inside': ['l', 'r'], 'the pinned one': ['r'] };

export async function pinBar(S, pinIn, view, ids) {
  evalJs(S, `(async () => { fe.setBp('desktop'); const blocks = ${JSON.stringify(PIN_BLOCKS)}; blocks[2].layout['${pinIn}'].sticky = { anchor: 'top', offset: 0 }; fe.load({ version: 1, title: 't', sections: [{ id: 's', theme: '', height: 'small', valign: 'top', gap: 11, rowGap: 11, rows: { desktop: 8, mobile: 19 }, blocks }] }); fe.setBp('${view}'); await new Promise((r) => setTimeout(r, 200)); return 1; })()`);
  await pause(60);
  return evalJs(S, `(async () => { fe.select('s', ${JSON.stringify(ids[0])}); await new Promise((r) => setTimeout(r, 120)); const f = document.getElementById('site-frame'), d = f.contentDocument, W = f.contentWindow; for (const id of ${JSON.stringify(ids.slice(1))}) { const el = d.querySelector('.fe-block[data-block-id="' + id + '"]'); el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(), o = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, button: 0, shiftKey: true, clientX: r.left + 20, clientY: r.top + 20 }; d.elementFromPoint(r.left + 20, r.top + 20).dispatchEvent(new W.PointerEvent('pointerdown', o)); d.dispatchEvent(new W.PointerEvent('pointerup', o)); } await new Promise((r) => setTimeout(r, 150)); const out = JSON.stringify([...document.querySelectorAll('#block-toolbar > .tb-btn')].filter((b) => !b.hidden && b.getBoundingClientRect().width > 0).map((b) => b.getAttribute('aria-label') + (b.classList.contains('is-off') || b.disabled ? ' off' : '')).join()); fe.select(null); fe.setBp('desktop'); return out; })()`);
}
