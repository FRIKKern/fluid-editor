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
    case 'social': {
      // Social links (T11): icons of 20px, 12px apart, as on the oracle footer.
      const icons = Array.from({ length: b.count || 3 }, () => '<a class="social-icon" href="#" aria-label="Social link"><svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="10" r="9" fill="currentColor"/></svg></a>').join('');
      return `<div class="sqs-block socialaccountlinks-v2-block sqs-block-socialaccountlinks-v2" id="block-${b.id}"><div class="sqs-block-content"><div class="social-icons social-icon-alignment-${b.align || 'left'}">${icons}</div></div></div>`;
    }
    case 'code': {
      const src = b.codeOf ? sectionGridCss(model.sections.find((s) => s.id === b.codeOf)).trim() : b.code;
      return `<div class="sqs-block code-block sqs-block-code" data-block-type="23" id="block-${b.id}"><div class="sqs-block-content"><pre><code>${escapeHtml(src)}</code></pre></div></div>`;
    }
    default:
      return `<div class="sqs-block" id="block-${b.id}"><div class="sqs-block-content"></div></div>`;
  }
}

export function renderBlock(b, model) {
  return `<div class="fe-block fe-block-${b.id}" data-block-id="${b.id}">${blockInner(b, model)}</div>`;
}

export function renderSection(s, model) {
  // Section settings (P3, P5): height S/M/L, vertical alignment, content width.
  const cls = [
    'page-section',
    `section-height--${s.height || 'medium'}`,
    `vertical-alignment--${s.valign || 'middle'}`,
    `content-width--${s.contentWidth || 'wide'}`,
    `horizontal-alignment--${s.halign || 'center'}`,
    s.theme || '',
  ].filter(Boolean).join(' ');
  const style = s.height === 'custom' && s.customHeight != null ? ` style="min-height: ${s.customHeight}vh;"` : '';
  return `<section class="${cls}" data-section-id="${s.id}"${style}><div class="content-wrapper"><div class="content"><style data-fe-css>${sectionCss(s)}</style><div class="fluid-engine fe-${s.id}">${s.blocks.map((b) => renderBlock(b, model)).join('')}</div></div></div></section>`;
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
