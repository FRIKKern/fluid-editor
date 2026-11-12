// What the plain stand-in tiles draw inside (T12): the content the oracle's block shows, by its panel's values (b.sp, kept by
// standin-panels.js), as its leaf boxes read before and after each press (CAP-T12PRESS-A.json to -E.json, CAP-ROWSPRODUCT.json).
// Only what two runs agree on is drawn; the rest is named where it is left. The tile's rows stay as they are (named misses in
// T12): content past them is cut. Pictures are ours: no image of the oracle's is used (O2).
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const on = (v, key, def) => (v[key] ?? def) !== false;

// Product: an empty image at the Ratio's aspect, its title, price, description and add-to-cart row, each by its Elements switch.
// Read at 6 columns (341.7 wide, CAP-T12PRESS-A.json and CAP-ROWSPRODUCT.json) and 3 (165.3, CAP-T12PRESS-E.json):
// Original draws the empty image 3:2 and 1:1 square (read in both runs); the other ratios take their names (inferred).
// The description's text past its first 60 letters is not read: ours draws those 60.
const PRODUCT_RATIO = { '1:1': '1 / 1', '3:2': '3 / 2', '2:3': '2 / 3', '4:3': '4 / 3', '3:4': '3 / 4', '16:9': '16 / 9', Original: '3 / 2' };
const PLUS = '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
const MINUS = '<svg viewBox="0 0 17 17" width="17" height="17" aria-hidden="true"><path d="M2.3 8.5h13.1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
const PLUS17 = '<svg viewBox="0 0 17 17" width="17" height="17" aria-hidden="true"><path d="M8.5 2.3v12.4M2.3 8.5h12.4" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
function productHtml(b) {
  const v = b.sp || {};
  const image = on(v, 'pdImage', true) ? `<div class="product-image" style="aspect-ratio:${PRODUCT_RATIO[v.pdRatio] || PRODUCT_RATIO.Original}"><div class="product-add"><span class="product-add-icon">${PLUS}</span><span class="product-add-text">Add a product</span></div></div>` : '';
  const title = on(v, 'pdTitle', true) ? '<div class="product-title">Product Name</div>' : '';
  const price = on(v, 'pdPrice', true) ? '<div class="product-price">NOK&nbsp;25.00</div>' : '';
  const desc = v.pdDesc ? '<div class="product-excerpt"><p>Designed for ease, this solution offers reliable performance</p></div>' : '';
  const cart = v.pdCart ? `<div class="product-cart"><div class="product-quantity"><div class="product-quantity-row"><button type="button" class="decrease-button" tabindex="-1" aria-label="Decrease">${MINUS}</button><input value="1" aria-label="Quantity" tabindex="-1" readonly><button type="button" class="increase-button" tabindex="-1" aria-label="Increase">${PLUS17}</button></div></div><button type="button" class="sqs-add-to-cart-button" tabindex="-1"><span class="add-to-cart-text">Add to cart</span></button></div>` : '';
  return `<div class="product-block">${image}<div class="productDetails">${title}${price}${desc}${cart}</div></div>`;
}

