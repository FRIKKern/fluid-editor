// A2: after an edit a section's blocks follow the phone rows, top to bottom, then left to right
// (parity/findings/CAP-ORDER.json). Blocks with the same z paint in DOM order, so a pair that
// overlaps with the same z, on desktop or on the phone, keeps its order: a flip would show on
// screen, now or on a width switch. Held pairs are ours, not measured on the oracle.
const overlaps = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const held = (x, y) => ['desktop', 'mobile'].some((name) => {
  const L = x.layout[name], R = y.layout[name];
  return !!L && !!R && L.z === R.z && overlaps(L.area, R.area);
});
const phoneRank = (b) => b.layout.mobile?.area ?? [Infinity, Infinity];

// Held pairs don't sort on their own: take the first block by phone rows among those with no
// block held ahead of them still to come. The order that results never swaps a held pair, and a
// chain of held blocks stays in order even when its two ends don't overlap.
export function phoneOrder(blocks) {
  const left = [...blocks], out = [];
  while (left.length) {
    const free = left.filter((b, k) => !left.slice(0, k).some((o) => held(o, b)));
    const next = free.reduce((best, b) => {
      const p = phoneRank(best), q = phoneRank(b);
      return q[0] < p[0] || (q[0] === p[0] && q[1] < p[1]) ? b : best;
    });
    out.push(next);
    left.splice(left.indexOf(next), 1);
  }
  return out;
}

// A new block on a phone (parity/findings/CAP-NEWORDER*.json). `blocks` are in phone order; returns
// the place the new block takes. It lands at the top left on desktop, so only blocks that start
// there compare by size: same size, it goes after that block and what sits inside it; inside bigger
// ones, right after the smallest; around smaller ones, before the first. Anything else goes after
// the blocks at or above its place.
export function newBlockSlot(blocks, w, h, place = [1, 2]) {
  const key = (a) => a[0] * 100 + a[1];
  const size = (b) => { const a = b.layout.desktop.area; return [a[3] - a[1], a[2] - a[0]]; };
  const here = (b) => key(b.layout.desktop.area) === key(place);
  const fits = (b, W, H) => { const [x, y] = size(b); return x <= W && y <= H && (x < W || y < H); };
  const same = blocks.flatMap((b, k) => { const [x, y] = size(b); return here(b) && x === w && y === h ? [k] : []; });
  if (same.length) {
    let k = same.at(-1) + 1;
    while (k < blocks.length && here(blocks[k]) && fits(blocks[k], w, h)) k++;
    return k;
  }
  const bigger = blocks.flatMap((b, k) => { const [x, y] = size(b); return here(b) && x >= w && y >= h ? [[x * y, k]] : []; });
  if (bigger.length) return bigger.reduce((best, c) => (c[0] < best[0] ? c : best))[1] + 1;
  const inside = blocks.findIndex((b) => here(b) && fits(b, w, h));
  if (inside >= 0) return inside;
  return blocks.reduce((last, b, k) => (key(b.layout.desktop.area) <= key(place) ? k + 1 : last), 0);
}

