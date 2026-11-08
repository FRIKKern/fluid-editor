// The block Edit panel (T15, U4), drawn like the oracle's (parity/findings/DESIGN.json,
// EDITPANEL.json, the gap review screenshots): a 320 by 500 panel 18px right of the block,
// Design and Animation tabs; Design has Background and Blur switches, Stroke, Blend Mode, and
// Transforms (Opacity, Rotate, Scale X/Y, Offset X/Y, Skew X/Y). Values go into the block's
// transform-vars rule (render.js designCss). Controls marked data-unbuilt are shown where the
// oracle shows them but do nothing yet; the inventory counts them as missing.
import { SHAPES, shapeById } from './shapes.js';
import { IMAGE_SHAPE_TABS, imageShapesOf } from './image-shapes.js';
import { ACCORDION_STYLES, escapeHtml as esc, DESIGN_DEFAULTS, BLEND_MODES, STROKE_PX, MAP_STYLES, MAP_ZOOMS, mapArt, mapVars, socialGlyph, socialKind, SOCIAL_SIZES, SOCIAL_STYLES } from './render.js';
import { linkKind, linkSummary, parseMail, parsePhone } from './link-kinds.js';
import { HITS, resetBtn, ARROWS, barHtml, POSE_RANGE } from './anim-panel.js';
import { effectPanelHtml } from './effect-panel.js';
import { formFieldsPanelHtml } from './form-fields.js';
import { lookBox } from './code-look.js';
import { STANDIN_PANELS, standinTabs, standinContentHtml, standinDesignHtml, standinHelpHtml, standinViewHtml } from './standin-panels.js';

const pi = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">${d}</svg>`;

// Anchor: the point a block turns and scales around, as a percent of the block, once per layout (CAP-L6ANCHOR.json).
// Nine places or X and Y. Ours draws its own dots, from the numbers measured there.
const ANCHOR_PLACES = [['Top Left', 0, 0], ['Top Center', 50, 0], ['Top Right', 100, 0], ['Center Left', 0, 50], ['Center', 50, 50], ['Center Right', 100, 50], ['Bottom Left', 0, 100], ['Bottom Center', 50, 100], ['Bottom Right', 100, 100]];
const ANCHOR_DOTS = [2, 11, 20].flatMap((y) => [2, 11, 20].map((x) => `<circle r="2" cx="${x}" cy="${y}"/>`)).join('');
const anchorGlyph = (x, y) => `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" style="overflow:visible"><g fill="#b7b7b7">${ANCHOR_DOTS}</g><circle r="2.5" cx="${2 + 0.18 * x}" cy="${2 + 0.18 * y}" fill="#0e0e0e"/></svg>`;
export const anchorText = (v) => `${v.toLocaleString('en-US', { maximumFractionDigits: 3 })}%`;
const anchorField = (k, label, v) => `<label class="sc-box an-anchor-box"><input type="text" data-anchor="${k}" aria-label="${label}" value="${anchorText(v)}"><span class="an-axis">${label}</span>${HITS}</label>`;
export const anchorPopHtml = (x, y) => `<div class="an-anchor-head">Position</div><div class="an-anchor-xy">${anchorField('ox', 'X', x)}${anchorField('oy', 'Y', y)}</div><div role="radiogroup" aria-label="Position">${ANCHOR_PLACES.map(([name, px, py]) => {
  const on = px === x && py === y;
  return `<button type="button" role="radio" class="an-anchor-row${on ? ' is-on' : ''}" aria-checked="${on}" data-anchor-at="${px},${py}">${anchorGlyph(px, py)}<span>${name}</span></button>`;
}).join('')}</div>`;

export const DESIGN_FIELDS = [['opacity', 'Opacity', '%', 0, 100], ['rotate', 'Rotate', '°', -360, 360], ['sx', 'Scale', '%', 0, 1000, 'X'], ['sy', 'Scale', '%', 0, 1000, 'Y'],
  ['tx', 'Offset', 'px', -10000, 10000, 'X'], ['ty', 'Offset', 'px', -10000, 10000, 'Y'], ['kx', 'Skew', '°', -89, 89, 'X'], ['ky', 'Skew', '°', -89, 89, 'Y']];
// What a transform field shows, one text with its unit (CAP-T6FIELDS.json), and its drag bar's range.
export const designText = (k, v) => `${Number(v).toLocaleString('en-US', { maximumFractionDigits: 3 })}${DESIGN_FIELDS.find((x) => x[0] === k)[2]}`;
export const designRange = (k) => POSE_RANGE[DESIGN_FIELDS.findIndex((x) => x[0] === k)];

// Content tab of a button block (parity/findings/BUTTONEDIT.json): Text, a 276 by 44 field
// with the placeholder Learn More, and Link, an Attach link button that turns into the link
// with Edit, Copy and Remove Link once one is set.
function linkField(href, pages) {
  const sum = href ? linkSummary(href, pages) : null;
  const link = href
    ? `<div class="bp-link"><button type="button" class="bp-link-url" data-link="edit" aria-label="${esc(href)}">${LINK_ICONS[sum.icon]}<span class="bp-link-name">${esc(sum.title)}</span>${sum.sub ? `<span class="bp-link-sub">${esc(sum.sub)}</span>` : ''}</button><div class="bp-link-actions"><button type="button" data-link="edit">Edit</button><button type="button" data-link="copy">Copy</button><button type="button" class="bp-link-remove" data-link="remove">Remove Link</button></div></div>`
    : '<button type="button" class="bp-attach" data-link="open">Attach link</button>';
  return `<div class="bp-field"><span class="bp-flabel">Link</span>${link}</div>`;
}
function buttonContentHtml(c) {
  return `<div class="bp-field"><span class="bp-flabel">Text</span><input class="bp-text" type="text" aria-label="Text" placeholder="Learn More" data-content="label" value="${esc(c.label || '')}"></div>`
    + linkField(c.href, c.pages);
}

// Content tab of an image block, in the oracle's order (parity/findings/IMAGEMODES.json): the
// picture with Replace, Edit and Remove, then Link, Alternate Filename and Image alt text. Those
// labels are all that is measured, so the sizes follow the button's Content tab. Replace reads a
// file from this computer; Edit, the oracle's full-screen image editor, is not built.
const addBox = (title, note, act) => `<button type="button" class="bp-add-box"${act ? ` data-image-act="${act}"` : ' disabled data-unbuilt title="Not built yet"'} aria-label="${title}"><span class="bp-add-plus" aria-hidden="true">${pi('<path d="M12 5v14M5 12h14"/>')}</span><strong>${title}</strong><small>${note}</small></button>`;
function imageContentHtml(c) {
  // A new image (MEDIAEMPTY.json): Add an Image takes a picture from this computer, nothing is uploaded.
  if (c.empty) return `${addBox('Add an Image', '20 MB max', 'replace')}<input class="bp-pic-file" type="file" accept="image/*" hidden data-image-file>${linkField(c.href, c.pages)}`;
  const text = (key, label, value) => `<div class="bp-field"><span class="bp-flabel">${label}</span><input class="bp-text" type="text" aria-label="${label}" data-content="${key}" value="${esc(value || '')}"></div>`;
  // The picture stands on a checker, 125 high, with the focal point's ring on it (IMAGEDESIGN.json).
  const h = c.src ? Math.min(125, 276 / (c.aspect || 1.5)) : 0, w = h * (c.aspect || 1.5), [fx, fy] = c.focal || [0.5, 0.5];
  const pic = c.src ? `<div class="bp-pic-stage"><div class="bp-pic-frame" style="width:${w}px;height:${h}px"><img class="bp-pic-img" alt="" src="${esc(c.src)}"><div class="bp-focal" role="button" tabindex="0" aria-label="Focal point" style="left:${fx * 100}%;bottom:${(1 - fy) * 100}%"></div></div></div><div class="bp-pic-name">${esc(c.filename || '')}</div><div class="bp-pic-kind">Image</div>` : '';
  const trash = pi('<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10 10v6M14 10v6"/>');
  return `<div class="bp-pic">${pic}<div class="bp-pic-actions"><button type="button" data-image-act="replace">Replace</button><button type="button" data-image-act="edit"${c.src ? '' : ' disabled'}>Edit</button><button type="button" class="bp-link-remove" data-image-act="remove" aria-label="Remove"${c.src ? '' : ' disabled'}>${trash}<span class="bp-sr">Remove</span></button></div><input class="bp-pic-file" type="file" accept="image/*" hidden data-image-file></div>`
    + (c.lightbox ? '' : linkField(c.href, c.pages))
    + text('filename', 'Alternate Filename', c.filename)
    + text('alt', 'Image alt text', c.alt);
}

// Content tab of a video (MEDIAEMPTY.json, VIDEOPLAYER.json). The file comes from this computer,
// nothing is uploaded. Storage is the oracle's words: ours has no quota.
const VIDEO_SELECTS = {
  aspect: ['Aspect ratio', [['auto', 'Auto-detect'], ['16/9', '16:9 — Landscape'], ['9/16', '9:16 — Portrait'], ['1/1', '1:1 — Square'], ['4/3', '4:3 — Classic'], ['3/2', '3:2 — Photo']]],
  lazy: ['Lazy Loading', [['auto', 'Auto'], ['lazy', 'Enabled'], ['eager', 'Disabled']]],
  controls: ['Player controls', [['full', 'All'], ['minimal', 'Minimal'], ['none', 'None']]],
};
function videoContentHtml(c) {
  const v = c.video || {};
  const select = (key, cur) => { const [label, opts] = VIDEO_SELECTS[key]; return `<div class="sp-row"><span class="sp-label">${label}</span><select class="bp-vselect" aria-label="${label}" data-video="${key}">${opts.map(([val, text]) => `<option value="${val}"${val === cur ? ' selected' : ''}>${text}</option>`).join('')}</select></div>`; };
  const toggle = (key, off, on, d) => `<button type="button" class="bp-vtoggle${v[key] !== false ? ' is-on' : ''}" data-video-toggle="${key}" aria-label="${v[key] !== false ? on : off}" title="${v[key] !== false ? on : off}">${pi(d)}</button>`;
  const file = '<input type="file" accept="video/mp4, video/x-m4v, video/quicktime" hidden data-video-file>';
  const thumb = `<div class="sp-row"><span class="sp-label">Custom thumbnail</span><label class="sp-switch"><input type="checkbox" aria-label="Custom thumbnail" data-video="thumb"${v.thumb ? ' checked' : ''}><span aria-hidden="true"></span></label></div>`
    + (!v.thumb ? '' : v.thumbSrc ? `<div class="bp-pic"><img class="bp-pic-img" alt="" src="${esc(v.thumbSrc)}"></div>` : `<button type="button" class="bp-add-box" data-video-act="thumb" aria-label="Add an Image"><span class="bp-add-plus" aria-hidden="true">${pi('<path d="M12 5v14M5 12h14"/>')}</span><strong>Add an Image</strong><small>20 MB max</small></button><input type="file" accept="image/*" hidden data-video-thumb-file>`);
  const head = v.src
    ? `<div class="bp-vid"><div class="bp-vid-prev"><video src="${esc(v.src)}" muted playsinline aria-hidden="true"></video><span class="bp-vid-play" aria-hidden="true">${pi('<path d="M8 5v14l11-7z"/>')}</span></div><div class="bp-vid-name">${esc(v.name || '')}</div><div class="bp-vid-meta">Video · ${esc(v.length || '0:00')}</div><div class="bp-vid-acts"><button type="button" data-video-act="add">Replace</button><button type="button" class="bp-vid-trash" data-video-act="remove" aria-label="Remove">${pi('<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10 11v6M14 11v6"/>')}</button></div></div>`
    : `<button type="button" class="bp-add-box" data-video-act="add" aria-label="Add a Video"><span class="bp-add-plus" aria-hidden="true">${pi('<path d="M12 5v14M5 12h14"/>')}</span><strong>Add a Video</strong><small>30 minutes max</small></button>`;
  const store = `<div class="bp-video-store"><span>Video Storage</span><span>30 min left</span><button type="button" class="bp-video-tip" aria-label="Open storage dialog" data-video-tip>${pi('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1 1-1.1 1.8M12 16.5v.5"/>')}</button></div>`;
  const help = '<p class="bp-help">Lazy loading is an optimization that defers loading content until the block is near the visible portion of the page.</p>';
  const desc = `<div class="bp-field"><span class="sp-label">Description</span><textarea class="bp-desc" aria-label="Description" placeholder="Add description here..." data-content="description">${esc(c.description || '')}</textarea></div>`;
  if (!v.src) return head + file + store + thumb + select('lazy', v.lazy || 'auto') + help + `<div class="bp-video-head">Elements</div>${desc}`;
  return head + file + store + thumb + select('aspect', v.aspect || 'auto') + select('lazy', v.lazy || 'auto') + help
    + `<div class="bp-vtoggles">${toggle('autoPlay', 'Autoplay', 'Stop Autoplay', '<path d="M18 7a8 8 0 1 0 2 5M18 3v4h-4M10 9v6l5-3z"/>')}${toggle('loop', 'Loop', 'Unloop', '<path d="M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1M7 21l-3-3 3-3M4 18h12a4 4 0 0 0 4-4v-1"/>')}${toggle('muted', 'Mute', 'Unmute', '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6"/>')}</div>`
    + '<p class="bp-help">Videos are automatically muted on autoplay.</p>'
    + `<div class="bp-video-head">Elements</div>${select('controls', v.controls || 'minimal')}${desc}`;
}

