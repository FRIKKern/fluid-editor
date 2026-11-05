// Model to HTML and CSS. The CSS text follows the per-section <style> that
// Squarespace publishes for Fluid Engine sections, captured 2026-11-03.
// Runs in the browser and in Node.
import { siteStylesHead } from './site-style-packs.js';

export const BPS = ['mobile', 'desktop'];
export const COLS = { mobile: 8, desktop: 24 };
// Column lines: 1 is the left edge of the left gutter track,
// COLS + 3 is the right edge of the right gutter track.
export const LAST_LINE = { mobile: COLS.mobile + 3, desktop: COLS.desktop + 3 };
export const BREAKPOINT = 768;
export const ROW_SCALE = 0.0215;
export const MOBILE_ROW_MIN = 24;

const f1 = (n) => Number(n).toFixed(1);
const areaText = (a) => a.join('/');

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Sticky blocks, desktop only in all 278 captured sections, but Pin works in Mobile View too
// (parity/findings/PIN.json phones): that pin goes in the base rule. Three forms seen. The offset
// keeps the unit it was typed with.
export function stickyCss(st) {
  if (!st) return '';
  const o = `${st.offset}${st.unit || 'px'}`;
  if (st.anchor === 'top') return `position: sticky; top: calc(${o} + var(--header-fixed-top-offset, 0px));`;
  if (st.anchor === 'center') return `position: sticky; top: calc(50% + ${o} + (var(--header-fixed-top-offset, 0px) / 2) - (var(--block-height, 0px) / 2));`;
  if (st.anchor === 'bottom') return `position: sticky; bottom: ${o};`;
  throw new Error(`unknown sticky anchor ${st.anchor}`);
}

// A phone pin sits in the base rule, so the desktop rule has to undo what would leak.
function stickyReset(m, d) {
  if (!m) return '';
  if (!d) return 'position: relative; top: auto; bottom: auto;';
  if (m.anchor === 'bottom' && d.anchor !== 'bottom') return 'bottom: auto;';
  if (m.anchor !== 'bottom' && d.anchor === 'bottom') return 'top: auto;';
  return '';
}

// Column gap sets the gutter and cell width; row gap can differ.
export function sectionGridCss(s) {
  const id = s.id;
  const g = f1(s.gap);
  const rg = f1(s.rowGap ?? s.gap);
  return `
.fe-${id} {
  --grid-gutter: calc(var(--sqs-mobile-site-gutter, 6vw) - ${g}px);
  --cell-max-width: calc( ( var(--sqs-site-max-width, 1500px) - (${g}px * (8 - 1)) ) / 8 );

  display: grid;
  position: relative;
  grid-area: 1/1/-1/-1;
  grid-template-rows: repeat(${s.rows.mobile},minmax(24px, auto));
  grid-template-columns:
    minmax(var(--grid-gutter), 1fr)
    repeat(8, minmax(0, var(--cell-max-width)))
    minmax(var(--grid-gutter), 1fr);
  row-gap: ${rg}px;
  column-gap: ${g}px;
  overflow-x: hidden;
  overflow-x: clip;
}

@media (min-width: 768px) {
  .background-width--inset .fe-${id} {
    --inset-padding: calc(var(--sqs-site-gutter) * 2);
  }

  .fe-${id} {
    --grid-gutter: calc(var(--sqs-site-gutter, 4vw) - ${g}px);
    --cell-max-width: calc( ( var(--sqs-site-max-width, 1500px) - (${g}px * (24 - 1)) ) / 24 );
    --inset-padding: 0vw;

    --row-height-scaling-factor: 0.0215;
    --container-width: min(var(--sqs-site-max-width, 1500px), calc(100vw - var(--sqs-site-gutter, 4vw) * 2 - var(--inset-padding) ));

    grid-template-rows: repeat(${s.rows.desktop},minmax(calc(var(--container-width) * var(--row-height-scaling-factor)), auto));
    grid-template-columns:
      minmax(var(--grid-gutter), 1fr)
      repeat(24, minmax(0, var(--cell-max-width)))
      minmax(var(--grid-gutter), 1fr);
  }
}
`;
}

