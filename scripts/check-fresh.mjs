// A fitted rule counts only on reads it hasn't seen (lane brief). So a finding that scores a fresh round must show it:
// (a) it names its predictions file, and that file was committed before the capture started and hasn't changed since;
// (b) each scored case has two reads that agree, or the finding names the case in `unsteady`.
// oracle-capture --predictions writes what this reads: { startedAt, predictions: { file, commit, committedAt, sha256 } }.
// The predictions file lists its cases: "cases": { "<case>": ["read label", "second read label"] }.
// A finding claims a fresh round if it has `predictions`, a <name>-PREDICTED.json beside it, or a question that says
// its predictions were pushed first. Squash merges flatten a branch's commits, so the time is the one recorded at capture;
// where the commit is still in the local history, its time must match.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const DIR = new URL('../parity/findings/', import.meta.url);

// Findings from before this check (2026-11-09). They stay as they are; nothing new joins this list.
const GRANDFATHERED = new Set(`
CAP-79ONTOP CAP-82UNDO CAP-93HR CAP-98 CAP-98SPLIT CAP-A2DELETE CAP-A2FRESH CAP-A2STOPNEW CAP-A2TYPEDNEW CAP-E4ENTER
CAP-E4FRESH CAP-E4REOPEN2 CAP-E4REOPEN3 CAP-E4SCORE CAP-E5HEAD2 CAP-E5WHERE CAP-E5WHERE2 CAP-E7BOX CAP-E7REOPEN3
CAP-E7REOPEN4 CAP-E7SCORE CAP-ESC2 CAP-P3ALIGN2 CAP-P3ALIGN3 CAP-P3ALIGN4 CAP-P3FRAME CAP-P3PREDICT CAP-P3PREDICT2
CAP-P3TOPS CAP-P3UNDO CAP-P3UNDO2 CAP-R2PTR CAP-R2TWICE CAP-R2WIDEDROP CAP-R2WIDEFALL CAP-RESIZESCROLL2
CAP-RESIZESCROLL3 CAP-RESIZESCROLL4 CAP-RESIZESCROLLPREDICT CAP-SELECTLETGO CAP-SHORTPULL CAP-STOPMOVE CAP-STOPMOVE2
CAP-STOPMOVE3 CAP-STOPMOVEPREDICT CAP-T10EDITS CAP-T10EDITS2 CAP-T10EDITS3 CAP-T10FRESH CAP-T10PHONEA CAP-T10PHONEB
CAP-T10PHONEC CAP-T10PHONED CAP-T10PHONEE CAP-T10ROWS2 CAP-T10SCORE CAP-T10SCORE2 CAP-T11ZOOMKEYS CAP-T12CHARTCELLS
CAP-T12INSTAASPECT-A CAP-T12INSTAASPECT-B CAP-T12INSTAASPECT-C CAP-T12INSTAASPECT-D CAP-T12INSTAASPECT-E
CAP-T12INSTAASPECT-F CAP-T12INSTAASPECT-G CAP-T12INSTAFLOOR-1 CAP-T12INSTAFLOOR-2 CAP-T12NLUNDO CAP-T12QUOTE
CAP-T12QUOTEROWS CAP-T12TILT CAP-T12TILT-SCORE CAP-T15BLEND CAP-T15CHEAP CAP-T15FRESH CAP-T15FRESH2 CAP-T15FRESH3
CAP-T15STAGE4 CAP-T15STAGE5 CAP-T15STAGE6-SCORE CAP-T15STAGE7-SCORE CAP-T15STAGE8-SCORE CAP-T3EMPTY CAP-T3EMPTY2
CAP-T3EMPTY3 CAP-T7ORDER CAP-T7THICK CAP-TEXTPRESS CAP-TEXTPRESS2 CAP-TEXTSECOND CAP-TEXTSHRINK CAP-TEXTWIDTH6
CAP-TEXTWIDTH7 CAP-TEXTWIDTH8 CAP-U10ALIGNPREDICT CAP-U10BAND CAP-U10BAND-PREDICT CAP-U10BAND2 CAP-U10FAMILYPREDICT
CAP-U10FLIPPREDICT CAP-U10LISTGAP-UL2 CAP-U10LISTGAP-UL5 CAP-U10MIXPREDICT CAP-U10MIXPREDICT2 CAP-U10MIXPREDICT3
CAP-U10PADPREDICT CAP-U10PADREFIT1 CAP-U10PANELPREDICT CAP-U10PREDICT2 CAP-U10PREDICT3 CAP-U10ROWSPREDICT
CAP-U10SHAREPREDICT CAP-U10STEPPREDICT CAP-U10TEXTMIXPREDICT CAP-U10WORDSPREDICT CAP-U12ASSIGNPREDICT
CAP-U12LISTPREDICT CAP-U12PREDICT CAP-U12PREDICT2 CAP-U12PREDICT3 CAP-U4PINTO CAP-U4PINTO2 CAP-U9BAND
CAP-U9BAND-PREDICT CAP-U9CLOSE CAP-U9DEMO CAP-U9DEMO-PREDICT CAP-U9FADE4PREDICT CAP-U9PREDICT CAP-U9PREDICT2
CAP-U9REST-PREDICT CAP-U9REST-PREDICT2 CAP-U9REST-PREDICT3 CAP-U9SCROLL3 CAP-X2LEFTPREDICT CAP-X2RESIZED CAP-X2STEPS
CAP-X2STEPS2 CAP-X2STEPS3 CAP-X2UNREAD CAP-X2WIDTHS CAP-X2WIDTHS2 CAP-X2WIDTHS3 CAP-X6DESKROWS CAP-X6FARSETTLE
CAP-X6FLICKRPHONE CAP-X6FLOORSPHONE CAP-X6PHONEROWS CAP-X6SUMMARYFAR CAP-X6SUMMARYWALK CAP-X8LAG CAP-X8LAG2 CAP-X8LAG3
CAP-X8NEXT CAP-X8QUOTE CAP-X8ROWS CAP-X8ROWS2 CAP-X8ROWS3 CAP-X8TYPES CAP-X8TYPES2 CAP-Y2KEYS CAP-Y2KEYS2 CAP-Y2KEYS3
CAP-Y2KEYS4 CAP-Y2KEYS5 CAP-Y2KEYS6 CAP-Y2KEYS7 CAP-Y2KEYS8 CAP-Y2KEYS9 CAP-Y2SCORE CAP-Z3PATH CAP-Z3PATH2 CAP-Z3SCORE
`.trim().split(/\s+/));