// Content tab of a code block (parity/findings/CODEEMBED.json): Mode, Display Source Code and the
// code, in a panel 575 wide. Expand opens the same rows in a full-screen view (CODEMODAL.json).
export const CODE_MODES = [['CSS', 'css'], ['HTML', 'html'], ['JavaScript', 'javascript'], ['Markdown', 'markdown'], ['Plain Text', 'plain']];
export const CODE_PANEL_WIDTH = 575;
const EXPAND = `<button type="button" class="bp-code-expand" data-code-expand aria-label="Expand">${pi('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>')}</button>`;
const codeEditor = (key, value, placeholder = '', expand = false) => `<div class="bp-code">${expand ? EXPAND : ''}<div class="bp-code-lines" aria-hidden="true">${Array.from({ length: Math.max(1, String(value || '').split('\n').length) }, (_, n) => n + 1).join('<br>')}</div><textarea spellcheck="false" aria-label="Code" data-content="${key}" placeholder="${placeholder}">${esc(value || '')}</textarea></div>`;
// The editors with a look of their own (CAP-T10LOOK.json): a band on the caret's line, a layer of colours over a field whose
// own text is clear, wrapped lines on HTML and Markdown. editor.js paints them.
const lookEditor = (key, value, lang, placeholder = '', expand = false) => lookBox(`data-content="${key}"`, value, lang, { placeholder, top: expand ? EXPAND : '' });
function codeContentHtml(c, expand = true) {
  return `<div class="bp-code-top"><label class="bp-field bp-code-mode"><span class="bp-flabel">Mode</span><select aria-label="Mode" data-content="codeMode">${CODE_MODES.map(([l, v]) => `<option value="${v}"${c.mode === v ? ' selected' : ''}>${l}</option>`).join('')}</select></label>`
    + `<div class="sp-row bp-code-source${c.mode === 'html' || c.mode === 'markdown' ? '' : ' is-locked'}"><span class="sp-label">Display Source Code</span><label class="sp-switch"><input type="checkbox" aria-label="Display Source Code" data-content="showSource" ${c.showSource ? 'checked' : ''}${c.mode === 'html' || c.mode === 'markdown' ? '' : ' disabled'}><span aria-hidden="true"></span></label></div></div>`
    + lookEditor('code', c.html, c.mode, '', expand);
}
export const codeModalHtml = (c) => `<div class="code-modal-scrim" data-code-modal="close"></div><div class="code-modal-box" role="dialog" aria-label="Code Editor"><div class="code-modal-head"><button type="button" class="code-modal-close" data-code-modal="close">Close</button><span>Code Editor</span></div>${codeContentHtml(c, false)}</div>`;