// How a section built here sets its phone order again (CAP-DESKMOVE*, CAP-NEWORDER*, CAP-CYCLE*,
// CAP-TURNTEST*). Inferred from those reads. Blocks are placed one at a time, top first, then left
// first: each goes after the last block it shares columns with, and past blocks to its left that it
// shares none with. A smaller block with at least 80% of its area inside a bigger one (read between
// 75 and 83%) waits for the first of the smallest such blocks. If the old stack starts at phone row 1 with a block one row high, the
// order turns so that block lands last: it goes last, then first on the next edit, whichever block
// was edited.
const stackOf = (blocks) => [...blocks].sort((p, q) => p.layout.mobile.area[0] - q.layout.mobile.area[0] || p.layout.mobile.area[1] - q.layout.mobile.area[1]);
const startsOneRow = (b) => b.layout.mobile.area[0] === 1 && b.layout.mobile.area[2] === 2;
const box = (b) => b.layout.desktop.area;
const shareColumns = (A, B) => A[3] > B[1] && B[3] > A[1];
const boxArea = (A) => (A[3] - A[1]) * (A[2] - A[0]);
const inside = (a, b) => {
  const A = box(a), B = box(b);
  const w = Math.min(A[3], B[3]) - Math.max(A[1], B[1]), h = Math.min(A[2], B[2]) - Math.max(A[0], B[0]);
  return w > 0 && h > 0 && boxArea(A) < boxArea(B) && w * h >= 0.8 * boxArea(A);
};
function desktopOrder(stack) {
  const sorted = [...stack].sort((p, q) => box(p)[0] - box(q)[0] || box(p)[1] - box(q)[1]);
  // The first of the smallest blocks this one sits inside.
  const host = (b) => sorted.filter((o) => inside(b, o)).reduce((best, o) => (!best || boxArea(box(o)) < boxArea(box(best)) ? o : best), null);
  const tops = [], waiting = [];
  const place = (b) => {
    tops.push(b);
    for (const w of waiting.filter((x) => host(x) === b)) { waiting.splice(waiting.indexOf(w), 1); place(w); }
  };
  for (const b of sorted) {
    if (host(b) && !tops.includes(host(b))) waiting.push(b);
    else place(b);
  }
  const out = [];
  for (const b of tops) {
    let at = out.reduce((far, o, k) => (shareColumns(box(o), box(b)) ? k + 1 : far), 0);
    while (at < out.length && box(out[at])[1] < box(b)[1] && !shareColumns(box(out[at]), box(b))) at++;
    out.splice(at, 0, b);
  }
  return out;
}
const turned = (order, first) => {
  if (!first || !startsOneRow(first)) return order;
  const k = order.indexOf(first);
  return [...order.slice(k + 1), ...order.slice(0, k + 1)];
};
// Each block keeps its height and the gap above it. A new block has no gap.
function layStack(s, old, order) {
  const gap = new Map();
  let end = 1, row = 1, changed = false;
  for (const b of old) { gap.set(b, b.layout.mobile.area[0] - end); end = b.layout.mobile.area[2]; }
  for (const b of order) {
    const a = b.layout.mobile.area, at = row + (gap.get(b) ?? 0), h = a[2] - a[0];
    if (a[0] !== at) changed = true;
    b.layout.mobile.area = [at, a[1], at + h, a[3]];
    row = at + h;
  }
  s.rows.mobile = Math.max(s.rows.mobile, row - 1);
  return changed;
}

// Any desktop move or resize, of one block or a group. Returns true if a block moved on the phone.
export function followDesktopEdit(s) {
  const old = stackOf(s.blocks);
  return layStack(s, old, turned(desktopOrder(old), old[0]));
}

// A new block in such a section; it isn't in s.blocks yet. It takes its place by size, then the order
// turns. When it will turn, a block taller than one row goes before the first block at its place
// that is shorter, or as tall and narrower, or before the first there if one has its size; or else
// after the last there. Not ruled: a same-size pair can swap on the next add (CAP-NEWORDER5 w5).
export function followNewBlock(s, block, w, h, place = [1, 2]) {
  const old = stackOf(s.blocks), order = desktopOrder(old), first = old[0];
  const here = (b) => box(b)[0] === place[0] && box(b)[1] === place[1];
  const size = (b) => [box(b)[3] - box(b)[1], box(b)[2] - box(b)[0]];
  let k = -1;
  if (first && startsOneRow(first) && h > 1) {
    const twin = order.some((b) => here(b) && size(b)[0] === w && size(b)[1] === h);
    k = order.findIndex((b) => here(b) && (twin || size(b)[1] < h || (size(b)[1] === h && size(b)[0] < w)));
    if (k < 0) k = order.reduce((far, b, j) => (here(b) ? j + 1 : far), -1);
  }
  if (k < 0) k = newBlockSlot(order, w, h, place);
  order.splice(k, 0, block);
  return layStack(s, old, turned(order, first));
}