const CLAIM = /predictions? (were )?pushed|pushed first|-PREDICTED/i;
const claims = (f, hasSibling) => !!f.predictions || hasSibling || CLAIM.test(String(f.question || ''));

// Key order doesn't make two reads differ.
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// What is wrong with one fresh finding. predText is its predictions file's text (null if missing); gitTime is the
// commit's time from the local history (null if the commit isn't there).
export function freshFails(f, predText, gitTime) {
  const p = f.predictions, out = [];
  if (!p?.file || !p.commit || !p.committedAt || !p.sha256) return ['no predictions record: run oracle-capture with --predictions <file>'];
  const started = Date.parse(f.startedAt), committed = Date.parse(p.committedAt);
  if (Number.isNaN(started)) out.push('no startedAt');
  if (Number.isNaN(committed)) out.push('predictions committedAt is no time');
  if (!(committed < started)) out.push(`predictions committed at ${p.committedAt}, not before the capture started at ${f.startedAt}`);
  if (gitTime && Date.parse(gitTime) !== committed) out.push(`commit ${p.commit.slice(0, 7)} has time ${gitTime}, the finding says ${p.committedAt}`);
  if (predText == null) return [...out, `no ${p.file}`];
  if (createHash('sha256').update(predText).digest('hex') !== p.sha256) out.push(`${p.file} changed after the read`);
  let cases;
  try { cases = JSON.parse(predText).cases; } catch { return [...out, `${p.file} does not parse`]; }
  if (!cases || !Object.keys(cases).length) return [...out, `${p.file} lists no cases`];
  const unsteady = new Set(f.unsteady || []), reads = f.reads || {};
  for (const [k, labels] of Object.entries(cases)) {
    if (!Array.isArray(labels) || labels.length !== 2) { out.push(`case "${k}" needs two read labels`); continue; }
    const missing = labels.filter((l) => !(l in reads));
    if (missing.length) out.push(`case "${k}": no read "${missing.join('", "')}"`);
    else if (!same(reads[labels[0]], reads[labels[1]]) && !unsteady.has(k)) out.push(`case "${k}": its two reads differ, and it isn't named unsteady`);
  }
  return out;
}

