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

// Per block: its tabs (Animation is the shared list), its Content rows, and its Design rows before the shared ones.
// look: the shared Appearance rows follow (with an Appearance head); transforms: the Transforms rows follow.
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
};
export const standinPanelOf = (b) => (b.type === 'shape' && !b.standin && STANDIN_PANELS[b.label] ? b.label : null);
export const standinTabs = (name) => STANDIN_PANELS[name].tabs || ['Content', 'Design', 'Animation'];
export const standinContentHtml = (c) => `<div class="bp-sp">${STANDIN_PANELS[c.name].content.map((r) => r(c.values)).join('')}</div>`;
export const standinDesignHtml = (c) => `<div class="bp-sp bp-sp-design">${STANDIN_PANELS[c.name].design.map((r) => r(c.values)).join('')}</div>`;