// Hide on desktop or mobile (L5, parity/findings/UNBUILT.json): the oracle takes the block out of
// that layout and the editor shows it at opacity 0; ours adds display: none for that layout.
function hiddenCss(b) {
  const id = b.id;
  return (b.layout.mobile.hidden ? `\n  @media (max-width: 767px) { .fe-block-${id} { display: none; } }` : '')
    + (b.layout.desktop.hidden ? `\n  @media (min-width: 768px) { .fe-block-${id} { display: none; } }` : '');
}

export function blockCss(b) {
  return blockLayoutCss(b) + hiddenCss(b);
}
function blockLayoutCss(b) {
  const id = b.id;
  const m = b.layout.mobile;
  const d = b.layout.desktop;
  return `
  .fe-block-${id} {
    grid-area: ${areaText(m.area)};
    z-index: ${m.z};${m.sticky ? `\n    ${stickyCss(m.sticky)}` : ''}

    @media (max-width: 767px) {
    }
  }

  .fe-block-${id} .sqs-block {
    justify-content: ${m.justify};
  }

  .fe-block-${id} .sqs-block-alignment-wrapper {
    align-items: ${m.align};
  }

  @media (min-width: 768px) {
    .fe-block-${id} {
      grid-area: ${areaText(d.area)};
      z-index: ${d.z};
      ${stickyCss(d.sticky)}${m.sticky ? `\n      ${stickyReset(m.sticky, d.sticky)}` : ''}
    }

    .fe-block-${id} .sqs-block {
      justify-content: ${d.justify};
    }

    .fe-block-${id} .sqs-block-alignment-wrapper {
      align-items: ${d.align};
    }
  }
`;
}

export function sectionCss(s) {
  return sectionGridCss(s) + '\n' + s.blocks.map(blockCss).join('');
}

