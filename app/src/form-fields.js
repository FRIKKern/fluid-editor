// A form's fields (parity/findings/FORMFIELDS.json): what each kind draws on the page, and the
// Edit Form Fields views. A label ending in (required) is a required field, as in FORMADD.json.
import { escapeHtml as e } from './render.js';

const REQ = '(required)';
export const isRequired = (l = '') => l.endsWith(REQ);
export const plainLabel = (l = '') => (isRequired(l) ? l.slice(0, -REQ.length) : l);
const withReq = (l, on) => plainLabel(l) + (on ? REQ : '');
const req = (t = '') => (isRequired(t) ? `${e(plainLabel(t))}<span class="req">${REQ}</span>` : e(t));

// Tile, kind, new field. New fields are not required. A new Checkbox or Radio has its options
// further apart than the imported Contact form's (drawn; T9.json): loose.
const opts = () => ['Option 1', 'Option 2'];
export const FIELD_TILES = [
  ['Name', 'name', () => ({ label: 'Name', parts: ['First Name', 'Last Name'] })],
  ['Text', 'text', () => ({ label: 'Text' })],
  ['Email', 'email', () => ({ label: 'Email' })],
  ['Phone', 'phone', () => ({ label: 'Phone' })],
  ['Text Area', 'textarea', () => ({ label: 'Text Area' })],
  ['Dropdown', 'select', () => ({ label: 'Dropdown', placeholder: 'Select an option', options: opts() })],
  ['Checkbox', 'checkbox', () => ({ label: 'Checkbox', options: opts(), loose: true })],
  ['Radio', 'radio', () => ({ label: 'Radio', options: opts(), loose: true })],
  ['Survey', 'survey', () => ({ label: 'Survey', options: opts() })],
  ['Address', 'address', () => ({ label: 'Address' })],
  ['Line', 'line', () => ({ label: 'Line', underline: true })],
  ['Website', 'website', () => ({ label: 'Website' })],
  ['Date', 'date', () => ({ label: 'Date' })],
  ['Number', 'number', () => ({ label: 'Number' })],
  ['Time', 'time', () => ({ label: 'Time' })],
  ['Currency', 'currency', () => ({ label: 'Currency', symbol: '$' })],
  ['Hidden', 'hidden', () => ({ label: 'Hidden' })],
  ['X', 'x', () => ({ label: 'X Username' })],
  ['File Upload', 'file', () => ({ label: 'File Upload', maxFiles: 1 })],
];
const tileOf = (f) => FIELD_TILES.find((t) => t[1] === (f.kind || 'text')) || FIELD_TILES[1];
export const newField = (name) => { const t = FIELD_TILES.find((x) => x[0] === name); return { kind: t[1], ...t[2]() }; };

// The browser's own region names: the oracle's list has 245 countries, with the site's country chosen.
const NOT_A_COUNTRY = new Set(['AC', 'CP', 'DG', 'EA', 'EU', 'EZ', 'IC', 'QO', 'TA', 'UN', 'XA', 'XB', 'ZZ']);
let countries;
function countryOptions() {
  if (!countries) {
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' }), list = new Set();
    for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b), name = NOT_A_COUNTRY.has(code) ? null : names.of(code);
      if (name) list.add(name);
    }
    countries = [...list].sort((x, y) => x.localeCompare(y, 'en')).map((n) => `<option${n === 'Norway' ? ' selected' : ''}>${e(n)}</option>`).join('');
  }
  return countries;
}

const CHEVRON = '<svg class="form-chevron" viewBox="0 0 18 12" width="18" height="12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 3l7 7 7-7"/></svg>';
const PICK_ICONS = {
  date: '<rect x="1.5" y="2.5" width="13" height="12"/><path d="M1.5 6h13M5 1v3M11 1v3"/>',
  time: '<circle cx="8" cy="8" r="6.5"/><path d="M8 4v4.5l3 1.5"/>',
};
const UPLOAD = '<svg viewBox="0 0 22 22" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M11 17V6M6.5 10.5L11 6l4.5 4.5M4 3h14"/></svg>';
const LIKERT = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
const desc = (f, tag = 'p') => (f.description ? `<${tag} class="description">${e(f.description)}</${tag}>` : '');
const ph = (f) => (f.placeholder ? ` placeholder="${e(f.placeholder)}"` : '');
const caption = (t, cls = '') => `<label class="caption"><span class="caption-row${cls}">${req(t)}</span></label>`;

