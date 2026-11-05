// The style packs of the Site Styles popovers, measured on the oracle (parity/findings/SITESTYLES2.json):
// the values each pack gave the site's page, and how its tile draws. Colors are the palette's ten
// hsl values in the order of VARS. Fonts load from Google Fonts by name, as Poppins does (O2).
import { brightness } from './color-math.js';
import { themeRowsCss } from './theme-rows.js';
import { tierCss } from './button-tiers.js';
import { formCss } from './form-rows.js';

export const PALETTES = [
  {"id":"#D9D9D9","vars":["0,0%,100%","0,0%,0%","0,0%,85.1%","0,0%,96.08%","0,0%,47.45%","0,0%,85.1%","0,0%,0%","0,0%,0%","0,0%,0%","0,0%,100%"]},
  {"id":"#209D50","vars":["0,0%,100%","0,0%,0%","143.04,66.14%,37.06%","45,11.76%,86.67%","111.43,11.11%,12.35%","143.04,66.14%,37.06%","143.04,66.14%,37.06%","0,0%,100%","0,0%,100%","0,0%,100%"]},
  {"id":"#FF5E1A","vars":["0,0%,100%","0,0%,0%","17.82,100%,55.1%","0,1.33%,85.29%","0,0%,15.69%","17.82,100%,55.1%","17.82,100%,55.1%","0,0%,100%","0,0%,100%","0,0%,100%"]},
  {"id":"#D53D22","vars":["45,20%,96.08%","0,0%,0%","9.05,72.47%,48.43%","50.5,100%,72.75%","331.11,100%,37.06%","9.05,72.47%,48.43%","9.05,72.47%,48.43%","45,20%,96.08%","45,20%,96.08%","45,20%,96.08%"]},
  {"id":"#FBE19F","vars":["0,0%,100%","42.63,23.17%,32.16%","43.04,92%,80.39%","44.21,100%,92.55%","42.55,100%,67.65%","43.04,92%,80.39%","42.63,23.17%,32.16%","42.63,23.17%,32.16%","42.63,23.17%,32.16%","0,0%,100%"]},
  {"id":"#D4967D","vars":["0,0%,100%","180,5.88%,20%","17.24,50.29%,66.08%","46.67,14.75%,88.04%","172.94,10.43%,31.96%","17.24,50.29%,66.08%","17.24,50.29%,66.08%","0,0%,100%","0,0%,100%","0,0%,100%"]},
  {"id":"#536C7C","vars":["44.21,100%,92.55%","225.37,46.07%,17.45%","203.41,19.81%,40.59%","194.55,14.29%,54.71%","204,40.54%,21.76%","44.21,100%,92.55%","203.41,19.81%,40.59%","44.21,100%,92.55%","225.37,46.07%,17.45%","44.21,100%,92.55%"]},
  {"id":"#F598FF","vars":["0,0%,100%","229.71,43.21%,15.88%","294.17,100%,79.8%","230,85.71%,94.51%","226.34,89.38%,77.84%","294.17,100%,79.8%","229.71,43.21%,15.88%","229.71,43.21%,15.88%","229.71,43.21%,15.88%","0,0%,100%"]},
];
export const FONT_PACKS = [
  {"id":"manrope","h":"Manrope","hw":500,"tt":"none","ls":-0.02,"p":"Poppins","pw":400,"btt":"none","tile":[28,9.30909]},
  {"id":"libre baskerville","h":"Libre Baskerville","hw":400,"tt":"none","ls":-0.02,"p":"Almarai","pw":400,"btt":"none","tile":[25.2898,10.9257]},
  {"id":"anton","h":"Anton","hw":400,"tt":"uppercase","ls":0,"p":"Epilogue","pw":400,"btt":"uppercase","tile":[28,9.6068]},
  {"id":"instrument serif","h":"Instrument Serif","hw":400,"tt":"none","ls":-0.02,"p":"Newsreader","pw":400,"btt":"none","tile":[28,10.9141]},
  {"id":"archivo black 1","h":"Archivo Black","hw":400,"tt":"uppercase","ls":-0.02,"p":"Space Grotesk","pw":600,"btt":"uppercase","tile":[21.0894,9.57464]},
  {"id":"shrikhand","h":"Shrikhand","hw":400,"tt":"none","ls":-0.02,"p":"Bitter","pw":400,"btt":"none","tile":[24.9412,10.0653]},
  {"id":"asap","h":"Manrope","hw":500,"tt":"none","ls":-0.02,"p":"Nunito Sans","pw":400,"btt":"uppercase","tile":[28,10.3988]},
  {"id":"young serif","h":"Young Serif","hw":400,"tt":"none","ls":-0.02,"p":"Bitter","pw":400,"btt":"none","tile":[26.563,10.0653]},
];
export const BUTTON_PACKS = [
  {"id":"button-pack-17","radius":"300px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(0, 0, 0)","border":0,"radius":"300px","w":94,"h":42}},
  {"id":"button-pack-18","radius":"300px","border":2,"pad":"24px 35.2px","tile":{"bg":"","border":2,"radius":"300px","w":98,"h":46}},
  {"id":"button-pack-03","radius":"10px","border":0,"pad":"16px 20.8px","tile":{"bg":"rgb(0, 0, 0)","border":0,"radius":"7.5px","w":72,"h":42}},
  {"id":"button-pack-21","radius":"10px","border":2,"pad":"24px 35.2px","tile":{"bg":"","border":2,"radius":"7.5px","w":98,"h":46}},
  {"id":"button-pack-23","radius":"0px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(0, 0, 0)","border":0,"radius":"0","w":94,"h":42}},
  {"id":"button-pack-24","radius":"30px","border":2,"pad":"24px 35.2px","tile":{"bg":"","border":2,"radius":"18px","w":98,"h":46}},
  {"id":"button-pack-41","radius":"100%","border":0,"pad":"32px 48px","tile":{"bg":"rgb(0, 0, 0)","border":0,"radius":"100%","w":113,"h":42}},
  {"id":"button-pack-06","radius":"0px","border":0,"pad":"16px 20.8px","tile":{"bg":"","border":0,"radius":"0","w":72,"h":44}},
];
export const FORM_PACKS = [
  {"id":"form-pack-01","w":71,"field":null,"chk":{"w":50,"bg":"rgb(0, 0, 0)","border":"2px solid rgba(0, 0, 0, 0.55)","radius":"0"},"option":true},
  {"id":"form-pack-02","w":90,"field":{"bg":"rgba(255, 255, 255, 0.8)","border":"","radius":"0"},"chk":{"w":32,"bg":"rgb(0, 0, 0)","border":"1px solid rgba(0, 0, 0, 0.55)","radius":"300px"},"option":false},
  {"id":"form-pack-03","w":90,"field":{"bg":"rgba(255, 255, 255, 0.8)","border":"","radius":"6.25px"},"chk":{"w":32,"bg":"rgb(0, 0, 0)","border":"1px solid rgba(0, 0, 0, 0.55)","radius":"300px"},"option":false},
  {"id":"form-pack-04","w":90,"field":{"bg":"","border":"1px solid rgba(0, 0, 0, 0.55)","radius":"0"},"chk":{"w":32,"bg":"rgba(255, 255, 255, 0)","border":"1px solid rgba(0, 0, 0, 0.55)","radius":"0"},"option":false},
  {"id":"form-pack-05","w":90,"field":{"bg":"rgba(255, 255, 255, 0.8)","border":"","radius":"0"},"chk":{"w":32,"bg":"rgb(0, 0, 0)","border":"1px solid rgba(0, 0, 0, 0.55)","radius":"0"},"option":false},
  {"id":"form-pack-06","w":71,"field":{"bg":"rgba(255, 255, 255, 0.8)","border":"","radius":"300px"},"chk":{"w":50,"bg":"rgb(0, 0, 0)","border":"2px solid rgba(0, 0, 0, 0.55)","radius":"300px"},"option":true},
];
export const THEMES = [
  {"id":"professional-1","group":"Professional","vars":["0,0%,100%","0,0%,0%","0,0%,85.1%","0,0%,96.08%","0,0%,47.45%","0,0%,85.1%","0,0%,0%","0,0%,0%","0,0%,0%","0,0%,100%"],"h":"Manrope","hw":500,"tt":"none","ls":-0.02,"p":"Poppins","pw":400,"btt":"none","radius":"0px","border":1,"pad":"16px 20.8px","tile":{"bg":"rgb(245, 245, 245)","aa":[45.5057,"rgb(0, 0, 0)",""],"btn":{"bg":"","border":"2px solid rgb(0, 0, 0)","radius":"0","ink":"rgb(0, 0, 0)"}}},
  {"id":"professional-2","group":"Professional","vars":["0,0%,100%","0,0%,0%","143.04,66.14%,37.06%","45,11.76%,86.67%","111.43,11.11%,12.35%","143.04,66.14%,37.06%","143.04,66.14%,37.06%","0,0%,100%","0,0%,100%","0,0%,100%"],"h":"Instrument Serif","hw":400,"tt":"none","ls":-0.02,"p":"Newsreader","pw":400,"btt":"none","radius":"0px","border":0,"pad":"16px 20.8px","tile":{"bg":"rgb(225, 223, 217)","aa":[51,"rgb(0, 0, 0)",""],"btn":{"bg":"rgb(32, 157, 80)","border":"","radius":"0","ink":"rgb(255, 255, 255)"}}},
  {"id":"playful-1","group":"Playful","vars":["0,66.67%,96.47%","309.47,52.29%,21.37%","252.44,71.93%,77.65%","252.27,66.67%,87.06%","0,58.16%,38.43%","252.44,71.93%,77.65%","309.47,52.29%,21.37%","309.47,52.29%,21.37%","309.47,52.29%,21.37%","0,66.67%,96.47%"],"h":"Shrikhand","hw":400,"tt":"none","ls":-0.02,"p":"Bitter","pw":400,"btt":"none","radius":"300px","border":3,"pad":"32px 48px","tile":{"bg":"rgb(209, 200, 244)","aa":[40.6798,"rgb(83, 26, 74)",""],"btn":{"bg":"rgb(83, 26, 74)","border":"2px solid rgb(252, 240, 240)","radius":"300px","ink":"rgb(252, 240, 240)"}}},
  {"id":"playful-2","group":"Playful","vars":["41.54,23.64%,89.22%","60,3.45%,17.06%","176.9,28.16%,59.61%","44.27,74.1%,72.75%","211.46,49.76%,40.59%","176.9,28.16%,59.61%","60,3.45%,17.06%","60,3.45%,17.06%","60,3.45%,17.06%","41.54,23.64%,89.22%"],"h":"Young Serif","hw":400,"tt":"none","ls":-0.02,"p":"Bitter","pw":400,"btt":"none","radius":"45px 0px","border":0,"pad":"32px 48px","tile":{"bg":"rgb(237, 210, 134)","aa":[39.708,"rgb(45, 45, 42)",""],"btn":{"bg":"rgb(45, 45, 42)","border":"","radius":"12px 0px","ink":"rgb(234, 230, 221)"}}},
  {"id":"sophisticated-1","group":"Sophisticated","vars":["42,35.71%,94.51%","30,12.5%,18.82%","30.73,22.65%,64.51%","33.33,32.14%,89.02%","32.5,16%,29.41%","30.73,22.65%,64.51%","30,12.5%,18.82%","30,12.5%,18.82%","30,12.5%,18.82%","42,35.71%,94.51%"],"h":"Libre Baskerville","hw":400,"tt":"none","ls":-0.02,"p":"Almarai","pw":400,"btt":"none","radius":"15px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(236, 228, 218)","aa":[41.4692,"rgb(54, 48, 42)",""],"btn":{"bg":"rgb(54, 48, 42)","border":"","radius":"7.5px","ink":"rgb(246, 243, 236)"}}},
  {"id":"sophisticated-2","group":"Sophisticated","vars":["0,0%,100%","180,5.88%,20%","17.24,50.29%,66.08%","46.67,14.75%,88.04%","172.94,10.43%,31.96%","17.24,50.29%,66.08%","17.24,50.29%,66.08%","0,0%,100%","0,0%,100%","0,0%,100%"],"h":"Marcellus","hw":400,"tt":"none","ls":-0.02,"p":"PT Serif","pw":400,"btt":"none","radius":"15px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(229, 227, 220)","aa":[46.0072,"rgb(48, 54, 54)",""],"btn":{"bg":"rgb(212, 150, 125)","border":"","radius":"7.5px","ink":"rgb(255, 255, 255)"}}},
  {"id":"friendly-1","group":"Friendly","vars":["44.21,100%,92.55%","225.37,46.07%,17.45%","203.41,19.81%,40.59%","194.55,14.29%,54.71%","204,40.54%,21.76%","44.21,100%,92.55%","203.41,19.81%,40.59%","44.21,100%,92.55%","225.37,46.07%,17.45%","44.21,100%,92.55%"],"h":"Manrope","hw":500,"tt":"none","ls":-0.02,"p":"Nunito Sans","pw":400,"btt":"uppercase","radius":"300px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(123, 148, 156)","aa":[45.5057,"rgb(24, 34, 65)",""],"btn":{"bg":"rgb(83, 108, 124)","border":"","radius":"300px","ink":"rgb(255, 245, 217)"}}},
  {"id":"friendly-2","group":"Friendly","vars":["55,35.29%,93.33%","120,16.46%,15.49%","67.39,95.83%,71.76%","40,37.5%,84.31%","111.43,14.29%,71.18%","67.39,95.83%,71.76%","120,16.46%,15.49%","120,16.46%,15.49%","120,16.46%,15.49%","55,35.29%,93.33%"],"h":"Sansita","hw":700,"tt":"none","ls":-0.02,"p":"Nunito Sans","pw":400,"btt":"uppercase","radius":"10px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(230, 220, 200)","aa":[50.5936,"rgb(33, 46, 33)",""],"btn":{"bg":"rgb(33, 46, 33)","border":"","radius":"5px","ink":"rgb(244, 243, 232)"}}},
  {"id":"bold-1","group":"Bold","vars":["60,9.09%,97.84%","0,0%,5.1%","16.91,100%,56.86%","31.65,90.1%,80.2%","180,1.96%,10%","16.91,100%,56.86%","16.91,100%,56.86%","60,9.09%,97.84%","60,9.09%,97.84%","60,9.09%,97.84%"],"h":"Anton","hw":400,"tt":"uppercase","ls":0,"p":"Epilogue","pw":400,"btt":"uppercase","radius":"0px","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(250, 207, 159)","aa":[51,"rgb(13, 13, 13)","uppercase"],"btn":{"bg":"rgb(255, 97, 35)","border":"","radius":"0","ink":"rgb(250, 250, 249)"}}},
  {"id":"bold-2","group":"Bold","vars":["0,0%,100%","0,1.54%,12.75%","0,0%,74.9%","0,0%,87.06%","223.41,62.44%,38.63%","0,0%,74.9%","0,1.54%,12.75%","0,1.54%,12.75%","0,1.54%,12.75%","0,0%,100%"],"h":"Archivo Black","hw":400,"tt":"uppercase","ls":-0.02,"p":"Space Grotesk","pw":600,"btt":"uppercase","radius":"100%","border":0,"pad":"24px 35.2px","tile":{"bg":"rgb(222, 222, 222)","aa":[35.3455,"rgb(33, 32, 32)","uppercase"],"btn":{"bg":"rgb(33, 32, 32)","border":"","radius":"100%","ink":"rgb(255, 255, 255)"}}},
  {"id":"quirky-1","group":"Quirky","vars":["48,31.25%,93.73%","142.5,45.45%,17.25%","210,100%,93.73%","62.65,83.7%,73.53%","6.04,74.45%,55.49%","210,100%,93.73%","142.5,45.45%,17.25%","142.5,45.45%,17.25%","142.5,45.45%,17.25%","48,31.25%,93.73%"],"h":"Climate Crisis","hw":400,"tt":"none","ls":0,"p":"Archivo","pw":500,"btt":"uppercase","radius":"100%","border":0,"pad":"32px 48px","tile":{"bg":"rgb(239, 244, 131)","aa":[29.1003,"rgb(24, 64, 39)",""],"btn":{"bg":"rgb(24, 64, 39)","border":"","radius":"100%","ink":"rgb(244, 242, 234)"}}},
  {"id":"quirky-2","sz":{"h1":4.6,"p":1.3,"btn":1.2},"group":"Quirky","vars":["0,0%,100%","0,0%,0%","3.87,70.45%,82.75%","42.55,100%,67.65%","273.06,90.18%,68.04%","3.87,70.45%,82.75%","0,0%,0%","0,0%,0%","0,0%,0%","0,0%,100%"],"h":"Ojuju","hw":600,"tt":"none","ls":-0.02,"p":"Archivo","pw":400,"btt":"uppercase","radius":"0px","border":4,"pad":"32px 48px","tile":{"bg":"rgb(255, 207, 90)","aa":[47.2014,"rgb(0, 0, 0)",""],"btn":{"bg":"rgb(0, 0, 0)","border":"2px solid rgb(255, 255, 255)","radius":"0","ink":"rgb(255, 255, 255)"}}},
  {"id":"innovative-1","sz":{"h1":4.6,"p":1.2,"title":2,"bw":400},"group":"Innovative","vars":["0,0%,100%","0,0%,0%","11.73,82.49%,57.45%","60,4.35%,95.49%","0,0%,21.96%","11.73,82.49%,57.45%","11.73,82.49%,57.45%","0,0%,100%","0,0%,100%","0,0%,100%"],"h":"Space Grotesk","hw":500,"tt":"none","ls":-0.05,"p":"Raleway","pw":500,"btt":"none","radius":"0px","border":0,"pad":"32px 48px","tile":{"bg":"rgb(244, 244, 243)","aa":[45.5057,"rgb(0, 0, 0)",""],"btn":{"bg":"rgb(236, 92, 57)","border":"","radius":"0","ink":"rgb(255, 255, 255)"}}},
  {"id":"innovative-2","sz":{"base":18,"h1":4.2,"p":1.1,"title":1.1,"btn":1.1,"plh":1.4,"bls":0.01},"group":"Innovative","vars":["0,0%,98.04%","0,0%,0%","0,0%,86.27%","0,0%,100%","0,0%,10.98%","0,0%,86.27%","0,0%,0%","0,0%,0%","0,0%,0%","0,0%,98.04%"],"h":"Syne","hw":700,"tt":"uppercase","ls":-0.03,"p":"Syne Mono","pw":400,"btt":"none","radius":"20px 0px","border":2,"pad":"36px 54px","tile":{"bg":"rgb(255, 255, 255)","aa":[34.8515,"rgb(0, 0, 0)","uppercase"],"btn":{"bg":"","border":"2px solid rgb(0, 0, 0)","radius":"8.88889px 0px","ink":"rgb(0, 0, 0)"}}},
];

