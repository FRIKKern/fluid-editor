// scrolling-check's rows for a phone Wave Intensity on a layout's Scrolling turn (section-layouts.js applyLayout). A guard,
// not read on the oracle: a heading alone takes View Layouts' layout 0, which turns it into a Scrolling block; in the phone
// view Wave Intensity 90 makes the phone its own wave (waveMobile, CAP-T12WAVEVIEWS.json). Layout 1 turns it into another
// Scrolling turn, at that layout's wave, and layout 2 into the Text again. Each pick builds the block afresh from the heading,
// so the phone's wave goes with the first pick, and the Text has no phone overrides: its phone button is off. Presses and
// picks are real mouse input.
export async function layoutRows({ qs, press, add, pause, browser, mouse, S }) {
  const real = async (p) => { mouse(S, 'move', p[0], p[1]); await pause(50); mouse(S, 'down', p[0], p[1], { buttons: 1 }); await pause(30); mouse(S, 'up', p[0], p[1]); await pause(500); };
  const centre = (find) => qs(`const e = ${find}; if (!e) return 'null'; e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return JSON.stringify([r.left + r.width / 2, r.top + r.height / 2]);`);
  // The section's toolbar shows under the mouse; its View Layouts button opens the panel.
  const openLayouts = async () => {
    const f = qs(`const r = document.getElementById('site-frame').getBoundingClientRect(); return JSON.stringify([r.left + 800, r.top + 200]);`);
    mouse(S, 'move', f[0], f[1]); await pause(150); mouse(S, 'move', f[0] + 3, f[1] + 2); await pause(300);
    const b = centre(`[...document.querySelectorAll('[data-sc="layouts"]')].find((b) => b.getBoundingClientRect().width > 0 && !b.hasAttribute('data-unbuilt'))`);
    if (b) await real(b);
    return !!b;
  };
  const pick = async (n) => { const t = centre(`document.querySelector('[data-layout="${n}"]')`); if (t) await real(t); return !!t; };
  const blk = () => qs(`const b = fe.model.sections[0].blocks[0]; return JSON.stringify({ type: b.type, wave: b.wave ?? null, waveMobile: b.waveMobile ?? null });`);
  const close = async () => { browser(S, 'press', 'Escape'); await pause(400); qs(`fe.select(null); await sleep(300); return 'true';`); };
  qs(`const m = JSON.parse(JSON.stringify(fe.model)), s = m.sections[0], t = s.blocks.find((b) => b.type === 'text'); m.sections = [s]; delete s.phoneEdited; s.blocks = [{ ...JSON.parse(JSON.stringify(t)), html: '<h2>Heading words here</h2>' }]; fe.setBp('desktop'); fe.load(m); await sleep(400); return 'true';`);
  const opened = await openLayouts(), p0 = opened && await pick(0), turn = blk();
  await close();
  const [sid, bid] = qs(`const s = fe.model.sections[0]; return JSON.stringify([s.id, s.blocks[0].id]);`);
  qs(`fe.setBp('mobile'); await sleep(800); fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
  await press('#block-panel [data-btab="Design"]');
  await press('#block-panel [data-scr-range="wave"]', 0.5); await pause(400);
  const phone = blk();
  qs(`fe.select(null); await sleep(300); fe.setBp('desktop'); await sleep(800); return 'true';`);
  // The start must hold: layout 0 made the Scrolling turn and the phone press set the phone's own wave.
  const start = p0 && turn.type === 'scrolling' && phone.type === 'scrolling' && phone.waveMobile === 90 && phone.wave === turn.wave;
  const o1 = await openLayouts(), p1 = o1 && await pick(1), one = blk(), p2 = await pick(2), two = blk();
  await close();
  add('Layout turn, phone wave 90, layout 1: another Scrolling turn, no phone wave', start && p1 && one.type === 'scrolling' && one.waveMobile === null, JSON.stringify({ opened, turn, phone, one }));
  add('Layout turn, phone wave 90, layout 1 then 2: the Text, no phone wave', start && p2 && two.type === 'text' && two.waveMobile === null, JSON.stringify({ two }));
  qs(`fe.setBp('mobile'); await sleep(800); fe.select(${JSON.stringify(sid)}, ${JSON.stringify(bid)}); await sleep(200); document.querySelector('#block-toolbar [data-tb="edit"]').click(); await sleep(600); return 'true';`);
  await press('#block-panel [data-btab="Design"]');
  const btn = qs(`const b = document.querySelector('#block-panel [data-phone-btn]'); return JSON.stringify(b ? (b.disabled ? 'off' : 'on') : 'none');`);
  add('Layout turn, phone wave 90, layout 1 then 2: the Text\'s phone button is off', start && two.type === 'text' && btn === 'off', btn);
  qs(`fe.select(null); fe.setBp('desktop'); await sleep(400); return 'true';`);
}
