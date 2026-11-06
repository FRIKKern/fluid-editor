// Replays a stored text finding's steps in our editor with real keys and real presses, at the
// capture's own pauses: undo steps go by time. Each `read` and `undoWalk` is compared with the oracle's.
import { browser, cdp, evalJs, goto, pause } from './cmux.mjs';
import { BASE } from './base.mjs';

const TRAILING = / class="is-empty( is-editor-empty)?"| data-placeholder="[^"]*"| class="ProseMirror-trailingBreak"| data-rte-preserve-empty="true"| ?style="white-space: ?pre-wrap;?"/g;
export const textNorm = (h) => (h == null ? h : h.replace(TRAILING, '').replace(/ data-text-attribute-id="[^"]*"/g, ' data-text-attribute-id="id"').replace(/<(p|h[1-4]|li) +>/g, '<$1>').replace(/<br *\/?>(?=<\/(p|h[1-4])>)/g, (m, tag, at, all) => (all.slice(0, at).endsWith(`<${tag}>`) ? '' : m)).replace(/<(https?)>/g, '$1://'));

export async function replay(S, finding, add) {
  let id = null;
  const sid = () => evalJs(S, `JSON.stringify(fe.model.sections[1].id)`);
  const fresh = async () => {
    goto(S, `${BASE}/index.html`); await pause(1200);
    evalJs(S, `(async () => { const next = JSON.parse(JSON.stringify(fe.model)); next.sections[1].blocks = []; next.sections[1].rows = { desktop: 40, mobile: 40 }; fe.load(next); await new Promise((r) => setTimeout(r, 300)); return 1; })()`);
  };
  const ceOf = `document.getElementById('site-frame').contentDocument.querySelector('.fe-block[data-block-id="' + ${JSON.stringify('__ID__')} + '"] .sqs-html-content')`;
  const q = (what) => evalJs(S, `(() => { const ce = ${ceOf.replace('__ID__', id)}; return JSON.stringify(ce ? ce.${what} : null); })()`);
  const undoHere = async (name, r) => {
    const walk = [q('textContent')], html = [q('innerHTML')];
    for (let n = 0; n < 12 && evalJs(S, `JSON.stringify(!document.getElementById('undo').disabled)`); n++) { browser(S, 'click', '#undo'); await pause(300); walk.push(q('textContent')); html.push(q('innerHTML')); }
    r.undo.forEach((u, k) => {
      if (u[1] === null) return;
      const ok = (walk[k] ?? '').replace(/\s+/g, ' ').trim().slice(-60) === u[1] && (u[2] === undefined || textNorm(html[k]) === textNorm(u[2]));
      add(`${name} ${u[0]}`, ok, `oracle ${u[2] ? textNorm(u[2]) : u[1]}, ours ${u[2] ? textNorm(html[k]) : walk[k]}`);
    });
  };
  await fresh();
  // Undo steps go by time: the capture's pauses are kept only where undo is walked.
  const untilNextEnter = (k) => { const n = finding.steps.findIndex((x, j) => j > k && x[0] === 'enter'); return finding.steps.slice(k, n < 0 ? undefined : n); };
  let wait = pause;
  for (const [k, [op, ...a]] of finding.steps.entries()) {
    if (op === 'enter') { await fresh(); wait = untilNextEnter(k).some((x) => x[0] === 'undoWalk') ? pause : (ms) => pause(Math.min(ms, 120)); }
    else if (op === 'add') { const s = sid(); evalJs(S, `(() => { fe.addBlock(${JSON.stringify(s)}, 'Text'); return 1; })()`); id = evalJs(S, `JSON.stringify(fe.model.sections[1].blocks.at(-1).id)`); await pause(100); }
    else if (op === 'click' && a[0] === 'Write') { const s = sid(); evalJs(S, `(() => { fe.edit(${JSON.stringify(s)}, ${JSON.stringify(id)}); const ce = ${ceOf.replace('__ID__', id)}; ce.focus(); return 1; })()`); await pause(150); }
    else if (op === 'clickIf' && !evalJs(S, `!!document.querySelector('#text-bar [aria-label="${a[0]}"], #text-bar [data-ctab="${a[0]}"]')`)) continue;
    else if (op === 'click' || op === 'clickIf') { browser(S, 'click', `#text-bar [aria-label="${a[0]}"], #text-bar [data-ctab="${a[0]}"]`); await wait(1200); }
    else if (op === 'fill') { browser(S, 'fill', `#text-bar input[aria-label="${a[0]}"]`, a[1]); await wait(1200); }
    else if (op === 'press') { browser(S, 'press', a[0]); await wait(500); }
    else if (op === 'keys') { for (const c of a[0]) browser(S, 'press', c === ' ' ? 'Space' : c); await wait(300); }
    else if (op === 'keysList') { cdp(S, { op: 'presses', keys: a[0] }); await wait(300); }
    else if (op === 'pause') await wait(a[0]);
    else if (op === 'read') { const want = finding.reads[a[0]]?.html; if (want === undefined) continue; const got = q('innerHTML'); add(a[0], textNorm(got) === textNorm(want), `oracle ${textNorm(want)}, ours ${textNorm(got)}`); }
    else if (op === 'undoWalk') await undoHere(a[0], finding.reads[a[0]] || { undo: [] });
  }
}
