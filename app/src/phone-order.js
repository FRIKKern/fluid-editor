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
// the blocks at or above its place. Two Lines of the same size are not ruled: they flip on the oracle.
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
