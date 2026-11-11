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

const TILES = { Product: ['sqs-block-product product-block-tile', productHtml] };
// A plain stand-in that draws its content: a Shape with the Add Block menu's name and no content type of its own.
export const tileOf = (b) => (b.type === 'shape' && !b.standin && Object.hasOwn(TILES, b.label) ? b.label : null);
export const tileHtml = (b) => { const [cls, draw] = TILES[b.label]; return `<div class="sqs-block fe-drawn-tile ${cls}" data-block-type="1337" id="block-${esc(b.id)}"><div class="sqs-block-content">${draw(b)}</div></div>`; };