// What a code block shows (parity/findings/CODEEMBED.json): HTML as it is, Markdown rendered, and
// with Display Source Code the text in <pre class="source-code">, which CSS, JavaScript and Plain
// Text always use. Only headings, paragraphs, emphasis, strong and inline code are read from
// Markdown here; the oracle's other Markdown is not measured.
export function markdownHtml(text) {
  const inline = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code>$1</code>');
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => {
    const h = p.match(/^(#{1,6})\s+(.*)$/);
    return h ? `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>` : `<p>${inline(p)}</p>`;
  }).join(' ');
}
function codeOutput(b) {
  const mode = b.codeMode || 'html';
  if (b.showSource || (mode !== 'html' && mode !== 'markdown')) return `<pre class="source-code">${escapeHtml(b.html)}</pre>`;
  return mode === 'markdown' ? markdownHtml(b.html) : b.html;
}

// Accordion block (T12, parity/findings/ACCORDION.json): the oracle's list. Icon size S 14, M 24,
// L 30; line S 1, M 3, L 6; row padding S 15, M 30, L 50. One item is open while its panel view is.
export const ACCORDION_ICON = { S: 14, M: 24, L: 30 };
export const ACCORDION_LINE = { S: 1, M: 3, L: 6 };
export const ACCORDION_PAD = { S: 15, M: 30, L: 50 };
export const ACCORDION_DESCRIPTION = 'Description text goes here';
function accordionHtml(b) {
  const flag = (v) => (v ? 'true' : 'false');
  const on = b.dividers !== false;
  const items = (b.items || []).map((it, n) => {
    const id = `${b.id}-${n + 1}`;
    const top = n === 0 ? '<div data-sqsp-accordion-block-divider="" class="accordion-divider accordion-divider--top" aria-hidden="true"></div>' : '';
    const open = n === 0 && b.expandFirst;
    return `<li class="accordion-item"${open ? ' data-is-open="true"' : ''}>${top}<h4 class="accordion-item__title-wrapper" data-sqsp-accordion-block-item-title=""><button id="button-${id}" class="accordion-item__click-target" aria-expanded="${flag(open)}" aria-controls="dropdown-${id}"><span class="accordion-item__title">${escapeHtml(it.title)}</span><div class="accordion-icon-container" aria-hidden="true"><div class="plus"><div class="plus__horizontal-line"></div><div class="plus__vertical-line"></div></div></div></button></h4><div class="accordion-item__dropdown" id="dropdown-${id}" role="region" aria-labelledby="button-${id}"><div class="accordion-item__description" data-sqsp-accordion-block-item-description="">${escapeHtml(it.description ?? '')}</div></div><div data-sqsp-accordion-block-divider="" class="accordion-divider" aria-hidden="true"></div></li>`;
  }).join('');
  const style = `--accordion-icon:${ACCORDION_ICON[b.iconSize || 'S']}px;--accordion-line:${ACCORDION_LINE[b.iconThickness || 'S']}px;--accordion-pad:${ACCORDION_PAD[b.rowPadding || 'M']}px`;
  return `<ul class="accordion-items-container" style="${style}" data-should-allow-multiple-open-items="${flag(b.multiple)}" data-is-divider-enabled="${flag(on)}" data-is-first-divider-visible="${flag(b.showFirst !== false)}" data-is-last-divider-visible="${flag(b.showLast !== false)}" data-is-expanded-first-item="${flag(b.expandFirst)}" data-accordion-title-alignment="left" data-accordion-description-alignment="left" data-accordion-description-placement="left" data-accordion-icon-placement="${b.iconLeft ? 'left' : 'right'}">${items}</ul>`;
}

function blockInner(b, model) {
  switch (b.type) {
    case 'text':
      return `<div class="sqs-block html-block sqs-block-html" data-block-type="2" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-html-content">${b.html}</div></div></div>`;
    case 'button':
      // Button style (parity/findings/BUTTONSTYLE.json): Primary is medium, Secondary large,
      // Tertiary small; the oracle writes both on the container and the link.
      {
        const type = b.buttonStyle || 'primary';
        const size = BUTTON_SIZE[type];
        // A button stacked once stops filling its block (parity/findings/S3.json fitButton): it takes
        // its own width and Align Horizontally places it.
        const place = b.fit ? `sqs-block-button-container--${b.halign || 'center'} btn-fit` : 'sqs-block-button-container--center sqs-stretched';
        return `<div class="sqs-block button-block sqs-block-button" data-block-type="53" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-block-button-container sqs-button-block-container-system_desktop ${place}" data-button-size="${size}" data-button-type="${type}"><a class="sqs-block-button-element--${size} sqs-button-element--${type} sqs-block-button-element" href="${escapeHtml(b.href || '')}">${escapeHtml(b.label)}</a></div></div></div>`;
      }
    case 'shape': {
      const style = `--shape-fill:${b.fill || 'var(--accent)'};--shape-radius:${b.radius || '0'};--shape-ink:${b.ink || 'inherit'}`;
      const label = b.label ? `<span class="sqs-shape-label">${escapeHtml(b.label)}</span>` : '';
      // Stretch off (parity/findings/SHAPEDESIGN.json): the oracle drops data-stretched-to-fill
      // and draws the shape as wide as it is tall.
      const stretched = b.stretch !== false;
      return `<div class="sqs-block shape-block sqs-block-shape${stretched ? ' sqs-stretched' : ''}" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-shape-block-outer-container"><div class="sqs-shape-block-container sqs-block-alignment-wrapper sqs-shape-block-container-system_desktop"><div class="sqs-shape${stretched ? '' : ' is-square'}" style="${style}">${label}</div></div></div></div></div>`;
    }
    case 'stack': {
      // A Stack (S3): one grid block whose children flow in a flex box, measured on the oracle
      // (parity/findings/S3.json). stackCss holds its values, once per layout.
      const kids = (b.children || []).map((c) => `<div class="stack-child-container">${blockInner({ ...c, id: `${b.id}-${c.id}`, fit: c.type === 'button' || c.fit }, model)}</div>`).join('');
      return `<div class="sqs-block stack-block sqs-block-stack" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-stack-container stack-d-${stackAxes(b, 'desktop').direction} stack-m-${stackAxes(b, 'mobile').direction}" data-component-id="${b.id}">${kids}</div></div></div><style class="stack-vars">${stackCss(b)}</style>`;
    }
    case 'image': {
      // Image blocks (T4): Fill, the default here, covers the block. Fit and Shape are measured
      // in parity/findings/IMAGEMODES.json. Without a picture of the user's own (b.src, Content >
      // Replace) it is a neutral placeholder (QUALITY.md O2), and Fit uses b.aspect, or 3:2.
      const r = b.radius ? `border-radius:${b.radius};` : '';
      const mode = b.mode === 'fit' || b.mode === 'shape' ? ` image-mode-${b.mode}` : '';
      const aspect = b.mode === 'fit' ? `--image-aspect:${Number(b.aspect) || 1.5};` : '';
      const alt = escapeHtml(b.alt || '');
      const inner = b.src ? `<div class="fluid-image-container has-picture" style="${r}${aspect}"><img src="${escapeHtml(b.src)}" alt="${alt}"></div>`
        : `<div class="fluid-image-container" style="${r}${aspect}" role="img" aria-label="${alt}"></div>`;
      // A new block has no picture yet (MEDIAEMPTY.json): the editor shows a white box with a +.
      if (b.empty) return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-image image-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="fluid-image-component-empty-state-node"><span class="fluid-image-add" aria-hidden="true"></span></div></div></div>`;
      const pic = b.href ? `<a class="sqs-block-image-link" href="${escapeHtml(b.href)}">${inner}</a>` : inner;
      // The measured chain (parity/findings/BLOCKTYPES.json): an image holds the alignment wrapper.
      return `<div class="sqs-block image-block sqs-block-image sqs-stretched${mode}" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="fluid-image-component-root image-block-outer-wrapper design-layout-fluid image-position-center"><div class="fluid-image-animation-wrapper sqs-image sqs-block-alignment-wrapper">${pic}</div></div></div></div>`;
    }
    case 'accordion':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-accordion accordion-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content">${accordionHtml(b)}</div></div>`;
    case 'form': {
      // Form block (T9), sized to the oracle Contact form (parity/findings/T9.json).
      const e = escapeHtml;
      const field = (f) => {
        const req = (t) => { const m = t.match(/^(.*?)(\(required\))$/); return m ? `${e(m[1])}<span class="req">${e(m[2])}</span>` : e(t); };
        if (f.kind === 'name') return `<fieldset class="form-item form-name"><legend>${e(f.label)}</legend><div class="name-parts">${(f.parts || []).map((p) => `<div class="field"><label class="caption"><span class="caption-row">${req(p)}</span></label><input type="text"></div>`).join('')}</div></fieldset>`;
        if (f.kind === 'textarea') return `<div class="form-item"><label class="title">${e(f.label)}</label><textarea></textarea></div>`;
        if (f.kind === 'checkbox') return `<fieldset class="form-item form-checkbox"><legend>${e(f.label)}</legend>${(f.options || []).map((o) => `<div class="option"><label><input type="checkbox"><span>${e(o)}</span></label></div>`).join('')}</fieldset>`;
        if (f.kind === 'select') return `<div class="form-item form-select"><label class="title">${e(f.label)}</label><select>${(f.options || []).map((o) => `<option>${e(o)}</option>`).join('')}</select></div>`;
        return `<div class="form-item"><label class="title">${e(f.label)}</label><input type="${f.kind === 'email' ? 'email' : 'text'}"></div>`;
      };
      return `<div class="sqs-block form-block sqs-block-form" id="block-${b.id}"><div class="sqs-block-content"><form class="fe-form" onsubmit="return false">${(b.fields || []).map(field).join('')}<div class="form-button-wrapper"><button class="form-submit" type="submit">${e(b.button || 'Send')}</button></div></form></div></div>`;
    }
    case 'scrolling': {
      // Scrolling text (T12): the oracle draws the line along a wave path; its height is
      // the line height (1.4em, heading formula with size value 5) plus 120px.
      return `<div class="sqs-block scrolling-block sqs-block-scrolling${b.wave === 0 ? ' scrolling-block--flat' : ''}" id="block-${b.id}"><div class="sqs-block-content"><div class="marquee" style="--marquee-font-size-value:${b.size || 5}${b.wave === 0 ? ';--marquee-wave:0px' : ''}"><span class="marquee-text">${escapeHtml(b.text || '')}</span></div></div></div>`;
    }
    case 'line': {
      // Line block (T11): a horizontal rule centered in its area.
      return `<div class="sqs-block horizontalrule-block sqs-block-horizontalrule" id="block-${b.id}"><div class="sqs-block-content"><hr></div></div>`;
    }
    case 'social': {
      // Social links (T11): icons of 20px, 12px apart, as on the oracle footer.
      const icons = Array.from({ length: b.count || 3 }, () => '<a class="social-icon" href="#" aria-label="Social link"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/></svg></a>').join('');
      return `<div class="sqs-block socialaccountlinks-v2-block sqs-block-socialaccountlinks-v2" id="block-${b.id}"><div class="sqs-block-content"><div class="social-icons social-icon-alignment-${b.align || 'left'}">${icons}</div></div></div>`;
    }
    // Code, Embed and Video (T7, T10; parity/findings/CODEEMBED.json, T7.json): the published
    // class strings and block type 1337 of the corpus pages. An empty embed and an empty video
    // show a placeholder in the editor only. Our demo's code blocks show source text in <pre>.
    case 'embed': {
      const status = `<div class="sqs-blockStatus"${b.embedInvalid ? ' data-state="invalid"' : ''}><div class="sqs-blockStatus-box"><div class="sqs-blockStatus-box-title">Embed Block</div><div class="sqs-blockStatus-box-message">${b.embedInvalid ? 'Enter a valid embed URL or code.' : 'Add an embed URL or code.'}</div></div></div>`;
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-embed embed-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-embed-container">${b.html || status}</div></div></div>`;
    }
    case 'video':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-video video-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div>${b.html || '<div class="sqs-block-video-placeholder sqs-block-video-placeholder--empty"><div class="sqs-block-video-placeholder__ui"><div class="sqs-block-video-placeholder__icon"><svg viewBox="0 0 26 21" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2" aria-hidden="true"><rect x="1" y="1" width="24" height="19"/><path d="M10.5 7v7l6-3.5z" fill="currentColor" stroke="none"/></svg></div></div></div>'}</div></div></div>`;
    case 'code': {
      if (b.html != null) return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-code code-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-code-container">${codeOutput(b)}</div></div></div>`;
      const src = b.codeOf ? sectionGridCss(model.sections.find((s) => s.id === b.codeOf)).trim() : b.code;
      return `<div class="sqs-block code-block sqs-block-code" data-block-type="23" id="block-${b.id}"><div class="sqs-block-content"><pre><code>${escapeHtml(src)}</code></pre></div></div>`;
    }
    default:
      return `<div class="sqs-block" id="block-${b.id}"><div class="sqs-block-content"></div></div>`;
  }
}

// Block design (Edit > Design, parity/findings/DESIGN.json): the oracle writes one rule per
// block in <style class="transform-vars">, in this exact form (corpus pages, 134 blocks).
// --block-transform stays none until a transform is set. Blur adds backdrop-filter:
// blur(15px) and Background a white block background on this site.
export const DESIGN_DEFAULTS = { opacity: 100, tx: 0, ty: 0, rotate: 0, sx: 100, sy: 100, kx: 0, ky: 0, ox: 50, oy: 50 };
const TRANSFORM = 'translateX(var(--translate-x)) translateY(var(--translate-y)) rotate(var(--rotation)) scale(var(--scale-x), var(--scale-y)) skewX(var(--skew-x)) skewY(var(--skew-y))';
export function designCss(b) {
  const d = { ...DESIGN_DEFAULTS, ...b.design };
  const moved = d.tx || d.ty || d.rotate || d.sx !== 100 || d.sy !== 100 || d.kx || d.ky;
  return `
    .fe-block-${b.id} {
      --opacity: ${d.opacity}%;
      --translate-x: ${d.tx}px;
      --translate-y: ${d.ty}px;
      --rotation: ${d.rotate}deg;
      --scale-x: ${d.sx}%;
      --scale-y: ${d.sy}%;
      --skew-x: ${d.kx}deg;
      --skew-y: ${d.ky}deg;
      --origin-x: ${d.ox}%;
      --origin-y: ${d.oy}%;
      --block-transform: ${moved ? TRANSFORM : 'none'};

      opacity: var(--opacity, 1);
      transform: var(--block-transform);
      transform-origin: var(--origin-x) var(--origin-y);${d.blur ? '\n      backdrop-filter: blur(15px);' : ''}
    }${d.background ? `\n    .fe-block-${b.id}${b.type === 'stack' ? ' >' : ''} .sqs-block { background-color: rgb(255, 255, 255); }` : ''}
  `;
}

// Blend Mode (T15, parity/findings/BLEND.json): on a text block the oracle keeps
// mix-blend-mode: var(--tweak-text-block-blend ) and sets the variable, normal by default.
// Other block types are not measured; they get mix-blend-mode directly.
export const BLEND_MODES = ['Normal', 'Multiply', 'Screen', 'Overlay', 'Darken', 'Lighten', 'Color Dodge', 'Color Burn', 'Hard Light', 'Soft Light', 'Difference', 'Exclusion', 'Hue', 'Saturation', 'Color', 'Luminosity'];
export const BUTTON_SIZE = { primary: 'medium', secondary: 'large', tertiary: 'small' };

// A stack's direction and position in one layout (parity/findings/S3.json): phones start as a
// column at the top left and keep their own values. Position is stored as left-right and
// top-bottom, so the same tab stays on when the direction changes.
export function stackAxes(b, bp) {
  const s = bp === 'mobile' ? (b.phone || {}) : b;
  return { direction: s.direction || 'column', x: s.posX || 'flex-start', y: s.posY || 'flex-start' };
}
// The oracle's rule for a stack (S3.json): in a row left-right is justify-content and top-bottom
// align-items, in a column the reverse. Fill spreads the children and drops the gap.
export function stackCss(b) {
  const fill = b.gap === 'fill';
  const vars = (bp, spread) => {
    const { direction, x, y } = stackAxes(b, bp), row = direction === 'row';
    return `--stack-flex-direction: ${direction}; --stack-justify-content: ${spread ? 'space-between' : row ? x : y}; --stack-align-items: ${row ? y : x};`;
  };
  const sel = `.sqs-stack-container[data-component-id="${b.id}"]`;
  const p = b.padding;
  const padding = !p ? '' : b.padFour ? `${p.t} ${p.r} ${p.b} ${p.l}` : `${p.t} ${p.l}`;
  const g = b.design || {};
  const corner = g.corners ? g.corners.map((v) => `${v}px`).join(' ') : g.corner ? `${g.corner}px` : '';
  const own = `${padding ? `padding: ${padding};` : ''}${corner ? `border-radius: ${corner};` : ''}`;
  return `${sel} { ${vars('desktop', fill)} --stack-gap: ${fill ? 'normal' : `${b.gap ?? 20}px`}; } @media screen and (max-width: 767px) { ${sel} { ${vars('mobile', false)} } }${own ? ` #block-${b.id} { ${own} }` : ''}`;
}

export const STROKE_PX = { S: 2, M: 6, L: 15 };
export const STROKE_PAD = { S: '3%', M: '6%', L: '12%' };
export function blendCss(b) {
  // Drop Shadow on a shape (SHAPEDESIGN.json): drop-shadow(2px 2px 3px) on the block contents,
  // in the text color as no color is given.
  const g = b.design || {};
  // Stroke on a text block (parity/findings/STROKE.json): a solid or dashed black border on
  // .sqs-block, 2, 6 or 15px, and padding inside it of 3, 6 or 12% (6% unless set). Corner is
  // ours: the block's corner radius (not measured).
  const stroke = g.stroke ? `.fe-block-${b.id}${b.type === 'stack' ? ' >' : ''} .sqs-block { border: ${STROKE_PX[g.strokeSize || 'S']}px ${g.stroke} rgb(0, 0, 0); border-radius: ${g.corner || 0}px; } .fe-block-${b.id} .sqs-html-content { padding: ${STROKE_PAD[g.pad || 'M']}; }` : '';
  const shadow = (g.shadow ? `.fe-block-${b.id} .sqs-block { filter: drop-shadow(2px 2px 3px); }` : '') + (stroke ? ` ${stroke}` : '');
  const m = b.design?.blend;
  if (!m || m === 'normal') return shadow;
  if (b.type === 'text') return `${shadow} .fe-block-${b.id} { mix-blend-mode: var(--tweak-text-block-blend ); } .fe-block-${b.id} { --tweak-text-block-blend : ${m}; }`.trim();
  return `${shadow} .fe-block-${b.id} { mix-blend-mode: ${m}; }`.trim();
}

export function renderBlock(b, model) {
  const blend = blendCss(b);
  const design = (b.design ? `<style class="transform-vars">${designCss(b)}</style>` : '') + (blend ? `<style class="fe-blend">${blend}</style>` : '');
  return `<div class="fe-block fe-block-${b.id}" data-block-id="${b.id}">${blockInner(b, model)}${design}</div>`;
}

// Section divider (P5), measured on the oracle (parity/findings/DIVIDER.json): the default
// shape is a wave across the full width in a 6vw band at the section bottom. These are the
// band-relative heights of its edge at 41 even steps, sampled at 1600px and the same at 375
// and 1280px. The background is clipped along the edge and a 6px stroke follows it.
export const DIVIDER_EDGE = [0.5, 0.438, 0.375, 0.313, 0.253, 0.196, 0.143, 0.097, 0.061, 0.037, 0.03, 0.04, 0.064, 0.1, 0.147, 0.2, 0.257, 0.318, 0.379, 0.443,
  0.505, 0.569, 0.631, 0.693, 0.753, 0.81, 0.864, 0.91, 0.947, 0.972, 0.98, 0.973, 0.95, 0.914, 0.868, 0.815, 0.757, 0.698, 0.636, 0.573, 0.51];
const pct = (k) => +(k * 100 / (DIVIDER_EDGE.length - 1)).toFixed(3);
const DIVIDER_CLIP = `polygon(0 0, 100% 0, ${DIVIDER_EDGE.map((r, k) => `${pct(k)}% calc(100% - ${+(6 * (1 - r)).toFixed(3)}vw)`).reverse().join(', ')})`;
const DIVIDER_PATH = `M${DIVIDER_EDGE.map((r, k) => `${+(k / (DIVIDER_EDGE.length - 1)).toFixed(4)} ${r}`).join(' L')}`;
// Stroke (parity/findings/DIVOPTS.json): none, solid or dashed (5px dash, 21px gap, square
// caps, measured at 6px); thickness S 2px, M 6px (default), L 15px.
export const DIVIDER_THICKNESS = { S: 2, M: 6, L: 15 };
const dividerSvg = (s) => {
  const style = s.dividerStroke || 'solid';
  if (style === 'none') return '';
  const w = DIVIDER_THICKNESS[s.dividerThickness || 'M'];
  return `<svg class="section-divider-stroke" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><path d="${DIVIDER_PATH}" style="stroke-width: ${w}px;${style === 'dashed' ? ' stroke-dasharray: 5px 21px;' : ''}" /></svg>`;
};

export function renderSection(s, model) {
  // Section settings (P3, P4, P5): height S/M/L, vertical alignment, content width, background width.
  const cls = [
    'page-section',
    `section-height--${s.height || 'medium'}`,
    `vertical-alignment--${s.valign || 'middle'}`,
    `content-width--${s.contentWidth || 'wide'}`,
    `horizontal-alignment--${s.halign || 'center'}`,
    `background-width--${s.bgWidth || 'full-bleed'}`,
    s.divider ? 'has-section-divider' : '',
  ].filter(Boolean).join(' ');
  const themeName = (s.theme || '').replace(/^theme-/, '');
  const style = s.height === 'custom' ? ` style="--custom-height: ${s.customHeight ?? 0};"` : '';
  return `<section class="${cls}"${s.anchor ? ` id="${escapeHtml(s.anchor)}"` : ''} data-section-id="${s.id}" data-section-theme="${themeName}"${style}><div class="section-background"${s.divider ? ` style="clip-path: ${DIVIDER_CLIP};"` : ''}>${s.bgImage ? `<img class="section-background-image" alt="" src="${escapeHtml(s.bgImage)}">` : ''}</div>${s.divider ? dividerSvg(s) : ''}<div class="content-wrapper"><div class="content"><style data-fe-css>${sectionCss(s)}</style><div class="fluid-engine fe-${s.id}">${s.blocks.map((b) => renderBlock(b, model)).join('')}</div></div></div></section>`;
}

// Site header (P7), measured on the oracle (parity/findings/P7.json): it lies over the
// first section; desktop is the title's line height plus 3vw above and below, phones a
// 40px row (the menu button) plus 6vw. A small script switches to the phone header when
// title, menu and actions no longer fit, and pads the first section by the header's
// height, as the oracle's own script does. Spacing: 4vw sides, 1.3vw between menu
// items, 2vw before the actions.
export function renderHeader(h) {
  if (!h) return '';
  const nav = (h.nav || []).map((n) => `<a class="header-nav-item" href="${escapeHtml(n.href || '#')}">${escapeHtml(n.label)}</a>`).join('');
  const actions = (h.actions || []).map((n) => `<a class="header-action" href="${escapeHtml(n.href || '#')}">${escapeHtml(n.label)}</a>`).join('');
  return `<header class="site-header" id="header" data-collapse-below="${h.collapseBelow || 817}"><div class="header-inner"><a class="header-title" href="/">${escapeHtml(h.title)}</a><nav class="header-nav">${nav}</nav><div class="header-actions">${actions}</div><button class="header-burger" type="button" aria-label="Open Menu"><span></span><span></span></button></div></header>`;
}

export const HEADER_SCRIPT = `(() => {
  const header = document.getElementById('header');
  if (!header) return;
  const fit = () => {
    header.classList.remove('is-collapsed');
    const inner = header.querySelector('.header-inner');
    // The oracle switched at 817px for this title and menu (measured); its rule for
    // other content is not known, so the width is stored on the header.
    if (window.innerWidth < Number(header.dataset.collapseBelow || 817)) header.classList.add('is-collapsed');
    const first = document.querySelector('main#page .page-section');
    if (first) first.style.paddingTop = header.getBoundingClientRect().height + 'px';
  };
  fit();
  addEventListener('resize', fit);
  document.fonts && document.fonts.ready.then(fit);
})();`;

// On a published page a title opens and closes its item, one at a time unless the block allows
// more. This behaviour is inferred from the block's labels, not measured on a published page.
export const ACCORDION_SCRIPT = `document.addEventListener('click', (e) => {
  const b = e.target.closest('.accordion-item__click-target');
  if (!b) return;
  const li = b.closest('.accordion-item'), open = !li.hasAttribute('data-is-open'), ul = li.parentElement;
  if (open && ul.dataset.shouldAllowMultipleOpenItems !== 'true') for (const o of ul.querySelectorAll('[data-is-open]')) { o.removeAttribute('data-is-open'); o.querySelector('.accordion-item__click-target').setAttribute('aria-expanded', 'false'); }
  if (open) li.setAttribute('data-is-open', 'true'); else li.removeAttribute('data-is-open');
  b.setAttribute('aria-expanded', String(open));
});`;

export function renderPage(model) {
  return model.sections.map((s) => renderSection(s, model)).join('\n');
}

// The site footer: Fluid Engine sections of their own (P7).
export function renderFooter(model) {
  if (!model.footer?.length) return '';
  return `<footer class="sections" id="footer-sections">${model.footer.map((s) => renderSection(s, model)).join('')}</footer>`;
}

export function exportHtml(model, siteCss) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(model.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;1,400&display=swap">
<style>${siteCss}</style>
${siteStylesHead(model.siteStyles)}
</head>
<body>
${renderHeader(model.header)}
<main id="page">
${renderPage(model)}
</main>
${renderFooter(model)}
<script>${HEADER_SCRIPT}
${ACCORDION_SCRIPT}</script>
</body>
</html>
`;
}
