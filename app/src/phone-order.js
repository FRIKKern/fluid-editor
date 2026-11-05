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
