// Reads one published Fluid Engine section <style> into our model.
// The inverse of sectionCss() in app/src/render.js; Gate A checks they agree.
export function parseSectionCss(css) {
  const head = css.match(/\.fe-([\w-]+) \{\s*--grid-gutter: calc\(var\(--sqs-mobile-site-gutter, 6vw\) - ([\d.]+)px\)/);
  if (!head) return null;
  const mobileRows = css.match(/grid-template-rows: repeat\((\d+),minmax\(24px, auto\)\)/);
  const desktopRows = css.match(/grid-template-rows: repeat\((\d+),minmax\(calc\(var\(--container-width\)/);
  const rowGap = css.match(/row-gap: ([\d.]+)px;/);
  const section = {
    id: head[1],
    gap: parseFloat(head[2]),
    ...(rowGap && parseFloat(rowGap[1]) !== parseFloat(head[2]) && { rowGap: parseFloat(rowGap[1]) }),
    rows: { mobile: mobileRows ? +mobileRows[1] : null, desktop: desktopRows ? +desktopRows[1] : null },
    blocks: [],
  };
  const byId = new Map();
  for (const m of css.matchAll(/\.fe-block-([\w-]+) \{\s*grid-area: ([\d/-]+);\s*z-index: (-?\d+);/g)) {
    const id = m[1];
    if (!byId.has(id)) {
      byId.set(id, { id, layout: {} });
      section.blocks.push(byId.get(id));
    }
    const b = byId.get(id);
    b.layout[b.layout.mobile ? 'desktop' : 'mobile'] = { area: m[2].split('/').map(Number), z: +m[3] };
  }
  // Sticky sits in the desktop block rule, right after z-index.
  for (const m of css.matchAll(/\.fe-block-([\w-]+) \{\s*grid-area: [\d/-]+;\s*z-index: -?\d+;\s*position: sticky;\s*(top|bottom): ([^;]+);/g)) {
    const b = byId.get(m[1]);
    const v = m[3];
    let st;
    if (m[2] === 'bottom') st = { anchor: 'bottom', offset: parseFloat(v) };
    else if (v.startsWith('calc(50% + ')) st = { anchor: 'center', offset: parseFloat(v.slice(11)) };
    else st = { anchor: 'top', offset: parseFloat(v.slice(5)) };
    b.layout.desktop.sticky = st;
  }
  for (const b of section.blocks) {
    const j = [...css.matchAll(new RegExp(`\\.fe-block-${b.id} \\.sqs-block \\{\\s*justify-content: ([\\w-]+);`, 'g'))];
    const a = [...css.matchAll(new RegExp(`\\.fe-block-${b.id} \\.sqs-block-alignment-wrapper \\{\\s*align-items: ([\\w-]+);`, 'g'))];
    ['mobile', 'desktop'].forEach((bp, i) => {
      if (!b.layout[bp]) return;
      b.layout[bp].justify = j[i]?.[1];
      b.layout[bp].align = a[i]?.[1];
    });
  }
  return section;
}