// Content tab of a Markdown block (CAP-T10PRE.json, CAP-T10MD3.json): a toolbar over the editor, Expand, and
// the note. Expand opens the same toolbar and editor in the Code Editor view. The cheatsheet is our own note.
const MD_ICONS = {
  bold: '<path d="M7 5h6.5a3.5 3.5 0 0 1 0 7H7zM7 12h7.5a3.5 3.5 0 0 1 0 7H7z" stroke-width="3"/>',
  italic: '<path d="M10 5h7M7 19h7M13.5 5l-3 14"/>',
  link: '<path d="M10 8H7a4 4 0 0 0 0 8h3M14 8h3a4 4 0 0 1 0 8h-3M8 12h8"/>',
  bullet: '<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" stroke-width="2.2"/>',
  number: '<path d="M10 6h11M10 12h11M10 18h11M3.5 4.5 5 4v5M3 15h3l-3 4h3"/>',
  quote: '<path d="M4 11h5v7H4zM4 11c0-3 1-4 4-5M14 11h5v7h-5zM14 11c0-3 1-4 4-5" fill="currentColor"/>',
};
const MD_HEADINGS = ['Paragraph', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4'];
const mdButton = (key, label, role = 'checkbox') => `<button type="button" role="${role}"${role === 'checkbox' ? ' aria-checked="false"' : ''} class="bp-md-btn" aria-label="${label}" data-md="${key}">${pi(MD_ICONS[key])}</button>`;
const mdBar = () => `<div class="bp-md-bar"><div class="bp-md-head"><button type="button" class="bp-md-heading" aria-label="Heading" aria-expanded="false" data-md="heading"><span>Paragraph</span>${pi('<path d="M6 9l6 6 6-6"/>')}</button><div class="bp-md-list" hidden>${MD_HEADINGS.map((h, n) => `<button type="button" data-md-level="${n}">${h}</button>`).join('')}</div></div><i class="bp-md-sep"></i>${mdButton('bold', 'Bold')}${mdButton('italic', 'Italic')}${mdButton('link', 'Link', 'button')}<i class="bp-md-sep"></i>${mdButton('bullet', 'Bulleted List')}${mdButton('number', 'Numbered List')}<i class="bp-md-sep"></i>${mdButton('quote', 'Quote')}</div>`;
const markdownContentHtml = (c) => mdBar() + lookEditor('markdown', c.text, 'markdown', 'Add markdown…', true) + '<p class="bp-md-note">New to Markdown? <a href="help-markdown.html" target="_blank" rel="noopener">See the syntax cheatsheet</a>.</p>';
export const mdModalHtml = (text) => `<div class="code-modal-scrim" data-code-modal="close"></div><div class="code-modal-box is-md" role="dialog" aria-label="Code Editor"><div class="code-modal-head"><button type="button" class="code-modal-close" data-code-modal="close">Close</button><span>Code Editor</span></div>${mdBar()}${lookEditor('markdown', text, 'markdown', 'Add markdown…')}</div>`;
export const mdLinkSummaryHtml = (href) => `<div class="lk-md-sum"><span class="lk-md-icon">${LINK_ICONS.url}</span><span class="lk-md-href">${esc(href)}</span></div><div class="lk-md-acts"><button type="button" data-md-link="edit">Edit</button><button type="button" data-md-link="copy">Copy</button><button type="button" data-md-link="remove">Remove Link</button></div>`;

// Content tab of an embed block (CODEEMBED.json): Embed as Link or Code Snippet. A link goes
// through a lookup service of the host, which we do not have, so every link ends in its error
// text, and Learn More opens our own note, not the host's help page. A snippet is written in the Embed data view, with Back. Custom thumbnail stays off, as it
// does on the oracle for anything but a video.
function embedContentHtml(c, open) {
  if (open === 'embed-data') return `<div class="bp-sub"><button type="button" class="bp-back" data-embed="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>Embed data</span></div>${codeEditor('embedHtml', c.html, 'Add code…')}`;
  const seg = (v, l) => `<button type="button" role="radio" class="bp-mode${c.as === v ? ' is-on' : ''}" aria-checked="${c.as === v}" data-embed="${v}">${l}</button>`;
  const source = c.as === 'code'
    ? '<button type="button" class="sp-row bp-rowbtn" data-embed="data"><span class="sp-label">Embed data</span><span aria-hidden="true">›</span></button>'
    : `<input class="bp-text" type="text" placeholder="https://…" aria-label="Embed URL" data-content="embedUrl" value="${esc(c.url || '')}">${c.invalid ? '<p class="bp-note">No embeddable content found</p>' : ''}`;
  return `<p class="bp-note">Paste the URL of the item you’re embedding, and we’ll attempt to locate the content and format it for your site. <a class="bp-learn" href="help-embed.html" target="_blank" rel="noopener">Learn More</a></p>`
    + `<div class="bp-field"><span class="sp-label">Embed as</span><div class="bp-modes bp-modes-2" role="radiogroup" aria-label="Embed as">${seg('link', 'Link')}${seg('code', 'Code Snippet')}</div></div>${source}`
    + `<div class="sp-row"><span class="sp-label">Custom thumbnail</span><label class="sp-switch" data-unbuilt title="Only available for embedded videos."><input type="checkbox" disabled aria-label="Custom thumbnail"><span aria-hidden="true"></span></label></div><p class="bp-note">Only available for embedded videos.</p>`
    + `<div class="bp-field"><span class="sp-label">Description</span><textarea class="bp-desc" aria-label="Description" placeholder="Add description here..." data-content="description">${esc(c.description || '')}</textarea></div>`;
}

// Content tab of an accordion (parity/findings/ACCORDION.json): the items, each with a trash and a
// way in, and Add Item. An item's view has Back, Title, Description, Duplicate and Delete. The
// handles that reorder items are not built.
const backRow = (act, title) => `<div class="bp-sub"><button type="button" class="bp-back" data-acc="${act}">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>${esc(title)}</span></div>`;
function accordionContentHtml(c, open) {
  if (open?.startsWith('acc-item:')) {
    const n = Number(open.slice(9)), it = c.items[n];
    return `${backRow('back', it.title)}<div class="bp-field"><span class="bp-cap">Title</span><input class="bp-text" type="text" aria-label="Title" data-content="accTitle" data-n="${n}" value="${esc(it.title)}"></div>`
      + `<div class="bp-field"><span class="bp-cap">Description</span><textarea class="bp-desc bp-desc-tall" aria-label="Description" data-content="accDescription" data-n="${n}">${esc(it.description ?? '')}</textarea></div>`
      + `<div class="bp-item-actions"><button type="button" data-acc="dup:${n}">Duplicate</button><button type="button" class="bp-link-remove" data-acc="del:${n}">Delete</button></div>`;
  }
  return c.items.map((it, n) => `<div class="bp-acc-row"><span class="bp-acc-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="bp-acc-t" aria-hidden="true">T</span><button type="button" class="bp-acc-name" data-acc="open:${n}" aria-label="${esc(it.title)}">${esc(it.title)}</button><button type="button" class="bp-acc-trash" data-acc="del:${n}" aria-label="Delete ${esc(it.title)}">${pi('<path d="M5 7h14M10 7V4h4v3M7 7v13h10V7M10.5 11v5M13.5 11v5"/>')}</button><button type="button" class="bp-acc-go" data-acc="open:${n}" aria-hidden="true" tabindex="-1">${pi('<path d="M9 6l6 6-6 6"/>')}</button></div>`).join('')
    + '<button type="button" class="bp-acc-add" data-acc="add">Add Item</button>';
}
// Design tab of an accordion, in the oracle's order (parity/findings/ACCORDIONSTYLES.json). Icon
// Background, Stroke, Blend Mode and Blur are the rows every block has.
const smlRow = (cap, key, cur, more = true) => `<div class="bp-cap bp-cap-seg">${cap}</div><div class="bp-sml" role="radiogroup" aria-label="${cap}">${['S', 'M', 'L'].map((k) => `<button type="button" role="radio" class="bp-mode${cur === k ? ' is-on' : ''}" aria-checked="${cur === k}" data-acc-set="${key}" data-v="${k}">${k}</button>`).join('')}${more ? `<button type="button" role="radio" class="bp-mode${cur === 'custom' ? ' is-on' : ''}" aria-checked="${cur === 'custom'}" aria-label="More ${cap}" data-acc-set="${key}" data-v="custom">···</button>` : `<button type="button" class="bp-mode" disabled data-unbuilt title="Not built yet" aria-label="More ${cap}">···</button>`}</div>`;
const smlOf = (v, def) => (typeof v === 'number' || Array.isArray(v) ? 'custom' : v || def);
// A value with a range beside it (a more button's row), or a label and field over the range.
const accInline = (key, v, unit, min, max) => `<div class="bp-acc-inline"><input type="range" aria-label="${key} range" data-acc-range="${key}" data-unit="${unit}" min="${min}" max="${max}" step="1" value="${v}"><input type="text" aria-label="${key}" data-acc-field="${key}" data-unit="${unit}" data-min="${min}" data-max="${max}" value="${v}${unit}"></div>`;
// Icon Thickness's more: a px field with Decrement and Increment, no range (CAP-T12READS-D.json, iconThickness).
const accStep = (key, v, min, max) => `<div class="bp-acc-step"><input type="text" aria-label="${key}" data-acc-field="${key}" data-unit="px" data-min="${min}" data-max="${max}" value="${v}px">${[['-1', 'Decrement', 'M5 12h14'], ['1', 'Increment', 'M12 5v14M5 12h14']].map(([d, l, path]) => `<button type="button" class="bp-acc-stepbtn" data-acc-step="${key}" data-v="${d}" data-min="${min}" data-max="${max}" aria-label="${l}">${pi(`<path d="${path}"/>`)}</button>`).join('')}</div>`;
const accLabelled = (label, key, v, unit, min, max, step = 1) => `<div class="bp-acc-labelled"><div class="bp-acc-labelled-head"><span class="sp-label">${label}</span><input type="text" aria-label="${label}" data-acc-field="${key}" data-unit="${unit}" data-min="${min}" data-max="${max}" value="${v}${unit}"></div><input type="range" aria-label="${label}" data-acc-range="${key}" data-unit="${unit}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
const accPads = (key, v, prefix = '') => ['Top', 'Right', 'Bottom', 'Left'].map((n, i) => accLabelled(`${prefix}Padding ${n}`, `${key}:${i}`, v[i], 'px', 0, 50)).join('');
const ALIGN_ICON = { left: '<path d="M4 6h16M4 12h10M4 18h13"/>', center: '<path d="M4 6h16M7 12h10M5.5 18h13"/>', right: '<path d="M4 6h16M10 12h10M7 18h13"/>' };
const alignSeg = (cap, key, cur) => `<div class="bp-cap bp-cap-seg">${cap}</div><div class="bp-modes bp-acc-3" role="radiogroup" aria-label="${cap}">${['left', 'center', 'right'].map((k) => `<button type="button" role="radio" class="bp-mode${cur === k ? ' is-on' : ''}" aria-checked="${cur === k}" aria-label="${k}" data-acc-set="${key}" data-v="${k}">${pi(ALIGN_ICON[k])}</button>`).join('')}</div>`;
const CHEV_R = pi('<path d="M9 6l6 6-6 6"/>');
function accordionDesignHtml(c, open, d) {
  const sw = (key, on, label) => `<div class="sp-row"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" data-acc-set="${key}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label></div>`;
  const pick = (key, value, cap) => `<div class="bp-cap bp-cap-seg">${cap}</div><button type="button" class="bp-acc-pick" data-acc-menu="${key}" aria-haspopup="listbox" aria-label="${value}"><span>${value}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button>`;
  if (open === 'acc-title') return `<div class="bp-acc-view">${backRow('design', 'Title')}${pick('titleStyle', ACCORDION_STYLES[c.titleStyle || 'h4'], 'Style')}${alignSeg('Alignment', 'titleAlign', c.titleAlign || 'left')}</div>`;
  if (open === 'acc-desc') {
    const w = smlOf(c.descWidth, 'M'), p = smlOf(c.descPad, 'M');
    return `<div class="bp-acc-view">${backRow('design', 'Description')}${pick('descStyle', ACCORDION_STYLES[c.descStyle || 'p2'], 'Style')}`
      + smlRow('Width', 'descWidth', w) + (w === 'custom' ? accInline('descWidth', c.descWidth, '%', 25, 100) : '')
      + smlRow('Padding', 'descPad', p) + (p === 'custom' ? accPads('descPad', c.descPad) : '')
      + alignSeg('Alignment', 'descAlign', c.descAlign || 'left')
      // Width L fills the block, so there is nothing to place (ACCORDIONSTYLES.json).
      + (c.descWidth === 'L' ? '' : alignSeg('Placement', 'descPlace', c.descPlace || 'left')) + '</div>';
  }
  if (open === 'acc-dividers') {
    const t = smlOf(c.dividerSize, 'S');
    return `<div class="bp-acc-view">${backRow('design', 'Dividers')}${sw('dividers', c.dividers !== false, 'Dividers')}${sw('showFirst', c.showFirst !== false, 'Show first')}${sw('showLast', c.showLast !== false, 'Show last')}`
      + smlRow('Thickness', 'dividerSize', t).replace('bp-cap-seg', 'bp-cap-seg bp-cap-after') + (t === 'custom' ? accInline('dividerSize', c.dividerSize, 'px', 0, 10) : '')
      + accLabelled('Opacity', 'dividerOpacity', c.dividerOpacity ?? 1, '', 0, 1, 0.01) + '</div>';
  }
  const nav = (act, label, v) => `<button type="button" class="sp-row bp-rowbtn" data-acc="${act}" aria-label="Navigate to ${label}"><span class="sp-label">${label}</span><span class="bp-chip-v">${v}${CHEV_R}</span></button>`;
  const iconSz = smlOf(c.iconSize, 'S'), iconTh = smlOf(c.iconThickness, 'S'), rowPad = smlOf(c.rowPadding, 'M');
  return `<div class="bp-acc-view"><div class="bp-cap bp-cap-seg">Text</div>${nav('title', 'Title', ACCORDION_STYLES[c.titleStyle || 'h4'])}${nav('desc', 'Description', ACCORDION_STYLES[c.descStyle || 'p2'])}<div class="bp-cap bp-cap-seg bp-cap-after">Design</div>`
    + sw('expandFirst', c.expandFirst, 'Expand first item') + sw('multiple', c.multiple, 'Allow multiple open items')
    + nav('dividers', 'Dividers', c.dividers !== false ? 'On' : 'Off')
    + `<button type="button" class="sp-row bp-rowbtn bp-acc-iconrow" data-acc-menu="icon" aria-haspopup="listbox" aria-label="Icon"><span class="sp-label">Icon</span><span class="bp-chip-v">${c.icon === 'arrow' ? 'Arrow' : 'Plus'}</span></button>`
    + smlRow('Icon Size', 'iconSize', iconSz) + (iconSz === 'custom' ? accInline('iconSize', c.iconSize, 'px', 10, 40) : '')
    + smlRow('Icon Thickness', 'iconThickness', iconTh) + (iconTh === 'custom' ? accStep('iconThickness', c.iconThickness, 1, 10) : '')
    + `<div class="bp-cap bp-cap-seg">Icon Placement</div><div class="bp-modes bp-modes-2" role="radiogroup" aria-label="Icon Placement">${[['left', c.iconLeft], ['right', !c.iconLeft]].map(([k, on]) => `<button type="button" role="radio" class="bp-mode${on ? ' is-on' : ''}" aria-checked="${!!on}" aria-label="${k}" data-acc-set="iconLeft" data-v="${k}">${k === 'left' ? '←' : '→'}</button>`).join('')}</div>`
    + smlRow('Row Padding', 'rowPadding', rowPad) + (rowPad === 'custom' ? accPads('rowPadding', c.rowPadding, 'Accordion Item ') : '')
    + row2('Background', `<label class="sp-switch"><input type="checkbox" data-design="background" aria-label="Background" ${d.background ? 'checked' : ''}><span aria-hidden="true"></span></label>`)
    + strokeRows(d) + blendRow(d.blend || 'normal', open === 'blend')
    + row2('Blur', `<label class="sp-switch"><input type="checkbox" data-design="blur" aria-label="Blur" ${d.blur ? 'checked' : ''}><span aria-hidden="true"></span></label>`) + '</div>';
}
// An image's Shape picker (parity/findings/IMAGESHAPES.json): Back stays put, the tabs and tiles scroll.
const IMAGE_TILE = { '1:1': [63.4, 63.4], '2:3': [42.7, 64.3], '3:2': [72.1, 47.9] };
function imageShapeHtml(cur, tab) {
  const tile = (s) => {
    const [w, h] = IMAGE_TILE[tab], on = s.id === cur;
    return `<button type="button" class="bp-ishape-tile${on ? ' is-on' : ''}" aria-label="${s.label}" aria-pressed="${on}" data-image-shape="${s.id}"><svg width="${w + 2}" height="${h + 2}" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path class="bp-ishape-ring" vector-effect="non-scaling-stroke" d="${s.d}"/><path class="bp-ishape-fill" vector-effect="non-scaling-stroke" transform="translate(${1 / (w + 2)} ${1 / (h + 2)}) scale(${w / (w + 2)} ${h / (h + 2)})" d="${s.d}"/></svg></button>`;
  };
  return `<div class="bp-ishape-head"><button type="button" class="bp-back" data-image-nav="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>Shape</span></div>`
    + `<div class="bp-ishape-tabs" role="tablist">${IMAGE_SHAPE_TABS.map((t) => `<button type="button" role="tab" aria-selected="${t === tab}" class="bp-ishape-tab${t === tab ? ' is-on' : ''}" data-image-tab="${t}">${t}</button>`).join('')}</div>`
    + `<div class="bp-ishape-grid">${imageShapesOf(tab).map(tile).join('')}</div>`;
}
const row2 = (label, control) => `<div class="sp-row"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;

// The link editor popover (BUTTONEDIT.json, the gap review's button-link state). A pill names the
// kind of link and opens its menu: URL, File, Email, Phone, Learn more (parity/findings/LINKMENU.json).
// File stays off: file links need an upload (decision 0005). URL has the field Enter link, search,
// or add files, Open link in new tab and Clear selected page; the site pages lie over the box while
// the field is in use, as name and path, grouped by navigation (parity/findings/LINKBOX.json), so a
// click reaches the box only once a link is entered.
const svgIcon = (d) => `<svg class="lk-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const LINK_ICONS = {
  url: svgIcon('<circle cx="10" cy="10" r="7.5"/><path d="M2.5 10h15M10 2.5c2.2 2.2 3.2 4.7 3.2 7.5s-1 5.3-3.2 7.5c-2.2-2.2-3.2-4.7-3.2-7.5s1-5.3 3.2-7.5z"/>'),
  file: svgIcon('<rect x="2" y="4" width="12" height="9"/><path d="M5 15.5h13v-9M2 11l3.5-3 3 2.5 2-1.5 3.5 3"/>'),
  email: svgIcon('<rect x="2.5" y="4.5" width="15" height="11"/><path d="M3 5l7 6 7-6"/>'),
  phone: svgIcon('<path d="M4 3l3 .5L8.500 7l-2 1.500c.8 2 2.500 3.700 4.500 4.500l1.500-2 3.500 1.500.5 3c-.3 1-1.200 1.500-2 1.500C8.500 17 3 11.500 2.500 5c0-.8.5-1.700 1.500-2z"/>'),
  page: svgIcon('<path d="M8 4h5v12H7V6.5zM8 4v2.5H5.5"/>'),
  info: '<svg class="lk-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><circle cx="7" cy="7" r="6"/><path d="M7 6v4M7 4v1"/></svg>',
};
const PAGE_ROW_ICON = '<svg width="16" height="18" viewBox="0 0 16 18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 5.5 6.5 1H14v16H2z"/></svg>';
const LINK_KINDS = [['url', 'URL'], ['file', 'File'], ['email', 'Email'], ['phone', 'Phone']];
const CHEVRON = '<svg class="lk-chevron" width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M1 1.5l5 5 5-5"/></svg>';
const CHECK = '<svg class="lk-check" width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M1 6.5l4 4 8-9"/></svg>';
function linkHeadHtml(kind) {
  const name = LINK_KINDS.find(([k]) => k === kind)[1];
  const rows = LINK_KINDS.map(([k, label]) => `<button type="button" class="lk-kind" data-kind="${k}"${k === 'file' ? ' disabled data-unbuilt' : ''}>${LINK_ICONS[k]}<span>${label}</span>${k === kind ? CHECK : ''}</button>`).join('');
  return `<div class="lk-head"><button type="button" class="lk-pill" aria-expanded="false">${LINK_ICONS[kind]}<span>${name}</span>${CHEVRON}</button>`
    + `<div class="lk-menu" hidden>${rows}<div class="lk-sep" role="separator"></div><button type="button" class="lk-learn">${LINK_ICONS.info}<span>Learn more</span></button></div></div>`;
}
// The box a linked Button opens from its toolbar (CAP-E7REOPEN2.json): the link as the panel's row shows it, then Edit, Copy and
// Remove Link. A page has a tip with its full address; a typed link has one only if the row cuts it short (drawLinkBox), an email or number none.
export function linkBoxHtml(href, groups, origin) {
  const sum = linkSummary(href, groups);
  return `<button type="button" class="lk-box-row${sum.sub ? '' : ' is-one'}" aria-label="${esc(`${sum.title}${sum.sub}`)}"><span class="lk-box-icon">${sum.icon === 'page' ? PAGE_ROW_ICON : LINK_ICONS[sum.icon]}</span><span class="lk-box-name">${esc(sum.title)}</span>${sum.sub ? `<span class="lk-box-sub">${esc(sum.sub)}</span>` : ''}</button>`
    + (sum.icon === 'page' || sum.icon === 'url' ? `<div class="lk-tip" role="tooltip"${sum.icon === 'page' ? ' data-page' : ''}>${esc(sum.icon === 'page' ? origin + href : href)}</div>` : '')
    + '<div class="lk-box-acts"><button type="button" data-link-box="edit">Edit</button><button type="button" data-link-box="copy">Copy</button><button type="button" data-link-box="remove">Remove Link</button></div>';
}
function urlBodyHtml(href, groups, newTab) {
  const pages = groups.filter((g) => g.pages.length).map((g) => `<div class="lk-set"><div class="lk-group">${esc(g.name)}</div>${g.pages.map((pg) => `<button type="button" class="lk-page" data-href="${esc(pg.href)}" aria-label="${esc(`${pg.label}${pg.href}`)}">${PAGE_ROW_ICON}<span>${esc(pg.label)}</span><span class="lk-path">${esc(pg.href)}</span></button>`).join('')}</div>`).join('');
  return `<div class="lk-row"><input class="lk-input" type="text" placeholder="Enter link, search, or add files" value="${esc(href || '')}"><button type="button" class="lk-clear" aria-label="Clear selected page">×</button></div>`
    + `<label class="lk-newtab">Open link in new tab<input type="checkbox" class="lk-box"${newTab ? ' checked' : ''}></label>`
    + `<div class="lk-pages">${pages}</div>`;
}
function emailBodyHtml(href) {
  const m = parseMail(href);
  const field = (f, label, ph = '') => `<div class="lk-g" data-g="${f}"${(f === 'cc' || f === 'bcc') && !m[f] ? ' hidden' : ''}><div class="lk-flabel">${label}</div><div class="lk-row"><input data-f="${f}" type="text" aria-label="${label}"${ph ? ` placeholder="${ph}"` : ''} value="${esc(m[f])}"><button type="button" class="lk-clear" aria-label="Clear"${m[f] ? '' : ' hidden'}>×</button></div></div>`;
  const adds = ['cc', 'bcc'].filter((f) => !m[f]);
  return `<div class="lk-mail">${field('to', 'To', 'Enter email address')}`
    + `<div class="lk-adds"${adds.length ? '' : ' hidden'}>${adds.map((f) => `<button type="button" data-add="${f}">${f.toUpperCase()}</button>`).join('')}</div>`
    + `${field('cc', 'CC')}${field('bcc', 'BCC')}`
    + `<div class="lk-g" data-g="subject"><div class="lk-flabel">Subject</div><div class="lk-row"><input data-f="subject" type="text" aria-label="Subject" value="${esc(m.subject)}"></div></div>`
    + `<div class="lk-g" data-g="body"><div class="lk-flabel">Body</div><div class="lk-row lk-area"><textarea data-f="body" aria-label="Body">${esc(m.body)}</textarea></div></div></div>`;
}
function phoneBodyHtml(href) {
  const p = parsePhone(href);
  const radio = (mode, label) => `<button type="button" role="radio" class="lk-radio" data-mode="${mode}" aria-checked="${p.mode === mode}">${label}</button>`;
  return `<div class="lk-row"><input data-f="phone" type="text" placeholder="Enter phone number" value="${esc(p.number)}"><button type="button" class="lk-clear" aria-label="Clear">×</button></div>`
    + `<div class="lk-seg" role="radiogroup">${radio('call', 'Call')}${radio('text', 'Text')}</div>`;
}
export function linkPopoverHtml(href, groups, newTab = false, kind = linkKind(href)) {
  const body = kind === 'email' ? emailBodyHtml(href) : kind === 'phone' ? phoneBodyHtml(href) : urlBodyHtml(href, groups, newTab);
  return linkHeadHtml(kind) + body;
}