export const VARS = ['white', 'black', 'accent', 'lightAccent', 'darkAccent', 'safeLightAccent', 'safeDarkAccent', 'safeInverseAccent', 'safeInverseLightAccent', 'safeInverseDarkAccent'];

// The site's own colors on the oracle, before any pick.
export const BASE_VARS = ['0,0%,100%', '0,0%,0%', '3.87,70.45%,82.75%', '42.55,100%,67.65%', '273.06,90.18%,68.04%', '3.87,70.45%,82.75%', '0,0%,0%', '0,0%,0%', '0,0%,0%', '0,0%,100%'];
// The five colors the palette edits make the other five (fits every reading, parity/findings/CAP-THEMEROWS.json).
export function paletteVars(c) {
  const far = (a, b) => Math.abs(brightness(a) - brightness(b)) >= 0.34, on = (x) => (far(x, c.white) ? c.white : c.black);
  const light = far(c.accent, c.black) ? c.accent : c.white, dark = far(c.accent, c.white) ? c.accent : c.black;
  return [c.white, c.black, c.accent, c.lightAccent, c.darkAccent, light, dark, on(c.accent), on(light), on(dark)];
}
const byId = (list, id) => list.find((x) => x.id === id);

// What the site's picks come to. A theme sets colors, fonts and buttons at once; a later pack of
// one kind replaces that part. `styles` is { theme, palette, font, button, colors, themeRows }, ids from
// the tables, colors the palette's own edits. `picked`: a popover's palette or theme has been chosen.
export function resolveSiteStyles(styles) {
  if (!styles) return { vars: null, font: null, button: null, picked: false };
  const t = styles.theme ? byId(THEMES, styles.theme) : null;
  const packed = (styles.palette && byId(PALETTES, styles.palette)?.vars) || t?.vars || null;
  const vars = styles.colors ? paletteVars({ ...Object.fromEntries(VARS.slice(0, 5).map((k, i) => [k, (packed || BASE_VARS)[i]])), ...styles.colors }) : packed;
  return {
    vars,
    picked: !!packed,
    font: (styles.font && byId(FONT_PACKS, styles.font)) || t || null,
    button: (styles.button && byId(BUTTON_PACKS, styles.button)) || t || null,
  };
}

