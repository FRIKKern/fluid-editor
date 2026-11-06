// Image Effect (T4, parity/findings/IMAGEEFFECT.json). The rows, ranges, defaults, presets and what
// Shuffle changes are read from the oracle. The drawing is our own: plain WebGL over the block's
// picture, written from what the effect looks like, so it is alike but not pixel equal (O2).
const range = (label, key, min, max, when) => ['range', label, key, min, max, when];
const pct = (label, key, when) => range(label, key, 0, 100, when);
const seg = (label, key, options, custom = []) => ['seg', label, key, options, custom];
const flag = (label, key) => ['switch', label, key];
const INTERACTION = ['select', 'Interaction', 'interaction', ['Mouse', 'Scroll', 'None']];
const moving = (e) => e.interaction !== 'None'; // None hides the two rows under it

export const EFFECTS = {
  liquid: {
    name: 'Liquid',
    groups: [
      ['Shape and Size', [pct('Complexity', 'complexity'), pct('Intensity', 'intensity'), pct('Seed', 'seed')]],
      ['Motion', [seg('Speed', 'speed', ['.5x', '1x', '2x', 'Speed'], [pct('Morph Speed', 'morph'), pct('Speed', 'flow'), range('Direction', 'direction', 0, 360)])]],
      ['Texture', [pct('Smoothness', 'smoothness'), pct('Shadow', 'shadow')]],
    ],
    defaults: { complexity: 2, intensity: 10, seed: 100, speed: '1x', morph: 5, flow: 50, direction: 270, smoothness: 100, shadow: 8 },
    presets: { speed: { '.5x': { morph: 20, flow: 20 }, '1x': { morph: 5, flow: 50 }, '2x': { morph: 50, flow: 60 } } },
    shuffle: { complexity: [1, 5], intensity: [10, 100], seed: [0, 100], smoothness: [60, 100], shadow: [0, 20] },
  },
  grain: {
    name: 'Film grain',
    rows: [seg('Intensity', 'level', ['Low', 'High', 'Intensity'], [pct('Intensity', 'amount'), pct('Depth', 'depth')]), seg('Animation', 'animation', ['Off', 'On'])],
    defaults: { level: 'Intensity', amount: 50, depth: 0, animation: 'On' },
    presets: { level: { Low: { amount: 25, depth: 0 }, High: { amount: 75, depth: 75 } } },
    shuffle: { amount: [0, 100], depth: [0, 100] },
    shuffleSets: { level: 'Intensity' },
  },
  parallax: {
    name: 'Parallax',
    groups: [
      ['Parallax', [pct('Intensity', 'intensity'), range('Angle', 'angle', 0, 360)]],
      ['Zoom', [range('Zoom start', 'zoomStart', 0, 50), range('Zoom end', 'zoomEnd', 0, 50)]],
    ],
    defaults: { intensity: 20, angle: 45, zoomStart: 2, zoomEnd: 0 },
    shuffle: { intensity: [0, 50], angle: [0, 360], zoomStart: [0, 25], zoomEnd: [0, 25] },
  },
  circles: {
    name: 'Circles',
    groups: [
      ['Shape and Size', [
        seg('Scale', 'scale', ['Low', 'High', 'Scale'], [pct('Center offset', 'offset'), range('Ring size', 'ring', 1, 200), flag('Limit rings', 'limit'), range('Ring count', 'count', 1, 20, (e) => e.limit)]),
        seg('Complexity', 'complex', ['Low', 'High', 'Complexity'], [range('Scale even', 'even', 50, 200), range('Scale odd', 'odd', 50, 200), range('Taper even', 'taperEven', -50, 50), range('Taper odd', 'taperOdd', -50, 50)]),
        flag('Flip rotation', 'flipRotation'), flag('Flip X', 'flipX'), flag('Flip Y', 'flipY'),
      ]],
      ['Motion', [INTERACTION, pct('Intensity', 'motion', moving), pct('Speed', 'pace', moving)]],
    ],
    defaults: { scale: 'Scale', offset: 20, ring: 100, limit: false, count: 5, complex: 'Low', even: 100, odd: 90, taperEven: 10, taperOdd: -10, flipRotation: false, flipX: false, flipY: false, interaction: 'Mouse', motion: 40, pace: 20 },
    presets: {
      scale: { Low: { offset: 20, ring: 75 }, High: { offset: 55, ring: 150 } },
      complex: { Low: { even: 100, odd: 90, taperEven: 10, taperOdd: -10 }, High: { even: 120, odd: 70, taperEven: 30, taperOdd: -30 } },
    },
    shuffle: { offset: [0, 100], count: [1, 20], even: [50, 200], odd: [50, 200], taperEven: [-50, 50], taperOdd: [-50, 50] },
    shuffleFlags: ['limit', 'flipRotation', 'flipX', 'flipY'],
    shuffleSets: { scale: 'Scale', complex: 'Complexity' },
  },
  lines: {
    name: 'Lines',
    groups: [
      ['Shape and Size', [
        seg('Scale', 'scale', ['Low', 'High', 'Scale'], [range('Line size', 'line', 1, 200), range('Image scale', 'image', -50, 150)]),
        seg('Complexity', 'complex', ['Low', 'High', 'Complexity'], [range('Intensity', 'intensity', -100, 200), range('Offset scale X', 'offsetX', -200, 200), range('Offset scale Y', 'offsetY', -200, 200)]),
        range('Angle', 'angle', 0, 360),
      ]],
      ['Motion', [INTERACTION, pct('Intensity', 'motion', moving), pct('Speed', 'pace', moving)]],
    ],
    defaults: { scale: 'Scale', line: 100, image: 60, complex: 'Low', intensity: -25, offsetX: 50, offsetY: 50, angle: 135, interaction: 'Scroll', motion: 25, pace: 10 },
    presets: {
      scale: { Low: { line: 120, image: 80 }, High: { line: 200, image: 120 } },
      complex: { Low: { intensity: -25, offsetX: 50, offsetY: 50 }, High: { intensity: -50, offsetX: 75, offsetY: 75 } },
    },
    shuffle: { line: [1, 200], image: [0, 100], intensity: [-100, 200], offsetX: [0, 100], offsetY: [0, 100], angle: [0, 360] },
    shuffleSets: { scale: 'Scale', complex: 'Complexity' },
  },
};
export const EFFECT_ORDER = ['liquid', 'grain', 'parallax', 'circles', 'lines'];
// Choosing a tile starts it over from these (read after Lines and back, and after None and back).

