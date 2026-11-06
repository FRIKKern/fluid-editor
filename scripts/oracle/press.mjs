// A real press on an element that is on top, or it stops. Refuses anything named reset, save, delete or remove.
import { evalJs, mouse, pause } from '../lib/cmux.mjs';

export async function pressOnTop(S, find, wait = 1000) {
  const q = evalJs(S, `(() => { const e = ${find}; if (!e) return JSON.stringify('none'); if (/reset|save|delete|remove/i.test((e.getAttribute('aria-label') || '') + ' ' + e.textContent)) return JSON.stringify('refused'); e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return JSON.stringify(t && (t === e || e.contains(t)) ? [x, y] : 'covered'); })()`);
  if (!Array.isArray(q)) throw new Error(`press: ${q}`);
  mouse(S, 'move', q[0], q[1]); await pause(90); mouse(S, 'down', q[0], q[1], { buttons: 1 }); await pause(30); mouse(S, 'up', q[0], q[1]); await pause(wait);
}

// Exit, then the Exit inside "Exit Without Saving?" if it asks. Returns whether it asked, that is, whether something had changed.
const DIALOG_EXIT = `(() => { const t = [...document.querySelectorAll('body *')].find((e) => e.childElementCount === 0 && /exit without saving/i.test(e.textContent) && e.getBoundingClientRect().width > 0); let box = t; while (box && ![...box.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Exit')) box = box.parentElement; return box ? [...box.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Exit') : null; })()`;
const TOP_EXIT = `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Exit' && b.getBoundingClientRect().width > 0)`;
export async function leaveChecked(S) {
  await pressOnTop(S, TOP_EXIT, 1500);
  const asked = evalJs(S, `(() => JSON.stringify(!!${DIALOG_EXIT}))()`) === true;
  if (asked) await pressOnTop(S, DIALOG_EXIT, 3000);
  return asked;
}
