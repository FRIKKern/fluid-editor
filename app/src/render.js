// Model to HTML and CSS. The CSS text follows the per-section <style> that
// Squarespace publishes for Fluid Engine sections, captured 2026-11-03.
// Runs in the browser and in Node.

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

// Sticky blocks, desktop only in all 278 captured sections. Three forms seen.
export function stickyCss(st) {
  if (!st) return '';
  const o = `${st.offset}px`;
  if (st.anchor === 'top') return `position: sticky; top: calc(${o} + var(--header-fixed-top-offset, 0px));`;
  if (st.anchor === 'center') return `position: sticky; top: calc(50% + ${o} + (var(--header-fixed-top-offset, 0px) / 2) - (var(--block-height, 0px) / 2));`;
  if (st.anchor === 'bottom') return `position: sticky; bottom: ${o};`;
  throw new Error(`unknown sticky anchor ${st.anchor}`);
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

export function blockCss(b) {
  const id = b.id;
  const m = b.layout.mobile;
  const d = b.layout.desktop;
  return `
  .fe-block-${id} {
    grid-area: ${areaText(m.area)};
    z-index: ${m.z};

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
      ${stickyCss(d.sticky)}
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

function blockInner(b, model) {
  switch (b.type) {
    case 'text':
      return `<div class="sqs-block html-block sqs-block-html" data-block-type="2" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-html-content">${b.html}</div></div></div>`;
    case 'button':
      return `<div class="sqs-block button-block sqs-block-button" data-block-type="53" id="block-${b.id}"><div class="sqs-block-alignment-wrapper"><div class="sqs-block-content"><a class="sqs-block-button-element" href="${escapeHtml(b.href || '#')}">${escapeHtml(b.label)}</a></div></div></div>`;
    case 'shape': {
      const style = `--shape-fill:${b.fill || 'var(--accent)'};--shape-radius:${b.radius || '0'};--shape-ink:${b.ink || 'inherit'}`;
      const label = b.label ? `<span class="sqs-shape-label">${escapeHtml(b.label)}</span>` : '';
      return `<div class="sqs-block shape-block sqs-block-shape sqs-stretched" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-shape" style="${style}">${label}</div></div></div>`;
    }
    case 'stack': {
      // A Stack (S3): one grid block whose children flow in a flex column, values
      // seen on the oracle (parity/findings/S3.json): gap 20px, start-aligned,
      // children stretch to the full width with a 20px minimum.
      const kids = (b.children || []).map((c) => `<div class="stack-child-container">${blockInner({ ...c, id: `${b.id}-${c.id}` }, model)}</div>`).join('');
      return `<div class="sqs-block stack-block sqs-block-stack" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-stack-container direction-${b.direction || 'column'}" style="--stack-gap:${b.gap ?? 20}px">${kids}</div></div></div>`;
    }
    case 'image': {
      // Image blocks (T4) fill their grid area; the picture is a neutral placeholder
      // here (oracle images stay out of the repo, QUALITY.md O2).
      const r = b.radius ? `border-radius:${b.radius};` : '';
      return `<div class="sqs-block image-block sqs-block-image sqs-stretched" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="fluid-image-container" style="${r}" role="img" aria-label="${escapeHtml(b.alt || '')}"></div></div></div>`;
    }
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
      return `<div class="sqs-block scrolling-block sqs-block-scrolling" id="block-${b.id}"><div class="sqs-block-content"><div class="marquee" style="--marquee-font-size-value:${b.size || 5}"><span class="marquee-text">${escapeHtml(b.text || '')}</span></div></div></div>`;
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
    // Code, Embed and Video (T7, T10; parity/findings/T10.json, T7.json): the published class
    // strings and block type 1337 of the corpus pages. A code block with HTML shows it as is, like the oracle's default
    // <p>Hello, World!</p>; our demo's code blocks show source text in <pre>. An empty embed
    // and an empty video show a placeholder in the editor only.
    case 'embed':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-embed embed-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-embed-container">${b.html || '<div class="sqs-blockStatus"><strong>Embed block</strong><span>Add an embed URL or code.</span></div>'}</div></div></div>`;
    case 'video':
      return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-video video-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div>${b.html || '<div class="sqs-block-video-placeholder sqs-block-video-placeholder--empty"></div>'}</div></div></div>`;
    case 'code': {
      if (b.html != null) return `<div class="sqs-block website-component-block sqs-block-website-component sqs-block-code code-block" data-block-type="1337" id="block-${b.id}"><div class="sqs-block-content"><div class="sqs-code-container">${b.html}</div></div></div>`;
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
    }${d.background ? `\n    .fe-block-${b.id} .sqs-block { background-color: rgb(255, 255, 255); }` : ''}
  `;
}

export function renderBlock(b, model) {
  const design = b.design ? `<style class="transform-vars">${designCss(b)}</style>` : '';
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
  return `<section class="${cls}"${s.anchor ? ` id="${escapeHtml(s.anchor)}"` : ''} data-section-id="${s.id}" data-section-theme="${themeName}"${style}><div class="section-background"${s.divider ? ` style="clip-path: ${DIVIDER_CLIP};"` : ''}></div>${s.divider ? dividerSvg(s) : ''}<div class="content-wrapper"><div class="content"><style data-fe-css>${sectionCss(s)}</style><div class="fluid-engine fe-${s.id}">${s.blocks.map((b) => renderBlock(b, model)).join('')}</div></div></div></section>`;
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
</head>
<body>
${renderHeader(model.header)}
<main id="page">
${renderPage(model)}
</main>
${renderFooter(model)}
<script>${HEADER_SCRIPT}</script>
</body>
</html>
`;
}
