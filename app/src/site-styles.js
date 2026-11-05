// The Site Styles panel (U12, parity/findings/SITESTYLES.json, SITESTYLES2.json, 1600 by 1000
// window): the editor moves into a box 16px from the window edges and 320px from the right, and a
// panel on the right shows Site Styles with Close, a 276 by 144 Themes card, then Fonts, Colors,
// Buttons and Forms cards (226 by 104, each with a 44px disclosure, 11px apart) and Miscellaneous.
// A card opens a 342px popover 22px left of the editor's right edge, level with the card and never
// lower than 38px above the window's bottom: a heading, the pack tiles and Customize. The cards draw
// the site's current styles. A 44px disclosure swaps the panel for that pack's view, with a back
// button. Works: Base Size and Reset in Fonts and Buttons, Headings, Paragraphs, Animations, Spacing and
// the packs we hold in each list panel (parity/findings/CAP-SITESTYLEROWS.json), Edit Palette and Edit
// Color Theme's rows (CAP-THEMEROWS.json), each button type's rows (CAP-BUTTONROWS.json), the Forms rows, Form Spacing and pack picks (CAP-FORMROWS.json). Faded and not built (data-unbuilt): the other rows of a view, Customize.
import { PALETTES, FONT_PACKS, BUTTON_PACKS, FORM_PACKS, THEMES, VARS, TYPE_DEFAULTS, SPACE_DEFAULTS, BASE_VARS, resolveSiteStyles, fontLink, baseSize } from './site-style-packs.js';
import { paletteHtml } from './site-palette.js';
import { ROW_GROUPS, rowValue, rowCss } from './theme-rows.js';
import { TIERS, TIER_NAMES, SHAPES, tierValues, sameTier, tierSample } from './button-tiers.js';
import { FORM_SHAPES, formValues, formRadius, formFill } from './form-rows.js';

