// The Shape style list (parity/findings/SHAPESTYLES.json): the oracle's names and proportions, with
// our own drawings. Each is [label, name, view width, view height, path]. Rectangle has no path:
// the renderer draws it with its corners.
const pts = (list) => `M${list.map(([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join('L')}Z`;
const ring = (cx, cy, rx, ry, n, inner, turn = -90) => pts(Array.from({ length: n * 2 }, (_, k) => {
  const a = ((turn + (k * 180) / n) * Math.PI) / 180, f = k % 2 ? inner : 1;
  return [cx + rx * f * Math.cos(a), cy + ry * f * Math.sin(a)];
}));
const disc = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
// One outline, never overlapping pieces: a stroke follows every piece of a path. n circles of radius
// r on a ring of radius R, joined where neighbours cross.
const bumps = (cx, cy, R, r, n, turn = 0) => {
  const half = Math.PI / n, cross = R * Math.cos(half) + Math.sqrt(r * r - (R * Math.sin(half)) ** 2);
  const at = (k) => { const a = turn + half + k * 2 * half; return `${Math.round((cx + cross * Math.cos(a)) * 10) / 10} ${Math.round((cy + cross * Math.sin(a)) * 10) / 10}`; };
  const large = cross * Math.cos(half) < R ? 1 : 0;
  return `M${at(0)}${Array.from({ length: n }, (_, k) => `A${r} ${r} 0 ${large} 1 ${at(k + 1)}`).join('')}Z`;
};

export const SHAPES = [
  ['Rectangle', 'rectangle', 1, 1, ''],
  ['Circle', 'circle', 100, 100, disc(50, 50, 49.5)],
  ['Triangle', 'triangle', 100, 100, 'M50 0L100 100H0Z'],
  ['Diamond', 'diamond', 100, 100, 'M50 0L100 50L50 100L0 50Z'],
  ['Rabbet', 'rabbet', 100, 100, 'M14 0H86V14H100V86H86V100H14V86H0V14H14Z'],
  ['Eight Sided Shield', 'eight-sided-shield', 100, 100, 'M16 0Q50 7 84 0L100 16Q93 50 100 84L84 100Q50 93 16 100L0 84Q7 50 0 16Z'],
  ['TV', 'tv', 100, 100, 'M14 2Q50-2 86 2Q98 3 98 14Q102 50 98 86Q98 97 86 98Q50 102 14 98Q2 97 2 86Q-2 50 2 14Q2 3 14 2Z'],
  ['Octagon', 'octagon', 100, 100, 'M29 0H71L100 29V71L71 100H29L0 71V29Z'],
  ['Rounded Pentagon', 'rounded-pentagon', 100, 100, 'M43 2Q50-1 57 2L94 28Q100 33 98 40L84 90Q82 98 74 98H26Q18 98 16 90L2 40Q0 33 6 28Z'],
  ['Gear', 'gear', 152, 152, ring(76, 76, 76, 76, 28, 0.9)],
  ['Four Point Star', 'four-point-star', 100, 100, 'M0 0Q50 26 100 0Q74 50 100 100Q50 74 0 100Q26 50 0 0Z'],
  ['Open Book', 'open-book', 100, 100, 'M0 4Q26 14 50 14Q74 14 100 4V96Q74 86 50 86Q26 86 0 96Z'],
  ['Pointed Star', 'pointed-star', 172, 163, ring(86, 90, 90.4, 95, 5, 0.42)],
  ['Stepped Cross', 'stepped-cross', 100, 100, 'M33 0H67V15H85V33H100V67H85V85H67V100H33V85H15V67H0V33H15V15H33Z'],
  ['Rounded Star', 'rounded-star', 100, 100, 'M50 2Q58 4 63 24Q64 30 70 31L92 35Q100 40 94 47L78 62Q75 65 76 69L82 91Q80 99 72 96L53 84Q50 83 47 84L28 96Q20 99 18 91L24 69Q25 65 22 62L6 47Q0 40 8 35L30 31Q36 30 37 24Q42 4 50 2Z'],
  ['Flower', 'flower', 100, 100, bumps(50, 50, 33, 17, 8)],
  ['Four Petal Flower', 'four-petal-flower', 100, 100, 'M50 9A29 29 0 1 1 91 50A29 29 0 1 1 50 91A29 29 0 1 1 9 50A29 29 0 1 1 50 9Z'],
  ['Four Leaf Clover', 'four-leaf-clover', 100, 100, 'M50 36Q36 0 22 0Q0 0 0 22Q0 36 36 50Q0 64 0 78Q0 100 22 100Q36 100 50 64Q64 100 78 100Q100 100 100 78Q100 64 64 50Q100 36 100 22Q100 0 78 0Q64 0 50 36Z'],
  ['Horizontal Stacked Circles', 'horizontal-stacked-circles', 150, 100, 'M75 7.3A49.5 49.5 0 1 1 75 92.7A49.5 49.5 0 1 1 75 7.3Z'],
  ['Wide Vertical Stacked Pills', 'wide-vertical-stacked-pills', 150, 100, 'M0 25a25 25 0 0 1 50 0a25 25 0 0 1 50 0a25 25 0 0 1 50 0v50a25 25 0 0 1-50 0a25 25 0 0 1-50 0a25 25 0 0 1-50 0Z'],
  ['Horizontal Right Leaning Oval', 'horizontal-right-leaning-oval', 150, 100, 'M6 78A76 34 -22 0 1 144 22A76 34 -22 0 1 6 78Z'],
  ['Parallelogram', 'parallelogram', 241, 111, 'M56 0H241L185 111H0Z'],
  ['Arched Window', 'arched-window', 100, 150, 'M0 150V50A50 50 0 0 1 100 50V150Z'],
  ['Pointed Window', 'pointed-window', 100, 150, 'M4 150V34Q4 18 20 14Q42 8 50 0Q58 8 80 14Q96 18 96 34V150Z'],
  ['Award', 'award', 100, 150, 'M50 0A38 38 0 0 1 72 69V96H100V150H0V96H28V69A38 38 0 0 1 50 0Z'],
  ['Narrow Pow', 'narrow-pow', 100, 150, ring(50, 75, 50, 75, 8, 0.72)],
  ['Egg', 'egg', 100, 150, 'M50 0C78 0 100 58 100 96A50 54 0 0 1 0 96C0 58 22 0 50 0Z'],
  ['Hourglass', 'hourglass', 100, 150, 'M10 0H90Q100 34 66 75Q100 116 90 150H10Q0 116 34 75Q0 34 10 0Z'],
  ['Keystone', 'keystone', 100, 150, 'M0 0H100L78 150H22Z'],
].map(([label, id, w, h, d]) => ({ label, id, w, h, d }));
export const shapeById = (id) => SHAPES.find((s) => s.id === id) || SHAPES[0];
