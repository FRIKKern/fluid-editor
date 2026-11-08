// The panels of the stand-ins that keep their plain tile (T12): each tab's rows as the oracle shows them, from
// CAP-T12PANELS-A.json to -C.json, and what a press does from CAP-T12PRESS-A.json to -D.json. The tile itself stays
// a sized stand-in (0005): none of these rows changed a block's rows on the oracle, so a press only keeps its value.
// Rows that need an account, a lookup, a collection or a payment are drawn faded and do nothing (0005's stand-in line).
// Note texts are copied from the read's screenshots.
import { escapeHtml as esc } from './render.js';

const pi = (p) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const CHEV = pi('<path d="M9 6l6 6-6 6"/>');
const OUT = 'disabled data-unbuilt title="Needs an outside account (0005)"';
const link = (t) => `<span class="bp-sp-u" data-unbuilt title="A link out (0005)">${t}</span>`;

// Row kinds. Each takes the block's values (b.sp) and gives its HTML.
const note = (html, cls = '') => () => `<p class="bp-sp-note${cls}">${html}</p>`;
const head = (label) => () => `<div class="bp-sp-head">${label}</div>`;
const rule = () => () => '<div class="bp-sp-rule"></div>';
const toggle = (key, label, def = false) => (v) => `<div class="sp-row bp-sp-row"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" data-sp-set="${key}"${(v[key] ?? def) ? ' checked' : ''}><span aria-hidden="true"></span></label></div>`;
const seg = (key, label, opts, def) => (v) => `<div class="bp-sp-seg"><span class="sp-label">${label}</span><div class="bp-sp-segs" role="radiogroup" aria-label="${label}">${opts.map(([val, l]) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? def) === val ? ' is-on' : ''}" aria-checked="${(v[key] ?? def) === val}" aria-label="${l}" data-sp-set="${key}" data-v="${val}">${l}</button>`).join('')}</div></div>`;
const field = (key, label, def, out = false) => (v) => `<label class="bp-sp-cap" for="bp-sp-${key}">${label}</label><input id="bp-sp-${key}" class="bp-sp-in" type="text" aria-label="${label}" ${out ? `placeholder="${esc(def)}" ${OUT}` : `data-sp-field="${key}" value="${esc(v[key] ?? def)}"`} autocomplete="off" spellcheck="false">`;
const range = (key, label, def, min, max) => (v) => `<div class="bp-sp-range"><div class="bp-sp-rhead"><span class="sp-label">${label}</span><input type="text" aria-label="${label}" data-sp-field="${key}" data-min="${min}" data-max="${max}" value="${v[key] ?? def}"></div><input type="range" aria-label="${label}" data-sp-range="${key}" min="${min}" max="${max}" step="1" value="${v[key] ?? def}" style="--p:${(((v[key] ?? def) - min) / (max - min)) * 100}%"></div>`;
const navOut = (label, sub) => () => `<button type="button" class="bp-sp-nav" aria-label="Navigate to ${label}" ${OUT}><span><span class="sp-label">${label}</span><em>${sub}</em></span>${CHEV}</button>`;
const card = (title, text) => () => `<button type="button" class="bp-sp-card" ${OUT}><span><b>${title}</b><em>${text}</em></span>${pi('<path d="M5 12h14M13 6l6 6-6 6"/>')}</button>`;
const box = (text) => () => `<div class="bp-sp-box">${text}</div>`;
const tile = () => () => `<div class="bp-sp-tile" ${OUT}></div>`;
// Audio's rows: a two-way choice the panel's width, a faded upload box, side fields, a row that opens a view not built.
const pair = (key, opts, def) => (v) => seg(key, 'Audio Source', opts, def)(v).replace('class="bp-sp-seg"', 'class="bp-sp-seg is-wide"');
const upload = (text) => () => `<button type="button" class="bp-sp-up" ${OUT}>${pi('<path d="M12 20V6M6 12l6-6 6 6M5 4h14"/>')}<span>${text}</span></button>`;
const side = (key, label) => (v) => `<div class="bp-sp-side"><span class="sp-label">${label}</span><input type="text" aria-label="${label}" data-sp-field="${key}" value="${esc(v[key] ?? '')}" autocomplete="off" spellcheck="false"></div>`;
const view = (label) => () => `<button type="button" class="bp-sp-view" aria-label="Navigate to ${label}" data-unbuilt title="Not built yet"><span class="sp-label">${label}</span>${pi('<path d="M10 7l5 5-5 5"/>')}</button>`;
const when = (test, row) => (v) => (test(v) ? row(v) : '');
// The older panel look Pricing Plan and Product keep: uppercase captions, rows with a rule under each.
const cap = (label) => () => `<div class="bp-sp-cap">${label}</div>`;
const erow = (key, label, def) => (v) => toggle(key, label, def)(v).replace('class="sp-row bp-sp-row"', 'class="sp-row bp-sp-erow"');
const ALIGN_ICONS = { left: '<path d="M6 5v14M19 12H10M13 9l-3 3 3 3"/>', center: '<path d="M12 5v14M3 12h6M6 9l3 3-3 3M21 12h-6M18 9l-3 3 3 3"/>', right: '<path d="M18 5v14M5 12h9M11 9l3 3-3 3"/>' };
const icons = (key, label, opts, def) => (v) => `<div class="bp-sp-icons" role="radiogroup" aria-label="${label}">${opts.map((o) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? def) === o ? ' is-on' : ''}" aria-checked="${(v[key] ?? def) === o}" aria-label="${o}" data-sp-set="${key}" data-v="${o}">${pi(ALIGN_ICONS[o])}</button>`).join('')}</div>`;
const darkOut = (text) => () => `<button type="button" class="bp-sp-dark" ${OUT}>${text}</button>`;
// Product's rows, in the same older look: a black head, a bordered box out, the image picker (not built), Corner, Ratio,
// a Focal Point that waits for an image, Block Alignment.
const phead = (label) => () => `<div class="bp-sp-phead">${label}</div>`;
const newOut = (text) => () => `<button type="button" class="bp-sp-new" ${OUT}>${pi('<path d="M12 5v14M5 12h14"/>')}<span>${text}</span></button>`;
const picker = () => () => `<button type="button" class="bp-sp-pick" aria-label="Image style" data-unbuilt title="Not built yet"><span></span>${pi('<path d="M7 10l5 5 5-5"/>')}</button>`;
const CORNER = [['uniform', 'Uniform corner radii', '<rect x="6" y="6" width="12" height="12" rx="2"/>'], ['each', 'Individual corner radii', '<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/>']];
const corner = (key, rkey) => (v) => `<div class="bp-sp-corner"><div class="bp-sp-csegs" role="radiogroup" aria-label="Corner">${CORNER.map(([val, l, d]) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? 'uniform') === val ? ' is-on' : ''}" aria-checked="${(v[key] ?? 'uniform') === val}" aria-label="${l}" data-sp-set="${key}" data-v="${val}">${pi(d)}</button>`).join('')}</div><input type="text" aria-label="Corner radius" data-sp-field="${rkey}" value="${esc(v[rkey] ?? '0px')}" autocomplete="off" spellcheck="false"></div>`;
const select = (key, label, opts, def) => (v) => `<label class="sp-row bp-sp-erow bp-sp-sel"><span class="sp-label">${label}</span><span class="bp-sp-selv">${esc(v[key] ?? def)}${pi('<path d="M7 10l5 5 5-5"/>')}</span><select aria-label="${label}" data-sp-set="${key}">${opts.map((o) => `<option${(v[key] ?? def) === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
const focal = () => () => `<button type="button" class="bp-sp-focal" disabled>${pi('<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/><circle cx="12" cy="12" r="1.5"/>')}<span>Focal Point</span></button>`;
const balign = (key, label) => (v) => `<div class="sp-row bp-sp-erow bp-sp-balign"><span class="sp-label">${label}</span><span class="bp-sp-bicons" role="radiogroup" aria-label="${label}">${['left', 'center', 'right'].map((o) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? 'left') === o ? ' is-on' : ''}" aria-checked="${(v[key] ?? 'left') === o}" aria-label="${o}" data-sp-set="${key}" data-v="${o}">${pi(ALIGN_ICONS[o])}</button>`).join('')}</span></div>`;

// Per block: its tabs (Animation is the shared list), its Content rows, and its Design rows before the shared ones.
// look: the shared Appearance rows follow (with an Appearance head); transforms: the Transforms rows follow.
// Pricing Plan's content by its Elements (CAP-T12PRESS-A.json at 8 columns, CAP-T12PRESS-E.json at 6): each part takes its own
// height, and only the Description wraps with the width, by what the whole content gains (DESK_HEIGHT in editor.js).
export const PLAN_PARTS = [['ppTitle', 'Title', 46], ['ppDesc', 'Description', 97], ['ppPrice', 'Price', 90.7], ['ppBenefits', 'Benefits', 96.8], ['ppButtonOn', 'Button', 88.6]];
// The content height with parts off, from the whole height at this width (all on).
export const planHeight = (b, all) => all - PLAN_PARTS.filter(([k]) => (b.sp || {})[k] === false).reduce((n, [k, , h]) => n + (k === 'ppDesc' ? h + all - 430.1 : h), 0);
export const STANDIN_PANELS = {
  Zola: {
    content: [note(`Enter your Zola registry name to display items<br>from your registry. ${link('Learn more')}<br>Sign up for a Zola registry ${link('here')}.`), field('zolaName', 'Registry Name', 'johnandjane', true), range('zolaItems', 'Items to Display', 4, 1, 12)],
    design: [toggle('zolaPad', 'Add Padding')], transforms: true,
  },
  'Search Field': {
    content: [note(`Add a search field to your page that returns<br>results from across your site, or limited to one<br>page. ${link('Learn more')}`), toggle('sfPage', 'Search specific page'), () => '<div class="bp-sp-label">Page</div>', box('<span>No collections found</span>')],
    design: [head('Style'), seg('sfTheme', 'Theme', [['dark', 'Dark'], ['light', 'Light']], 'dark'), rule(), head('Behavior'), toggle('sfPreview', 'Quick preview', true), note('A dropdown under the search block will allow a<br>quicker access to the search results.', ' bp-sp-dnote'), rule(), head('Appearance')], look: true, transforms: true,
  },
  Donation: {
    tabs: ['Content', 'Design'],
    content: [card('Set Up Payment Processor', 'This is required to start<br>receiving donations.'), navOut('Funds', 'General Fund'), field('donLabel', 'Fund Dropdown Label', 'Contribute to'), note('The dropdown label is shown when there is<br>more than one fund attached to this block.', ' bp-sp-wnote'), field('donButton', 'Button Text', 'Donate')],
    // Form style reaches every form on the site (0005, like T9's Form Style): its rows are left out.
    design: [tile(), note('Form style affects all forms on your site.', ' bp-sp-fnote')],
  },
  Audio: {
    // Upload File would put a file on the site, Add File Link's field loads an outside file (both 0005): the choice keeps its value.
    // Podcast opens a view of its own: drawn, not built.
    content: [pair('auSource', [['embedded', 'Upload File'], ['external', 'Add File Link']], 'embedded'), upload('Upload File'), head('Elements'), side('auTitle', 'Title'), side('auArtist', 'Artist'), toggle('auDownload', 'Download Link'), rule(), head('Metadata'), view('Podcast')],
    // Classic hides the Color row (CAP-T12PRESS-D.json).
    design: [head('Appearance'), seg('auStyle', 'Style', [['legacy', 'Classic'], ['minimal', 'Minimal']], 'minimal'), when((v) => (v.auStyle ?? 'minimal') !== 'legacy', seg('auColor', 'Color', [['dark', 'Dark'], ['light', 'Light']], 'dark')), rule()], transforms: true,
  },
  'Pricing Plan': {
    tabs: ['Content', 'Design'],
    content: [cap('Pricing Plan'), note(`Use pricing plans to sell your digital products. To<br>use this block, create at least one pricing plan.<br>${link('Learn more')}.`, ' bp-sp-pnote'), darkOut('Get started')],
    design: [cap('Alignment'), icons('ppAlign', 'Alignment', ['left', 'center', 'right'], 'left'), cap('Elements'), ...PLAN_PARTS.map(([k, l]) => erow(k, l, true)), field('ppButton', 'Button Text', 'Sign Up')],
  },
  Product: {
    // Create new product makes a product in the store (0005). Its rows follow neither the switches nor its content box by the
    // frozen rule (CAP-T12PRESS-A.json, -E.json): the switches and Ratio keep its rows (named misses).
    content: [phead('Product'), newOut('Create new product'), phead('Elements'), erow('pdImage', 'Image', true), erow('pdTitle', 'Title', true), erow('pdPrice', 'Price', true), erow('pdDesc', 'Description', false), erow('pdCart', 'Add to Cart Button', false), erow('pdQuick', 'Product Quick View', false), note('On hover, a button will appear that lets<br>customers dynamically access product details<br>without leaving the page.', ' bp-sp-qnote')],
    design: [phead('Image'), picker(), corner('pdCorner', 'pdRadius'), select('pdRatio', 'Ratio', ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', 'Original'], 'Original'), focal(), balign('pdAlign', 'Block Alignment')], look: true, transforms: true,
  },
};
export const standinPanelOf = (b) => (b.type === 'shape' && !b.standin && STANDIN_PANELS[b.label] ? b.label : null);
export const standinTabs = (name) => STANDIN_PANELS[name].tabs || ['Content', 'Design', 'Animation'];
export const standinContentHtml = (c) => `<div class="bp-sp">${STANDIN_PANELS[c.name].content.map((r) => r(c.values)).join('')}</div>`;
export const standinDesignHtml = (c) => `<div class="bp-sp bp-sp-design">${STANDIN_PANELS[c.name].design.map((r) => r(c.values)).join('')}</div>`;
