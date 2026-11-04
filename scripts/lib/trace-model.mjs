// Our model for one trace: the oracle's blocks and areas, with text content kept and
// every other block drawn as a plain shape. Fonts and type sizes are ours (item P6).
import { DEMO } from '../../app/src/demo-data.js';

const published = {};
for (const sec of DEMO.sections) for (const b of sec.blocks) published[b.id] = b;

export function modelFor(t) {
  const blocks = Object.entries(t.before.blocks).map(([id, s]) => {
    // Prefer the published content of the same block (clean HTML, real labels).
    const p = published[id];
    if (p) {
      const L = { area: s.area, z: s.z, justify: p.layout.desktop.justify || 'flex-start', align: p.layout.desktop.align || 'flex-start' };
      const { layout, ...content } = p;
      return { ...content, layout: { desktop: L, mobile: L } };
    }
    const c = t.content[id] || { type: 'shape' };
    const L = { area: s.area, z: s.z, justify: 'flex-start', align: 'flex-start' };
    const base = c.type === 'text' ? { type: 'text', html: c.html } : { type: 'shape', fill: '#d9d4ca', radius: '0', label: c.type };
    return { id, ...base, layout: { desktop: L, mobile: L } };
  });
  const rows = { desktop: t.before.rows, mobile: t.before.rows };
  return { version: 1, title: t.id, sections: [{ id: t.section.id, theme: '', gap: t.section.gap, rowGap: t.section.rowGap, rows, blocks }] };
}
