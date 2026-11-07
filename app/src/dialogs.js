// T12's older block dialogs (CAP-DIALOGS.json, CAP-T12D*.json, CAP-ROWS*.json): one table row per tile.
// Each dialog has the box, title, tabs and rows as read, in px from its top left. Rows that 0005 rules out
// (an account, a lookup or a collection) are drawn faded and do nothing. The words are the oracle's labels;
// no picture, font or script of theirs is here.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Aspect Ratio's list, with each ratio as height over width. Only 3:2 was read on the block; the rest go by name.
export const ASPECTS = [['1:1 Square', 1], ['3:2 Standard', 2 / 3], ['2:3 Standard (Vertical)', 3 / 2], ['4:3 Four-Three', 3 / 4], ['3:4 Three-Four (Vertical)', 4 / 3], ['16:9 Widescreen', 9 / 16], ['2.40 Anamorphic Widescreen', 1 / 2.4]];
export const galleryOf = (b) => ({ aspect: b.galAspect || '1:1 Square', crop: b.galCrop !== false, title: !!b.galTitle, newWindow: !!b.galNewWindow });
export const tagCountOf = (b) => b.tagCount ?? 5;

const LEARN = '<button type="button" class="dl-learn" tabindex="0">Learn more</button>';
const START = 'Start by selecting one of your pages below:';
const NONE = 'There are no collections.';

// Row kinds: text (12px), help (11px grey), label, select, field, check, slider (a count over its track), num (a
// number left of its track), empty, notice, heading, pages, layouts, grid, area, button.
// key: the block value a live row changes. out: ruled out by 0005, faded. unbuilt: in scope, built later.
const galleryDesign = (title) => {
  const d = title ? 66 : 0;
  return [
    { k: 'layouts', y: 100, out: true },
    { k: 'label', y: 232, text: 'Aspect Ratio' },
    { k: 'select', y: 254, key: 'galAspect', options: ASPECTS.map(([n]) => n) },
    { k: 'check', y: 320, key: 'galCrop', text: 'Crop Images', help: 'Crop images to the aspect ratio.' },
    ...(title ? [{ k: 'check', y: 386, key: 'galTitle', text: 'Show Title', help: 'Show the title below the image' }] : []),
    { k: 'num', y: 386 + d, value: 4, min: 1, max: 10, out: true },
    { k: 'help', y: 408.8 + d, text: 'Choose the thumbnails per row.' },
    { k: 'num', y: 452.8 + d, value: 20, min: 0, max: 50, out: true },
    { k: 'help', y: 475.7 + d, text: 'Padding around the gridded images.' },
    { k: 'check', y: 519.7 + d, text: 'Lightbox', help: 'Clicking on the images will pop the image up in a lightbox.', helpH: 44, out: true },
    { k: 'check', y: 607.7 + d, key: 'galNewWindow', text: 'Open Links in New Window', help: 'Images with links will open in a new window.' },
  ];
};
const account = (top) => [
  { k: 'label', y: top, text: 'Connected Account' },
  { k: 'select', y: top + 22, options: ['Choose an account', 'Add an account'], out: true },
  { k: 'slider', y: top + 88, value: 10, min: 1, max: 20, unit: 'Items', out: true },
];
const CHART_CSV = [['Label', 'Population'], ['New York', '150'], ['Las Vegas', '250'], ['San Francisco', '150']];
// The palettes read on the swatches (CAP-ROWSCHART.json). The other twelve are in the list but not read, so they stay off.
export const CHART_PALETTES = { Grayscale: ['rgb(121, 121, 121)', 'rgb(191, 191, 191)', 'rgb(229, 229, 229)'], Primary: ['rgb(240, 82, 59)', 'rgb(247, 180, 19)', 'rgb(36, 128, 196)'] };
const PALETTE_NAMES = ['Grayscale', 'Primary', 'Warm', 'Cool', 'Muted', 'Cobblestone', 'Shops', 'Suburbs', 'Tea Party', 'Highway', 'DB-Nine', 'Italia', 'M-Three', 'Thunderbird'];