export const effectDefaults = (kind) => ({ kind, ...EFFECTS[kind].defaults });

// A new set of values; Motion, Speed and Ring size stay as they are (read 24 times per effect).
export function shuffleEffect(effect, random = Math.random) {
  const def = EFFECTS[effect.kind], next = { ...effect };
  for (const [key, [lo, hi]] of Object.entries(def.shuffle)) next[key] = lo + Math.floor(random() * (hi - lo + 1));
  for (const key of def.shuffleFlags || []) next[key] = random() < 0.5;
  Object.assign(next, def.shuffleSets || {});
  return next;
}

// ---- Drawing ----
const SLOTS = {
  liquid: (e) => [e.complexity, e.intensity, e.seed, e.morph, e.flow, e.direction, e.smoothness, e.shadow],
  grain: (e) => [e.amount, e.depth, e.animation === 'On' ? 1 : 0],
  parallax: (e) => [e.intensity, e.angle, e.zoomStart, e.zoomEnd],
  circles: (e) => [e.offset, e.ring, e.limit ? 1 : 0, e.count, e.even, e.odd, e.taperEven, e.taperOdd, e.flipRotation ? 1 : 0, e.flipX ? 1 : 0, e.flipY ? 1 : 0, moving(e) ? 1 : 0, e.motion, e.pace],
  lines: (e) => [e.line, e.image, e.intensity, e.offsetX, e.offsetY, e.angle, moving(e) ? 1 : 0, e.motion],
};
// What a page needs to draw one effect, stored on its box as data-effect.
export const effectData = (e) => JSON.stringify({ k: EFFECT_ORDER.indexOf(e.kind), a: SLOTS[e.kind](e), i: e.interaction || 'Scroll' });