// The site's root size in px: the Fonts disclosure's Base Size, else what the theme sets, else 16.
export function baseSize(styles) {
  return styles?.base ?? resolveSiteStyles(styles).font?.sz?.base ?? 16;
}

const family = (f) => `"${f}"`;
const fontUrl = (f, w) => `https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}${w && w !== 400 ? `:wght@${w}` : ''}&display=swap`;
export const fontLink = (f, w) => `<link rel="stylesheet" data-fe-site-styles href="${fontUrl(f, w)}">`;

// Headings, Paragraphs and Spacing rows (parity/findings/CAP-SITESTYLEROWS.json): each is one of the
// page's own values. Line Height in em, Letter Spacing in rem for headings and em for paragraphs, sizes as the value in the size formula.
export const TYPE_DEFAULTS = { h: { lh: 1.3, ls: 0.01, style: 'Normal', weight: 400, tt: 'None', s1: 4, s2: 3.5, s3: 2.5, s4: 1.6 }, p: { lh: 1.4, ls: 0, style: 'Normal', weight: 400, tt: 'None', s1: 1.5, s2: 1, s3: 0.9 } };
export const SPACE_DEFAULTS = { width: 1400, margin: 4 };
const TT = { Uppercase: 'uppercase', Lowercase: 'lowercase', Capitalize: 'capitalize', None: 'none' };
function typeCss(styles) {
  const h = styles?.type?.h, p = styles?.type?.p, sp = styles?.space;
  let vars = '', out = '';
  if (h) {
    if (h.lh != null) vars += ` --heading-font-line-height: ${h.lh}em;`;
    if (h.ls != null) vars += ` --heading-font-letter-spacing: ${h.ls}rem;`;
    for (const n of [1, 2, 3, 4]) if (h[`s${n}`] != null) vars += ` --heading-${n}-size-value: ${h[`s${n}`]};`;
    const rule = [h.weight ? `font-weight: ${h.weight};` : '', h.style ? `font-style: ${h.style.toLowerCase()};` : '', h.tt ? `text-transform: ${TT[h.tt]};` : ''].join(' ').trim();
    if (rule) out += `h1, h2, h3, h4, .header-title { ${rule} }\n`;
    if (h.lh != null || h.ls != null) out += `.header-title { ${h.lh != null ? `line-height: ${h.lh}em;` : ''} ${h.ls != null ? `letter-spacing: ${h.ls}rem;` : ''} }\n`;
  }
  if (p) {
    if (p.lh != null) vars += ` --body-font-line-height: ${p.lh}em;`;
    if (p.ls != null) vars += ` --body-font-letter-spacing: ${p.ls}em;`;
    if (p.s1 != null) vars += ` --large-text-size-value: ${p.s1};`;
    if (p.s2 != null) vars += ` --normal-text-size-value: ${p.s2};`;
    if (p.s3 != null) vars += ` --small-text-size-value: ${p.s3};`;
    const rule = [p.weight ? `font-weight: ${p.weight};` : '', p.style ? `font-style: ${p.style.toLowerCase()};` : '', p.tt ? `text-transform: ${TT[p.tt]};` : ''].join(' ').trim();
    if (rule) out += `body { ${rule} }\n`;
    // The header links follow Paragraphs on the oracle: the same line height, letter spacing and size.
    if (p.lh != null || p.ls != null) out += `.header-nav-item, .header-action { ${p.lh != null ? `line-height: ${p.lh}em;` : ''} ${p.ls != null ? `letter-spacing: ${p.ls}em;` : ''} }\n`;
    if (p.s2 != null) out += `.header-nav-item, .header-action { font-size: inherit; }\n`;
  }
  if (sp?.width != null) vars += ` --sqs-site-max-width: ${sp.width}px; --maxPageWidth: ${sp.width}px;`;
  if (sp?.margin != null) vars += ` --sqs-site-gutter: ${sp.margin}vw;`;
  return (vars ? `:root {${vars} }\n` : '') + out;
}

