// H5: the trace format. One recorded gesture per file in traces/<id>.json.
// A trace is engine-neutral: gestures are written in grid units and keys, so the
// same trace can be performed on the oracle and replayed in our editor.
//
// {
//   "id": "T0001-key-right",           file name without .json
//   "journey": "J07", "items": ["R1"], what it proves
//   "oracle": { "editor": "https://<site>/config/pages", "page": "/", "capturedAt": "YYYY-MM-DD",
//               "frameWidth": 1874 },   width of the oracle's site frame when recorded
//   "layout": "desktop" | "mobile",
//   "section": { "id": "<fe id>", "gap": 11 },
//   "content": { "<blockId>": { "type": "text", "html": "<h1>…</h1>" } | { "type": "image" } … },
//   "before": { "rows": 24, "blocks": { "<blockId>": { "area": [r0, c0, r1, c1], "z": 1 } } },
//   "gesture": { "kind": "key", "target": "<blockId>", "keys": ["ArrowRight"] }
//            | { "kind": "drag", "target": "<blockId>", "grab": [fx, fy], "by": { "cols": 3, "rows": 2 } }
//            | { "kind": "resize", "target": "<blockId>", "handle": "se", "by": { "cols": 1, "rows": -1 } },
//   "after": { "rows": 24, "blocks": { … same shape as before … } },
//   "undo": { "restored": true }         the oracle state matched "before" after undo
// }
export const KINDS = ['key', 'drag', 'resize'];

const isArea = (a) => Array.isArray(a) && a.length === 4 && a.every(Number.isInteger) && a[0] < a[2] && a[1] < a[3];

function checkState(s, where, errors) {
  if (!s || !Number.isInteger(s.rows)) errors.push(`${where}.rows must be an integer`);
  if (!s?.blocks || !Object.keys(s.blocks).length) errors.push(`${where}.blocks is empty`);
  for (const [id, b] of Object.entries(s?.blocks || {})) {
    if (!isArea(b.area)) errors.push(`${where}.blocks.${id}.area is not [r0, c0, r1, c1]`);
    if (!Number.isInteger(b.z)) errors.push(`${where}.blocks.${id}.z must be an integer`);
  }
}

export function validate(t, file = t.id) {
  const errors = [];
  if (!/^T\d{4}-[a-z0-9-]+$/.test(t.id || '')) errors.push('id must look like T0001-short-name');
  if (file && !file.endsWith(`${t.id}.json`)) errors.push(`file name must be ${t.id}.json`);
  if (!/^J\d{2}$/.test(t.journey || '')) errors.push('journey must be a JOURNEYS.md id');
  if (!Array.isArray(t.items) || !t.items.length) errors.push('items must list parity item ids');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.oracle?.capturedAt || '')) errors.push('oracle.capturedAt must be YYYY-MM-DD');
  if (!['desktop', 'mobile'].includes(t.layout)) errors.push('layout must be desktop or mobile');
  if (!t.section?.id) errors.push('section.id is missing');
  checkState(t.before, 'before', errors);
  checkState(t.after, 'after', errors);
  if (!KINDS.includes(t.gesture?.kind)) errors.push(`gesture.kind must be one of ${KINDS.join(', ')}`);
  if (!t.before?.blocks?.[t.gesture?.target]) errors.push('gesture.target must be a block in before');
  if (t.undo?.restored !== true) errors.push('undo.restored must be true: the oracle was left changed');
  return errors;
}

// Gate C comparison: same rows, and same area and z for every block.
export function diffStates(want, got) {
  const out = [];
  if (want.rows !== got.rows) out.push(`rows: want ${want.rows}, got ${got.rows}`);
  for (const [id, w] of Object.entries(want.blocks)) {
    const g = got.blocks[id];
    if (!g) out.push(`${id}: missing`);
    else {
      if (w.area.join('/') !== g.area.join('/')) out.push(`${id}: area want ${w.area.join('/')}, got ${g.area.join('/')}`);
      if (w.z !== g.z) out.push(`${id}: z want ${w.z}, got ${g.z}`);
    }
  }
  return out;
}