const VERT = 'attribute vec2 p; varying vec2 vUv; void main() { vUv = vec2(p.x * .5 + .5, .5 - p.y * .5); gl_Position = vec4(p, 0., 1.); }';
const FRAG = `precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes, uImg, uFocal, uPtr;
uniform float uTime, uKind, uScroll;
uniform float a[16];
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
vec2 mirror(vec2 uv) { return abs(mod(uv + 1., 2.) - 1.); }
vec4 pic(vec2 uv) {
  float ca = uRes.x / uRes.y, ia = uImg.x / uImg.y;
  vec2 s = ca > ia ? vec2(1., ia / ca) : vec2(ca / ia, 1.);
  return texture2D(uTex, (1. - s) * uFocal + mirror(uv) * s);
}
mat2 rot(float t) { float c = cos(t), s = sin(t); return mat2(c, -s, s, c); }
void main() {
  vec2 uv = vUv; float ca = uRes.x / uRes.y; vec4 col;
  vec2 p = (uv - .5) * vec2(ca, 1.);
  if (uKind < .5) {
    float m = uTime * a[3] * .02; vec2 dir = vec2(cos(radians(a[5])), -sin(radians(a[5])));
    vec2 q = p * (.8 + a[0] * .35) + a[2] * .37 + dir * uTime * a[4] * .002, v = vec2(0.);
    for (int i = 0; i < 2; i++) { v += vec2(sin(q.y * 2.1 + m + v.y * .9), cos(q.x * 1.9 - m + v.x * .9)); q *= 1.6; }
    v = mix(floor(v * 6.) / 6., v, a[6] * .01);
    col = pic(uv + v * a[1] * .0016);
    col.rgb *= 1. - a[7] * .012 * clamp(abs(v.x - v.y), 0., 2.);
  } else if (uKind < 1.5) {
    float n = hash(floor(gl_FragCoord.xy) + floor(uTime * 12.) * a[2]) - .5;
    col = pic(uv);
    col.rgb += n * a[0] * .005 * mix(1., 1.6 * (1. - dot(col.rgb, vec3(.3, .59, .11))), a[1] * .01);
  } else if (uKind < 2.5) {
    vec2 dir = vec2(cos(radians(a[1])), -sin(radians(a[1])));
    float zoom = 1. + mix(a[2], a[3], uScroll) * .01 + a[0] * .006;
    col = pic(.5 + (uv - .5) / zoom + dir * (uScroll - .5) * a[0] * .004);
  } else if (uKind < 3.5) {
    p -= (uPtr - .5) * a[11] * a[12] * .002;
    float r = length(p), size = max(a[1], 1.) * .0016, idx = min(floor(r / size), a[2] > .5 ? a[3] - 1. : 1e3);
    float even = 1. - mod(idx, 2.), part = fract(r / size) - .5, side = even > .5 ? 1. : -1.;
    float s = max(.05, mix(a[5], a[4], even) * .01 + mix(a[7], a[6], even) * .01 * part);
    p = rot(side * (a[8] > .5 ? -1. : 1.) * (.02 + a[11] * .03 * sin(uTime * a[13] * .05))) * p;
    if (even > .5 && a[9] > .5) p.x = -p.x;
    if (even > .5 && a[10] > .5) p.y = -p.y;
    col = pic(.5 + (p / s + side * a[0] * .01 * vec2(.05, .03)) / vec2(ca, 1.));
  } else {
    float t = radians(a[5]); vec2 n = vec2(cos(t), -sin(t)).yx * vec2(-1., 1.);
    float part = fract(dot(p, n) / (max(a[0], 1.) * .0016)) - .5;
    vec2 shift = vec2(a[3], a[4]) * .01 * a[2] * .01 * part * .25 + n.yx * a[6] * (uScroll - .5) * a[7] * .004;
    col = pic(.5 + (p / (1. + a[1] * .0005) + shift) / vec2(ca, 1.));
  }
  gl_FragColor = vec4(col.rgb, 1.);
}`;

// Written with no outside names, so an exported page can carry it as text.
function effectGl(canvas, vert, frag) {
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) return null;
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]]) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(prog, s); }
  gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(at); gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const u = (n) => gl.getUniformLocation(prog, n);
  return {
    // A picture from another site can't be read: false leaves the plain image up.
    image(img) {
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); } catch { return false; }
      gl.uniform2f(u('uImg'), img.naturalWidth || img.width, img.naturalHeight || img.height);
      return true;
    },
    draw(e, w, h, { time = 0, scroll = 0.5, ptr = [0.5, 0.5], focal = [0.5, 0.5] } = {}) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u('uRes'), w, h); gl.uniform2f(u('uFocal'), focal[0], focal[1]); gl.uniform2f(u('uPtr'), ptr[0], ptr[1]);
      gl.uniform1f(u('uTime'), time); gl.uniform1f(u('uScroll'), scroll); gl.uniform1f(u('uKind'), e.k);
      const a = new Float32Array(16); a.set(e.a); gl.uniform1fv(u('a'), a);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    destroy() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

