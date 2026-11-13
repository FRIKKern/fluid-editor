// Frame-by-frame reads on the page's own clock (document.timeline), for checks that count the frames of a fade.
// A slow machine draws fewer frames than a fade has: a macos-15 runner drew 3 to 5 in a 0.2 s fade, where marks-check
// wants 6 or more (run 43201277105). So the 1/60 s steps between two drawn frames are read as well, by setting the
// animations of the parts read to a step's time, reading the row, and putting them back, all in one task: nothing is
// drawn and no event fires in between. Only animations on the parts read (a selector), or on a box around one, are set
// and weighed: a row reads a part's own opacity, border color or box, which no other animation changes. Rows read the
// top page only, and pointer and keys change what they read only through its DOM: no :hover rule touches them.
//
// Back from this frame: a step is read when the page then was the page now with its animations at that time. Every
// running or new animation had started by the step (or was already waiting to start at the last frame), none stopped
// or went from the page in the gap, one that finished in the gap had finished by the step, and no change to the top
// page's DOM and no scroll came after the step.
// Ahead from the last frame: a step that can't be read back (a change after it, say the chrome hidden mid-fade) is read
// as the last frame saw ahead of it, the animations set forward, when it came before the gap's first DOM change, no
// scroll and no new animation came in the gap, none was waiting to start at the last frame, and none ended by the step.
// One that stopped in the gap did so with a DOM change, after the step; with no DOM change in the gap, none may have.
//
// On a machine that draws every 1/60 s no step falls between two frames, and the reads are the drawn frames alone.
// Steps are read with nothing running too, so a count of rows covers the same time on any machine.
//
// In a sampler's page script, after ${STEPS}:
//   const read = (t) => [...row at page time t...];
//   tick: if (T.stop) return __stepsEnd(T); T.seen.push(...__steps(T, read, '<parts read>'), read(document.timeline.currentTime));
export const STEPS = `window.__steps = (T, read, parts) => {
  const mine = (a) => { const e = a.effect?.target; return !!e && (e.matches(parts) || !!e.querySelector(parts)); };
  const STEP = 1000 / 60, now = document.timeline.currentTime, all = document.getAnimations().filter(mine);
  if (!T.stepWatch) {
    T.changed = -Infinity; T.first = null; T.scrolled = false;
    const mark = () => { T.changed = performance.now(); if (T.first == null) T.first = T.changed; };
    const scrolled = () => { mark(); T.scrolled = true; };
    const docs = [document];
    try { const d = document.querySelector('iframe')?.contentDocument; if (d) docs.push(d); } catch {}
    // An attribute or text set again to the value it had changes nothing.
    const same = (r) => (r.type === 'attributes' ? r.target.getAttribute(r.attributeName) === r.oldValue : r.type === 'characterData' && r.target.data === r.oldValue);
    // A change inside the frame can't move what the rows read; a scroll of it can (copies follow the page).
    const mo = new MutationObserver((rs) => { if (!rs.every(same)) mark(); });
    mo.observe(document, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true, characterDataOldValue: true });
    for (const d of docs) d.addEventListener('scroll', scrolled, true);
    T.stepWatch = () => { mo.disconnect(); for (const d of docs) d.removeEventListener('scroll', scrolled, true); };
  }
  const last = T.stepLast, prev = T.stepPrev, ran = T.stepRan, ahead = T.stepAhead || [], first = T.first, scrolled = T.scrolled;
  const run = all.filter((a) => a.playState === 'running'), seek = run.filter((a) => a.startTime != null), was = seek.map((a) => a.currentTime);
  T.stepLast = now; T.stepPrev = all; T.stepRan = run; T.stepAhead = []; T.first = null; T.scrolled = false;
  const rows = new Map();
  try {
    if (last != null && prev) {
      // Back from this frame. One that ran at the last frame and runs no more counts from its end if it finished;
      // stopped any other way, or one that went from the page, leaves the gap to the reads ahead.
      let from = Math.max(last, T.changed), whole = true;
      for (const a of prev) {
        if (run.includes(a) || (all.includes(a) && !ran.includes(a))) continue;
        if (!ran.includes(a) || a.playState !== 'finished' || a.startTime == null) { whole = false; break; }
        from = Math.max(from, a.startTime + a.effect.getComputedTiming().endTime / Math.abs(a.playbackRate || 1));
      }
      const late = (a, t) => (a.startTime == null ? !prev.includes(a) : a.startTime > t);
      const started = all.filter((a) => a.playState === 'running' || !prev.includes(a));
      for (let j = 1; whole && last + j * STEP < now - STEP / 2; j++) {
        const t = last + j * STEP;
        if (t < from || started.some((a) => late(a, t))) continue;
        seek.forEach((a, i) => { a.currentTime = was[i] - (now - t) * a.playbackRate; });
        rows.set(j, read(t));
      }
      // Ahead from the last frame, for the steps not read back. Not when a new animation came in the gap: the page made it
      // from what the last frame drew, so a step ahead may show what was never drawn.
      const stopped = prev.some((a) => !all.includes(a) || (ran.includes(a) && !run.includes(a) && a.playState !== 'finished'));
      if (!scrolled && !all.some((a) => !prev.includes(a)) && (first != null || !stopped)) for (const [j, row] of ahead) if (!rows.has(j) && last + j * STEP < now - STEP / 2 && (first == null || last + j * STEP < first - STEP / 2)) rows.set(j, row);
    }
    // Ahead from this frame, for the next call: up to 8 steps, none past an animation's end. None while one waits to start:
    // its start time is set later, and may be set back to before the next frame.
    const end = run.length > seek.length ? -Infinity : Math.min(...seek.map((a) => a.startTime + a.effect.getComputedTiming().endTime / Math.abs(a.playbackRate || 1)));
    for (let j = 1; j <= 8 && now + j * STEP < end; j++) {
      seek.forEach((a, i) => { a.currentTime = was[i] + j * STEP * a.playbackRate; });
      T.stepAhead.push([j, read(now + j * STEP)]);
    }
  } finally { seek.forEach((a, i) => { a.currentTime = was[i]; }); }
  return [...rows.keys()].sort((a, b) => a - b).map((j) => rows.get(j));
};
window.__stepsEnd = (T) => { T.stepWatch?.(); T.stepWatch = null; };`;