// The popover is centred on the control it opened from, whatever its height: URL 61px above the
// Attach link button, Phone 65, Email 217 (parity/findings/LINKMENU.json), and 342px left of the panel.
export function linkPopoverPosition(panel, attach, stage, height = 167) {
  const left = Math.max(8, panel.left - stage.left - 342);
  const top = Math.max(8, Math.min(attach.top - stage.top - Math.floor((height - attach.height) / 2), stage.height - height - 8));
  return { left, top };
}

// Blend Mode (parity/findings/BLEND.json): a button reading Blend Mode and the current mode,
// opening a list of the 16 CSS blend modes.
export const blendValue = (label) => label.toLowerCase().replace(/ /g, '-');
// The shared Design tab and a Shape's show a chevron after the mode (CAP-DESIGNTAB-QUOTE.json).
const CHEV = '<svg class="bp-chev" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>';
function blendRow(cur, open, chev = false) {
  const name = BLEND_MODES.find((m) => blendValue(m) === cur) || 'Normal';
  const list = open ? `<div class="bp-listbox" role="listbox" aria-label="Blend Mode">${BLEND_MODES.map((m) => `<div role="option" class="bp-option" aria-selected="${m === name}" data-blend="${blendValue(m)}">${m}</div>`).join('')}</div>` : '';
  return `<div class="bp-blend-wrap"><div class="sp-row bp-blend" role="button" tabindex="0" aria-haspopup="listbox" aria-expanded="${open}" data-blend-toggle><span class="sp-label">Blend Mode</span><span class="bp-blend-value">${name}</span>${chev ? CHEV : ''}</div>${list}</div>`;
}
// A Quote's Design tab ends with Effects and an Appear menu (CAP-DESIGNTAB-EFFECTS2.json); Text and Shape have none.
export const APPEAR = ['Site Default', 'None', 'Fade In', 'Slide Up', 'Focus In', 'Reveal'];
// After a pick the row shows its value on a grey fill, with a small grey chevron and no line (CAP-T12APPEARROW.json, mouse off the row, two picks).
const effectsRows = (v) => `<div class="bp-thead bp-effects"><span>Effects</span></div><button type="button" class="bp-appear${v ? ' has-value' : ''}" data-appear aria-haspopup="listbox"><span>Appear</span>${v ? `<span class="bp-appear-v">${v}${CHEV}</span>` : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'}</button>`;

// A Video's is a name and a menu, not one button (CAP-VBLEND.json): the same list, over it and 9 to its left.
function videoBlendRow(cur) {
  const name = BLEND_MODES.find((m) => blendValue(m) === cur) || 'Normal';
  return `<div class="sp-row bp-image-sel bp-vblend"><span class="sp-label">Blend Mode</span><button type="button" role="combobox" class="an-sel" data-image-sel="vblend" data-cur="${cur}" aria-haspopup="listbox"><span>${name}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button></div>`;
}

// Stroke (parity/findings/STROKE.json): No, Solid and Dashed Stroke; with a stroke, Stroke Color
// (not built), Thickness S/M/L, Corner and Padding S/M/L.
// The Stack's Layout group (parity/findings/S3.json panel): Direction, Position, Gap and Padding.
const POS_Y = [['flex-start', 'Top'], ['center', 'Center'], ['flex-end', 'Bottom']];
const POS_X = [['flex-start', 'Left'], ['center', 'Center'], ['flex-end', 'Right']];
// A child's Size (S3.json children): W and H, each a field with Fixed, Hug and Fill under it.
// The Size menu's rows (CAP-SIZEMENU.json, CAP-SIZEMENU2.json, CAP-SIZEMENUH.json): an icon, upright for H, and a tick on the current one. Our own drawing, measured to the oracle's box.
const SIZE_ICON = { Fixed: 'M2 11h18M2 7v8M20 7v8', Hug: 'M0 11h9M6 7.5l3.5 3.5L6 14.5M22 11h-9M16 7.5L12.5 11l3.5 3.5', Fill: 'M1 11h20M4.5 7.5L1 11l3.5 3.5M17.5 7.5L21 11l-3.5 3.5' };
const sizeRow = (axis, name, text, current, off) => `<button type="button"${off || current ? ` class="${off ? 'is-off' : 'is-on'}"` : ''}${off ? ' disabled' : ''} data-stack="kid:${axis}:${name === 'Fixed' ? text.slice(8) : name}"><svg class="st-size-icon" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#b7b7b7" stroke-width="1.5" aria-hidden="true"><path d="${SIZE_ICON[name]}"${axis === 'h' ? ' transform="rotate(90 11 11)"' : ''}/></svg><span>${esc(text)}</span>${current ? '<svg class="st-size-tick" width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#0e0e0e" stroke-width="2" aria-hidden="true"><path d="M5.5 11.5l3.5 3.5 7.5-8.5"/></svg>' : ''}</button>`;
function kidSizeHtml(k) {
  const one = (axis, v) => {
    const open = k.open === axis, now = v === 'Fill' || v === 'Hug' ? v : 'Fixed';
    return `<span class="st-size-f"><b aria-hidden="true">${axis.toUpperCase()}</b><input type="text" aria-label="${axis.toUpperCase()}" data-stack-field="k${axis}" value="${esc(v)}"><button type="button" class="st-gap-toggle${open ? ' is-open' : ''}" aria-label="${axis.toUpperCase()} options" data-stack="kidopen:${axis}">${pi(open ? '<path d="M8 14l4-4 4 4"/>' : '<path d="M8 10l4 4 4-4"/>')}</button>${open ? `<span class="st-gap-menu st-size-menu">${sizeRow(axis, 'Fixed', `Fixed · ${k.fixed[axis]}`, now === 'Fixed')}${sizeRow(axis, 'Hug', 'Hug', now === 'Hug', k.noHug)}${sizeRow(axis, 'Fill', 'Fill', now === 'Fill')}</span>` : ''}</span>`;
  };
  return `<div class="st-head">Layout</div><div class="st-size"><span class="sp-label">Size</span><span class="st-size-col">${one('w', k.w)}${one('h', k.h)}</span></div>`;
}
function stackLayoutHtml(st) {
  const dir = (v, label, icon) => `<button type="button" role="radio" class="st-dir-btn${st.direction === v ? ' is-on' : ''}" aria-checked="${st.direction === v}" aria-label="${label}" data-stack="dir:${v}">${pi(icon)}</button>`;
  const tabs = POS_Y.flatMap(([y, yn]) => POS_X.map(([x, xn]) => {
    const on = st.x === x && st.y === y, label = yn === 'Center' && xn === 'Center' ? 'Center' : `${yn} ${xn}`;
    return `<button type="button" role="tab" class="st-pos-tab${on ? ' is-on' : ''}" aria-selected="${on}" aria-label="${label}" data-stack="pos:${x},${y}"><i></i></button>`;
  })).join('');
  const field = (key, label, value) => `<label class="st-pad"><span class="st-pad-icon" aria-hidden="true"></span><input type="text" aria-label="${label}" data-stack-field="${key}" value="${esc(value)}"></label>`;
  const p = st.pad || { t: '0px', r: '0px', b: '0px', l: '0px' };
  const pads = st.four
    ? `<span class="st-pads st-pads-four">${field('t', 'Padding top', p.t)}${field('l', 'Padding left', p.l)}${field('b', 'Padding bottom', p.b)}${field('r', 'Padding right', p.r)}</span>`
    : `<span class="st-pads">${field('y', 'Padding vertical', p.t)}${field('x', 'Padding horizontal', p.l)}</span>`;
  const gap = st.gap === 'fill' ? 'Fill' : `${st.gap}px`;
  return '<div class="st-head">Layout</div>'
    + `<div class="st-row"><span class="sp-label">Direction</span><span class="st-dir" role="radiogroup" aria-label="Direction">${dir('column', 'Column', '<rect x="4" y="4" width="7" height="6"/><rect x="4" y="14" width="7" height="6"/><path d="M17 5v14"/><path d="M14 16l3 3 3-3"/>')}${dir('row', 'Row', '<rect x="4" y="5" width="6" height="6"/><rect x="14" y="5" width="6" height="6"/><path d="M5 17h14"/><path d="M16 14l3 3-3 3"/>')}</span></div>`
    + `<div class="st-row st-row-pos"><span class="sp-label">Position</span><span class="st-pos" role="tablist" aria-label="Position">${tabs}</span></div>`
    + `<div class="st-row"><span class="sp-label">Gap</span><span class="st-gap${st.gapOpen ? ' is-open' : ''}"><span class="st-pad-icon" aria-hidden="true"></span><input type="text" aria-label="Gap" data-stack-field="gap" value="${gap}"><button type="button" class="st-gap-toggle${st.gapOpen ? ' is-open' : ''}" aria-label="${st.gapOpen ? 'Collapse' : 'Expand'} gap options" aria-expanded="${!!st.gapOpen}" data-stack="gapopen">${pi(st.gapOpen ? '<path d="M8 14l4-4 4 4"/>' : '<path d="M8 10l4 4 4-4"/>')}</button>${st.gapOpen ? '<span class="st-gap-menu"><button type="button" data-stack="gap:20">20px</button><button type="button" data-stack="gap:fill">Fill</button></span>' : ''}</span></div>`
    + `<div class="st-row st-row-pad${st.four ? ' is-four' : ''}"><span class="sp-label">Padding</span><button type="button" class="st-pad-toggle" aria-label="${st.four ? 'Only show vertical and horizontal padding controls' : 'Show top, bottom, left, and right padding controls'}" data-stack="four:${st.four ? 0 : 1}">${pi('<rect x="8" y="8" width="8" height="8"/>')}</button>${pads}</div>`;
}
// Add fill, the Color it brings (T15), and Corner, which shows once there is a fill or a stroke.
function stackFillRow(d) {
  const add = '<button type="button" class="st-add" aria-label="Add fill" data-stack="fill">+</button>';
  if (!d.background) return `<div class="sp-row"><span class="sp-label">Background</span><span class="sp-ctl">${add}</span></div>`;
  return `<div class="sp-row"><span class="sp-label">Background</span><span class="sp-ctl">${add}<span class="st-color"><button type="button" class="bp-swatch" data-unbuilt disabled aria-label="Color"></button><button type="button" class="st-color-x" aria-label="Remove color" data-stack="nofill">×</button></span></span></div>`;
}
function stackCornerRow(d, always = false) {
  if (!always && !d.background && !d.stroke) return '';
  const each = d.corners;
  const seg = (v, label, on, icon) => `<button type="button" role="radio" class="st-corner-btn${on ? ' is-on' : ''}" aria-checked="${on}" aria-label="${label}" data-stack="corners:${v}">${pi(icon)}</button>`;
  const four = each ? `<span class="st-corners">${[['Top left', 0], ['Top right', 1], ['Bottom right', 2], ['Bottom left', 3]].map(([n, k]) => `<input type="text" aria-label="${n} corner radius" data-stack-field="c${k}" value="${each[k]}">`).join('')}</span>` : '';
  return `<div class="sp-row st-row-corner${each ? ' is-four' : ''}"><span class="sp-label">Corner</span><span class="st-corner-seg" role="radiogroup" aria-label="Corner">${seg(0, 'Uniform corner radii', !each, '<rect x="6" y="6" width="12" height="12" rx="3"/>')}${seg(1, 'Individual corner radii', !!each, '<path d="M6 10V6h4M14 6h4v4M18 14v4h-4M10 18H6v-4"/>')}</span><label class="st-corner-field"><input type="text" aria-label="Corner" data-stack-field="corner" value="${each ? (each.every((v) => v === each[0]) ? `${each[0]}px` : 'Mixed') : `${d.corner || 0}px`}">${always && !each ? '<span class="bp-vscrub is-bare" data-scrub="corner" aria-hidden="true"></span>' : ''}${always && (d.corner || each) ? '<button type="button" class="st-corner-reset" aria-label="Reset to default value" data-stack="cornerreset">×</button>' : ''}</label>${four}</div>`;
}

