// A real copy, cut or paste reaches the system clipboard, which on this Mac is the owner's. So scripts/lib/cdp-run.mjs
// never sends Chrome's own copy, cut or paste command. It refuses a copy, cut or paste key unless the stub's marker,
// __fxClip, is an object in the top window and in the editor's frame, read right before the key goes. Then it sends the
// key event alone and a ClipboardEvent whose clipboardData is a DataTransfer the stub holds (the frame's __fxDt, the one
// oracle-capture's synthClip uses). scripts/check-clip-guard.mjs tests this.
export const isClipKey = (combo) => /^(Meta|Control)\+(Shift\+)?[cxv]$/i.test(combo);

// The keys Chrome on a Mac turns into copy, cut and paste. The others isClipKey stops do nothing there.
export const CLIP_EVENTS = { 'Meta+c': 'copy', 'Meta+x': 'cut', 'Meta+v': 'paste' };

const FRAME = `document.querySelector('#sqs-site-frame, #site-frame')`;

// Runs in the top window. A frame it can't read counts as no marker.
export const STUBBED_JS = `(() => { const has = (w) => { try { return !!w && typeof w.__fxClip === 'object' && w.__fxClip !== null; } catch { return false; } }; const f = ${FRAME}; return has(window) && !!f && has(f.contentWindow); })()`;

// The stub: navigator.clipboard and execCommand copy, cut and paste write to and read from __fxClip, in the top window
// and the frame. Runs in the top window.
export const STUB_JS = `(() => { const stub = (w) => { w.__fxClip = { log: [], data: null, texts: [] }; const c = w.__fxClip; const nav = { writeText: async (t) => { c.log.push('writeText'); c.texts.push(['writeText', String(t)]); c.data = t; }, readText: async () => { c.log.push('readText'); const t = typeof c.data === 'string' ? c.data : ''; c.texts.push(['readText', t]); return t; }, write: async (items) => { c.log.push('write'); c.data = items; }, read: async () => { c.log.push('read'); return Array.isArray(c.data) ? c.data : []; } }; Object.defineProperty(w.navigator, 'clipboard', { value: nav, configurable: true }); const ex = w.document.execCommand.bind(w.document); w.document.execCommand = (cmd, ...rest) => { if (/^(copy|cut|paste)$/i.test(cmd)) { c.log.push('exec:' + cmd); return false; } return ex(cmd, ...rest); }; }; stub(window); stub(${FRAME}.contentWindow); return true; })()`;

// The window and document that have focus: down through frames from the top.
const DEEP = `() => { let w = window, d = document; for (;;) { const a = d.activeElement; if (!a || a.tagName !== 'IFRAME') break; try { if (!a.contentWindow.document) break; w = a.contentWindow; d = w.document; } catch { break; } } return { w, d }; }`;

// Before the key: note whether the page takes the keydown. A taken keydown stops Chrome's command, so no event follows.
export const ARM_JS = `(() => { const c = window.__fxClip, { w } = (${DEEP})(); c.kd = null; const on = (e) => { c.kd = e.defaultPrevented; }; w.addEventListener('keydown', on, { once: true }); c.kdOff = () => w.removeEventListener('keydown', on); return true; })()`;

// After the keydown: the event Chrome would fire, to the focused element. If the page doesn't take it, what Chrome
// would do next, kept in the page: copy and cut put the selected text in the DataTransfer, cut then deletes it from an
// editable field, paste inserts the DataTransfer's text. Text only: no text/html. Logged in the top window's __fxClip.
export const fireJs = (type) => `(() => { const c = window.__fxClip; if (c.kdOff) c.kdOff(); c.kdOff = null; if (c.kd === true) { c.log.push('key:${type}:keydown taken'); return true; }
  const { w, d } = (${DEEP})(), host = ${FRAME}.contentWindow; host.__fxDt = host.__fxDt || new host.DataTransfer(); const dt = host.__fxDt;
  const el = d.activeElement && d.activeElement !== d.body ? d.activeElement : null;
  const taken = !(el || d).dispatchEvent(new w.ClipboardEvent('${type}', { bubbles: true, cancelable: true, composed: true, clipboardData: dt }));
  let did = '';
  if (!taken) {
    const field = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'), editable = field ? !el.readOnly && !el.disabled : !!el && el.isContentEditable;
    if ('${type}' !== 'paste') { const text = field ? el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0) : String(w.getSelection()); if (text) { dt.clearData(); dt.setData('text/plain', text); did = ':set'; if ('${type}' === 'cut' && editable) { d.execCommand('delete'); did += ',deleted'; } } }
    else if (editable) { const text = dt.getData('text/plain'); if (text) { d.execCommand('insertText', false, text); did = ':inserted'; } }
  }
  c.log.push('key:${type}:' + (taken ? 'taken' : 'not taken') + did + ':' + [...dt.types].join(',')); return true; })()`;

export const refusal = (combo) => `refused ${combo}: a real copy, cut or paste reaches the system clipboard, which is the owner's. Stub it first (stubClipboard), so window.__fxClip is in the top window and the editor frame.`;