// Finds every effect on a page as the page changes and stops one when its block goes.
function effectPage(doc, makeGl) {
  const W = doc.defaultView, live = new Map(), start = W.performance.now();
  let pointer = [0.5, 0.5], running = false;
  doc.addEventListener('pointermove', (e) => { pointer = [e.clientX / W.innerWidth, e.clientY / W.innerHeight]; });
  const add = (box) => {
    const canvas = box.querySelector('canvas'), img = box.parentElement.querySelector(':scope > img');
    const run = img && makeGl(canvas), state = { run, img, canvas, ready: false };
    live.set(box, state);
    if (!run) return; // no WebGL: the plain image stays up
    const ready = () => { if (run.image(img)) { state.ready = true; box.classList.add('is-on'); } };
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
  };
  const frame = () => {
    if (!live.size) { running = false; return; }
    const time = (W.performance.now() - start) / 1000, dpr = Math.min(W.devicePixelRatio || 1, 2);
    for (const [box, s] of live) {
      if (!s.ready) continue;
      const q = box.getBoundingClientRect();
      if (!q.width || !q.height || q.bottom < 0 || q.top > W.innerHeight) continue;
      const cw = Math.round(q.width * dpr), ch = Math.round(q.height * dpr);
      if (s.canvas.width !== cw || s.canvas.height !== ch) { s.canvas.width = cw; s.canvas.height = ch; }
      const e = JSON.parse(box.dataset.effect);
      const scroll = Math.min(1, Math.max(0, 1 - q.bottom / (W.innerHeight + q.height)));
      const ptr = e.i === 'Mouse' ? pointer : [0.5, scroll];
      const focal = (s.img.style.objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
      s.run.draw(e, q.width, q.height, { time, scroll: ptr[1], ptr, focal });
    }
    W.requestAnimationFrame(frame);
  };
  const sync = () => {
    for (const [box, s] of live) if (!box.isConnected) { s.run?.destroy(); live.delete(box); }
    for (const box of doc.querySelectorAll('.imageEffectContainer')) if (!live.has(box)) add(box);
    if (live.size && !running) { running = true; W.requestAnimationFrame(frame); }
  };
  new W.MutationObserver(sync).observe(doc.body, { childList: true, subtree: true });
  sync();
}
// Run as text, like render.js's other page scripts, so an exported page draws its effects too.
export const IMAGE_EFFECT_SCRIPT = `const makeGl = ${effectGl}; (${effectPage})(document, (c) => makeGl(c, ${JSON.stringify(VERT)}, ${JSON.stringify(FRAG)}));`;

// The panel tiles: one still of each effect on the block's own picture, kept so a re-render doesn't flash.
let stills = { src: null, of: {} };
export function paintEffectTiles(root, src) {
  const tiles = [...root.querySelectorAll('canvas[data-fx-still]')];
  if (!tiles.length || !src) return;
  const paint = () => { for (const t of tiles) if (stills.of[t.dataset.fxStill]) t.getContext('2d').drawImage(stills.of[t.dataset.fxStill], 0, 0, t.width, t.height); };
  if (stills.src === src) { paint(); return; }
  const img = new Image();
  img.onload = () => {
    const off = document.createElement('canvas');
    off.width = 125; off.height = 108;
    const run = effectGl(off, VERT, FRAG);
    if (!run?.image(img)) return;
    stills = { src, of: {} };
    for (const k of EFFECT_ORDER) {
      run.draw(JSON.parse(effectData(effectDefaults(k))), off.width, off.height);
      const c = document.createElement('canvas');
      c.width = off.width; c.height = off.height;
      c.getContext('2d').drawImage(off, 0, 0);
      stills.of[k] = c;
    }
    run.destroy();
    paint();
  };
  img.src = src;
}