// A value with a range under it (BLOCKDESIGN.json): Blur Amount and custom Padding.
const rangeRow = (label, key, v, unit, max) => `<div class="bp-range"><div class="bp-range-head"><span class="sp-label">${label}</span><input type="text" aria-label="${label}" data-design="${key}" value="${v}${unit}"></div><input type="range" aria-label="${label}" data-design="${key}" min="0" max="${max}" step="1" value="${v}"></div>`;
const colorRow = (label, act, color) => `<div class="sp-row"><span class="sp-label">${label}</span><span class="sp-ctl"><button type="button" class="bp-swatch sh-swatch-btn" data-shape-act="${act}" aria-label="${label}"><i style="background:${esc(color)}"></i></button></span></div>`;
const sml = (d, key, def, labels) => ['S', 'M', 'L'].map((k, n) => `<button type="button" role="radio" class="sp-seg sp-txt${(d[key] || def) === k ? ' is-on' : ''}" aria-checked="${(d[key] || def) === k}" data-dset="${key}" data-v="${k}" aria-label="${labels ? labels[n] : k}">${k}</button>`).join('');
const dots = (d, key, label) => `<button type="button" role="radio" class="sp-seg sp-txt${d[key] === 'custom' ? ' is-on' : ''}" aria-checked="${d[key] === 'custom'}" data-dset="${key}" data-v="custom" aria-label="${label}">···</button>`;
const thickness = (d, def) => `<div class="sp-row"><span class="sp-label">Thickness</span><span class="sp-ctl">${sml(d, 'strokeSize', def)}${dots(d, 'strokeSize', 'Custom thickness')}</span></div>`
  + (d.strokeSize === 'custom' ? `<div class="sp-row sh-range"><input type="range" min="0" max="50" step="1" data-design="strokePx" aria-label="Thickness" value="${d.strokePx ?? STROKE_PX[def]}"><input type="text" data-design="strokePx" aria-label="Thickness value" value="${d.strokePx ?? STROKE_PX[def]}px"></div>` : '');
export const PAD_PCT = { S: 3, M: 6, L: 12 };