// Each live key's value when the block has none. setDialogValue drops a key that is back at this value.
export const DIALOG_DEFAULTS = { galAspect: '1:1 Square', galCrop: true, galTitle: false, galNewWindow: false, tagCount: 5, chartType: 'Bar Chart', chartFlip: false, chartTitle: '', chartCaption: '', chartLegend: false, chartPalette: 'Grayscale', chartData: CHART_CSV };
export const dialogValue = (b, k) => b?.[k] ?? DIALOG_DEFAULTS[k];
export const chartOf = (b) => ({ type: dialogValue(b, 'chartType'), flip: dialogValue(b, 'chartFlip'), title: dialogValue(b, 'chartTitle'), caption: dialogValue(b, 'chartCaption'), legend: dialogValue(b, 'chartLegend'), palette: dialogValue(b, 'chartPalette'), data: dialogValue(b, 'chartData') });
export const chartCsv = (data) => data.map((r) => r.join(',')).join('\n');
export const parseCsv = (text) => text.split(/\r?\n/).filter((l) => l.trim()).map((l) => { const [a = '', v = ''] = l.split(','); return [a.trim(), v.trim()]; });

export const DIALOGS = {
  Instagram: {
    title: 'Grid', w: 395, h: 498, dx: -4.4, top: 182, tabs: ['Account', 'Design'],
    rows: {
      Account: [
        { k: 'text', y: 100, h: 66, html: `Display your own Instagram feed on your site and choose between four different layout styles in the Design tab. ${LEARN}` },
        ...account(210),
        { k: 'notice', y: 364.8, h: 88, html: 'There is no valid account connected yet. Select an existing connected account from the dropdown, or select <strong>Add an Account</strong> to connect a new one.' },
      ],
      Design: galleryDesign(false),
    },
  },
  Flickr: { title: 'Grid', w: 395, h: 498, dx: -4.4, top: 182, tabs: ['Account', 'Design'], rows: { Account: account(100), Design: galleryDesign(true) } },
  'Tag Cloud': {
    title: 'Tag Cloud', w: 300, h: 495, dx: -3.4, top: 181,
    rows: [
      { k: 'text', y: 66, h: 66, html: `Display tags or categories from one of your pages arranged in a fun cloud formation. ${LEARN}` },
      { k: 'text', y: 154, h: 44, html: START },
      { k: 'empty', y: 221 },
      { k: 'label', y: 313, text: 'Display Type' },
      { k: 'select', y: 335, options: ['Tags', 'Categories'], out: true },
      { k: 'label', y: 401, text: 'Sort By' },
      { k: 'select', y: 423, options: ['Alphabetical', 'Weight', 'Activity'], out: true },
      { k: 'slider', y: 489, key: 'tagCount', min: 5, max: 100, unit: 'Tags' },
      { k: 'help', y: 533.8, text: 'Pick the number of tags to show in the cloud.' },
    ],
  },
  Chart: {
    title: 'Chart', w: 572, h: 657, dx: -7.4, top: 180, tabs: ['Data', 'Design', 'Import / Export'],
    rows: {
      Data: [
        { k: 'text', y: 100, h: 44, html: `Add compelling data visualizations to your site by entering the data below or pasting it from a .csv file in the <strong>Import/Export</strong> tab. ${LEARN}` },
        { k: 'label', y: 166, text: 'Chart Type' },
        { k: 'select', y: 188, key: 'chartType', options: ['Bar Chart', 'Line Chart', 'Pie Chart'] },
        { k: 'check', y: 254, key: 'chartFlip', text: 'Flip X And Y Axes' },
        { k: 'label', y: 298, text: 'Chart Data' },
        { k: 'grid', y: 320, key: 'chartData' },
      ],
      Design: [
        { k: 'label', y: 100, text: 'Chart Title' },
        { k: 'field', y: 122, key: 'chartTitle', name: 'Chart Title' },
        { k: 'label', y: 188, text: 'Caption' },
        { k: 'field', y: 210, key: 'chartCaption', name: 'Caption' },
        { k: 'check', y: 276, key: 'chartLegend', text: 'Show Legend' },
        { k: 'label', y: 320, text: 'Color Palette' },
        { k: 'select', y: 342, key: 'chartPalette', options: PALETTE_NAMES, live: Object.keys(CHART_PALETTES) },
      ],
      'Import / Export': [
        { k: 'heading', y: 100, text: 'Import or Export Chart Data' },
        { k: 'help', y: 122, h: 88, text: 'Your data is provided here in CSV (comma separated value) format. You can copy the text below and save it as a .csv file to export your data. To import a spreadsheet, first save it as a .csv file. Then open it with a text editor and copy and paste the content into the box below, overwriting the existing text.' },
        { k: 'label', y: 232, text: 'Chart Data' },
        { k: 'area', y: 254, h: 144, key: 'chartData' },
        { k: 'button', y: 427, text: 'Update', action: 'csv' },
      ],
    },
  },
  Calendar: {
    title: 'Calendar', w: 335, h: 465, dx: -3.5, top: 182,
    rows: [
      { k: 'text', y: 66, h: 44, html: `Display events, blog posts, products, or gallery images as a calendar. ${LEARN}` },
      { k: 'text', y: 132, h: 22, html: START },
      { k: 'empty', y: 177 },
    ],
  },
  'Page Link': {
    title: 'Content Link', w: 335, h: 445, dx: -3.4, top: 182,
    rows: [
      { k: 'text', y: 66, h: 66, html: `Create a visual link to a page within your site that includes its associated title, thumbnail, and description. ${LEARN}` },
      { k: 'text', y: 154, h: 22, html: START },
      { k: 'heading', y: 199, text: 'Index' },
      { k: 'heading', y: 243, text: 'Pages' },
      { k: 'pages', y: 276, out: true },
    ],
  },
  RSS: {
    title: 'RSS Block', w: 350, h: 365, dx: -4.4, top: 183,
    rows: [
      { k: 'text', y: 66, h: 66, html: `Create a link to your Blog Page's RSS feed to encourage visitors to subscribe using their RSS reader. ${LEARN}` },
      { k: 'text', y: 154, h: 22, html: START },
      { k: 'empty', y: 199 },
    ],
  },
  SoundCloud: {
    title: 'Edit SoundCloud Embed', w: 470, h: 191, dx: -5.4, top: 186,
    rows: [
      { k: 'field', y: 67, placeholder: 'Enter a SoundCloud URL here', code: true, out: true },
      { k: 'help', y: 111, h: 44, html: `Paste the URL of a SoundCloud track, playlist, or profile to embed a player on the page. ${LEARN}` },
    ],
  },
  Bandsintown: {
    title: 'Bandsintown', w: 410, h: 420, dx: -5.4, top: 182,
    rows: [
      { k: 'text', y: 66, h: 66, html: `Display tour dates from your Bandsintown profile, and allow visitors to RSVP to your shows and buy tickets through links on your site. ${LEARN}` },
      { k: 'label', y: 155, text: 'Band Name' },
      { k: 'field', y: 177, placeholder: 'Pablo City', out: true },
      { k: 'help', y: 221, h: 44, text: "Enter your band's name as it appears within your Bandsintown account." },
      { k: 'label', y: 287, text: 'Timeframe to Show' },
      { k: 'select', y: 309, options: ['Upcoming', 'Date Range'], out: true },
    ],
  },
};
export const dialogOf = (b) => (b?.type === 'shape' && b.label && DIALOGS[b.label]) || null;