// Menu: its text as menus, sections and items (the Formatting Help's patterns), read on the default text (CAP-T12PANELS-B.json,
// CAP-T12READS-E.json, CAP-T12PRESS-C.json, the same boxes) and on a typed one with a single menu (CAP-T12PRESS-C.json): two or
// more menus put their names above, the first one shown; one menu has none (one read). Multi-Column flows the items down two
// columns; Centered stacks them, the price under the description (CAP-T12PRESS-C.json and CAP-ROWSMENU.json, the same steps of
// 131.7 an item). The Currency Symbol changes the sign alone. Not read: the second menu's look, options (+), a section's or
// menu's description, a price with words (they draw as text).
const CURRENCY = { '$ Dollar': '$', '€ Euro': '€', '£ Pound': '£', '¥ Yen': '¥' };
export function menuParse(text) {
  const lines = String(text).split('\n').map((l) => l.trim()), menus = [];
  let menu = null, section = null, item = null;
  const need = () => { if (!menu) menus.push(menu = { title: '', sections: [] }); if (!section) menu.sections.push(section = { title: '', items: [] }); };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], next = lines[i + 1] || '';
    if (!l) { item = null; continue; }
    if (/^=+$/.test(next)) { menus.push(menu = { title: l, sections: [] }); section = item = null; i++; continue; }
    if (/^-+$/.test(next)) { if (!menu) menus.push(menu = { title: '', sections: [] }); menu.sections.push(section = { title: l, items: [] }); item = null; i++; continue; }
    need();
    if (!item) section.items.push(item = { title: l, desc: [], price: null });
    else if (/^\$/.test(l) && item.price == null) item.price = l.slice(1);
    else item.desc.push(l);
  }
  return menus;
}
function menuHtml(b) {
  const v = b.sp || {}, menus = menuParse(v.mnText ?? MENU_TEXT), sign = `<span class="currency-sign">${esc(CURRENCY[v.mnCurrency] || '$')}</span>`;
  const tabs = menus.length > 1 ? `<div class="menu-selects">${menus.map((m, i) => `<label class="menu-select-labels${i ? '' : ' is-on'}">${esc(m.title)}</label>`).join(' ')}</div>` : '';
  const item = (it) => `<div class="menu-item"><div class="menu-item-title">${esc(it.title)}</div>${it.desc.length ? `<div class="menu-item-description">${it.desc.map(esc).join('<br>')}</div>` : ''}${it.price != null ? `<div class="menu-item-price-bottom">${sign}${esc(it.price)}</div>` : ''}</div>`;
  const first = menus[0] || { sections: [] };
  const sections = first.sections.map((s) => `<div class="menu-section">${s.title ? `<div class="menu-section-title">${esc(s.title)}</div>` : ''}<div class="menu-items">${s.items.map(item).join('')}</div></div>`).join('');
  return `<div class="menu-block menu-layout-${(v.mnLayout ?? 'Multi-Column') === 'Centered' ? 'centered' : 'columns'}">${tabs}<div class="menus"><div class="menu">${sections}</div></div></div>`;
}
// The default text, as the panel's box holds it (CAP-ROWSMENU.json).
export const MENU_TEXT = 'MEALS\n=========\n\nSandwiches\n----------\n\nLE PAYSAN\nSmoked Turkey, Brie & apple chutney\n$14\n\nSOHO MEDITERRANEAN SANDWICH\nHummus, grilled vegetables & halloumi cheese\n$15\n\nSTEAK SANDWICH\nSteak w/ onions, bacon & cheddar\n$18\n\n\nPasta\n------\n\nGRAMIGNA\nmacaroni, pork sausage, swiss chard, black pepper\n$20\n\nGARGANELLI\npasta quills, cream, peas, truffle butter, prosciutto\n$22\n\nSPALLINA\ndouble ravioli, squacquerone cheese, rabbit, porcini\n$24\n\n\nDRINKS\n=========\n\nWine\n----\n\nSauvignon Blanc, Kim Crawford, Imalborough\n$12.00 glass /  $45.00 bottle\n\nMeursault, Mat Rot, Burgundy, France\n$13 glass / $80 bottle';

const TILES = { Product: ['sqs-block-product product-block-tile', productHtml], Menu: ['sqs-block-menu menu-block-tile', menuHtml] };
// A plain stand-in that draws its content: a Shape with the Add Block menu's name and no content type of its own.
export const tileOf = (b) => (b.type === 'shape' && !b.standin && Object.hasOwn(TILES, b.label) ? b.label : null);
// phone: the height the oracle's block draws on a phone, where it has one (render.js PHONE_HEIGHTS).
export const tileHtml = (b, phone) => { const [cls, draw] = TILES[b.label]; return `<div class="sqs-block fe-drawn-tile ${cls}" data-block-type="1337" id="block-${esc(b.id)}"${phone ? ` style="--phone-h:${Number(phone)}px"` : ''}><div class="sqs-block-content">${draw(b)}</div></div>`; };