function strokeSegs(cur, kind = '') {
  const seg = (key, val, label, on, icon) => `<button type="button" role="radio" class="sp-seg${on ? ' is-on' : ''}" aria-checked="${on}" data-dset="${key}" data-v="${val}" aria-label="${label}">${icon}</button>`;
  return `<div class="sp-row"><span class="sp-label">Stroke</span><span class="sp-ctl${kind}">${seg('stroke', '', 'No Stroke', !cur, pi('<circle cx="12" cy="12" r="7"/><path d="M7 17L17 7"/>'))}${seg('stroke', 'solid', 'Solid Stroke', cur === 'solid', pi('<path d="M5 12h14"/>'))}${seg('stroke', 'dashed', 'Dashed Stroke', cur === 'dashed', pi('<path d="M4 12h3M10.5 12h3M17 12h3"/>'))}</span></div>`;
}
function strokeRows(d, stack = false, shape = false) {
  const cur = d.stroke || '', html = strokeSegs(cur);
  if (!cur) return html;
  // Stroke Color opens a popup, and three dots a range (SHAPESTYLES.json, BLOCKDESIGN.json). A new shape starts at M, the rest at S.
  if (stack) return html + `<div class="sp-row"><span class="sp-label">Stroke Color</span><span class="sp-ctl"><button type="button" class="bp-swatch" data-unbuilt disabled aria-label="Stroke Color"></button></span></div><div class="sp-row"><span class="sp-label">Thickness</span><span class="sp-ctl">${sml(d, 'strokeSize', 'S')}</span></div>`;
  return html + colorRow('Stroke Color', 'strokeColor', d.strokeColor || 'rgb(0, 0, 0)') + thickness(d, shape ? 'M' : 'S');
}
// A video's Appearance, empty or with a file (CAP-T7CORNER.json, CAP-T7DESIGN2.json, CAP-T7DESIGN3.json).
function videoAppearanceRows(d) {
  const white = 'rgb(255, 255, 255)', ink = (v) => (v === '' ? 'rgb(0, 0, 0)' : v || white), pct = (key, label, v) => `<label class="st-pad"><span class="st-pad-icon${{ padX: ' is-x', padT: ' is-t', padL: ' is-l', padB: ' is-b', padR: ' is-r' }[key] || ''}" aria-hidden="true"></span><input type="text" aria-label="${label}" data-design="${key}" value="${v}%"><span class="bp-vscrub is-bare is-edge" data-scrub="${key}" aria-hidden="true"></span></label>`;
  const y = d.padY ?? 6, x = d.padX ?? 6;
  const fill = d.background
    ? `<span class="st-color"><button type="button" class="bp-swatch sh-swatch-btn" data-shape-act="bgColor" aria-label="Color"><i style="background:${esc(ink(d.bgColor))}"></i></button><button type="button" class="st-color-x" aria-label="Remove color" data-dset="background">−</button></span>`
    : '<button type="button" class="st-add" aria-label="Add fill" data-dset="background" data-v="1">+</button>';
  const pads = !(d.background || d.stroke) ? '' : `<div class="st-row st-row-pad${d.padFour ? ' is-four' : ''}"><span class="sp-label">Padding</span><button type="button" class="st-pad-toggle" aria-label="${d.padFour ? 'Show vertical and horizontal padding controls' : 'Show individual padding controls'}" data-stack="vpad:${d.padFour ? 0 : 1}">${pi('<rect x="8" y="8" width="8" height="8"/>')}</button>${d.padFour
    ? `<span class="st-pads st-pads-four">${pct('padT', 'Padding top', d.padT ?? y)}${pct('padL', 'Padding left', d.padL ?? x)}${pct('padB', 'Padding bottom', d.padB ?? y)}${pct('padR', 'Padding right', d.padR ?? x)}</span>`
    : `<span class="st-pads">${pct('padY', 'Padding vertical', y)}${pct('padX', 'Padding horizontal', x)}</span>`}</div>`;
  const line = d.stroke ? `<div class="sp-row"><span class="sp-label">Thickness</span><span class="sp-ctl"><label class="bp-vfield"><input type="text" aria-label="Thickness" data-design="strokePx" value="${d.strokePx ?? 6}px"><span class="bp-vscrub" data-scrub="strokePx" aria-hidden="true"><svg width="14" height="8" viewBox="0 0 14 8" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 .5.5 4 4 7.5M10 .5 13.5 4 10 7.5"/></svg></span></label></span></div>${colorRow('Color', 'strokeColor', ink(d.strokeColor)).replace('sp-row', 'sp-row bp-vcolor')}` : '';
  return `<div class="bp-vrows"><div class="sp-row"><span class="sp-label">Background</span><span class="sp-ctl">${fill}</span></div>${pads}${strokeSegs(d.stroke || '', ' bp-vsegs')}${line}${stackCornerRow(d, true)}</div>${d.corner || d.corners?.some(Boolean) ? '<p class="bp-vhint">Design settings may obscure video controls.</p>' : ''}`;
}
// With a background or a stroke (BLOCKDESIGN.json): Corner, then Padding S, M, L or two ranges from 0 to 20.
function padRows(d) {
  const custom = d.pad === 'custom';
  return `<div class="bp-subhead">Padding</div><div class="bp-seg4" role="radiogroup" aria-label="Padding">${sml(d, 'pad', custom ? '' : 'M', ['small block background padding', 'medium block background padding', 'large block background padding'])}${dots(d, 'pad', 'Custom block background padding')}</div>`
    + (custom ? rangeRow('Top &amp; Bottom', 'padY', d.padY ?? 6, '%', 20) + rangeRow('Left &amp; Right', 'padX', d.padX ?? 6, '%', 20) : '');
}
// Blur (BLOCKDESIGN.json): Backdrop to start, or Element, with an amount from 0 to 100.
function blurRows(d) {
  const sw = `<label class="sp-switch"><input type="checkbox" data-design="blur" aria-label="Blur" ${d.blur ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const row = `<div class="sp-row"><span class="sp-label">Blur</span><span class="sp-ctl">${sw}</span></div>`;
  if (!d.blur) return row;
  const el = d.blurKind === 'element', seg = (v, label, on) => `<button type="button" role="radio" class="sp-seg sp-txt${on ? ' is-on' : ''}" aria-checked="${on}" data-dset="blurKind" data-v="${v}" aria-label="${label}">${label}</button>`;
  return row + `<div class="bp-seg2" role="radiogroup" aria-label="Blur type">${seg('element', 'Element', el)}${seg('', 'Backdrop', !el)}</div>`
    + (el ? '' : '<p class="bp-note bp-blur-note">Blurred backgrounds are more noticeable when the opacity is lower.</p>')
    + rangeRow('Blur Amount', 'blurPx', d.blurPx ?? 15, 'px', 100);
}
// The Design tab of a text block, and for now of the types not yet read (BLOCKDESIGN.json).
function appearanceRows(d) {
  const boxed = d.background || d.stroke;
  return `<div class="sp-row"><span class="sp-label">Background</span><span class="sp-ctl"><label class="sp-switch"><input type="checkbox" data-design="background" aria-label="Background" ${d.background ? 'checked' : ''}><span aria-hidden="true"></span></label></span></div>`
    + (d.background ? colorRow('Background Color', 'bgColor', d.bgColor || 'rgb(255, 255, 255)') : '')
    + strokeRows(d)
    + (boxed ? stackCornerRow(d) + padRows(d) : '');
}
const MORE = '<button type="button" class="bp-more" data-shape-act="more" aria-label="More actions" aria-haspopup="listbox">···</button>';

const BUTTON_STYLES = [['primary', 'Primary Button'], ['secondary', 'Secondary Button'], ['tertiary', 'Tertiary Button']];
function buttonStyleHtml(style, open) {
  const c = { style };
  const aa = '<span class="bp-bs-aa">Aa</span>';
  const name = BUTTON_STYLES.find(([k]) => k === c.style)[1];
  const list = !open ? '' : `<div class="bp-bs-list" role="listbox" aria-label="Button style">${BUTTON_STYLES.map(([k, n]) => `<button type="button" role="option" class="bp-bs-opt" aria-selected="${k === c.style}" data-bpstyle="${k}">${aa}<span>${n}</span>${k === c.style ? pi('<path d="M5 12.5l4.5 4.5L19 7.5"/>') : ''}</button>`).join('')}<button type="button" class="bp-bs-edit" data-bpstyle-edit>Edit Button Styles</button></div>`;
  return `<div class="bp-bs-wrap"><button type="button" class="bp-bs-cur" data-bpstyle-toggle aria-haspopup="listbox" aria-expanded="${open}">${aa}<span>${name}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button>${list}</div>`;
}
function buttonDesignHtml(c, open) {
  const seg = (key, v, label, on, inner) => `<button type="button" role="radio" class="sp-seg sp-txt${on ? ' is-on' : ''}" aria-checked="${on}" data-btn-set="${key}" data-v="${v}" aria-label="${label}">${inner}</button>`;
  const line = (l, body) => `<div class="sp-row bp-btn-row"><span class="sp-label">${l}</span><span class="sp-ctl">${body}</span></div>`;
  return `<div class="bp-bs-title">Button style</div>${buttonStyleHtml(c.style, open)}`
    + line('Layout', seg('fit', '1', 'Fit', c.fit, 'Fit') + seg('fit', '', 'Fill', !c.fit, 'Fill'))
    + (c.fit ? line('Alignment', [['left', 'Align Left', '<path d="M5 5v14M19 12H9M13 8l-4 4 4 4"/>'], ['center', 'Align Center', '<path d="M12 5v14M4 12h5M6.5 9.5L9 12l-2.5 2.5M20 12h-5M17.5 9.5L15 12l2.5 2.5"/>'], ['right', 'Align Right', '<path d="M19 5v14M5 12h10M11 8l4 4-4 4"/>']].map(([v, l, icon]) => seg('align', v, l, c.align === v, pi(icon))).join('')) : '');
}

// A shape's popups (parity/findings/SHAPESTYLES.json): the style picker, and Color and Stroke Color.
const shapeThumb = (s) => `<svg class="sh-thumb" viewBox="0 0 ${s.d ? `${s.w} ${s.h}` : '1 1'}" width="43" height="43" aria-hidden="true">${s.d ? `<path d="${s.d}"/>` : '<rect width="1" height="1"/>'}</svg>`;
export const shapePickerHtml = (cur) => `<div class="sh-grid" role="radiogroup" aria-label="Shape style">${SHAPES.map((s) => `<button type="button" role="radio" class="sh-tile${s.id === (cur || 'rectangle') ? ' is-on' : ''}" aria-checked="${s.id === (cur || 'rectangle')}" aria-label="${s.label}" data-shape-pick="${s.id}">${shapeThumb(s)}</button>`).join('')}</div>`;
// c: { swatches: [hex], rgb: [r, g, b], a: 0-1, set: did the user pick one, custom: null or { h, s, v, format }, opacity: show the bar }.
export function shapeColorHtml(c) {
  const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  const now = hex(c.rgb), css = c.a < 1 ? `rgba(${c.rgb.join(', ')}, ${c.a})` : `rgb(${c.rgb.join(', ')})`;
  // After Reset on a video nothing is picked: no ring, no bar and no Alpha, and Custom color starts at Hex (CAP-T7COLOR.json).
  const on = !c.unset && (c.a === 1 || c.keepAlpha) && c.swatches.includes(now) ? now : null;
  const swatch = (label, value, bg, checked) => `<label class="sh-swatch"><span style="background:${bg}"></span><input type="checkbox" aria-label="Color ${label}" data-color-pick="${value}"${checked ? ' checked' : ''}></label>`;
  // In the Custom color view the +'s place shows the color now, ringed, while nothing is picked or it is no swatch (CAP-L6ROWS.json).
  const sixth = c.custom && (!on || !c.set);
  const row = c.swatches.map((h) => swatch(h, h, h, h === on && !sixth)).join('') + (c.custom ? (sixth ? swatch(css, css, css, true) : '') : '<button type="button" class="sh-plus" data-color-custom aria-label="Custom color">+</button>');
  const hexView = c.custom?.format === 'hex'; // Hex has no Opacity bar or Alpha cell (CAP-T6CUSTOM.json).
  const bar = !c.unset && !hexView && (c.opacity || c.custom) ? `<input type="range" class="sh-opacity" aria-label="Opacity slider" min="0" max="100" data-color-alpha value="${Math.round(c.a * 100)}" style="--c:${now}">` : '';
  const field = (label, v) => `<input type="text" aria-label="${label}" data-color-field="${label}" value="${v}">`;
  let fields = '';
  if (c.custom) {
    const f = c.custom.format, alpha = c.unset || hexView ? '' : field('Alpha', `${Math.round(c.a * 100)}%`);
    const [h, s, l] = c.hsl;
    const body = f === 'hex' ? field('Hex', now) : f === 'hsl' ? field('Hue', Math.round(h)) + field('Saturation', Math.round(s)) + field('Lightness', Math.round(l)) : field('Red', c.rgb[0]) + field('Green', c.rgb[1]) + field('Blue', c.rgb[2]);
    fields = `<div class="sh-fields"><select class="sh-fmt-${f}" aria-label="Color format" data-color-format>${[['hex', 'Hex'], ['rgb', 'RGB'], ['hsl', 'HSL']].map(([v, l2]) => `<option value="${v}"${v === f ? ' selected' : ''}>${l2}</option>`).join('')}</select><span class="sh-cells">${body}${alpha}</span></div>`;
  }
  const map = c.custom ? `<div class="sh-map" style="background-color:hsl(${c.custom.h} 100% 50%)"><i role="slider" aria-label="Color Map" style="left:${c.custom.s * 100}%;top:${(1 - c.custom.v) * 100}%;background:${now}"></i></div>` : '';
  const hue = c.custom ? `<div class="sh-hue"><i role="slider" aria-label="Hue slider" style="left:calc(11px + (100% - 22px) * ${c.custom.h / 360})"></i></div>` : '';
  // The top row on a video's Background: one choice, Color, and a press changes nothing (CAP-T7COLOR.json, CAP-T7COLOR3.json).
  const tabs = c.tabs ? '<div class="sh-tabs" role="radiogroup"><button type="button" role="radio" aria-checked="true" aria-label="Color"><svg viewBox="0 0 22 22" width="22" height="22" aria-hidden="true"><rect x="3" y="5" width="16" height="12" fill="#ccc" stroke="currentColor" stroke-width="2"/></svg></button></div>' : '';
  return `${tabs}${map}<div class="sh-swatches">${row}</div>${hue}${bar}${fields}${c.set || (c.custom && !c.unset) ? '<button type="button" class="sh-reset" data-color-reset>Reset to theme</button>' : ''}`;
}

// Social Links (T11.json). The list is one for the whole site, so a change shows in every social block.
const GRIP = '<span class="bp-acc-grip bp-soc-grip" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
function socialContentHtml(c, open) {
  if (open?.startsWith('soc-row:')) {
    const n = Number(open.slice(8)), l = c.links[n], k = socialKind(l.url) || { name: l.url };
    return `<div class="bp-sub"><button type="button" class="bp-back" data-social="back">${pi('<path d="M15 6l-6 6 6 6"/>')}Back</button><span>${esc(k.name)}</span></div>`
      + `<label class="bp-soccap bp-soccap-top" for="bp-soc-url">Profile Link</label><input class="bp-socf" id="bp-soc-url" type="text" aria-label="Profile Link" data-soc-url="${n}" value="${esc(l.url)}">`
      + (c.err ? `<div class="bp-soc-err" role="alert">${esc(c.err)}</div>` : '')
      + `<div class="sp-row"><span class="sp-label">Display Social Icon</span><label class="sp-switch"><input type="checkbox" aria-label="Display Social Icon" data-soc-show="${n}"${l.hidden ? '' : ' checked'}><span aria-hidden="true"></span></label></div>`
      + `<button type="button" class="bp-soc-del" data-social="delete:${n}">Delete Social Link</button>`;
  }
  const rows = c.links.map((l, n) => {
    const k = socialKind(l.url) || { net: 'url', name: l.url };
    return `<div class="bp-soc-row" data-social="open:${n}">${GRIP}<span class="bp-soc-ic">${socialGlyph(k.net === 'facebook' ? 'facebookRound' : k.net)}</span><span class="bp-soc-name">${esc(k.name)}</span><span class="bp-soc-state">${l.hidden ? 'hidden' : 'visible'}</span><button type="button" class="bp-soc-go" aria-label="Navigate to ${esc(k.name)}">${pi('<path d="M9 6l6 6-6 6"/>')}</button></div>`;
  }).join('');
  return rows + (open === 'soc-add'
    ? `<input class="bp-socf bp-soc-new" type="text" aria-label="Add Social Link" data-soc-add>${c.err ? `<div class="bp-soc-err" role="alert">${esc(c.err)}</div>` : ''}`
    : '<button type="button" class="bp-soc-add" data-social="add">Add Social Link</button>');
}
const socIcon = { None: '<circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/>', Square: '<rect x="5" y="5" width="14" height="14"/>', Circle: '<circle cx="12" cy="12" r="8"/>', Rounded: '<rect x="5" y="5" width="14" height="14" rx="3.5"/>', Left: '<path d="M5 5v14M19 12H9M12 8.5L8.5 12l3.5 3.5"/>', Center: '<path d="M12 5v14M3 12h6M6.5 8.5L10 12l-3.5 3.5M21 12h-6M17.5 8.5L14 12l3.5 3.5"/>', Right: '<path d="M19 5v14M5 12h10M12 8.5l3.5 3.5-3.5 3.5"/>' };
function socialDesignHtml(c, d, open, pairs) {
  const seg = (key, v, cur, label, icon) => `<button type="button" role="radio" class="bp-sgrp-b${cur ? ' is-on' : ''}" aria-checked="${!!cur}"${icon ? ` aria-label="${label}"` : ''} data-soc-set="${key}" data-v="${v}">${icon ? pi(socIcon[label]) : label}</button>`;
  const group = (n, inner) => `<div class="bp-sgrp bp-sgrp-${n}" role="radiogroup">${inner}</div>`;
  const border = c.iconBorder || '';
  return `<div class="bp-soccap bp-soccap-first">Border</div>` + group(4, [['None', ''], ['Square', 'square'], ['Circle', 'circle'], ['Rounded', 'rounded']].map(([l, v]) => seg('iconBorder', v, border === v, l, true)).join(''))
    + (border ? group(3, Object.entries(SOCIAL_STYLES).map(([l, v]) => seg('iconStyle', v, (c.iconStyle || 'knockout') === v, l)).join('')) : '')
    + (border && c.iconStyle === 'border' ? `<div class="bp-soc-thick"><span class="sp-label">Thickness</span><input type="text" class="bp-soc-tv" aria-label="Thickness" value="${c.iconThick ?? 2}px" data-soc-thickfield><input type="range" aria-label="Thickness" min="1" max="5" step="1" value="${c.iconThick ?? 2}" data-soc-thick></div>` : '')
    + '<div class="bp-soccap">Alignment</div>' + group(3, [['Left', 'left'], ['Center', 'center'], ['Right', 'right']].map(([l, v]) => seg('align', v, (c.align || 'left') === v, l, true)).join(''))
    + '<div class="bp-soccap">Size</div>' + group(5, Object.keys(SOCIAL_SIZES).map((k) => seg('iconSize', k, (c.iconSize || 'S') === k, k)).join(''))
    + appearanceRows(d) + blendRow(d.blend || 'normal', open === 'blend') + blurRows(d)
    + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs}`;
}
// Map (T11.json): the map's values stay on the block.
const mapThumb = (id) => `<svg class="bp-map-thumb" viewBox="0 0 400 400" style="${mapVars(id)}" aria-hidden="true">${mapArt(false)}</svg>`;
export const mapStylesHtml = (cur) => MAP_STYLES.map(([name, id]) => `<button type="button" role="option" aria-selected="${id === cur}" class="bp-map-opt${id === cur ? ' is-on' : ''}" data-map-pick="${id}">${mapThumb(id)}<span>${name}</span>${id === cur ? pi('<path d="M5 12l5 5 9-10"/>') : ''}</button>`).join('');
// A form's Content tab (FORMADD.json). Form Name and Button Text work; the others are shown faded.
function formContentHtml(c) {
  const f = (key, label, v) => `<label class="bp-form-f"><span>${label}</span><input type="text" aria-label="${label}" data-content="${key}" value="${esc(v)}"></label>`;
  const row = (label, v = '') => `<button type="button" class="bp-form-nav" disabled data-unbuilt title="Not built yet"><span>${label}</span>${v ? `<em>${v}</em>` : ''}${pi('<path d="M9 6l6 6-6 6"/>')}</button>`;
  const act = (label) => `<button type="button" class="bp-form-act" disabled data-unbuilt title="Not built yet">${label}</button>`;
  const head = (t) => `<div class="bp-subhead">${t}</div>`;
  const go = `<button type="button" class="bp-form-nav" aria-label="Navigate to Edit Form Fields" data-ff="list"><span>Edit Form Fields</span>${pi('<path d="M9 6l6 6-6 6"/>')}</button>`;
  return f('formName', 'Form Name', c.formName) + f('button', 'Button Text', c.button) + go
    + head('Submissions') + go.replace(/Edit Form Fields/g, 'Edit Post-Submit').replace('data-ff="list"', 'data-ff="post"') + act('Manage Submissions') + act('Export Form Submissions')
    + head('Email Notification') + row('Additional Storage') + row('Google reCAPTCHA', 'On');
}
// A form's own Design rows (parity/findings/FORMADD.json). Form Style reaches every form on the site:
// shown as the oracle shows it, its list is not built and was read only.
const FORM_HIGHLIGHTS = [['none', 'None', 'NONE'], ['wave', 'Wave', '<i class="bp-fih-line"></i>'], ['double', 'Double Wave', '<i class="bp-fih-line"></i><i class="bp-fih-line"></i>'], ['glow', 'Glow', '<i class="bp-fih-box"></i>']];
function formDesignHtml(c, open) {
  const seg = (v, icon) => `<button type="button" role="radio" class="sp-seg sp-txt${c.buttonAlign === v ? ' is-on' : ''}" aria-checked="${c.buttonAlign === v}" aria-label="${v}" data-form-set="buttonAlign" data-v="${v}">${pi(icon)}</button>`;
  const hi = FORM_HIGHLIGHTS.find(([k]) => k === c.highlight);
  const tiles = !c.fihOpen ? '' : `<div class="bp-fih-grid" role="radiogroup" aria-label="First Input Highlight">${FORM_HIGHLIGHTS.map(([k, n, inner]) => `<button type="button" role="radio" class="bp-fih-tile bp-fih-tile--${k}${k === c.highlight ? ' is-on' : ''}" aria-checked="${k === c.highlight}" aria-label="${n}" data-form-set="highlight" data-v="${k}">${inner}</button>`).join('')}</div>`;
  return `<div class="bp-form-h">Form Style</div><div class="bp-form-style" data-unbuilt title="Not built yet"><span class="bp-form-style-in">Text</span><span class="bp-form-style-ok">${pi('<path d="M7 12.5l3.5 3.5L17 9"/>')}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</div><div class="bp-form-note">Form style affects all forms on your site.</div>`
    + `<div class="bp-form-h">Button Style</div>${buttonStyleHtml(c.buttonStyle, open)}`
    + `<div class="bp-form-h">Button Alignment</div><div class="bp-seg4 bp-form-seg" role="radiogroup" aria-label="Button Alignment">${seg('left', '<path d="M5 5v14M19 12H9M13 8l-4 4 4 4"/>')}${seg('center', '<path d="M12 5v14M4 12h5M6.5 9.5L9 12l-2.5 2.5M20 12h-5M17.5 9.5L15 12l2.5 2.5"/>')}${seg('right', '<path d="M19 5v14M5 12h10M11 8l4 4-4 4"/>')}${seg('stretch', '<path d="M5 5v14M19 5v14M8 12h8M10.5 9.5L8 12l2.5 2.5M13.5 9.5L16 12l-2.5 2.5"/>')}</div>`
    + `<button type="button" class="bp-fih-row" data-fih-toggle aria-expanded="${!!c.fihOpen}"><span>First Input Highlight</span><em>${hi[1]}</em>${pi('<path d="M7 10l5 5 5-5"/>')}</button>${tiles}`
    + `<div class="sp-row"><span class="sp-label">Lightbox</span><label class="sp-switch"><input type="checkbox" aria-label="Lightbox" data-form-lightbox${c.lightbox ? ' checked' : ''}><span aria-hidden="true"></span></label></div>`
    + (!c.lightbox ? '' : `<label class="sp-row bp-lb-text"><span class="sp-label">Button Text</span><input type="text" aria-label="Button Text" placeholder="Open Form" data-form-lbtext value="${esc(c.lightboxText)}"></label>${colorRow('Background Color', 'lightboxBg', c.lightboxBg)}`);
}
// Quote's Content tab (CAP-T12QUOTE.json): a caption and a field that grows by 22px lines, with a rule 10px under it.
const quoteContentHtml = (c) => [['quote', 'Quote', 'Add a quote'], ['source', 'Source', 'Add a quote source']]
  .map(([k, l, ph]) => `<div class="bp-qf"><label class="bp-soccap" for="bp-q-${k}">${l}</label><textarea id="bp-q-${k}" class="bp-qta" rows="1" aria-label="${l}" placeholder="${ph}" data-content="${k}" spellcheck="false">${esc(c[k])}</textarea></div>`).join('');