const CHEVRON = '<svg class="dl-chev" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4.5l3 3 3-3"/></svg>';
const TICK = '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M6.5 11.3l3 3 6-6.6" stroke="#fff" stroke-width="1.5"/></svg>';
const LAYOUT_ICONS = { Slideshow: '<rect x="2" y="2" width="28" height="16"/><rect x="2" y="22" width="7" height="6"/><rect x="12.5" y="22" width="7" height="6"/><rect x="23" y="22" width="7" height="6"/>', Carousel: '<rect x="8" y="4" width="16" height="22"/><path d="M2 4v22M30 4v22M5 4v22M27 4v22"/>', Grid: '<rect x="4" y="4" width="10" height="10"/><rect x="18" y="4" width="10" height="10"/><rect x="4" y="18" width="10" height="10"/><rect x="18" y="18" width="10" height="10"/>', Stacked: '<rect x="2" y="2" width="28" height="18"/><path d="M2 24h28M2 24v4M30 24v4"/>' };

function rowHtml(r, cw, b, pages) {
  const off = r.out || r.unbuilt;
  const dis = off ? ' disabled' : '';
  const cls = `dl-row dl-${r.k}${r.out ? ' is-out' : ''}${r.unbuilt ? ' is-unbuilt' : ''}`;
  const at = (y, h, x = 33, w = cw) => `style="top:${y}px;left:${x}px;width:${w}px${h != null ? `;height:${h}px` : ''}"`;
  const v = r.key ? dialogValue(b, r.key) : r.value;
  const data = r.key ? ` data-dl="${r.key}"` : '';
  switch (r.k) {
    case 'text': return `<div class="${cls}" ${at(r.y, r.h)}>${r.html}</div>`;
    case 'help': return `<div class="${cls}" ${at(r.y, r.h ?? 22, r.x ?? 33, r.x ? cw + 33 - r.x : cw)}>${r.html ?? esc(r.text)}</div>`;
    case 'label': return `<div class="${cls}" ${at(r.y, 22)}>${esc(r.text)}</div>`;
    case 'heading': return `<div class="${cls}" ${at(r.y, 22)}>${esc(r.text)}</div>`;
    case 'select': {
      const cur = v ?? r.options[0];
      return `<div class="${cls}" ${at(r.y, 44)}><span class="dl-sel-text">${esc(cur)}</span>${CHEVRON}<select aria-label="${esc(cur)}"${data}${dis}>${r.options.map((o) => `<option${o === cur ? ' selected' : ''}${r.live && !r.live.includes(o) ? ' disabled' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    }
    case 'field': return `<div class="${cls}" ${at(r.y, 44)}><input type="text"${data}${r.key ? ` value="${esc(v)}"` : ''} placeholder="${esc(r.placeholder || '')}" aria-label="${esc(r.name || r.placeholder || 'Field')}"${dis}>${r.code ? '<svg class="dl-code" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><path d="M7 6l-4 4 4 4M13 6l4 4-4 4M11 4.5l-2 11"/></svg>' : ''}</div>`;
    case 'check': return `<div class="${cls}" ${at(r.y, null)}><button type="button" role="checkbox" class="dl-box${v ? ' is-on' : ''}" aria-checked="${!!v}" aria-label="${esc(r.text)}"${data}${dis}>${v ? TICK : ''}</button><div class="dl-check-label">${esc(r.text)}</div>${r.help ? `<div class="dl-check-help" style="height:${r.helpH || 22}px">${esc(r.help)}</div>` : ''}</div>`;
    case 'slider': {
      const n = v ?? r.min;
      return `<div class="${cls}" ${at(r.y, 44)}><div class="dl-count">${n} ${r.unit}</div><span class="dl-track"></span><input type="range" aria-label="${r.unit}"${data} min="${r.min}" max="${r.max}" step="1" value="${n}"${dis}></div>`;
    }
    case 'num': return `<div class="${cls}" ${at(r.y, 22)}><div class="dl-numval">${v}</div><span class="dl-track"></span><input type="range" aria-label="${v}" min="${r.min}" max="${r.max}" step="1" value="${v}"${dis}></div>`;
    case 'empty': return `<div class="${cls}" ${at(r.y, 70)}>${NONE}</div>`;
    case 'notice': return `<div class="${cls}" ${at(r.y, r.h)}>${r.html}</div>`;
    case 'pages': return pages.map((p, n) => `<div class="${cls}" ${at(r.y + 49.5 * n, 44)}><span>${esc(p)}</span></div>`).join('');
    case 'layouts': return `<div class="${cls}" ${at(r.y, 110)}>${['Slideshow', 'Carousel', 'Grid', 'Stacked'].map((n) => `<button type="button" class="dl-layout${n === 'Grid' ? ' is-on' : ''}"${dis}><svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${LAYOUT_ICONS[n]}</svg><div class="dl-layout-name">${n}</div></button>`).join('')}</div>`;
    case 'grid': {
      // Header, the data rows and the + row, at the read cells (CAP-T12DCHART.json): every row has six inputs, two of
      // them under the grip and the label; the header has five, with a rule under it.
      const head = [[33, 132], [165, 110], [275, 44], [319, 110], [429, 110]], body = [[33, 110], [55, 110], [165, 110], [275, 44], [319, 110], [429, 110]];
      // Only the series name, the labels and the values take typing; the empty cells and the + row are off, as read.
      const cell = (y, [x, w], val, extra, at) => `<input type="text" class="dl-cell${extra}" style="top:${y}px;left:${x}px;width:${w}px" value="${esc(val)}" aria-label="Chart Data"${at && !off ? ` data-dl-cell="${at}"` : ' disabled'}>`;
      const rowsAt = [...v.slice(1).map((_, n) => 44 * (n + 1)), 44 * v.length + 2];
      const html = head.map((c, n) => cell(0, c, n === 1 ? v[0][1] : '', ' is-head', n === 1 && '0,1')).join('') + '<span class="dl-plus" style="top:0;left:275px">+</span>'
        + rowsAt.map((y, n) => body.map((c, k) => cell(y, c, v[n + 1]?.[k - 1] ?? '', n % 2 ? ' is-alt' : '', v[n + 1] && (k === 1 || k === 2) && `${n + 1},${k - 1}`)).join('') + (v[n + 1] ? `<span class="dl-grip" style="top:${y}px"></span>` : `<span class="dl-plus" style="top:${y}px;left:55px">+</span>`)).join('');
      return `<div class="${cls}" ${at(r.y, rowsAt.at(-1) + 44, 0, cw + 66)}>${html}</div>`;
    }
    case 'area': return `<div class="${cls}" ${at(r.y, r.h)}><textarea aria-label="Chart Data" data-dl-area="${r.key}"${dis}>${esc(chartCsv(v))}</textarea></div>`;
    case 'button': return `<div class="${cls}" ${at(r.y, 44)}><button type="button"${r.action ? ` data-dl-action="${r.action}"` : ''}${dis}><div>${esc(r.text)}</div></button></div>`;
    default: return '';
  }
}

// The dialog's inner page: the title, the tabs if any, then the open tab's rows.
export function dialogHtml(b, tab, pages = []) {
  const d = dialogOf(b);
  const cw = d.w - 66;
  const rows = d.tabs ? d.rows[tab] : d.rows;
  const tabs = d.tabs ? `<div class="dl-tabs" role="tablist">${d.tabs.map((t) => `<button type="button" role="tab" class="dl-tab${t === tab ? ' is-on' : ''}" aria-selected="${t === tab}" data-dl-tab="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : '<div class="dl-rule"></div>';
  const end = Math.max(...rows.map((r) => r.y + (r.k === 'pages' ? 49.5 * pages.length : r.k === 'grid' ? 44 * (dialogValue(b, r.key).length + 1) + 2 : r.h ?? 44)));
  return `<div class="dl-title" style="width:${cw}px">${esc(d.title)}</div>${tabs}${rows.map((r) => rowHtml(r, cw, b, pages)).join('')}<div class="dl-end" style="top:${end + 33}px"></div>`;
}
