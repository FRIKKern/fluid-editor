// Reads the board: every milestone is a sub-issue of the goal issue in this repo.
// Status comes from the issue: closed is done, closed as not planned is dropped,
// the label status:in_progress is in progress, anything else is to do.
// See docs/decisions/0003-tracking.md.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

export const REPO = 'FRIKKern/fluid-editor';
export const GOAL = 1;

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  for (const args of [['auth', 'token', '--user', 'FRIKKern'], ['auth', 'token']]) {
    try {
      return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {}
  }
  return '';
}

async function gh(path) {
  const t = token();
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { accept: 'application/vnd.github+json', ...(t && { authorization: `Bearer ${t}` }) },
  });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// One row per milestone issue: { id: 'M0'…, title, status, closedAt, url }.
export async function tasks() {
  const rows = [];
  for (let page = 1; ; page++) {
    const batch = await gh(`repos/${REPO}/issues/${GOAL}/sub_issues?per_page=100&page=${page}`);
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows.map((i) => {
    let status = i.labels.some((l) => l.name === 'status:in_progress') ? 'in_progress' : 'open';
    if (i.state === 'closed') status = i.state_reason === 'not_planned' ? 'cancelled' : 'done';
    const id = i.title.match(/^(M\d)\b/)?.[1] ?? 'other';
    return { id, title: i.title, status, closedAt: i.closed_at, url: i.html_url };
  });
}

// Milestones from the table in docs/ROADMAP.md, their one home.
export function milestones(file = new URL('../../docs/ROADMAP.md', import.meta.url)) {
  return [...fs.readFileSync(file, 'utf8').matchAll(/^\| (M\d) \| ([^|]+)\| ([^|]+)\| ([^|]+)\|/gm)].map(([, id, name, reward, doneWhen]) => ({
    id,
    name: name.trim(),
    reward: reward.trim().replace(/`/g, ''),
    doneWhen: doneWhen.trim(),
  }));
}

// Parity items, their one home.
export function items(file = new URL('../../parity/items.json', import.meta.url)) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// Replaces the text between <!-- name:start --> and <!-- name:end --> in a file.
export function replaceBlock(file, name, body) {
  const text = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`(<!-- ${name}:start -->\\n)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(text)) throw new Error(`${file}: no ${name} block`);
  const next = text.replace(re, (_, a, b) => a + body + b);
  if (next === text) return false;
  fs.writeFileSync(file, next);
  return true;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function writeIfChanged(url, text, label) {
  if (fs.existsSync(url) && fs.readFileSync(url, 'utf8') === text) return false;
  fs.mkdirSync(new URL('.', url), { recursive: true });
  fs.writeFileSync(url, text);
  console.log(`wrote ${label}`);
  return true;
}

// Shared SVG palette, light and dark, matching the Barkpark repos.
export const STYLE = `<style>
  svg { --bg:#fbfaf7; --card:#ffffff; --line:#e3e0d6; --ink:#1f1e1b; --muted:#6c6a63; --done:#2c7a4b; --now:#b26b00; --todo:#a3a097; --nowbg:#fff6e5; --partbg:#fdf0d8; --unk:#8a6fb0; }
  @media (prefers-color-scheme: dark) {
    svg { --bg:#14161a; --card:#1c1f24; --line:#30343b; --ink:#ecebe6; --muted:#9a9ca3; --done:#6cc28f; --now:#e8b55a; --todo:#6d7179; --nowbg:#2a2418; --partbg:#3a2f1a; --unk:#b39ddb; }
  }
  text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; fill: var(--ink); }
  .muted { fill: var(--muted); } .done { fill: var(--done); } .now { fill: var(--now); } .todo { fill: var(--todo); } .unk { fill: var(--unk); }
  .bg { fill: var(--bg); } .track { fill: var(--line); } .bar { fill: var(--done); } .rule { stroke: var(--line); }
  .card { fill: var(--card); stroke: var(--line); } .card.on { fill: var(--nowbg); stroke: var(--now); stroke-width: 2; }
</style>`;