// Newsletter's tabs (CAP-T12NEWSLETTER.json). Title, Description, Disclaimer, Button Text and Show Name Field change the
// block; Form Name is kept. Description and Disclaimer are plain fields here: a new line makes a paragraph on the block.
// The Form Name tip, Require First and Last Name and Post-Submit as CAP-T12NLPOST.json read them. Learn More and the
// Storage rows are out of scope (0005): a link out, and form storage.
const nlCap = (k, label) => `<label class="bp-nl-cap" for="bp-nl-${k}">${label}</label>`;
const nlLine = (k, label, ph, v) => `<div class="bp-nl-f">${nlCap(k, label)}<input id="bp-nl-${k}" class="bp-nl-in" type="text" aria-label="${label}" placeholder="${ph}" data-content="${k}" value="${esc(v)}" autocomplete="off" spellcheck="false"></div>`;
const nlArea = (k, label, v) => `${nlCap(k, label)}<div class="bp-nl-box"><textarea id="bp-nl-${k}" class="bp-nl-ta" aria-label="${label}" data-content="${k}" spellcheck="false">${esc(v)}</textarea></div>`;
const nlRow = (label, ctl, nav, cls = '') => `<div class="sp-row bp-nl-row${cls}"><span class="sp-label">${label}</span>${nav ? `<button type="button" class="bp-nl-go" aria-label="Navigate to ${label}"${nav === true ? ' disabled data-unbuilt title="Not built yet"' : ` data-ff="${nav}"`}>${pi('<path d="M9 6l6 6-6 6"/>')}</button>` : ctl}</div>`;
const nlSwitch = (k, label, on) => `<label class="sp-switch"><input type="checkbox" aria-label="${label}" data-nl-set="${k}"${on ? ' checked' : ''}><span aria-hidden="true"></span></label>`;
// The Form Name tip shows on hover, above the ? (CAP-T12NLPOST.json, tip).
const NL_TIP = 'Use a descriptive name to identify form submissions. The name also appears in the title of the Lightbox version of this form.';
const NL_HELP = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="M8.8 8.9a2.2 2.2 0 1 1 3.1 2c-.6.3-.9.8-.9 1.4v.4" stroke-linecap="round"/><circle cx="11" cy="15.2" r=".4" fill="currentColor"/></svg>';
function newsletterContentHtml(c) {
  return `<p class="bp-nl-note">Add a sign-up to your site to begin collecting mailing list subscribers. <span class="bp-nl-u" data-unbuilt title="Not built yet">Learn More.</span></p>`
    + `<div class="bp-nl-name"><label for="bp-nl-nlFormName">Form Name</label><input id="bp-nl-nlFormName" type="text" aria-label="Form Name" placeholder="Enter a name" data-content="nlFormName" value="${esc(c.nlFormName)}" autocomplete="off" spellcheck="false"><button type="button" class="bp-nl-help" aria-label="Form Name help" data-tip="${NL_TIP}" data-tip-above>${NL_HELP}</button></div>`
    + nlLine('nlTitle', 'Title', 'Enter a title', c.nlTitle) + nlArea('nlDesc', 'Description', c.nlDesc) + nlArea('nlDisc', 'Disclaimer', c.nlDisc)
    + nlLine('nlButton', 'Button Text', 'Sign Up', c.nlButton)
    + nlRow('Show Name Field', nlSwitch('nlName', 'Show Name Field', c.nlName))
    + (c.nlName ? nlRow('Require First Name', nlSwitch('nlReqFirst', 'Require First Name', c.nlReqFirst), false, ' bp-nl-req') + nlRow('Require Last Name', nlSwitch('nlReqLast', 'Require Last Name', c.nlReqLast), false, ' bp-nl-req') : '')
    + nlRow('Post-Submit', '', 'post');
}
const NL_ALIGN = [['left', 'alignLeft', '<path d="M5 5v14M19 12H9M13 8l-4 4 4 4"/>'], ['center', 'alignCenter', '<path d="M12 5v14M4 12h5M6.5 9.5L9 12l-2.5 2.5M20 12h-5M17.5 9.5L15 12l2.5 2.5"/>'], ['right', 'alignRight', '<path d="M19 5v14M5 12h10M11 8l4 4-4 4"/>']];
function newsletterDesignHtml(c) {
  const seg = (key, v, label, on, inner, def) => `<button type="button" role="radio" class="bp-nl-seg${on ? ' is-on' : ''}" aria-checked="${on}" aria-label="${label}" data-nl-set="${key}" data-v="${v === def ? '' : v}">${inner}</button>`;
  return `<div class="bp-nl-cap bp-nl-dcap">Layout</div><div class="bp-nl-segs bp-nl-two" role="radiogroup" aria-label="Layout">${[['stack', 'Stack'], ['float', 'Float']].map(([v, l]) => seg('nlLayout', v, l, c.nlLayout === v, l, 'float')).join('')}</div>`
    + `<div class="bp-nl-cap bp-nl-dcap">Alignment</div><div class="bp-nl-segs" role="radiogroup" aria-label="Alignment">${NL_ALIGN.map(([v, l, icon]) => seg('nlAlign', v, l, c.nlAlign === v, pi(icon), 'center')).join('')}</div>`;
}
const newsletterStorageHtml = () => `<p class="bp-nl-note bp-nl-snote"><span class="bp-nl-u" data-unbuilt title="Not built yet">Learn more</span> about how we handle your customers’ personal information.</p>`
  + `<button type="button" class="bp-nl-store" disabled data-unbuilt title="Not built yet"><span><b>Squarespace</b><em>Confirmation Email Off</em></span>${pi('<path d="M9 6l6 6-6 6"/>')}</button>`
  + nlRow('Other Storage Options', '', true);
