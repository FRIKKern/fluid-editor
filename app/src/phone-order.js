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
// the place the new block takes. Only blocks that start at its place compare by size: same size, it goes after that block and what sits inside it; inside bigger
// ones, right after the smallest; around smaller ones, before the first. Anything else goes after
// the blocks at or above its place. When it lands lower, by the frame's scroll (CAP-T14LAND.json): a block that holds
// the new one counts as bigger even if it starts above, which fits those reads and is inferred.
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
  const holds = (a) => a[1] === place[1] && a[0] <= place[0] && a[2] >= place[0] + h && a[3] >= place[1] + w;
  const bigger = blocks.flatMap((b, k) => { const [x, y] = size(b); return holds(b.layout.desktop.area) ? [[x * y, k]] : []; });
  if (bigger.length) return bigger.reduce((best, c) => (c[0] < best[0] ? c : best))[1] + 1;
  const inside = blocks.findIndex((b) => here(b) && fits(b, w, h));
  if (inside >= 0) return inside;
  return blocks.reduce((last, b, k) => (key(b.layout.desktop.area) <= key(place) ? k + 1 : last), 0);
}

// A new block on a phone stopped by overlap from a phone resize, with the overlap still there: it goes before the first
// block at its place that fits inside it, and otherwise last, below every block, moving none (CAP-A2ROUND1 b1, b4;
// CAP-A2ROUND2 f1). A phone stopped by a hand move, overlap or not, or whose overlap was deleted, keeps the size rule
// (CAP-A2ROUND1 a2; CAP-A2ROUND2 f2, f4, m1, m2).
export function stoppedSlot(blocks, w, h, place = [1, 2]) {
  const k = blocks.findIndex((b) => { const a = b.layout.desktop.area, x = a[3] - a[1], y = a[2] - a[0]; return a[0] === place[0] && a[1] === place[1] && x <= w && y <= h && (x < w || y < h); });
  return k >= 0 ? k : blocks.length;
}

// How a section built here sets its phone order again (CAP-DESKMOVE*, CAP-NEWORDER*, CAP-CYCLE*,
// CAP-TURNTEST*). Inferred from those reads. A smaller block with at least 80% of its area inside a
// bigger one (read between 75 and 83%) belongs to the first of the smallest such blocks, and comes
// right after it with the others it holds. Blocks taken in that order, top first, then left first,
// each go after the last block they share columns with, and past blocks to their left that they
// share none with. If the old stack starts at phone row 1 with a block one row high, the order turns
// so that block lands last: it goes last, then first on the next edit, whichever block was edited.
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
  const tops = [];
  const place = (b) => {
    tops.push(b);
    sorted.filter((x) => host(x) === b).forEach(place);
  };
  sorted.filter((b) => !host(b)).forEach(place);
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

// A new block in such a section; it isn't in s.blocks yet. It comes last in the old stack, so it
// goes behind blocks at its own place with no holder, then the same rule runs.
export function followNewBlock(s, block) {
  const old = stackOf(s.blocks);
  return layStack(s, old, turned(desktopOrder([...old, block]), old[0]));
}

// A block taken away: each block below it moves up by the rows the gone block held above that block's top which no
// other block covers, so no higher than where the gone one started, and the gaps above the rest stay. With no
// overlap that is its height. A tall block over it keeps those rows (CAP-A2ROUND2 f2 and f3).
export function closeUp(s, gone) {
  for (const g of [...gone].sort((p, q) => q[0] - p[0])) {
    const was = s.blocks.map((b) => b.layout.mobile.area);
    s.blocks.forEach((b, k) => {
      const a = was[k];
      if (a[0] <= g[0]) return;
      let up = 0;
      for (let row = g[0]; row < Math.min(g[2], a[0]); row++) if (!was.some((o, j) => j !== k && o[0] <= row && row < o[2])) up++;
      b.layout.mobile.area = [a[0] - up, a[1], a[2] - up, a[3]];
    });
  }
}

// Blocks that overlap on the phone: from then on it no longer follows the desktop (CAP-A2EDITS2 o, CAP-A2ROUND1 b).
export function phoneOverlaps(s) {
  const all = s.blocks;
  return all.some((b, k) => all.slice(k + 1).some((o) => overlaps(b.layout.mobile.area, o.layout.mobile.area)));
}