// Follow-up questions (FORMFIELDS.json, followUp). Kept per option in f.follow, next to f.options.
export const followOf = (f, i) => f.follow?.[i] || [];
export function addFollow(f, i, tile) {
  f.follow ||= [];
  (f.follow[i] ||= []).push(newField(tile));
  return f.follow[i].length - 1;
}
const tidyFollow = (f) => { if (f.follow && !f.follow.some((l) => l?.length)) delete f.follow; };
export function deleteFollow(f, i, k) { f.follow[i].splice(k, 1); tidyFollow(f); }
export function deleteOption(f, i) {
  f.options.splice(i, 1);
  f.follow?.splice(i, 1);
  tidyFollow(f);
}
export function moveOption(f, from, to) {
  const [o] = f.options.splice(from, 1);
  f.options.splice(to, 0, o);
  if (f.follow) { f.follow.length = Math.max(f.follow.length, f.options.length); const [l] = f.follow.splice(from, 1); f.follow.splice(to, 0, l); }
}
// They draw under the field, in option order, only for what a visitor picked. While editing none draws.
const followJs = (skip) => `if(document.querySelector('.fluid-engine.is-editing')&&!document.body.classList.contains('is-preview'))return;if(event.target.closest('.followup-question-container'))return;var t=this.firstElementChild,s=t.querySelector('select'),a=t.querySelectorAll('input'),q=t.querySelectorAll('fieldset.item');this.querySelectorAll(':scope > .followup-question-container').forEach(function(x){var i=+x.dataset.fu;x.hidden=!(q.length?q[i].querySelector('input:checked'):s?s.selectedIndex-${skip}===i:a[i].checked)})`;
let radioGroup = 0; // a name per group, so a press on one radio lets go of the other
export function formFieldHtml(f, ctl) {
  const html = oneFieldHtml(f, ctl);
  if (!f.follow?.some((l) => l?.length)) return html;
  const after = f.follow.flatMap((l, i) => (l || []).map((x) => `<div class="followup-question-container" data-fu="${i}" hidden>${oneFieldHtml(x, (h) => h)}</div>`)).join('');
  return `<div class="form-followed" onchange="${followJs(f.placeholder != null ? 1 : 0)}">${html}${after}</div>`;
}
// One field on the page. ctl wraps the form's first control for First Input Highlight.
function oneFieldHtml(f, ctl) {
  const title = `<label class="title">${req(f.label)}</label>${desc(f)}`;
  const legend = `<legend>${req(f.label)}</legend>${desc(f)}`;
  const affix = (sign, wide = false) => ctl(`<span class="form-affix${wide ? '' : ' form-affix--short'}"><span class="form-input-prefix">${e(sign)}</span><input type="text"${ph(f)}></span>`);
  const pick = (type) => ctl(`<span class="form-pick"><input type="${type}"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" aria-hidden="true">${PICK_ICONS[type]}</svg></span>`);
  switch (f.kind) {
    case 'name': {
      const parts = (f.parts || []).filter((_, i) => !f.hide?.[i]);
      return `<fieldset class="form-item form-name">${legend}<div class="name-parts">${parts.map((p) => `<div class="field">${caption(p)}${ctl('<input type="text">')}</div>`).join('')}</div></fieldset>`;
    }
    case 'textarea': return `<div class="form-item">${title}${ctl(`<textarea${ph(f)}></textarea>`)}</div>`;
    case 'checkbox':
    case 'radio': { const group = `form-radio-${++radioGroup}`; return `<fieldset class="form-item form-checkbox${f.kind === 'radio' ? ' form-radio' : ''}${f.loose ? ' form-checkbox--loose' : ''}">${legend}${(f.options || []).map((o) => `<div class="option"><label><input type="${f.kind}"${f.kind === 'radio' ? ` name="${group}"` : ''}><span>${e(o)}</span></label></div>`).join('')}</fieldset>`; }
    case 'select': return `<div class="form-item form-select">${title}${ctl(`<span class="form-select-box"><select${f.placeholder != null ? ' class="is-empty"' : ''}>${f.placeholder != null ? `<option>${e(f.placeholder)}</option>` : ''}${(f.options || []).map((o) => `<option>${e(o)}</option>`).join('')}</select>${CHEVRON}</span>`)}</div>`;
    case 'survey': return `<div class="form-item form-survey">${title}${(f.options || []).map((o) => { const group = `form-radio-${++radioGroup}`; return `<fieldset class="item"><legend class="question">${e(o)}</legend><div class="likert-options">${LIKERT.map((l) => `<div class="option"><label><input type="radio" name="${group}"><span>${l}</span></label></div>`).join('')}</div></fieldset>`; }).join('')}</div>`;
    case 'phone': return `<fieldset class="form-item form-phone">${legend}<div class="phone-parts">${f.countryCode ? `<div class="field field-country">${caption('Country')}${ctl(`<span class="form-select-box"><select>${countryOptions()}</select>${CHEVRON}</span>`)}</div><div class="field">${caption('Number')}${ctl('<span class="form-affix"><span class="form-input-prefix">+47</span><input type="text"></span>')}</div>` : `<div class="field">${ctl('<input type="text">')}</div>`}</div></fieldset>`;
    case 'address': return `<fieldset class="form-item form-address">${legend}<div class="field">${caption('Country', ' caption-row--lead')}${ctl(`<span class="form-select-box"><select>${countryOptions()}</select>${CHEVRON}</span>`)}</div><div class="field">${caption(`Address Line 1${REQ}`)}<input type="text"></div><div class="field">${caption('Address Line 2')}<input type="text"></div><div class="address-row"><div class="field">${caption(`Postal Code${REQ}`)}<input type="text"></div><div class="field">${caption(`City / Town${REQ}`)}<input type="text"></div></div></fieldset>`;
    case 'line': return `<div class="form-item form-line${f.underline ? ' underline' : ''}"><div class="title">${req(f.label)}</div>${desc(f, 'div')}</div>`;
    case 'website': return `<div class="form-item">${title}${affix('http://', true)}</div>`;
    case 'currency': return `<div class="form-item">${title}${affix(f.symbol ?? '$')}</div>`;
    case 'x': return `<div class="form-item">${title}${affix('@')}</div>`;
    case 'date': return `<div class="form-item">${title}${pick('date')}</div>`;
    case 'time': return `<div class="form-item form-time">${title}${pick('time')}<p class="caption-text">in Central European Time</p></div>`;
    case 'file': return `<div class="form-item">${title}<div class="file-upload"><label><input type="file"><span class="file-upload-in"><span class="file-upload-ic">${UPLOAD}</span><span>Add a File</span></span></label></div></div>`;
    case 'hidden': return '';
    default: return `<div class="form-item">${title}${ctl(`<input type="${f.kind === 'email' ? 'email' : 'text'}"${ph(f)}>`)}${f.signup ? `<div class="form-signup"><label><input type="checkbox"><span>${e(f.signup)}</span></label></div>` : ''}</div>`;
  }
}

