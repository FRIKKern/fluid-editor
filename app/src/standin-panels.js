// The panels of the stand-ins that keep their plain tile (T12): each tab's rows as the oracle shows them, from
// CAP-T12PANELS-A.json to -C.json, and what a press does from CAP-T12PRESS-A.json to -D.json. The tile itself stays
// a sized stand-in (0005): none of these rows changed a block's rows on the oracle, so a press only keeps its value.
// Rows that need an account, a lookup, a collection or a payment are drawn faded and do nothing (0005's stand-in line).
// Note texts are copied from the read's screenshots.
import { escapeHtml as esc } from './render.js';
import { IMAGE_SHAPE_TABS, imageShapesOf } from './image-shapes.js';

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
const icons = (key, label, opts, def) => (v) => `<div class="bp-sp-icons" role="radiogroup" aria-label="${label}">${opts.map((o) => { const [val, l, d] = Array.isArray(o) ? o : [o, o, ALIGN_ICONS[o]]; return `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? def) === val ? ' is-on' : ''}" aria-checked="${(v[key] ?? def) === val}" aria-label="${l}" data-sp-set="${key}" data-v="${val}">${pi(d)}</button>`; }).join('')}</div>`;
const darkOut = (text) => () => `<button type="button" class="bp-sp-dark" ${OUT}>${text}</button>`;
// Product's rows, in the same older look: a black head, a bordered box out, the image shape picker, Corner, Ratio,
// a Focal Point that waits for an image, Block Alignment.
const phead = (label) => () => `<div class="bp-sp-phead">${label}</div>`;
const newOut = (text) => () => `<button type="button" class="bp-sp-new" ${OUT}>${pi('<path d="M12 5v14M5 12h14"/>')}<span>${text}</span></button>`;
// Product's image shapes, in the picker's order and names (CAP-T12READS-E.json), drawn with our own 1:1 image-shape paths.
const PRODUCT_SHAPES = [['rectangle', 'Rectangle'], ['circle', 'Circle'], ['diamond', 'Diamond'], ['rabbet', 'Rabbet'], ['eight-sided-shield', 'Eight Sided Shield'], ['tv', 'TV'], ['octagon', 'Octagon'], ['rounded-pentagon', 'Rounded Pentagon'], ['open-book', 'Open Book'], ['four-petal-flower', 'Four Petal Flower'], ['flower', 'Flower'], ['horizontal-stacked-circles', 'Horizontal Stacked Circles'], ['wide-vertical-stacked-pills', 'Wide Vertical Stacked Pills'], ['horizontal-right-leaning-oval', 'Horizontal Right Leaning Oval'], ['wide-horizontal-stacked-pills', 'Wide Horizontal Stacked Pills'], ['wide-eight-sided-shield', 'Wide Eight Sided Shield'], ['egg', 'Egg'], ['narrow-horizontal-stacked-pills', 'Narrow Horizontal Stacked Pills'], ['arched-window', 'Arched Window'], ['pointed-window', 'Pointed Window'], ['award', 'Award']];
// The 1:1 drawing where there is one, else the first tab that has it, drawn at that tab's aspect, as the read's tiles show.
const tabOf = (id) => (id === 'rectangle' ? '1:1' : IMAGE_SHAPE_TABS.find((t) => imageShapesOf(t).some((x) => x.id === id)) || '1:1');
const shapeD = (id) => (id === 'rectangle' ? 'M0 0H1V1H0Z' : imageShapesOf(tabOf(id)).find((x) => x.id === id)?.d || 'M0 0H1V1H0Z');
const thumb = (id, size) => { const [a, b] = tabOf(id).split(':').map(Number), w = a >= b ? size : (size * a) / b, h = b >= a ? size : (size * b) / a; return `<svg width="${+w.toFixed(1)}" height="${+h.toFixed(1)}" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path d="${shapeD(id)}"/></svg>`; };
// The picker opens its tiles over the panel; a pick keeps its value and closes them (what a pick does to the block is not read).
const picker = (key) => (v) => `<div class="bp-sp-pickw"><button type="button" class="bp-sp-pick" aria-label="Image shape" aria-haspopup="listbox" data-sp-pick>${thumb(v[key] ?? 'rectangle', 47)}${pi('<path d="M7 10l5 5 5-5"/>')}</button><div class="bp-sp-shapes" role="listbox" aria-label="Image shape" hidden>${PRODUCT_SHAPES.map(([id, name]) => `<button type="button" role="option" class="bp-sp-shape${(v[key] ?? 'rectangle') === id ? ' is-on' : ''}" aria-selected="${(v[key] ?? 'rectangle') === id}" aria-label="${name}" title="${name}" data-sp-set="${key}" data-v="${id}">${thumb(id, 43)}</button>`).join('')}</div></div>`;
const CORNER = [['uniform', 'Uniform corner radii', '<rect x="6" y="6" width="12" height="12" rx="2"/>'], ['each', 'Individual corner radii', '<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/>']];
const corner = (key, rkey) => (v) => `<div class="bp-sp-corner"><div class="bp-sp-csegs" role="radiogroup" aria-label="Corner">${CORNER.map(([val, l, d]) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? 'uniform') === val ? ' is-on' : ''}" aria-checked="${(v[key] ?? 'uniform') === val}" aria-label="${l}" data-sp-set="${key}" data-v="${val}">${pi(d)}</button>`).join('')}</div><input type="text" aria-label="Corner radius" data-sp-field="${rkey}" value="${esc(v[rkey] ?? '0px')}" autocomplete="off" spellcheck="false"></div>`
  // Individual corner radii: four fields under it, each 0 (CAP-T12READS-E.json).
  + ((v[key] ?? 'uniform') === 'each' ? `<div class="bp-sp-four">${EACH.map(([k, l], i) => `<label class="bp-sp-each is-${i}"><input type="text" aria-label="${l} corner radius" data-sp-field="${rkey}${k}" value="${esc(v[rkey + k] ?? '0')}" autocomplete="off" spellcheck="false"></label>`).join('')}</div>` : '');
const EACH = [['TL', 'Top left'], ['TR', 'Top right'], ['BR', 'Bottom right'], ['BL', 'Bottom left']];
const select = (key, label, opts, def) => (v) => `<label class="sp-row bp-sp-erow bp-sp-sel"><span class="sp-label">${label}</span><span class="bp-sp-selv">${esc(v[key] ?? def)}${pi('<path d="M7 10l5 5 5-5"/>')}</span><select aria-label="${label}" data-sp-set="${key}">${opts.map((o) => `<option${(v[key] ?? def) === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
const focal = () => () => `<button type="button" class="bp-sp-focal" disabled>${pi('<path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/><circle cx="12" cy="12" r="1.5"/>')}<span>Focal Point</span></button>`;
// Menu's rows: the menu's text in a code box that grows with it, a layout tile with its menu, help texts with code boxes.
const MENU_TEXT = 'MEALS\n=========\n\nSandwiches\n----------\n\nLE PAYSAN\nSmoked Turkey, Brie & apple chutney\n$14\n\nSOHO MEDITERRANEAN SANDWICH\nHummus, grilled vegetables & halloumi cheese\n$15\n\nSTEAK SANDWICH\nSteak w/ onions, bacon & cheddar\n$18\n\n\nPasta\n------\n\nGRAMIGNA\nmacaroni, pork sausage, swiss chard, black pepper\n$20\n\nGARGANELLI\npasta quills, cream, peas, truffle butter, prosciutto\n$22\n\nSPALLINA\ndouble ravioli, squacquerone cheese, rabbit, porcini\n$24\n\n\nDRINKS\n=========\n\nWine\n----\n\nSauvignon Blanc, Kim Crawford, Imalborough\n$12.00 glass /  $45.00 bottle\n\nMeursault, Mat Rot, Burgundy, France\n$13 glass / $80 bottle';
const code = (key, label, def) => (v) => `<div class="bp-sp-code"><textarea aria-label="${label}" data-sp-field="${key}" spellcheck="false">${esc(v[key] ?? def)}</textarea></div>`;
const LAYOUT_ICON = '<path d="M5 7h3M5 12h3M5 17h3M11 7h8M11 12h8M11 17h8"/>';
const layout = (key, opts, def, icon = LAYOUT_ICON) => (v) => `<label class="bp-sp-layout"><span class="bp-sp-ltile">${pi(icon)}</span><span class="bp-sp-lname">${esc(v[key] ?? def)}</span>${pi('<path d="M7 10l5 5 5-5"/>')}<select aria-label="Layout" data-sp-set="${key}">${opts.map((o) => `<option${(v[key] ?? def) === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
const hhead = (t) => () => `<h4 class="bp-sp-hhead">${t}</h4>`;
const hpara = (html) => () => `<p class="bp-sp-hpara">${html}</p>`;
const hcode = (text) => () => `<div class="bp-sp-hcode"><pre>${esc(text)}</pre></div>`;
// Summary's and Archive's rows: a value with its menu, faded when it needs a collection (0005); a labelled menu in a box.
const dsel = (text) => () => `<button type="button" class="bp-sp-dsel" ${OUT}><span>${text}</span>${pi('<path d="M7 10l5 5 5-5"/>')}</button>`;
const vsel = (key, opts, def) => (v) => `<label class="bp-sp-dsel bp-sp-vsel"><span>${esc(v[key] ?? def)}</span>${pi('<path d="M7 10l5 5 5-5"/>')}<select aria-label="${opts.label}" data-sp-set="${key}">${opts.list.map((o) => `<option${(v[key] ?? def) === o ? ' selected' : ''}>${o}</option>`).join('')}</select></label>`;
const boxsel = (key, label, opts, def) => (v) => `<label class="bp-sp-boxsel"><span class="sp-label">${label}</span><span class="bp-sp-bsv"><span>${esc(v[key] ?? def)}</span>${pi('<path d="M7 10l5 5 5-5"/>')}<select aria-label="${label}" data-sp-set="${key}">${opts.map((o) => `<option${(v[key] ?? def) === o ? ' selected' : ''}>${o}</option>`).join('')}</select></span></label>`;
const segi = (key, label, opts, def) => (v) => `<div class="bp-sp-seg"><span class="sp-label">${label}</span><div class="bp-sp-segs" role="radiogroup" aria-label="${label}">${opts.map(([val, l, d]) => `<button type="button" role="radio" class="bp-sp-opt${(v[key] ?? def) === val ? ' is-on' : ''}" aria-checked="${(v[key] ?? def) === val}" aria-label="${l}" data-sp-set="${key}" data-v="${val}">${pi(d)}</button>`).join('')}</div></div>`;
const toggleOff = (label) => () => `<div class="sp-row bp-sp-erow is-off"><span class="sp-label">${label}</span><label class="sp-switch"><input type="checkbox" aria-label="${label}" disabled><span aria-hidden="true"></span></label></div>`;
const TEXT_ALIGN = [['left', 'Left Aligned', '<path d="M5 7h14M5 11h9M5 15h14M5 19h9"/>'], ['center', 'Center Aligned', '<path d="M5 7h14M7.5 11h9M5 15h14M7.5 19h9"/>'], ['right', 'Right Aligned', '<path d="M5 7h14M10 11h9M5 15h14M10 19h9"/>']];
const WALL_ICON = '<path d="M6 5h12v14H6zM12 5v14M12 12h6"/>', INDEX_ICON = '<path d="M6 6h12v5H6zM6 13h12v5H6z"/>';
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
  Menu: {
    // What the text does to the block is not drawn: the tile stays a stand-in (CAP-T12PRESS-C.json reads it).
    tabs: ['Content', 'Design', 'Formatting Help'],
    content: [note('Add your menu items, descriptions, and prices.<br>When you follow the format patterns below, your<br>text will transform into different menu sections.', ' bp-sp-mnote'), code('mnText', 'Menu text', MENU_TEXT)],
    design: [layout('mnLayout', ['Centered', 'Multi-Column'], 'Multi-Column'), select('mnCurrency', 'Currency Symbol', ['$ Dollar', '€ Euro', '£ Pound', '¥ Yen'], '$ Dollar')],
    help: [hpara(`Use the formatting shown below to create your<br>menu. ${link('Learn More.')}`), hhead('Menu Sections'), hpara('Sections define groups of items on your menu.<br>Section descriptions are optional.'), hcode('Section\n-------\nOptional section description'),
      hhead('Menu Items'), hpara('To add an item to your menu, type in the<br>following format. Separate multiple menu items<br>with 2 spaces. Options can be added to an item<br>by using the “+” format on a new line. Both<br>prices and descriptions are optional.'), hcode('Title of Menu Item\nDescription of food item.\n$10'), hcode('Another Menu Item\nA different description.\n$20\n+ Option\n+ Another Option'),
      hhead('Multiple Menu Pages'), hpara('Menu blocks can support multi-page menus<br>(lunch, dinner, etc). Menu pages will be rendered<br>as tabs. To create a menu page within a block,<br>type:'), hcode('Lunch\n========\nOptional menu description')],
  },
  Summary: {
    tabs: ['Content', 'Design'],
    // Its collection menus need a collection (0005): faded. Its rows are the fixes lane's (resize) and move by presses on the
    // oracle with no rule found (CAP-T12PRESS-B.json): named. Size and Spacing opens a view of its own: drawn, not built.
    content: [note(`Display content from other pages on your site,<br>such as blog posts, products, events, or videos.<br>${link('Learn More')}`, ' bp-sp-mnote'), dsel('There are no Collection Pages'), cap('Primary Metadata'), dsel('No metadata found'), cap('Secondary Metadata'), dsel('No metadata found')],
    design: [layout('smLayout', ['Wall', 'Carousel', 'List', 'Grid'], 'Wall', WALL_ICON), range('smItems', 'Number of Items', 3, 1, 30), cap('Text'), icons('smAlign', 'Text', TEXT_ALIGN, 'left'), cap('Elements'), erow('smTitle', 'Title', true), erow('smImage', 'Featured Image', true), erow('smExcerpt', 'Excerpt', true), cap('Metadata Position'), vsel('smMeta', { label: 'Metadata Position', list: ['Above Title', 'Below Title', 'Below Content'] }, 'Below Content'), view('Size and Spacing')], look: true,
  },
  Archive: {
    // Collection needs a collection (0005). Dates ascending is disabled as read. Rows: named (CAP-T12PRESS-B.json).
    content: [phead('Collection'), box('<span>No collections found</span>'), rule(), phead('Organization'), boxsel('arGroup', 'Group by', ['Month', 'Year', 'Author', 'Category', 'Tag'], 'Month'), rule(), phead('Elements'), toggleOff('Dates ascending'), erow('arDate', 'Item date', true), erow('arCount', 'Group count', false)],
    design: [head('Layout'), layout('arLayout', ['Index', 'List', 'Drop down'], 'Index', INDEX_ICON), segi('arColumns', 'Columns', [['false', 'One column', '<path d="M6 7h12M6 10.3h12M6 13.6h12M6 17h12"/>'], ['true', 'Two columns', '<path d="M5 7h6M5 10.3h6M5 13.6h6M5 17h6M13 7h6M13 10.3h6M13 13.6h6M13 17h6"/>']], 'true'), segi('arAlign', 'Alignment', ['left', 'center', 'right'].map((o) => [o, o, ALIGN_ICONS[o]]), 'left'), rule(), head('Appearance')], look: true, transforms: true,
  },
  Product: {
    // Create new product makes a product in the store (0005). Its rows follow neither the switches nor its content box by the
    // frozen rule (CAP-T12PRESS-A.json, -E.json): the switches and Ratio keep its rows (named misses).
    content: [phead('Product'), newOut('Create new product'), phead('Elements'), erow('pdImage', 'Image', true), erow('pdTitle', 'Title', true), erow('pdPrice', 'Price', true), erow('pdDesc', 'Description', false), erow('pdCart', 'Add to Cart Button', false), erow('pdQuick', 'Product Quick View', false), note('On hover, a button will appear that lets<br>customers dynamically access product details<br>without leaving the page.', ' bp-sp-qnote')],
    design: [phead('Image'), picker('pdShape'), when((v) => (v.pdShape ?? 'rectangle') === 'rectangle', corner('pdCorner', 'pdRadius')), select('pdRatio', 'Ratio', ['1:1', '3:2', '2:3', '4:3', '3:4', '16:9', 'Original'], 'Original'), focal(), balign('pdAlign', 'Block Alignment')], look: true, transforms: true,
  },
};
export const standinPanelOf = (b) => (b.type === 'shape' && !b.standin && STANDIN_PANELS[b.label] ? b.label : null);
export const standinTabs = (name) => STANDIN_PANELS[name].tabs || ['Content', 'Design', 'Animation'];
export const standinContentHtml = (c) => `<div class="bp-sp">${STANDIN_PANELS[c.name].content.map((r) => r(c.values)).join('')}</div>`;
export const standinHelpHtml = (c) => `<div class="bp-sp bp-sp-help">${STANDIN_PANELS[c.name].help.map((r) => r(c.values)).join('')}</div>`;
export const standinDesignHtml = (c) => `<div class="bp-sp bp-sp-design">${STANDIN_PANELS[c.name].design.map((r) => r(c.values)).join('')}</div>`;
