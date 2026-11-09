// oracle-capture's step loop. A step that fails ends the run: it threw, or it wrote an error
// (a press not made: nothing found, not on top, or refused). No later step runs, so keys meant for
// a field can't reach the page (2026-11-09: Cmd+A and Backspace went on after a failed press).
// The caller still leaves (Exit, then Exit Without Saving) and writes the reads taken so far.
// guard(op) returns why the run must stop before a step, or null. Checked by scripts/check-press-stop.mjs.
export async function runSteps(steps, { STEPS, errors, guard = () => null, onStart = () => {}, onDone = () => {}, onFail = async () => {}, log = () => {} }) {
  let ran = 0;
  for (const [op, ...a] of steps) {
    if (!STEPS[op]) { errors.push(`stopped before ${op}: there is no step ${op}`); log(errors.at(-1)); return { ran, stopped: true }; }
    onStart(op, a);
    const why = guard(op);
    if (why) { errors.push(`stopped before ${op}: ${why}`); log(errors.at(-1)); return { ran, stopped: true }; }
    const had = errors.length;
    let threw = null;
    try { await STEPS[op](...a); } catch (e) { threw = e; errors.push(`${op} ${JSON.stringify(a).slice(0, 60)}: ${String(e.stderr || e.message).trim().split('\n')[0].slice(0, 160)}`); }
    ran++;
    if (threw || errors.length > had) {
      log(errors.at(-1));
      await onFail(op, a, threw);
      const left = steps.length - ran;
      if (left) { errors.push(`stopped after ${op}: it failed, so the ${left} later step${left === 1 ? '' : 's'} did not run`); log(errors.at(-1)); }
      return { ran, stopped: true };
    }
    onDone(op, a);
  }
  return { ran, stopped: false };
}

// Polls probe() until it returns something, or gives null once limitMs has passed. The read-back uses it to wait for the frame
// to load its page again after the reload (a fixed 6 s pause read it before it loaded, 3 times on 2026-11-09).
export async function waitUntil(probe, limitMs, everyMs = 500, sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  for (let waited = 0; ; waited += everyMs) {
    const v = probe();
    if (v != null) return v;
    if (waited >= limitMs) return null;
    await sleep(everyMs);
  }
}