// After a submit (FORMFIELDS.json, postSubmit). The editor shows it while its view is open; a real
// submit shows the same, which is inferred: a submit writes to form storage (0005).
export const postOf = (b) => ({ redirect: false, message: 'Thank you!', align: 'left', position: 'top', html: '', href: '', ...b.post });
// The message is the box's rich text. One from before that, or from a file, is plain lines.
export const messageHtml = (m) => (!m ? '' : /^\s*<(p|h[1-4]|pre)[\s>]/i.test(m) ? m : m.split('\n').map((l) => `<p>${e(l)}</p>`).join(''));
export function formPostHtml(b) {
  const p = postOf(b);
  return `<div class="form-post form-post--${p.position}"><div class="form-submission-text form-submission-text--align-${p.align}">${messageHtml(p.message)}</div>${p.html ? `<div class="form-submission-html">${p.html}</div>` : ''}</div>`;
}
// In a frame, as our editor's Preview is, a redirect stays put and shows the message.
export function formSubmitJs(b) {
  const p = postOf(b);
  return `var w=this.parentNode;${p.redirect && p.href ? `if(top===self){${p.newTab ? `window.open(${JSON.stringify(p.href)},'_blank')` : `location.href=${JSON.stringify(p.href)}`};return false}` : ''}w.classList.add('is-submitted');return false`;
}

