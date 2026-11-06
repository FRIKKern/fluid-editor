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

// How a section built here sets its phone order again (CAP-DESKMOVE3 to 9, CAP-NEWORDER4 to 6). Inferred
// from those reads; the turn held on reads taken after it was written down. Sort by the desktop: no
// column in common, left first; otherwise top first, then left first; one place keeps its order. If
// the old stack starts with a block one row high on the phone, turn the sorted list so that block
// lands last. So it goes last, then first on the next edit, whichever block moved.
const stackOf = (blocks) => [...blocks].sort((p, q) => p.layout.mobile.area[0] - q.layout.mobile.area[0] || p.layout.mobile.area[1] - q.layout.mobile.area[1]);
const oneRow = (b) => b.layout.mobile.area[2] - b.layout.mobile.area[0] === 1;
const desktopSort = (stack) => [...stack].sort((a, b) => {
  const A = a.layout.desktop.area, B = b.layout.desktop.area;
  if (A[3] <= B[1]) return -1;
  if (B[3] <= A[1]) return 1;
  return A[0] - B[0] || A[1] - B[1];
});
const turned = (order, first) => {
  if (!first || !oneRow(first)) return order;
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
  return layStack(s, old, turned(desktopSort(old), old[0]));
}

// A new block in such a section; it isn't in s.blocks yet. With no turn it takes its place by size.
// With a turn the first block still goes last, and before it, at the new block's place, come the
// one-row blocks, then the others. A one-row block joins the first lot, last. Another goes first among
// the others at its place if one has its size; if not, taller first, then wider. It goes after blocks
// elsewhere. Not ruled: a same-size pair among the others can swap on the next add (CAP-NEWORDER5 w5).
export function followNewBlock(s, block, w, h, place = [1, 2]) {
  const old = stackOf(s.blocks), order = desktopSort(old), first = old[0];
  if (!first || !oneRow(first)) {
    order.splice(newBlockSlot(order, w, h, place), 0, block);
    return layStack(s, old, order);
  }
  const here = (b) => b.layout.desktop.area[0] === place[0] && b.layout.desktop.area[1] === place[1];
  const rest = turned(order, first).slice(0, -1);
  const small = rest.filter((b) => here(b) && oneRow(b)), others = rest.filter((b) => !small.includes(b));
  const size = (b) => { const a = b.layout.desktop.area; return [a[3] - a[1], a[2] - a[0]]; };
  const twin = others.some((b) => here(b) && size(b)[0] === w && size(b)[1] === h);
  const behind = (b) => { const [x, y] = size(b); return here(b) && (twin || y < h || (y === h && x < w)); };
  if (h === 1) small.push(block);
  else { const k = others.findIndex(behind); others.splice(k < 0 ? others.length : k, 0, block); }
  return layStack(s, old, [...small, ...others, first]);
}