// The rules a pick adds after site.css. From the readings: a font pack gives headings line height
// 1.2em and its letter spacing, paragraphs line height 1.5em, the site title value 1.5.
export function siteStylesCss(styles) {
  const { vars, font, button, picked } = resolveSiteStyles(styles);
  let css = '';
  if (vars) {
    const v = Object.fromEntries(VARS.map((k, i) => [k, vars[i]]));
    css += `:root { ${VARS.map((k) => `--${k}-hsl: ${v[k]};`).join(' ')} --paper: hsl(${picked ? v.lightAccent : v.darkAccent}); --accent: hsl(${v.darkAccent}); --accent-2: hsl(${v.lightAccent}); }\n`
      + `.sqsrte-text-color--accent { color: hsl(${v.accent}); }\n`;
    // A popover's pick also ends the demo site's own mapping of Light 1 and Dark 2 (measured after a
    // pick). An edit in Edit Palette, a preset among them, leaves that mapping as it is.
    if (picked) css += `.page-section[data-section-theme=""], .page-section[data-section-theme="light"] { --section-bg: hsla(var(--lightAccent-hsl), 1); --heading-color: hsla(var(--black-hsl), 1); --section-ink: hsla(var(--black-hsl), 1); --button-bg: hsla(var(--safeDarkAccent-hsl), 1); --button-ink: hsla(var(--safeInverseDarkAccent-hsl), 1); }\n`
      + `.page-section[data-section-theme="dark-bold"] { --heading-color: hsla(var(--safeLightAccent-hsl), 1); }\n`;
  }
  if (font) {
    css += `:root { --heading-font-line-height: 1.2em; --body-font-line-height: 1.5em; --heading-font-letter-spacing: ${font.ls}em; }\n`
      + `body { font-family: ${family(font.p)}, sans-serif; font-weight: ${font.pw}; }\n`
      + `h1, h2, h3, h4 { font-family: ${family(font.h)}, sans-serif; font-weight: ${font.hw}; text-transform: ${font.tt}; }\n`
      + `.header-title { --site-title-font-size-value: 1.5; font-family: ${family(font.h)}, sans-serif; font-weight: ${font.hw}; text-transform: ${font.tt}; line-height: 1.2em; letter-spacing: ${font.ls}em; }\n`
      + `.header-nav-item, .header-action { font-family: ${family(font.p)}, sans-serif; }\n`
      + `.sqs-block-button-element { font-family: ${family(font.p)}, sans-serif; font-weight: ${font.pw}; letter-spacing: normal; text-transform: ${font.btt}; }\n`;
  }
  // Base Size is the root size: everything in rem follows, a step is 1px (read on the oracle from 15
  // to 18). Three themes also set sizes, as the values in the page's own size formula.
  const z = font?.sz;
  const base = baseSize(styles);
  if (base !== 16) css += `html { font-size: ${base}px; }\n`;
  if (z) {
    if (z.h1) css += `:root { --heading-1-size-value: ${z.h1}; }\n`;
    if (z.p) css += `:root { --normal-text-size-value: ${z.p}; }\n`;
    if (z.plh) css += `:root { --body-font-line-height: ${z.plh}em; }\n`;
    if (z.title) css += `.header-title { --site-title-font-size-value: ${z.title}; }\n`;
    if (z.btn) css += `.sqs-block-button-element { font-size: calc((${z.btn} - 1) * 1.2vw + 1rem); }\n`;
    if (z.bw) css += `.sqs-block-button-element { font-weight: ${z.bw}; }\n`;
    if (z.bls) css += `.sqs-block-button-element { letter-spacing: ${z.bls}em; }\n`;
  }
  css += typeCss(styles);
  if (button) {
    css += `.sqs-block-button-element { border-radius: ${button.radius}; border: ${button.border}px solid var(--button-bg, #000); padding: ${button.pad}; }\n`;
  }
  return css + tierCss(styles, button) + formCss(styles) + themeRowsCss(styles);
}

// What goes in the page head for the picks: the two fonts and the rules.
export function siteStylesHead(styles) {
  const { font } = resolveSiteStyles(styles);
  const css = siteStylesCss(styles);
  if (!css) return '';
  return `${font ? fontLink(font.h, font.hw) + fontLink(font.p, font.pw) : ''}<style data-fe-site-styles>${css}</style>`;
}