// A form's Lightbox (FORMFIELDS.json, lightbox). The button and its rows are read. What the button
// opens is ours: the oracle opens it only after a Save, so it is not read (decision 0005).
const inkOn = (css) => {
  const hex = css.match(/^#([0-9a-f]{6})/i)?.[1];
  const [r, g, b] = hex ? [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) : (css.match(/\d+(\.\d+)?/g) || [255, 255, 255]).map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b > 140 ? '#000' : '#fff';
};
const LB_OPEN = "if(document.querySelector('.fluid-engine.is-editing')&&!document.body.classList.contains('is-preview'))return;var n=this.parentNode.nextElementSibling.cloneNode(true);n.classList.add('is-open');document.body.append(n)";
const LB_CLOSE = "this.closest('.form-lightbox').remove()";
// Lightbox, its Button Text and Background Color, Button Alignment and Button Style are per view: the
// phone follows desktop on each one until the phone changes that one, and then keeps it (FORMFIELDS.json,
// phone). The form's own Button Text is one value for both views.
export const formView = (b, view = 'desktop') => {
  const o = view === 'mobile' ? b.formMobile || {} : {};
  const own = (k) => (k in o ? o[k] : b[k]);
  return { lightbox: !!own('lightbox'), lightboxText: own('lightboxText') || '', buttonAlign: own('buttonAlign') || 'left', buttonStyle: own('buttonStyle') || 'primary', lightboxBg: own('lightboxBg') || 'rgb(255, 255, 255)' };
};
// The default is left out on desktop. On the phone it stays, because it differs from following desktop.
export function setFormView(b, view, key, v) {
  if (view === 'mobile') (b.formMobile ||= {})[key] = v;
  else if (v) b[key] = v;
  else delete b[key];
}
export const phoneStyle = (b) => { const d = formView(b).buttonStyle, m = formView(b, 'mobile').buttonStyle; return m === d ? '' : ` sqs-button-element--phone-${m}`; };
export const phoneAlign = (kind, b) => { const d = formView(b).buttonAlign, m = formView(b, 'mobile').buttonAlign; return m === d ? '' : ` ${kind}--phone-${m}`; };
export function formLightboxHtml(b, form) {
  const d = formView(b), m = formView(b, 'mobile'), bg = d.lightboxBg;
  const phoneBg = m.lightboxBg === bg ? '' : `;--lb-bg-phone:${e(m.lightboxBg)};--lb-ink-phone:${inkOn(m.lightboxBg)}`;
  const word = d.lightboxText === m.lightboxText ? e(d.lightboxText || 'Open Form') : `<span class="lb-word--desktop">${e(d.lightboxText || 'Open Form')}</span><span class="lb-word--phone">${e(m.lightboxText || 'Open Form')}</span>`;
  return `<div class="lightbox-handle-wrapper lightbox-handle-wrapper--align-${d.buttonAlign}${phoneAlign('lightbox-handle-wrapper', b)}"><button type="button" class="lightbox-handle sqs-button-element--${d.buttonStyle}${phoneStyle(b)}" onclick="${LB_OPEN}">${word}</button></div>`
    + `<div class="form-lightbox"><div class="form-lightbox-shade" onclick="${LB_CLOSE}"></div><div class="form-lightbox-box${phoneBg ? ' form-lightbox-box--phone' : ''}" style="--lb-bg:${e(bg)};--lb-ink:${inkOn(bg)}${phoneBg}"><button type="button" class="form-lightbox-close" aria-label="Close" onclick="${LB_CLOSE}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>${form}</div></div>`;
}

// The panel's views.
const ic = (d, s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${d}</svg>`;
const ICONS = {
  name: '<rect x="3" y="5" width="18" height="14"/><circle cx="12" cy="10.5" r="2.2" fill="currentColor"/><path d="M7.5 19c.5-3 2.3-4.5 4.5-4.5s4 1.5 4.5 4.5" fill="currentColor"/>',
  text: '<path d="M5 6h14M12 6v13"/>',
  email: '<rect x="3" y="5" width="18" height="14"/><path d="M3 6l9 7 9-7"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10.5 18.5h3"/>',
  textarea: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M8.5 9h7M12 9v7"/>',
  select: '<rect x="2" y="7" width="20" height="10"/><path d="M12 10.5h6l-3 3z" fill="currentColor"/>',
  checkbox: '<rect x="3.5" y="3.5" width="17" height="17"/><path d="M8 12l3 3 5-6"/>',
  radio: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
  survey: '<circle cx="4.5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="3"/><circle cx="19.5" cy="12" r="2" fill="currentColor"/><path d="M6.5 12h2.5M15 12h2.5"/>',
  address: '<path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2"/>',
  line: '<path d="M2 12h20"/>',
  website: '<rect x="3.5" y="4.5" width="17" height="15"/><path d="M3.5 9h17M6.5 13h4v3h-4zM13 13h4"/>',
  date: '<rect x="3.5" y="4.5" width="17" height="15"/><path d="M3.5 9h17M14 13h4v3h-4z"/>',
  number: '<path d="M9.5 3.5L7.5 20.5M16.5 3.5l-2 17M4 9h17M3 15h17"/>',
  time: '<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5V12l4 2"/>',
  currency: '<rect x="2" y="6" width="20" height="12"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M5 9v6M19 9v6"/>',
  hidden: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/><path d="M4 20L20 4"/>',
  x: '<path d="M4 4l16 16M20 4L4 20" /><path d="M4 4h4l12 16h-4z"/>',
  file: '<path d="M12 21V8M7 13l5-5 5 5M4 4h16"/>',
};
const BACK = '<path d="M15 6l-6 6 6 6"/>', ARROW = '<path d="M9 6l6 6-6 6"/>';
const TRASH = '<path d="M5 7h14M9 7V4.5h6V7M6.5 7v13h11V7M10 10.5v6M14 10.5v6"/>';
const GRIP = '<span class="bp-acc-grip bp-ff-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
const OGRIP = GRIP.replace('bp-ff-grip', 'bp-ffo-grip');
const DOTS = '<circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/>';
const nameOf = (f) => plainLabel(f.label) || tileOf(f)[0];
const head = (title) => `<div class="bp-ishape-head" data-drag-panel><button type="button" class="bp-back bp-fx-back" data-ff="back">${ic(BACK)}Back</button><span class="bp-ff-title">${e(title)}</span></div>`;

function listHtml(fields) {
  const rows = fields.map((f, n) => {
    const name = e(nameOf(f));
    return `<div class="bp-ff-row" data-ff="edit:${n}">${GRIP}<span class="bp-ff-ic">${ic(ICONS[tileOf(f)[1]])}</span><span class="bp-ff-name">${name}</span><button type="button" class="bp-ff-del" aria-label="Delete ${name}" data-ff="delete:${n}">${ic(TRASH)}</button><button type="button" class="bp-ff-go" aria-label="Navigate to ${name}">${ic(ARROW, 16)}</button></div>`;
  }).join('');
  return `${head('Edit Form Fields')}<div class="bp-ff bp-ff-list">${rows}<button type="button" class="bp-soc-add bp-ff-add" data-ff="add">Add Field</button></div>`;
}
const addHtml = (title = 'Add Field', act = 'tile') => `${head(title)}<div class="bp-ff bp-ff-tiles${act === 'fu-tile' ? ' is-follow' : ''}">${FIELD_TILES.map(([t, k]) => `<button type="button" class="bp-ff-tile" data-ff="${act}:${t}">${ic(ICONS[k])}<span>${act === 'fu-tile' && t === 'X' ? 'X Username' : t}</span></button>`).join('')}</div>`;

const swi = (set, on, label, off = false) => `<div class="sp-row bp-ff-sw${off ? ' is-off' : ''}"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" data-ff-set="${set}"${on ? ' checked' : ''}${off ? ' disabled' : ''}><span aria-hidden="true"></span></label></div>`;
const cap = (t) => `<div class="bp-soccap bp-ff-cap">${t}</div>`;
const line = (t, key, hint, v) => `${cap(t)}<input class="bp-socf" type="text" aria-label="${t}" data-ff-field="${key}" placeholder="${e(hint)}" value="${e(v ?? '')}">`;
const FILE_TYPES = ['Image (.png, .jpg, .tiff, .heic)', 'Document (.docx, .doc, .pdf, .txt)', 'Presentation (.pptx, .pdf)', 'Video (.mp4, .avi, .avchd, .flv)', 'Audio (.mp3, .wav, .aac, .mp4, .alac)'];
const required = (f) => swi('required', isRequired(f.label), 'Required');
const actions = (n) => `<div class="bp-ff-acts"><button type="button" class="bp-soc-add" data-ff="dup:${n}">Duplicate</button><button type="button" class="bp-soc-add bp-ff-red" data-ff="del:${n}">Delete</button></div>`;

// A field's option rows. An option with follow-ups is a row to open; a follow-up's own options have no follow-ups.
const optionRows = (f, n, inFollow = false) => (f.options || []).map((o, i) => {
  const many = followOf(f, i).length;
  if (many && !inFollow) return `<div class="bp-ffo-row is-follow" data-ff="opt:${n}:${i}">${OGRIP}<span class="bp-ffo-name"><span>${e(o)}</span><small>${many} follow-up${many > 1 ? 's' : ''}</small></span>${ic(ARROW, 22)}</div>`;
  return `<div class="bp-ffo-row">${OGRIP}<input type="text" placeholder="Option ${i + 1}" data-ff-opt="${i}" value="${e(o)}"><button type="button" class="bp-ffo-menu" aria-label="Open Menu" data-ff-menu="${n}:${i}">${ic(DOTS)}</button></div>`;
}).join('');
const fuLine = (t, key, hint, v) => `<div class="bp-fu-cap">${t}</div><span class="bp-fu-box"><input type="text" aria-label="${t}" data-ff-field="${key}" placeholder="${e(hint)}" value="${e(v ?? '')}"></span>`;
const fuSub = (t) => `<div class="bp-fu-sub">${t}</div>`;
// A follow-up's editor (followUp.editors): its own look and fewer rows than a field's.
function followHtml(f, n, i, k) {
  const kind = f.kind || 'text';
  const top = fuLine('Label', 'label', '', plainLabel(f.label));
  const description = fuLine('Description', 'description', 'Add description', f.description);
  const placeholder = fuLine('Placeholder', 'placeholder', 'Add placeholder', f.placeholder);
  let rows;
  if (kind === 'hidden') {
    rows = `<div class="bp-ff-note bp-fu-hidden">Hidden fields can be used to track which URL your form traffic originates from. <span class="bp-ff-u" data-unbuilt title="Not built yet">Learn More.</span></div>${top}<div class="bp-fu-cap">Variable</div><span class="bp-fu-box bp-fu-var">SQF_${e(plainLabel(f.label).toUpperCase().replace(/\W+/g, '_'))}</span><div class="bp-ff-note bp-fu-tofill">To fill in this field, include the variable from the box above in the query string for this page.</div>${fuLine('Value', 'value', 'Default value', f.value)}`;
  } else {
    let more;
    if (kind === 'name') {
      const one = (x, t) => `${fuSub(t)}${swi(`show:${x}`, !f.hide?.[x], 'Show', !!f.hide?.[1 - x])}${!f.hide?.[x] ? swi(`require:${x}`, isRequired(f.parts?.[x]), 'Require') : ''}`;
      more = `${one(0, 'First Name')}${one(1, 'Last Name')}<div class="bp-ff-note bp-fu-atleast">At least one name field must be showing.</div>`;
    } else if (kind === 'phone') more = `${swi('countryCode', !!f.countryCode, 'Country dropdown')}${required(f)}`;
    else if (kind === 'line') more = swi('underline', !!f.underline, 'Underline');
    else if (kind === 'currency') more = `${fuLine('Currency symbol', 'symbol', '$', f.symbol)}${required(f)}`;
    else if (kind === 'file') {
      const allow = !!f.fileTypes, max = f.maxFiles || 1;
      more = `${required(f)}${swi('fileTypes', allow, 'Allow only specific file types')}${allow ? `<div class="bp-ff-types">${FILE_TYPES.map((t, x) => `<label class="sp-row"><span class="sp-label">${t}</span><input type="checkbox" aria-label="${t}" data-ff-set="fileType:${x}"${f.fileTypes[x] ? ' checked' : ''}></label>`).join('')}</div>` : ''}<div class="sp-row bp-ff-max"><span class="sp-label">Max number of files</span><input type="text" readonly aria-label="Max number of files" value="${max}"><button type="button" aria-label="decrement" data-ff="max:-1"${max <= 1 ? ' disabled' : ''}>${ic('<path d="M5 12h14"/>')}</button><button type="button" aria-label="increment" data-ff="max:1">${ic('<path d="M5 12h14M12 5v14"/>')}</button></div>`;
    } else if (kind === 'select' || kind === 'checkbox' || kind === 'radio' || kind === 'survey') {
      more = `${required(f)}${cap('Options').replace('bp-ff-cap', 'bp-ff-cap bp-ff-cap-opt')}${optionRows(f, n, true)}<button type="button" class="bp-soc-add bp-ffo-add" data-ff="opt-add">Add option</button>`;
    } else if (kind === 'address' || kind === 'date' || kind === 'time' || kind === 'x') more = required(f);
    else more = `${placeholder}${required(f)}`;
    rows = `${top}${description}${more}`;
  }
  return `<div class="bp-ff-note bp-fu-note">Follows-ups appear when visitors select one of your form field options.</div>${rows}<button type="button" class="bp-fu-act bp-ff-red" data-ff="fu-del:${n}:${i}:${k}">Delete Field</button>`;
}
function optionHtml(f, n, i) {
  const list = followOf(f, i);
  return `<div class="bp-fu-cap">Option</div><span class="bp-fu-box"><input type="text" aria-label="Option" data-ff-opt="${i}" value="${e(f.options[i])}"></span>${fuSub(list.length > 1 ? 'Follow-ups' : 'Follow-up')}${list.map((x, k) => `<button type="button" class="bp-fu-row" data-ff="fu:${n}:${i}:${k}"><span class="bp-fu-ic">${ic(ICONS[tileOf(x)[1]], 22)}</span><span class="bp-fu-name">${e(nameOf(x))}</span>${ic(ARROW, 22)}</button>`).join('')}<button type="button" class="bp-fu-act bp-fu-add" data-ff="fu-add:${n}:${i}">Add follow-up</button><button type="button" class="bp-fu-act bp-fu-del bp-ff-red" data-ff="opt-del:${n}:${i}">Delete Option</button>`;
}
function editorHtml(f, n) {
  const k = f.kind || 'text', tile = tileOf(f)[0];
  const top = line('Label', 'label', tile === 'X' ? 'X' : tile, plainLabel(f.label));
  const description = `${cap('Description')}<textarea class="bp-socf bp-ff-area" rows="1" aria-label="Description" data-ff-field="description" placeholder="Add description">${e(f.description || '')}</textarea>`;
  const placeholder = line('Placeholder', 'placeholder', 'Add placeholder text', f.placeholder);
  let rows;
  if (k === 'name') {
    const one = (i, t) => {
      const shown = !f.hide?.[i], otherOff = !!f.hide?.[1 - i];
      return `${cap(t)}${swi(`show:${i}`, shown, 'Show', otherOff)}${shown ? swi(`require:${i}`, isRequired(f.parts?.[i]), 'Require') : ''}`;
    };
    rows = one(0, 'First Name') + one(1, 'Last Name') + '<div class="bp-ff-note bp-ff-note-tight">At least one name field must be showing.</div>';
  } else if (k === 'hidden') {
    return `<div class="bp-ff-note bp-ff-intro">Hidden fields can be used to track which URL your form traffic originates from. <span class="bp-ff-u" data-unbuilt title="Not built yet">Learn More.</span></div>${line('Label', 'label', '', plainLabel(f.label))}${cap('Variable')}<div class="bp-ff-var">SQF_${e(plainLabel(f.label).toUpperCase().replace(/\W+/g, '_'))}</div><div class="bp-ff-note">To fill in this field, include the variable from the box above in the query string for this page.</div>${line('Value', 'value', 'Default Value', f.value)}<div class="bp-ff-note">If no value is passed through the query string, the default value above will be used.</div><button type="button" class="bp-soc-add bp-ff-red bp-ff-field-del" data-ff="del:${n}">Delete Field</button>${actions(n)}`;
  } else if (k === 'phone') {
    rows = `${swi('countryCode', !!f.countryCode, 'Show Country Code')}${swi('sms', false, 'SMS Marketing Opt-in', true).replace('bp-ff-sw', 'bp-ff-sw bp-ff-sms')}<div class="bp-ff-note bp-ff-note-sms">Allow people to sign up for SMS marketing through this form. <span class="bp-ff-u">SMS Subscribers</span> are automatically stored in Contacts.</div><div class="bp-ff-plan"><strong>SMS subscription required</strong><p>Select a plan to set up SMS marketing and start collecting opt-ins through this form.</p><button type="button" disabled data-unbuilt title="Not built yet">View plans</button></div>${required(f)}`;
  } else if (k === 'line') {
    rows = swi('underline', !!f.underline, 'Underline');
  } else if (k === 'currency') {
    rows = `${line('Currency Symbol', 'symbol', '$', f.symbol)}${required(f)}`;
  } else if (k === 'file') {
    const allow = !!f.fileTypes, max = f.maxFiles || 1;
    rows = `${required(f)}${cap('File Details')}${swi('fileTypes', allow, 'Allow only specific file types')}${allow ? `<div class="bp-ff-types">${FILE_TYPES.map((t, i) => `<label class="sp-row"><span class="sp-label">${t}</span><input type="checkbox" aria-label="${t}" data-ff-set="fileType:${i}"${f.fileTypes[i] ? ' checked' : ''}></label>`).join('')}</div>` : ''}<div class="sp-row bp-ff-max"><span class="sp-label">Max Number of Files</span><input type="text" readonly aria-label="Max Number of Files" value="${max}"><button type="button" aria-label="decrement" data-ff="max:-1"${max <= 1 ? ' disabled' : ''}>${ic('<path d="M5 12h14"/>')}</button><button type="button" aria-label="increment" data-ff="max:1">${ic('<path d="M5 12h14M12 5v14"/>')}</button></div>`;
  } else if (k === 'select' || k === 'checkbox' || k === 'radio' || k === 'survey') {
    const list = optionRows(f, n);
    rows = `${k === 'select' ? placeholder : ''}${required(f)}${cap('Options').replace('bp-ff-cap', 'bp-ff-cap bp-ff-cap-opt')}${list}<button type="button" class="bp-soc-add bp-ffo-add" data-ff="opt-add">Add option</button>`;
  } else if (k === 'phone' || k === 'address' || k === 'date' || k === 'time' || k === 'x') {
    rows = required(f);
  } else {
    rows = `${placeholder}${required(f)}`;
    // The form's first Email carries the sign-up row and verification (types.default:Email).
    if (k === 'email' && (f.signup != null || f.signupOff != null)) rows += `<div class="bp-ff-note">This email address will be stored in <span class="bp-ff-u">Contacts</span> as the contact for the form submission.</div>${swi('signup', f.signup != null, 'Email Signup')}<div class="bp-ff-note">Allow form submitters to sign up for your marketing emails. Subscribers will be automatically stored in <span class="bp-ff-u">Contacts</span>.</div>${cap('Verification')}${swi('confirm', false, 'Send confirmation email', true)}`;
  }
  return `${top}${description}${rows}${actions(n)}`;
}

const ALIGN_ICONS = { left: '<path d="M4 6h16M4 10h11M4 14h16M4 18h11"/>', center: '<path d="M4 6h16M7 10h10M4 14h16M7 18h10"/>', right: '<path d="M4 6h16M9 10h11M4 14h16M9 18h11"/>' };
const POSITION_ICONS = { top: '<path d="M4 4h16M12 21V8M8 12l4-4 4 4"/>', middle: '<path d="M4 12h16M12 2v7M9 6l3 3 3-3M12 22v-7M9 18l3-3 3 3"/>', bottom: '<path d="M4 20h16M12 3v13M8 12l4 4 4-4"/>' };
function postHtml(p, link) {
  const seg = (on, v, t) => `<button type="button" role="radio" aria-checked="${on}" class="bp-ffp-seg${on ? ' is-on' : ''}" data-ff="post-mode:${v}">${t}</button>`;
  const three = (k, cur, icons) => Object.entries(icons).map(([v, d]) => `<button type="button" role="radio" aria-checked="${cur === v}" aria-label="${v[0].toUpperCase()}${v.slice(1)}" class="bp-ffp-pick${cur === v ? ' is-on' : ''}" data-ff="post-${k}:${v}">${ic(d, 22)}</button>`).join('');
  const lines = Array.from({ length: Math.max(1, p.html.split('\n').length) }, (_, n) => n + 1).join('<br>');
  const body = p.redirect
    ? `<div class="bp-ffp-link">${link}</div><div class="bp-ff-note bp-ffp-help">Add a URL to redirect the user after they submit the form.</div>`
    : `<div class="bp-soccap bp-ff-cap bp-ffp-cap">Message</div><div class="bp-ffp-msg${p.message ? '' : ' is-empty'}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Message" data-ff-post="message">${messageHtml(p.message) || '<p><br></p>'}</div><div class="bp-ff-note bp-ffp-help">This message displays after users submit a form.</div><div class="sp-row bp-ffp-row"><span class="sp-label">Alignment</span><span class="bp-ffp-three" role="radiogroup">${three('align', p.align, ALIGN_ICONS)}</span></div><div class="sp-row bp-ffp-row"><span class="sp-label">Position</span><span class="bp-ffp-three" role="radiogroup">${three('position', p.position, POSITION_ICONS)}</span></div><div class="bp-soccap bp-ff-cap bp-ffp-cap bp-ffp-htmlcap">HTML</div><div class="bp-code bp-ffp-code"><div class="bp-code-lines" aria-hidden="true">${lines}</div><textarea spellcheck="false" aria-label="HTML" placeholder="Add" data-ff-post="html">${e(p.html)}</textarea></div><div class="bp-ff-note bp-ffp-help">HTML to be rendered in addition to the Post-Submit Message.</div>`;
  return `${head('Edit Post-Submit')}<div class="bp-ff bp-ffp"><div class="bp-soccap bp-ff-cap bp-ffp-cap bp-ffp-first">After Submission</div><div class="bp-ffp-segs" role="radiogroup">${seg(!p.redirect, 'message', 'Message')}${seg(p.redirect, 'redirect', 'Redirect')}</div>${body}</div>`;
}

export function formFieldsPanelHtml(c, view, linkField) {
  const fields = c.fields;
  if (view === 'ff-post') return postHtml(c.post, linkField(c.post.href, c.pages).replace('>Link<', '>Redirect Url<'));
  if (view === 'ff-add') return addHtml();
  const [v, a, b, k] = (view || '').split(':');
  if (v === 'ff-fuadd') return addHtml('Add Follow-Up', 'fu-tile');
  if (v === 'ff-opt') return `${head('Option Details')}<div class="bp-ff bp-fu">${optionHtml(fields[a], Number(a), Number(b))}</div>`;
  if (v === 'ff-fu') {
    const f = followOf(fields[a], b)[k];
    return `${head(nameOf(f)).replace('bp-ishape-head', 'bp-ishape-head bp-fu-head')}<div class="bp-ff bp-fu bp-ff-edit bp-ff-edit--${f.kind || 'text'}">${followHtml(f, Number(a), Number(b), Number(k))}</div>`;
  }
  if (view?.startsWith('ff-edit:')) {
    const n = Number(view.slice(8)), f = fields[n];
    return `${head(nameOf(f))}<div class="bp-ff bp-ff-edit bp-ff-edit--${f.kind || 'text'}">${editorHtml(f, n)}</div>`;
  }
  return listHtml(fields);
}

// A typed value: the label keeps its required mark. An empty value is no value.
export function writeFieldText(f, key, v) {
  if (key === 'label') f.label = withReq(v, isRequired(f.label));
  else if (v || key === 'symbol') f[key] = v;
  else delete f[key];
}
// A toggle, by the name the panel gave it.
export function writeFieldSet(f, set, on) {
  const [k, arg] = set.split(':'), i = Number(arg);
  if (k === 'required') f.label = withReq(f.label, on);
  else if (k === 'show') { f.hide = [...(f.hide || [false, false])]; f.hide[i] = !on; if (!f.hide.some(Boolean)) delete f.hide; }
  else if (k === 'require') f.parts[i] = withReq(f.parts[i], on);
  else if (k === 'countryCode' || k === 'underline') { if (on) f[k] = true; else delete f[k]; }
  else if (k === 'signup') { if (on) { f.signup = f.signupOff; delete f.signupOff; } else { f.signupOff = f.signup; delete f.signup; } }
  else if (k === 'fileTypes') { if (on) f.fileTypes = [false, false, false, false, false]; else delete f.fileTypes; }
  else if (k === 'fileType') f.fileTypes[i] = on;
}