const fails = [];

// Proof the guard can fail, on a planted finding.
{
  const text = JSON.stringify({ cases: { one: ['a', 'a again'] } });
  const sha256 = createHash('sha256').update(text).digest('hex');
  const good = { startedAt: '2026-11-09T12:00:00.000Z', predictions: { file: 'P.json', commit: 'abc1234', committedAt: '2026-11-09T11:00:00Z', sha256 }, reads: { a: { x: 1, y: 2 }, 'a again': { y: 2, x: 1 } } };
  const proof = (why, ok) => { if (!ok) fails.push(`the guard itself: ${why}`); };
  proof('a good round passes', freshFails(good, text, '2026-11-09T12:00:00+01:00').length === 0);
  proof('predictions committed after the read started fail', freshFails({ ...good, predictions: { ...good.predictions, committedAt: '2026-11-09T12:30:00Z' } }, text, null).length > 0);
  proof('a commit time other than the recorded one fails', freshFails(good, text, '2026-11-09T12:30:00Z').length > 0);
  proof('changed predictions fail', freshFails(good, text.replace('one', 'two'), null).length > 0);
  const differ = { ...good, reads: { a: { x: 1 }, 'a again': { x: 2 } } };
  proof('two reads that differ fail', freshFails(differ, text, null).length > 0);
  proof('two reads that differ, named unsteady, pass', freshFails({ ...differ, unsteady: ['one'] }, text, null).length === 0);
  proof('no predictions record fails', freshFails({ question: 'Predictions pushed first' }, null, null).length > 0);
}

const gitTimeOf = (commit) => {
  try { return execFileSync('git', ['show', '-s', '--format=%cI', commit], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null; } catch { return null; }
};

const files = new Set(readdirSync(DIR).filter((n) => n.endsWith('.json')));
let fresh = 0;
for (const n of files) {
  if (n.endsWith('-PREDICTED.json')) continue;
  const name = n.slice(0, -5);
  let f;
  try { f = JSON.parse(readFileSync(new URL(n, DIR), 'utf8')); } catch { continue; } // check-findings reports files that don't parse
  if (!f || typeof f !== 'object' || !claims(f, files.has(`${name}-PREDICTED.json`)) || GRANDFATHERED.has(name)) continue;
  fresh++;
  const pred = f.predictions?.file && existsSync(new URL(f.predictions.file, DIR)) ? readFileSync(new URL(f.predictions.file, DIR), 'utf8') : null;
  for (const why of freshFails(f, pred, f.predictions?.commit ? gitTimeOf(f.predictions.commit) : null)) fails.push(`${n}: ${why}`);
}
for (const name of GRANDFATHERED) if (!files.has(`${name}.json`)) fails.push(`grandfathered ${name}.json is gone: take it off the list`);

if (fails.length) { console.error(`check-fresh: ${fails.length} problem(s)\n  ${fails.join('\n  ')}`); process.exit(1); }
console.log(`check-fresh: ${fresh} fresh round(s) hold, ${GRANDFATHERED.size} from before are grandfathered, 7 guard proofs hold`);