function mapContentHtml(c) {
  const f = (key, label, ph) => `<label class="bp-mapf"><span class="bp-soccap">${label}</span><input class="bp-socf" type="text" aria-label="${label}" placeholder="${ph}" data-content="${key}" value="${esc(c[key] || '')}"></label>`;
  return f('mapName', 'Business Name', 'Squarespace') + f('mapAddress', 'Address', '8 Clarkson St') + f('mapCity', 'City, State, Zip Code', 'New York, NY, 10014') + f('mapCountry', 'Country', 'United States');
}
function mapDesignHtml(c, pairs) {
  const name = MAP_STYLES.find(([, id]) => id === c.style)[0];
  const sw = (key, on, label) => `<div class="sp-row"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" data-map-set="${key}"${on ? ' checked' : ''}><span aria-hidden="true"></span></label></div>`;
  return `<button type="button" role="combobox" class="bp-map-style" data-shape-act="mapstyle" aria-haspopup="listbox" aria-label="${name}">${mapThumb(c.style)}<span>${name}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button>`
    + '<div class="bp-soccap bp-map-cap">Elements</div>'
    + `<div class="bp-map-zoom"><span class="sp-label">Zoom</span><input type="text" aria-label="Zoom" data-map-zoomfield value="${MAP_ZOOMS[c.zoom] ?? c.zoom}"><span class="bp-map-x">x</span><button type="button" aria-label="decrement" data-map-zoom="-1"${c.zoom <= 0 ? ' disabled' : ''}>${pi('<path d="M5 12h14"/>')}</button><button type="button" aria-label="increment" data-map-zoom="1"${c.zoom >= MAP_ZOOMS.length - 1 ? ' disabled' : ''}>${pi('<path d="M12 5v14M5 12h14"/>')}</button></div>`
    + sw('mapLabels', c.labels, 'Labels') + sw('mapTerrain', c.terrain, 'Terrain') + sw('mapControls', c.controls, 'Controls')
    + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs}`;
}

export function blockPanelHtml(d, tab, content = null, open = null, shape = null, image = null, stack = null, button = null, kid = null) {
  if (image && open?.startsWith('image-shape:')) return imageShapeHtml(image.shapeId, open.slice(12));
  if (image && open === 'image-fx') return effectPanelHtml(image);
  if ((content?.kind === 'form' || content?.kind === 'newsletter') && open?.startsWith('ff-')) return formFieldsPanelHtml(content, open, linkField);
  if (content?.kind === 'standin' && open?.startsWith('sp-view:')) return standinViewHtml(content, open.slice(8));
  const tabBtn = (t) => `<button type="button" role="tab" class="sp-tab${t === tab ? ' is-on' : ''}" aria-selected="${t === tab}" data-btab="${t}">${t}</button>`;
  const row = (label, control) => `<div class="sp-row"><span class="sp-label">${label}</span><span class="sp-ctl">${control}</span></div>`;
  const sw = (key, on, label) => `<label class="sp-switch"><input type="checkbox" data-design="${key}" aria-label="${label}" ${on ? 'checked' : ''}><span aria-hidden="true"></span></label>`;
  const box = ([k, l, , , , axis]) => `<label class="bp-box sc-box">${barHtml(d[k], designRange(k))}<input type="text" data-design="${k}" aria-label="${axis ? `${l} ${axis}` : l}" value="${designText(k, d[k])}" autocomplete="off" spellcheck="false">${HITS}${axis ? `<b class="an-axis">${axis}</b>` : ARROWS}${resetBtn(`data-design-reset="${k}"`, Number(d[k]) !== DESIGN_DEFAULTS[k])}</label>`;
  let body;
  if (tab === 'Content' && content?.kind === 'standin') {
    body = standinContentHtml(content);
  } else if (tab === 'Formatting Help' && content?.kind === 'standin') {
    body = standinHelpHtml(content);
  } else if (tab === 'Content' && content) {
    body = image ? imageContentHtml(content) : content.kind === 'social' ? socialContentHtml(content, open) : content.kind === 'form' ? formContentHtml(content) : content.kind === 'map' ? mapContentHtml(content) : content.kind === 'quote' ? quoteContentHtml(content) : content.kind === 'newsletter' ? newsletterContentHtml(content) : content.kind === 'markdown' ? markdownContentHtml(content) : content.kind === 'code' ? codeContentHtml(content) : content.kind === 'embed' ? embedContentHtml(content, open) : content.kind === 'accordion' ? accordionContentHtml(content, open) : content.kind === 'video' ? videoContentHtml(content) : buttonContentHtml(content);
  } else if (tab === 'Storage') {
    body = newsletterStorageHtml();
  } else if (tab === 'Design' && content?.kind === 'newsletter') {
    body = newsletterDesignHtml(content) + appearanceRows(d) + blendRow(d.blend || 'normal', open === 'blend') + blurRows(d); // no transforms
  } else if (tab === 'Design' && content?.kind === 'accordion') {
    body = accordionDesignHtml(content, open, d);
  } else if (tab === 'Design') {
    const pairs = [];
    for (let i = 0; i < DESIGN_FIELDS.length; i++) {
      const f = DESIGN_FIELDS[i];
      if (f[5] === 'X') { pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span><span class="bp-pair">${box(f)}${box(DESIGN_FIELDS[i + 1])}</span></div>`); i++; }
      else pairs.push(`<div class="bp-trow"><span class="sp-label">${f[1]}</span>${box(f)}</div>`);
    }
    pairs.push(`<div class="bp-trow"><span class="sp-label">Anchor</span><button type="button" class="bp-anchor" data-shape-act="anchor" aria-label="Position" aria-haspopup="true">${anchorGlyph(d.ox, d.oy)}</button></div>`);
    // A video (MEDIAEMPTY.json, CAP-T7DESIGN2.json): Appearance, Transforms, Effects.
    if (content?.kind === 'social') body = socialDesignHtml(content, d, open, pairs.join(''));
    else if (content?.kind === 'map') body = mapDesignHtml(content, pairs.join(''));
    else if (content?.kind === 'video') body = '<div class="bp-thead"><span>Appearance</span></div>' + videoAppearanceRows(d)
      + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs.join('')}`
      + '<div class="bp-thead bp-vfx"><span>Effects</span></div>' + videoBlendRow(d.blend || 'normal') + blurRows(d);
    // Code, embed and Line blocks (CODEEMBED.json, T11.json) and a form as a Lightbox button have the transforms alone.
    else if (content?.kind === 'standin') {
      const sp = STANDIN_PANELS[content.name];
      body = standinDesignHtml(content)
        + (sp.look ? `<div class="bp-look-rows">${appearanceRows(d)}${blendRow(d.blend || 'normal', open === 'blend', true)}${blurRows(d)}</div>` : '')
        + (sp.transforms ? `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs.join('')}` : '');
    }
    else if (content?.kind === 'code' || content?.kind === 'embed' || content?.kind === 'line' || (content?.kind === 'form' && content.lightbox)) body = `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs.join('')}`;
    // A shape's Design tab (parity/findings/SHAPESTYLES.json):
    // shape style, Corner radius with Uniform or Individual radii, Stretch, Color, Blend Mode,
    // Drop Shadow, Blur, then the transforms.
    else if (shape) {
      const thumb = shapeThumb(shapeById(shape.shape));
      const four = shape.corners, mixed = four && new Set(four).size > 1;
      const fld = (n, label) => `<input type="text" class="sh-corner" aria-label="${label} corner radius" data-shape="corner:${n}" value="${four[n]}">`;
      const radii = shape.shape && shape.shape !== 'rectangle' ? '' : `<div class="sp-row sh-radii"><span class="bp-radii"><button type="button" role="radio" aria-checked="${!four}" class="sp-seg${four ? '' : ' is-on'}" aria-label="Uniform corner radii" data-shape-act="uniform">${pi('<rect x="5" y="5" width="14" height="14" rx="3"/>')}</button><button type="button" role="radio" aria-checked="${!!four}" class="sp-seg${four ? ' is-on' : ''}" aria-label="Individual corner radii" data-shape-act="individual">${pi('<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>')}</button></span><label class="bp-box sc-box bp-radius">${barHtml(mixed ? 0 : four ? four[0] : shape.radius, [0, 1000])}<input type="text" data-shape="radius" aria-label="Corner radius" value="${mixed ? 'Mixed' : `${four ? four[0] : shape.radius}px`}">${HITS}${resetBtn('data-corner-reset', mixed || (four ? four[0] : shape.radius) !== 0)}</label></div>${four ? `<div class="sp-row sh-corners">${fld(0, 'Top left')}${fld(1, 'Top right')}${fld(2, 'Bottom right')}${fld(3, 'Bottom left')}</div>` : ''}`;
      body = `<div class="sh-head">Shape style</div><button type="button" class="sh-style" data-shape-act="style" aria-haspopup="true" aria-label="Shape style">${thumb}<span class="sh-chev" aria-hidden="true">${pi('<path d="M7 10l5 5 5-5"/>')}</span></button>`
        + radii
        + '<div class="bp-shape-rows">'
        + row('Stretch', `<label class="sp-switch"><input type="checkbox" data-shape="stretch" aria-label="Stretch" ${shape.stretch ? 'checked' : ''}><span aria-hidden="true"></span></label>`)
        + '<div class="bp-thead"><span>Styling</span></div>'
        + row('Color', `<button type="button" class="bp-swatch sh-swatch-btn" data-shape-act="color" aria-label="Color"><i style="background:${esc(shape.color)}"></i></button>`)
        + blendRow(d.blend || 'normal', open === 'blend', true)
        + strokeRows({ ...d, strokeColor: d.strokeColor || shape.strokeInk }, false, true)
        + row('Drop Shadow', sw('shadow', d.shadow, 'Drop Shadow'))
        + blurRows(d)
        + '</div>'
        + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>`
        + pairs.join('');
    }
    // A button's Design tab (parity/findings/BUTTONDESIGN.json): Button style, Layout, Alignment
    // on Fit, the transforms.
    else if (button) body = buttonDesignHtml(button, open === 'bstyle') + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>${pairs.join('')}`;
    // An image's Design tab (parity/findings/IMAGEMODES.json) opens with Fit, Fill and Shape.
    else if (image) {
      const seg = (m, l) => `<button type="button" role="radio" class="bp-mode${image.mode === m ? ' is-on' : ''}" aria-checked="${image.mode === m}" aria-label="${l}" data-image-mode="${m}">${l}</button>`;
      const sw = (l, key, on) => row(l, `<label class="sp-switch"><input type="checkbox" data-image-set="${key}" aria-label="${l}"${on ? ' checked' : ''}><span aria-hidden="true"></span></label>`);
      const sel = (l, key, v) => `<div class="sp-row bp-image-sel"><span class="sp-label">${l}</span><button type="button" class="an-sel" data-image-sel="${key}" aria-haspopup="listbox" aria-label="${l}"><span>${v}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button></div>`;
      const four = image.corners, mixed = four && new Set(four).size > 1;
      const fld = (n, label) => `<input type="text" class="sh-corner" aria-label="${label} corner radius" data-shape="corner:${n}" value="${four[n]}">`;
      // Corner: Uniform or Individual radii, as a shape's (IMAGEDESIGN.json); Individual starts from the Uniform value.
      const corner = `<div class="sp-row bp-image-corner"><span class="sp-label">Corner</span><span class="sh-radii"><span class="bp-radii"><button type="button" role="radio" aria-checked="${!four}" class="sp-seg${four ? '' : ' is-on'}" aria-label="Uniform corner radii" data-shape-act="uniform">${pi('<rect x="5" y="5" width="14" height="14" rx="3"/>')}</button><button type="button" role="radio" aria-checked="${!!four}" class="sp-seg${four ? ' is-on' : ''}" aria-label="Individual corner radii" data-shape-act="individual">${pi('<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>')}</button></span><label class="bp-box sc-box bp-radius">${barHtml(mixed ? 0 : four ? four[0] : image.corner, [0, 1000])}<input type="text" data-shape="radius" aria-label="Corner" value="${mixed ? 'Mixed' : `${four ? four[0] : image.corner}px`}">${HITS}${resetBtn('data-corner-reset', mixed || (four ? four[0] : image.corner) !== 0)}</label></span></div>${four ? `<div class="sp-row sh-corners">${fld(0, 'Top left')}${fld(1, 'Top right')}${fld(2, 'Bottom right')}${fld(3, 'Bottom left')}</div>` : ''}`;
      body = `<div class="bp-modes bp-image-modes" role="radiogroup" aria-label="Image mode">${seg('fit', 'Fit')}${seg('fill', 'Fill')}${seg('shape', 'Shape')}</div><div class="bp-image-rows">`
        + (image.mode === 'shape' ? `<button type="button" class="sp-row bp-rowbtn" data-image-nav="shape" aria-label="Navigate to Shape"><span class="sp-label">Shape</span><span class="bp-chip-v">${CHEV_R}</span></button>` + sw('Stretch', 'stretch', image.stretch) + '<div class="bp-image-gap"></div>' : corner)
        + (image.empty ? '' : `<button type="button" class="sp-row bp-rowbtn" data-fx-nav="list" aria-label="Navigate to Image Effect"><span class="sp-label">Image Effect</span><span class="bp-chip-v">${CHEV_R}</span></button>`
          + sw('Overlay', 'overlay', image.overlay) + (image.overlay ? colorRow('Color', 'overlay', image.overlayColor) + sel('Blend Mode', 'blend', image.blendName) : '')
          + sw('Lightbox', 'lightbox', image.lightbox) + (image.lightbox ? sel('Lightbox Theme', 'theme', image.themeName) : ''))
        + '</div>'
        + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>`
        + pairs.join('');
    }
    else if (stack) body = stackLayoutHtml(stack) + '<div class="bp-thead st-appearance"><span>Appearance</span></div>' + stackFillRow(d)
      + strokeRows(d, true) + stackCornerRow(d)
      + blendRow(d.blend || 'normal', open === 'blend')
      + blurRows(d)
      + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>`
      + pairs.join('');
    else body = `<div class="bp-look-rows">${appearanceRows(d)}${blendRow(d.blend || 'normal', open === 'blend', true)}${blurRows(d)}</div>`
      + `<div class="bp-thead"><span>Transforms</span>${MORE}</div>`
      + pairs.join('') + (content?.kind === 'quote' ? effectsRows(content.appear) : '');
  } else {
    // The Animation tab's list (anim-panel.js); its picker and editor replace the whole panel.
    body = open;
  }
  if (kid && tab === 'Design') body = kidSizeHtml(kid) + body;
  if (content?.kind === 'form' && tab === 'Design') body = formDesignHtml(content, open === 'bstyle') + body;
  if ((tab === 'Content' && (open === 'embed-data' || open?.startsWith('acc-item:') || open?.startsWith('soc-row:'))) || open === 'acc-dividers' || open === 'acc-title' || open === 'acc-desc') return `<div class="sp-body">${body}</div>`;
  const tabs = content?.kind === 'standin' ? standinTabs(content.name) : content?.kind === 'markdown' ? ['Content'] : content?.kind === 'newsletter' ? ['Content', 'Design', 'Storage'] : content?.kind === 'accordion' ? ['Content', 'Design'] : content?.kind === 'line' ? ['Design', 'Animation'] : content ? ['Content', 'Design', 'Animation'] : ['Design', 'Animation'];
  // The header is also the drag handle (U13): the oracle labels it Click and drag to reposition block editor form.
  // Tock's panel has no tab row (CAP-T12PANELS-C.json): its body is the whole panel.
  if (content?.kind === 'standin' && STANDIN_PANELS[content.name].bare) return `<div class="bp-drag is-bare" role="button" aria-label="Click and drag to reposition block editor form" data-drag-panel></div><div class="sp-body is-bare">${body}</div>`;
  return `<div class="bp-drag" role="button" aria-label="Click and drag to reposition block editor form" data-drag-panel></div><div class="sp-tabs" role="tablist">${tabs.map(tabBtn).join('')}</div><div class="sp-body">${body}</div>`;
}

// 18px right of the block and 3px below its top, in the stage's coordinates. With no room on the
// right it stays 20px from the stage's edge, over the block (parity/findings/CAP-T6PLACE.json).
export function blockPanelPosition(block, frame, stage, width = 320) {
  const ox = frame.left - stage.left, oy = frame.top - stage.top;
  const left = Math.max(0, Math.min(ox + block.right + 18, stage.width - width - 20));
  const top = Math.max(oy + 8, Math.min(oy + block.top + 3, stage.height - 500 - 8));
  return { left, top };
}

export const pinRangeValue = (off) => Math.max(0, Math.min(250, Math.round(off)));
// The Pin popover (parity/findings/PIN.json): 248 by 140, centred under the toolbar Pin button and
// 7px below it. Pin: four icon radios (Pin to Top, Center, Bottom on Scroll, Remove Pin); Offset: a
// text field and a 204px slider running 0 to 250. The field goes past the slider and keeps its unit;
// the slider shows the number, rounded and held to its range.
export function pinPopoverHtml(st) {
  const ic = { top: '<path d="M5 5h14M12 9v10M8 13l4-4 4 4"/>', center: '<path d="M5 12h14M12 4v4M12 16v4M9 6l3 2 3-2M9 18l3-2 3 2"/>', bottom: '<path d="M5 19h14M12 5v10M8 11l4 4 4-4"/>', remove: '<path d="M6 6l12 12M18 6L6 18"/>' };
  const radio = (k, label) => `<button type="button" role="radio" class="pin-opt${(st ? st.anchor : 'remove') === k ? ' is-on' : ''}" aria-checked="${(st ? st.anchor : 'remove') === k}" data-pin="${k}" aria-label="${label}">${pi(ic[k])}</button>`;
  const off = st ? st.offset : 0;
  const unit = st?.unit || 'px';
  return `<div class="pin-row"><span class="pin-label">Pin</span><span class="pin-opts">${radio('top', 'Pin to Top on Scroll')}${radio('center', 'Pin to Center on Scroll')}${radio('bottom', 'Pin to Bottom on Scroll')}${radio('remove', 'Remove Pin')}</span></div>`
    + `<div class="pin-row"><span class="pin-label">Offset</span><input class="pin-off" type="text" aria-label="Offset" data-pin-offset value="${off}${unit}"${st ? '' : ' disabled'}></div>`
    + `<input class="pin-range" type="range" aria-label="Offset" data-pin-range min="0" max="250" step="1" value="${pinRangeValue(off)}"${st ? '' : ' disabled'}>`;
}