const svg = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHEV = '<path d="M9 6l6 6-6 6"/>';
const CHECK = '<path d="M6 12l4 4 8-8"/>';
const hsl = (v) => `hsl(${v})`;
const swatches = (vars) => { const v = Object.fromEntries(VARS.map((k, i) => [k, vars[i]])); return [v.white, v.lightAccent, v.accent, v.darkAccent, v.black].map(hsl); };
const q = (s) => s.replace(/"/g, '&quot;');

// The panel. view is null for the cards, or Fonts, Colors, Buttons, Forms or Miscellaneous; rows are
// the section color themes for Colors: { name, bg, ink, used }.
// The views a level down (parity/findings/CAP-SITESTYLEROWS.json): the view, its parent and its title.
export const SUB = { ButtonTier: ['Buttons', 'Buttons'], FontPacks: ['Fonts', 'Font Packs'], Headings: ['Fonts', 'Headings'], Paragraphs: ['Fonts', 'Paragraphs'], ButtonPacks: ['Buttons', 'Button Packs'], FormPacks: ['Forms', 'Form Packs'], FormSpacing: ['Forms', 'Form Spacing'], EditPalette: ['Colors', 'Edit Palette'], ThemeRows: ['Colors', 'Edit Color Theme'], Animations: ['Miscellaneous', 'Animations'], Spacing: ['Miscellaneous', 'Spacing'] };
const CHEV_DOWN = '<path d="M6 9l6 6 6-6"/>';
// What a font pack sets, shown in its rows: the readings in site-style-packs.js.
function packValue(font, k, n) {
  if (!font) return undefined;
  if (n === 'lh') return k === 'h' ? 1.2 : 1.5;
  if (n === 'weight') return k === 'h' ? font.hw : font.pw;
  if (n === 'ls' && k === 'h') return font.ls;
  if (n === 'tt' && k === 'h' && font.tt) return font.tt[0].toUpperCase() + font.tt.slice(1);
  return undefined;
}
const ANIM_ICONS = { None: '<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>', Fade: '<path d="M4 5h16v11H4zM4 20h16"/>', Scale: '<path d="M4 9v11h11M4 20L20 4M12 4h8v8"/>', Slide: '<path d="M12 18V5M6 11l6-6 6 6M3 21h18"/>', Clip: '<path d="M4 4h16v16H4zM4 4l16 16"/>', Flex: '<path d="M8 19V5M4 9l4-4 4 4M16 5v14M12 15l4 4 4-4"/>' };
// One button type (parity/findings/CAP-BUTTONROWS.json). The Font row opens with Fonts, not built here.
function tierHtml(styles, font, slide, opts) {
  const tier = opts.tier || 'primary', pack = resolveSiteStyles(styles).button, v = tierValues(styles, pack, tier), first = tierValues(styles, pack, 'primary');
  const name = TIER_NAMES[tier], set = (n) => `buttons.${tier}.${n}`, open = opts.select === 'tier-shape';
  const differs = TIERS.some((t) => !sameTier(tierValues(styles, pack, t), first));
  const tabs = TIERS.map((t) => `<button type="button" class="ss-tab${t === tier ? ' is-on' : ''}" role="tab" aria-selected="${t === tier}" aria-label="${TIER_NAMES[t]}" data-ss-tier="${t}">${TIER_NAMES[t]}</button>`).join('');
  const seg = (on, off) => `<div class="ss-seg" role="radiogroup">${on}${off}</div>`;
  const tileHtml = ([n]) => `<button type="button" class="ss-shape${v.shape === n ? ' is-on' : ''}${v.fill ? '' : ' is-line'}" aria-label="${n}" aria-pressed="${v.shape === n}" data-ss-shape="${n}"><i class="ss-sh-${n.split(' ')[0].toLowerCase()}">${n === 'Underline' ? 'Text' : ''}</i></button>`;
  const corners = v.shape !== 'Custom' ? '' : `<div class="ss-corners"><div class="ss-seg ss-seg-c" role="radiogroup"><button type="button" role="radio" aria-label="Use single border radius" aria-checked="${!v.multi}" class="${v.multi ? '' : 'is-on'}" data-ss-radii="single">${svg('<rect x="5" y="5" width="14" height="14" rx="3"/>', 18)}</button><button type="button" role="radio" aria-label="Use multiple border radii" aria-checked="${v.multi}" class="${v.multi ? 'is-on' : ''}" data-ss-radii="multi">${svg('<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>', 18)}</button></div>${(v.multi ? ['Top left', 'Top right', 'Bottom right', 'Bottom left'] : ['Single']).map((c, i) => `<input type="number" class="ss-radius${v.multi ? ' is-four' : ''}" aria-label="${c} border radius value" data-ss-radius="${i}" min="0" value="${v.radii[i]}">`).join('')}</div>`;
  const pop = !open ? '' : `<div class="ss-shape-pop">${seg(`<button type="button" role="radio" aria-checked="${v.fill}" class="${v.fill ? 'is-on' : ''}" data-ss-fill="1">Fill</button>`, `<button type="button" role="radio" aria-checked="${!v.fill}" class="${v.fill ? '' : 'is-on'}" data-ss-fill="0">No fill</button>`)}<div class="ss-shapes">${SHAPES.map(tileHtml).join('')}</div><button type="button" class="ss-custom${v.shape === 'Custom' ? ' is-on' : ''}" data-ss-shape="Custom">${svg('<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>', 18)}<span>Custom Corners</span></button>${corners}</div>`;
  const pad = (n, label, text) => `<button type="button" role="radio" aria-label="${label}" aria-checked="${v.pad === n}" class="ss-pad${v.pad === n ? ' is-on' : ''}" data-ss-set="${set('pad')}" data-v="${n}">${text}</button>`;
  const sides = v.pad === 'custom' ? [['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([k, l]) => slide(set(k), l, v[k], 0, 10, 0.1, 'em')).join('') : '';
  const lacks = tier !== 'primary' && !opts.pageTiers?.has(tier);
  const warn = lacks ? `<p class="ss-tier-warn ss-tier-warn-${tier}">This page doesn't have a ${tier} button.</p>` : '';
  const act = tier === 'primary' ? (differs ? '<button type="button" class="ss-reset ss-tier-act" data-ss-reset="apply">Apply to all button types</button>' : '') : (!sameTier(v, first) ? '<button type="button" class="ss-reset ss-tier-act" data-ss-reset="match">Match with primary button</button>' : '');
  return `<div class="ss-tabs ss-tier-tabs" role="tablist">${tabs}</div><div class="ss-preview ss-tier-preview"><span class="ss-btn" style="${tierSample(v)}">Button</span></div>
    <div class="ss-sel-row ss-tier-font" data-unbuilt><span>Font</span><span class="ss-sel"><span>${font?.p || 'Poppins'}, ${font?.pw || 500}, 1rem</span>${svg(CHEV_DOWN)}</span></div>
    <div class="ss-sel-row ss-tier-shape"><span>Shape</span><button type="button" class="ss-sel" data-ss-select="tier-shape" aria-label="Shape" aria-expanded="${open}"><span>${v.shape}</span>${svg(CHEV_DOWN)}</button>${pop}</div>
    ${slide(set('outline'), 'Outline', v.outline, 0, 10, 1, 'px')}
    <div class="ss-pad-row"><span>Padding</span><span class="ss-pad-set" role="radiogroup">${pad('S', 'Small', 'S')}${pad('M', 'Medium', 'M')}${pad('L', 'Large', 'L')}${pad('custom', 'Custom', '<b>...</b>')}</span></div>
    ${sides}<div class="ss-tier-end${warn ? ' has-warn' : ''}">${warn}${act}${reset(`Reset ${name} Button`, 'data-ss-reset="tier"', 'ss-reset-red')}</div>`;
}

function subHtml(view, styles, font, opts) {
  const open = opts.select;
  // A list row: the open list lays the current option over the row, as on the oracle.
  const select = (key, label, now, options) => `<div class="ss-sel-row"><span>${label}</span><button type="button" class="ss-sel" data-ss-select="${key}" aria-label="${label}" aria-expanded="${open === key}"><span>${now}</span>${svg(CHEV_DOWN)}</button>${open === key ? `<div class="ss-options" role="listbox" style="top:${1 - 44 * options.indexOf(now)}px">${options.map((o) => `<button type="button" role="option" class="ss-option${o === now ? ' is-on' : ''}" aria-selected="${o === now}" data-ss-set="${key}" data-v="${o}">${o}</button>`).join('')}</div>` : ''}</div>`;
  const slide = (key, label, now, min, max, step, unit) => `<div class="ss-slide"><span>${label}</span><input type="text" data-ss-set="${key}" aria-label="${label} value" value="${now}${unit}"><input type="range" data-ss-set="${key}" data-unit="${unit}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${now}" style="--p:${(100 * (now - min)) / (max - min)}%"></div>`;
  if (view === 'ButtonTier') return tierHtml(styles, font, slide, opts);
  if (view === 'FormSpacing') { const f = formValues(styles); return `<div class="ss-spacing">${[['label', 'Space Below Label'], ['desc', 'Space Below Description'], ['cap', 'Space Below Caption'], ['fields', 'Space Between Fields'], ['cols', 'Space Between Columns']].map(([k, l]) => slide(`forms.${k}`, l, f[k], 1, 40, 1, 'px')).join('')}</div>`; }
  if (view === 'Headings' || view === 'Paragraphs') {
    const k = view === 'Headings' ? 'h' : 'p', d = TYPE_DEFAULTS[k], t = styles?.type?.[k] || {}, v = (n) => t[n] ?? packValue(font, k, n) ?? d[n];
    const family = (k === 'h' ? font?.h : font?.p) || 'Poppins';
    const sizes = k === 'h' ? [1, 2, 3, 4].map((n) => slide(`type.h.s${n}`, `Heading ${n}`, v(`s${n}`), 0.1, 10, 0.1, 'rem')) : [1, 2, 3].map((n) => slide(`type.p.s${n}`, `Paragraph ${n}`, v(`s${n}`), 0.1, 10, 0.1, 'rem'));
    return `<div class="ss-font-l">Font</div><button type="button" class="ss-font" data-unbuilt style="font-family:'${family}',sans-serif"><span>${family}</span>${svg(CHEV_DOWN)}</button>
    ${select(`type.${k}.style`, 'Style', v('style'), ['Normal', 'Italic'])}${select(`type.${k}.weight`, 'Weight', String(v('weight')), ['100', '200', '300', '400', '500', '600', '700', '800', '900'])}
    ${slide(`type.${k}.lh`, 'Line Height', v('lh'), 0.5, 10, 0.1, 'em')}${slide(`type.${k}.ls`, 'Letter Spacing', v('ls'), -0.1, 2, 0.01, k === 'h' ? 'rem' : 'em')}
    ${select(`type.${k}.tt`, 'Text Transform', v('tt'), ['None', 'Uppercase', 'Lowercase', 'Capitalize'])}
    <div class="ss-group ss-group-size">Size</div>${sizes.join('')}`;
  }
  if (view === 'Spacing') {
    const sp = styles?.space || {};
    return `<div class="ss-spacing">${slide('space.width', 'Page Width (Max)', sp.width ?? SPACE_DEFAULTS.width, 800, 3000, 1, 'px')}${slide('space.margin', 'Site Margin', sp.margin ?? SPACE_DEFAULTS.margin, 0, 12, 1, 'vw')}</div>`;
  }
  if (view === 'Animations') {
    const a = styles?.anim || {}, now = a.style || 'None';
    return `<p class="ss-lead">Select an animation style to animate site elements as they appear on the page.</p><div class="ss-group ss-group-anim">Style</div>
    ${['None', 'Fade', 'Scale', 'Slide', 'Clip', 'Flex'].map((n) => `<label class="ss-radio">${svg(ANIM_ICONS[n], 22)}<span>${n}</span><input type="radio" name="ss-anim" data-ss-set="anim.style" data-v="${n}"${n === now ? ' checked' : ''}></label>`).join('')}
    ${now !== 'None' ? `<div class="ss-group ss-group-speed">Speed</div><div class="ss-speeds">${['Slow', 'Medium', 'Fast'].map((n) => `<button type="button" class="ss-speed${n === (a.speed || 'Medium') ? ' is-on' : ''}" data-ss-set="anim.speed" data-v="${n}">${n}</button>`).join('')}</div>` : ''}`;
  }
  if (view === 'ThemeRows') {
    const r = opts.theme || { name: '', bg: '#fff', ink: '#000' }, { vars, picked } = resolveSiteStyles(styles);
    const v = Object.fromEntries(VARS.map((k, i) => [k, (vars || BASE_VARS)[i]]));
    // A row's dot draws its own color, so the variables can't be used here: the panel isn't in the canvas.
    const dot = (val) => (val.rgb ? `rgba(${val.rgb.join(',')},${val.a ?? 1})` : `hsla(${v[val.role]},${val.a ?? 1})`);
    let n = 0;
    const rows = ROW_GROUPS.map(([t, names]) => `<h3 class="ss-group ss-theme-h">${t}</h3>${names.map((name) => { const i = n++; return `<button type="button" class="ss-dis ss-theme-row" data-ss-row="${i}" aria-label="${name}"><span class="ss-dis-l">${name}</span><i class="ss-dot" style="background:${dot(rowValue(styles, picked, r.name, i))}"></i></button>`; }).join('')}`).join('');
    const tr = (t) => `<button type="button" class="ss-tr${t.name === r.name ? ' is-now' : ''}" data-ss-theme="${t.name}" style="background:${t.bg};color:${t.ink}"><span class="ss-tr-aa">Aa</span><span class="ss-tr-n">${t.name}</span></button>`;
    const list = opts.themeList ? `<div class="ss-tr-list"><div class="ss-group">Color themes on this page</div>${opts.themeRows.filter((t) => t.used).map(tr).join('')}<div class="ss-group ss-group-2">Other color themes</div>${opts.themeRows.filter((t) => !t.used).map(tr).join('')}</div>` : '';
    return `<p class="ss-theme-help ss-theme-help-rows">Changes you make will affect all sections that use this color theme.</p><button type="button" class="ss-tr ss-tr-now" data-ss-theme-list aria-expanded="${!!opts.themeList}" style="background:${r.bg};color:${r.ink}"><span class="ss-tr-aa">Aa</span><span class="ss-tr-n">${r.name}</span>${svg(CHEV_DOWN)}</button>${list}
    ${rows}<button type="button" class="ss-theme-reset ss-theme-reset-rows" data-ss-theme-reset>Reset Color Theme</button>`;
  }
  const cur = styles || {};
  if (view === 'FontPacks') return `<div class="ss-tabs"><button type="button" class="ss-tab is-on">Sans-serif</button><button type="button" class="ss-tab" data-unbuilt>Serif</button><button type="button" class="ss-tab" data-unbuilt>Mixed</button></div>${FONT_PACKS.map((f) => `<button type="button" class="ss-pack ss-pack-font${cur.font === f.id ? ' is-on' : ''}" data-ss-pick="font" data-v="${f.id}" aria-label="${f.id} font pack" aria-pressed="${cur.font === f.id}"><span class="ss-pv-h" style="font-family:'${f.h}',sans-serif;font-weight:${f.hw};text-transform:${f.tt}">Heading</span><span class="ss-pv-p" style="font-family:'${f.p}',sans-serif;font-weight:${f.pw}">This is your paragraph.</span><span class="ss-pv-n">${f.h === f.p ? f.h : `${f.h} · ${f.p}`}</span></button>`).join('')}`;
  if (view === 'ButtonPacks') return BUTTON_PACKS.map((b) => `<button type="button" class="ss-pack${cur.button === b.id ? ' is-on' : ''}" data-ss-pick="button" data-v="${b.id}" aria-label="Button style pack ${b.id}" aria-pressed="${cur.button === b.id}">${buttonSample(b)}</button>`).join('');
  if (view === 'FormPacks') return FORM_PACKS.map((f) => `<button type="button" class="ss-pack ss-pack-form" data-ss-pick="form" data-v="${f.id}" aria-label="Form pack ${f.id}" aria-pressed="${styles?.form === f.id}" style="background:${hsl((resolveSiteStyles(styles).vars || BASE_VARS)[4])}">${formSample(f)}</button>`).join('');
  if (view === 'EditPalette') {
    const v = Object.fromEntries(VARS.map((k, i) => [k, (resolveSiteStyles(styles).vars || BASE_VARS)[i]]));
    return paletteHtml(v, opts.pal, Object.fromEntries(Object.entries(v).map(([k, c]) => [k, hsl(c)])));
  }
  return '';
}
export function siteStylesHtml(styles, view = null, rows = [], opts = {}) {
  const { vars, font, button } = resolveSiteStyles(styles);
  const colors = swatches(vars || BASE_VARS);
  const strip = (cls) => `<span class="ss-strip ${cls}">${colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span>`;
  const headFont = font ? `font-family:'${font.h}',sans-serif;font-weight:${font.hw};text-transform:${font.tt}` : '';
  const paraFont = font ? `font-family:'${font.p}',sans-serif;font-weight:${font.pw}` : '';
  // The samples follow the page: a pick moves sections to lightAccent, ink to black and the button to safeDarkAccent.
  const v = vars ? Object.fromEntries(VARS.map((k, i) => [k, hsl(vars[i])])) : null;
  const bg = v ? v.lightAccent : colors[3];
  const ink = v ? v.black : '#000';
  const btnBg = v ? v.safeDarkAccent : '#000';
  const btnInk = v ? v.safeInverseDarkAccent : '#fff';
  const btnStyle = `background:${btnBg};color:${btnInk};${button ? `border-radius:${button.radius};border:${button.border}px solid ${btnBg};` : ''}${font ? `font-family:'${font.p}',sans-serif;font-weight:${font.pw};text-transform:${font.btt};` : ''}`;
  const pack = (name, sample) => `<div class="ss-row"><button type="button" class="ss-card" aria-label="Toggle ${name} style pack popover" aria-expanded="false" data-ss-pop="${name}"><span class="ss-name">${name}</span>${sample}</button><button type="button" class="ss-more" aria-label="Open ${name} style disclosure" data-ss-view="${name}">${svg(CHEV)}</button></div>`;
  const close = `<button type="button" class="ss-close" data-ss="close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 22)}</button>`;
  // Edit Color Theme (P5, parity/findings/CAP-DIVSHAPES.json): reached from the section panel's Colors tab.
  if (view === 'ColorTheme') {
    return `${close}<button type="button" class="ss-back" data-ss-back aria-label="Back to Colors">${svg('<path d="M15 4l-8 8 8 8"/>', 18)}<span>Colors</span></button>
    <h1 class="ss-title">Edit Color Theme</h1><p class="ss-theme-help">Changes you make will affect all sections that use this color theme.</p><button type="button" class="ss-theme-reset" data-ss-theme-reset>Reset Color Theme</button>`;
  }
  if (SUB[view]) {
    const [parent, title] = SUB[view];
    return `${close}<button type="button" class="ss-back" data-ss-back aria-label="Back to ${parent}">${svg('<path d="M15 4l-8 8 8 8"/>', 18)}<span>${parent}</span></button>
    <h2 class="ss-title">${title}</h2>${subHtml(view, styles, font, opts)}`;
  }
  if (view) {
    return `${close}<button type="button" class="ss-back" data-ss-back aria-label="Back to Site Styles">${svg('<path d="M15 4l-8 8 8 8"/>', 18)}<span>Site Styles</span></button>
    <h2 class="ss-title">${view}</h2>${viewHtml(view, { styles, font, colors, bg, ink, btnStyle, rows, opts })}`;
  }
  return `${close}
    <h2 class="ss-title">Site Styles</h2>
    <button type="button" class="ss-card ss-themes" aria-label="Toggle Themes style pack popover" aria-expanded="false" data-ss-pop="Themes"><span class="ss-name">Themes</span><span class="ss-theme" style="background:${bg}"><span class="ss-aa" style="${headFont};color:${ink}">Aa</span>${strip('ss-strip-theme')}<span class="ss-btn ss-btn-small" style="${btnStyle}">Button</span></span></button>
    <hr class="ss-sep">
    ${pack('Fonts', `<span class="ss-heading" style="${headFont};color:${ink}">Heading</span><span class="ss-para" style="${paraFont};color:${ink}">This is your paragraph.</span>`)}
    ${pack('Colors', strip('ss-strip-colors'))}
    ${pack('Buttons', `<span class="ss-btn ss-btn-wide" style="${btnStyle}">Button</span>`)}
    ${pack('Forms', `<span class="ss-form" style="background:${bg};color:${ink}"><span class="ss-input">Text</span><span class="ss-check">${svg(CHECK, 16)}</span></span>`)}
    <button type="button" class="ss-misc" data-ss-view="Miscellaneous">Miscellaneous${svg(CHEV)}</button>`;
}

// The five views (parity/findings/SITESTYLES2.json, disclosures).
const disRow = (label, value = '', to = '') => `<button type="button" class="ss-dis"${to ? ` data-ss-view="${to}"` : ' data-unbuilt'}><span class="ss-dis-l">${label}</span>${value ? `<span class="ss-dis-v">${value}</span>` : ''}${svg(CHEV)}</button>`;
const reset = (label, attrs, cls = '') => `<button type="button" class="ss-reset ${cls}" ${attrs}>${label}</button>`;

function viewHtml(view, { styles, font, colors, bg, ink, btnStyle, rows, opts }) {
  const h = font?.h || 'Poppins';
  const p = font?.p || 'Poppins';
  if (view === 'Fonts') {
    const base = baseSize(styles);
    const headFont = font ? `font-family:'${h}',sans-serif;font-weight:${font.hw};text-transform:${font.tt}` : '';
    const paraFont = font ? `font-family:'${p}',sans-serif;font-weight:${font.pw}` : '';
    return `<div class="ss-preview ss-preview-fonts"><span class="ss-pv-h" style="${headFont};color:${ink}">Heading</span><span class="ss-pv-p" style="${paraFont};color:${ink}">This is your paragraph.</span><span class="ss-pv-n">${h === p ? h : `${h} · ${p}`}</span></div>
    ${disRow('All Font Packs', '', 'FontPacks')}
    <div class="ss-base"><span>Base Size</span><input class="ss-base-in" type="text" inputmode="numeric" aria-label="Base Size" value="${base}"><span class="ss-base-px">px</span><button type="button" class="ss-step ss-dec" data-ss-base="-1" aria-label="Decrement">${svg('<path d="M5 12h14"/>', 18)}</button><button type="button" class="ss-step ss-inc" data-ss-base="1" aria-label="Increment">${svg('<path d="M12 5v14M5 12h14"/>', 18)}</button></div>
    ${disRow('Headings', h, 'Headings')}${disRow('Paragraphs', p, 'Paragraphs')}${disRow('Buttons')}${disRow('Miscellaneous', p)}${disRow('Assign Styles')}
    ${reset('Reset Font Pack', 'data-ss-reset="font"', 'ss-reset-fonts')}`;
  }
  if (view === 'Colors') {
    const tr = (r) => `<button type="button" class="ss-tr" data-ss-theme="${r.name}" style="background:${r.bg};color:${r.ink}"><span class="ss-tr-aa">Aa</span><span class="ss-tr-n">${r.name}</span></button>`;
    return `<div class="ss-palette" data-unbuilt><span class="ss-strip ss-strip-palette">${colors.map((c) => `<span style="background:${c}"></span>`).join('')}</span></div>
    ${disRow('Edit Palette', '', 'EditPalette')}
    <div class="ss-sub"><span>Section color themes</span><button type="button" class="ss-help" aria-label="Colors help" data-ss-help>${svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>', 20)}</button>${opts?.help ? '<div class="ss-tip" role="tooltip">Your palette is used to create 10 unique color themes that can be applied to your sections.</div>' : ''}</div>
    <div class="ss-group">Color themes on this page</div>${rows.filter((r) => r.used).map(tr).join('')}
    <div class="ss-group ss-group-2">Other color themes</div>${rows.filter((r) => !r.used).map(tr).join('')}`;
  }
  if (view === 'Buttons') {
    const pack = resolveSiteStyles(styles).button;
    const sample = (t) => (styles?.buttons?.[t] ? tierSample(tierValues(styles, pack, t)) : btnStyle);
    const card = (name) => { const t = name.toLowerCase(); return `<button type="button" class="ss-bcard" data-ss-view="ButtonTier" data-ss-tier="${t}" aria-label="${name}"><span class="ss-group ss-bcard-n">${name}</span><span class="ss-btn ss-btn-wide" style="${sample(t)}">Button</span>${svg(CHEV)}</button>`; };
    return `<div class="ss-preview ss-preview-center"><span class="ss-btn ss-btn-wide" style="${sample('primary')}">Button</span></div>
    ${disRow('All Button Packs', '', 'ButtonPacks')}
    <div class="ss-bcards">${card('Primary')}${card('Secondary')}${card('Tertiary')}</div>
    ${reset('Reset Button Pack', 'data-ss-reset="button"', 'ss-reset-red')}`;
  }
  if (view === 'Forms') {
    const f = formValues(styles), open = opts.select === 'form-shape', ico = '<path d="M5 9V7a2 2 0 0 1 2-2h2M15 5h2a2 2 0 0 1 2 2v2M19 15v2a2 2 0 0 1-2 2h-2M9 19H7a2 2 0 0 1-2-2v-2"/>';
    const tiles = FORM_SHAPES.map(([n]) => `<button type="button" class="ss-shape${f.shape === n ? ' is-on' : ''}${f.fill ? '' : ' is-line'}" aria-label="${n}" aria-pressed="${f.shape === n}" data-ss-fshape="${n}"><i class="ss-sh-${n.split(' ')[0].toLowerCase()}"></i></button>`).join('');
    const corners = f.shape !== 'Custom' ? '' : `<div class="ss-corners"><div class="ss-seg ss-seg-c" role="radiogroup"><button type="button" role="radio" aria-label="Use single border radius" aria-checked="${!f.multi}" class="${f.multi ? '' : 'is-on'}" data-ss-fradii="single">${svg('<rect x="5" y="5" width="14" height="14" rx="3"/>', 18)}</button><button type="button" role="radio" aria-label="Use multiple border radii" aria-checked="${f.multi}" class="${f.multi ? 'is-on' : ''}" data-ss-fradii="multi">${svg(ico, 18)}</button></div>${(f.multi ? ['Top left', 'Top right', 'Bottom right', 'Bottom left'] : ['Single']).map((c, i) => `<input type="number" class="ss-radius${f.multi ? ' is-four' : ''}" aria-label="${c} border radius value" data-ss-fradius="${i}" min="0" value="${f.radii[i]}">`).join('')}</div>`;
    const pop = !open ? '' : `<div class="ss-shape-pop ss-form-pop"><div class="ss-shapes">${tiles}</div><button type="button" class="ss-custom${f.shape === 'Custom' ? ' is-on' : ''}" data-ss-fshape="Custom">${svg(ico, 18)}<span>Custom Corners</span></button>${corners}</div>`;
    const pad = (n, label, text) => `<button type="button" role="radio" aria-label="${label}" aria-checked="${f.pad === n}" class="ss-pad${f.pad === n ? ' is-on' : ''}" data-ss-set="forms.pad" data-v="${n}">${text}</button>`;
    const sides = f.pad === 'custom' ? `<div class="ss-form-sides">${[['t', 'Top'], ['r', 'Right'], ['b', 'Bottom'], ['l', 'Left']].map(([k, l]) => `<div class="ss-slide"><span>${l}</span><input type="text" data-ss-set="forms.${k}" aria-label="${l} value" value="${f[k]}px"><input type="range" data-ss-set="forms.${k}" data-unit="px" aria-label="${l}" min="1" max="40" step="1" value="${f[k]}" style="--p:${(100 * (f[k] - 1)) / 39}%"></div>`).join('')}</div>` : '';
    return `<div class="ss-form ss-form-big" style="background:${bg};color:${ink}"><span class="ss-input" style="border-radius:${f.shape === 'Pill' ? '999px' : formRadius(f)};background:${f.fill ? '#fff' : 'transparent'};${f.border ? '' : 'border-color:transparent;'}">Text</span><span class="ss-check">${svg(CHECK, 16)}</span></div>
    ${disRow('All Form Packs', '', 'FormPacks')}
    <div class="ss-group ss-group-forms">Form Fields</div>
    <div class="ss-sel-row ss-form-shape"><span>Field Shape</span><button type="button" class="ss-sel" data-ss-select="form-shape" aria-label="Field Shape" aria-expanded="${open}"><span>${f.shape}</span>${svg(CHEV_DOWN)}</button>${pop}</div>
    <div class="ss-fline"><span>Field Fill</span><button type="button" role="switch" class="ss-toggle${f.fill ? ' is-on' : ''}" aria-label="Field Fill" aria-checked="${!!f.fill}" data-ss-ffill><i></i></button></div>
    <div class="ss-fline"><span>Border</span><span class="ss-border-set" role="radiogroup"><button type="button" role="radio" aria-label="No border" aria-checked="${!f.border}" class="ss-pad${f.border ? '' : ' is-on'}" data-ss-fborder="0">${svg('<circle cx="12" cy="12" r="8"/><path d="M6.5 6.5l11 11"/>', 20)}</button><button type="button" role="radio" aria-label="Border" aria-checked="${f.border}" class="ss-pad${f.border ? ' is-on' : ''}" data-ss-fborder="1">${svg('<rect x="6" y="6" width="12" height="12"/>', 20)}</button></span></div>
    <div class="ss-fline ss-fline-thick"><span>Border Thickness</span><input type="text" class="ss-thick-in" aria-label="Border Thickness" data-ss-fthickin value="${f.thick}px"><button type="button" class="ss-fstep" aria-label="decrement" data-ss-fthick="-1">${svg('<path d="M5 12h14"/>', 18)}</button><button type="button" class="ss-fstep" aria-label="increment" data-ss-fthick="1">${svg('<path d="M12 5v14M5 12h14"/>', 18)}</button></div>
    <div class="ss-fline ss-form-pads"><span>Padding</span><span class="ss-pad-set" role="radiogroup">${pad('S', 'Small', 'S')}${pad('M', 'Medium', 'M')}${pad('L', 'Large', 'L')}${pad('custom', 'Custom', '<b>...</b>')}</span></div>${sides}
    <div class="ss-forms-more">${disRow('Effects')}${disRow('Selection Options')}${disRow('Fonts')}${disRow('Colors')}${disRow('Form Spacing', '', 'FormSpacing')}</div>
    ${reset('Reset Form Pack', 'data-ss-reset="form"', 'ss-reset-forms')}`;
  }
  return `<div class="ss-miscs">${['Animations', 'Spacing', 'Image Blocks'].map((n) => `<button type="button" class="ss-mrow"${n === 'Image Blocks' ? ' data-unbuilt' : ` data-ss-view="${n}"`}>${n}${svg(CHEV)}</button>`).join('')}</div>`;
}

const customize = '<button type="button" class="ss-customize" data-unbuilt>Customize</button>';
const tile = (kind, id, label, on, body, extra = '') => `<button type="button" class="ss-tile" data-ss-pick="${kind}" data-v="${q(id)}" aria-label="${q(label)}" aria-pressed="${on}"${extra}>${body}</button>`;

function themesPop(cur) {
  const groups = [...new Set(THEMES.map((t) => t.group))];
  const one = (t) => `<button type="button" class="ss-tile ss-tile-theme" data-ss-pick="theme" data-v="${t.id}" aria-label="Site theme ${t.id}" aria-pressed="${cur.theme === t.id}"><span class="ss-tt" style="background:${t.tile.bg}"><span class="ss-tt-aa" style="font:${t.hw} ${t.tile.aa[0]}px/47px '${t.h}',sans-serif;color:${t.tile.aa[1]};text-transform:${t.tile.aa[2] || 'none'}">Aa</span><span class="ss-strip ss-tt-strip">${swatches(t.vars).map((c) => `<span style="background:${c}"></span>`).join('')}</span><span class="ss-tt-btn" style="background:${t.tile.btn.bg || 'transparent'};border:${t.tile.btn.border || '0'};border-radius:${t.tile.btn.radius};color:${t.tile.btn.ink};font-family:'${t.p}',sans-serif;text-transform:${t.btt}">Button</span></span></button>`;
  return `<div class="ss-pop-head">Themes</div>${groups.map((g) => `<div class="ss-pop-group">${g}</div>${THEMES.filter((t) => t.group === g).map(one).join('')}`).join('')}`;
}
function fontsPop(cur) {
  return `<div class="ss-pop-head">Recommended Font Packs</div><div class="ss-pop-grid">${FONT_PACKS.map((f) => tile('font', f.id, `${f.id} font pack`, cur.font === f.id, `<span class="ss-ft-h" style="font:${f.hw} ${f.tile[0]}px/26px '${f.h}',sans-serif;text-transform:${f.tt}">Heading</span><span class="ss-ft-p" style="font:${f.pw} ${f.tile[1]}px/12px '${f.p}',sans-serif">This is your paragraph.</span>`)).join('')}</div>${customize}`;
}
function colorsPop(cur) {
  return `<div class="ss-pop-head">Recommended Color Palettes</div><div class="ss-pop-grid">${PALETTES.map((p) => tile('palette', p.id, `Palette with accent ${p.id}`, cur.palette === p.id, `<span class="ss-strip ss-pal">${swatches(p.vars).map((c) => `<span style="background:${c}"></span>`).join('')}</span>`)).join('')}</div>${customize}`;
}
const buttonSample = (b) => `<span class="ss-bt${b.tile.bg ? ' is-filled' : ''}" style="width:${b.tile.w}px;height:${b.tile.h}px;background:${b.tile.bg || 'transparent'};border:${b.tile.border}px solid #000;border-radius:${b.tile.radius}${!b.tile.bg && !b.tile.border ? ';border-bottom:2px solid #000' : ''}">Button</span>`;
function buttonsPop(cur) {
  return `<div class="ss-pop-head">Recommended Button Packs</div><div class="ss-pop-grid">${BUTTON_PACKS.map((b) => tile('button', b.id, `Button style pack ${b.id}`, cur.button === b.id, buttonSample(b))).join('')}</div>${customize}`;
}
const formSample = (f) => `<span class="ss-fm${f.field ? '' : ' is-line'}" style="width:${f.w}px;background:${f.field?.bg || 'transparent'};border:${f.field?.border || '0'};border-radius:${f.field?.radius || 0}">Text</span><span class="ss-fm-c" style="width:${f.chk.w}px;background:${f.chk.bg || 'transparent'};border:${f.chk.border || '0'};border-radius:${f.chk.radius};color:${f.chk.bg === 'rgba(255, 255, 255, 0)' || !f.chk.bg ? '#000' : '#fff'}">${f.option ? 'Option' : svg(CHECK, 16)}</span>`;
function formsPop(accent, cur) {
  return `<div class="ss-pop-head">Recommended Form Packs</div><div class="ss-pop-grid ss-pop-forms">${FORM_PACKS.map((f) => tile('form', f.id, `Form pack ${f.id}`, cur?.form === f.id, formSample(f), ` style="background:${accent}"`)).join('')}</div>${customize}`;
}

export function stylePopoverHtml(kind, styles) {
  const cur = styles || {};
  const { vars } = resolveSiteStyles(styles);
  if (kind === 'Themes') return themesPop(cur);
  if (kind === 'Fonts') return fontsPop(cur);
  if (kind === 'Colors') return colorsPop(cur);
  if (kind === 'Buttons') return buttonsPop(cur);
  return formsPop(hsl(vars ? vars[4] : BASE_VARS[4]), cur);
}

// The fonts every tile draws in, loaded once in the editor's own page when a popover first opens.
export function packFontLinks() {
  const seen = new Map([['Poppins|400', ['Poppins', 400]], ['Poppins|500', ['Poppins', 500]]]); // The site's own font, in the samples.
  for (const f of [...FONT_PACKS, ...THEMES]) { seen.set(`${f.h}|${f.hw}`, [f.h, f.hw]); seen.set(`${f.p}|${f.pw}`, [f.p, f.pw]); }
  return [...seen.values()].map(([n, w]) => fontLink(n, w)).join('');
}

// Measured (window 1000 tall): the popover sat at its card's top, except that its bottom stopped at
// 962 (Buttons at 441, Forms at 540). Themes is 650 tall and scrolls.
export const POPOVER_HEIGHT = { Themes: 650, Fonts: 521, Colors: 521, Buttons: 521, Forms: 422 };
export function stylePopoverPosition(kind, cardTop, frameRight, windowHeight) {
  return { left: frameRight - 22 - 342, top: Math.max(16, Math.min(cardTop, windowHeight - 38 - POPOVER_HEIGHT[kind])), height: POPOVER_HEIGHT[kind] };
}
