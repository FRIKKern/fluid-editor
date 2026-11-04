// The Site Styles panel (U12, parity/findings/SITESTYLES.json, 1600 by 1000 window): the editor
// moves into a box 16px from the window edges and 320px from the right, and a panel on the
// right shows Site Styles with a boxed Close, a 276 by 144 Themes card, then Fonts, Colors,
// Buttons and Forms cards (226 by 104, each with a 44px disclosure, 11px apart) and
// Miscellaneous. The cards draw our own site styles. Their popovers and disclosures are not
// built (data-unbuilt).
const svg = (d, s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const CHEV = '<path d="M9 6l6 6-6 6"/>';
const PALETTE = ['rgb(255, 255, 255)', 'rgb(255, 207, 90)', 'rgb(242, 184, 180)', 'rgb(181, 100, 247)', 'rgb(0, 0, 0)'];

export function siteStylesHtml() {
  const strip = (cls) => `<span class="ss-strip ${cls}">${PALETTE.map((c) => `<span style="background:${c}"></span>`).join('')}</span>`;
  const pack = (name, sample) => `<div class="ss-row"><button type="button" class="ss-card" aria-label="Toggle ${name} style pack popover" data-unbuilt><span class="ss-name">${name}</span>${sample}</button><button type="button" class="ss-more" aria-label="Open ${name} style disclosure" data-unbuilt>${svg(CHEV)}</button></div>`;
  return `<button type="button" class="ss-close" data-ss="close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6L6 18"/>', 22)}</button>
    <h2 class="ss-title">Site Styles</h2>
    <button type="button" class="ss-card ss-themes" aria-label="Toggle Themes style pack popover" data-unbuilt><span class="ss-name">Themes</span><span class="ss-theme"><span class="ss-aa">Aa</span>${strip('ss-strip-theme')}<span class="ss-btn ss-btn-small">Button</span></span></button>
    <hr class="ss-sep">
    ${pack('Fonts', '<span class="ss-heading">Heading</span><span class="ss-para">This is your paragraph.</span>')}
    ${pack('Colors', strip('ss-strip-colors'))}
    ${pack('Buttons', '<span class="ss-btn ss-btn-wide">Button</span>')}
    ${pack('Forms', '<span class="ss-form"><span class="ss-input">Text</span><span class="ss-check">' + svg('<path d="M6 12l4 4 8-8"/>', 16) + '</span></span>')}
    <button type="button" class="ss-misc" data-unbuilt>Miscellaneous${svg(CHEV)}</button>`;
}
