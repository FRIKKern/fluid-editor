// H2: capture public Fluid Engine pages into fixtures/raw/, politely.
// Reads robots.txt and obeys the rules for "*" and for our client name, takes
// pages from the sitemap, waits between requests, and writes one .html plus a
// .json with the URL and capture date per page. Then run extract-fixtures.
// Usage: node scripts/capture.mjs [sites file] [--pages 3] [--delay 1000]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const sitesFile = args.find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) || 'fixtures/sites.txt';
const PAGES = opt('pages', 3);
const DELAY = opt('delay', 1000);
const AGENT = 'fluid-editor-capture/0.1';
const raw = new URL('../fixtures/raw/', import.meta.url);
mkdirSync(raw, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function get(url) {
  const wait = last + DELAY - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const res = await fetch(url, { headers: { 'user-agent': AGENT }, redirect: 'follow' });
  return { ok: res.ok, status: res.status, url: res.url, text: res.ok ? await res.text() : '' };
}

// Minimal robots.txt: the groups for "*" and our agent, longest match wins, Allow beats Disallow on ties.
export function robotsRules(text, agent = AGENT) {
  const groups = [];
  let cur = null;
  let lastWasAgent = false;
  for (const line of text.split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean)) {
    const [k, ...rest] = line.split(':');
    const key = k.trim().toLowerCase();
    const val = rest.join(':').trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (cur && (key === 'allow' || key === 'disallow')) cur.rules.push({ allow: key === 'allow', path: val });
    }
  }
  const name = agent.split('/')[0].toLowerCase();
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && name.includes(a)));
  return (mine.length ? mine : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
}

export function allowed(rules, path) {
  let best = null;
  for (const r of rules) {
    if (!r.path) continue;
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

const slug = (u) => {
  const { host, pathname } = new URL(u);
  const p = pathname.replace(/^\/|\/$/g, '').replace(/[^a-z0-9-]+/gi, '-');
  return `${host}${p ? '--' + p : ''}`;
};

const today = new Date().toISOString().slice(0, 10);
const sites = readFileSync(sitesFile, 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
let pages = 0;
let skipped = 0;
for (const site of sites) {
  const origin = new URL(site).origin;
  const robots = await get(`${origin}/robots.txt`);
  const rules = robots.ok ? robotsRules(robots.text) : [];
  const map = await get(`${origin}/sitemap.xml`);
  let urls = map.ok ? [...map.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()) : [];
  urls = [site, ...urls.filter((u) => u.startsWith(origin) && u !== site)].slice(0, PAGES);
  for (const u of urls) {
    const { pathname, search } = new URL(u);
    if (!allowed(rules, pathname + search)) {
      skipped++;
      console.log(`robots.txt disallows ${u}`);
      continue;
    }
    const name = slug(u);
    if (existsSync(new URL(`${name}.html`, raw))) continue;
    const page = await get(u);
    if (!page.ok) {
      console.log(`${page.status} ${u}`);
      continue;
    }
    writeFileSync(new URL(`${name}.html`, raw), page.text);
    writeFileSync(new URL(`${name}.json`, raw), JSON.stringify({ url: u, capturedAt: today }, null, 2) + '\n');
    pages++;
    console.log(`captured ${u} (${(page.text.match(/class="fluid-engine/g) || []).length} sections)`);
  }
}
console.log(`done: ${pages} pages captured, ${skipped} disallowed by robots.txt`);
