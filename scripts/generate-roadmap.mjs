// Draws docs/images/roadmap.svg: milestones and rewards from docs/ROADMAP.md,
// status from the board, item counts from parity/items.json.
import { tasks, milestones, items, esc, writeIfChanged, STYLE } from './lib/board.mjs';

const OUT = new URL('../docs/images/roadmap.svg', import.meta.url);
const W = 1200, PAD = 40, GAP = 16, TOP = 196, CARD_H = 212, PER_ROW = 4;
const ICON = { done: '✓', in_progress: '◐', open: '○', cancelled: '✕' };
const STATUS_TEXT = { done: 'delivered', in_progress: 'in progress', open: 'to do', cancelled: 'dropped' };

function wrap(text, width) {
  const lines = [''];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    if ((lines[last] + ' ' + word).trim().length > width) lines.push(word);
    else lines[last] = (lines[last] + ' ' + word).trim();
  }
  return lines;
}

function progress(m, all) {
  if (m.id === 'M3') {
    const was = all.filter((i) => i.wasUnknown);
    const left = was.filter((i) => i.status === 'unknown').length;
    return { done: was.length - left, total: was.length, text: `${was.length - left} of ${was.length} unknowns answered` };
  }
  const mine = all.filter((i) => i.milestone === m.id);
  const done = mine.filter((i) => i.status === 'done').length;
  return mine.length ? { done, total: mine.length, text: `${done} of ${mine.length} items done` } : null;
}

export function render(board, rows, all) {
  const byId = Object.fromEntries(board.filter((t) => t.id !== 'other').map((t) => [t.id, t]));
  const cards = rows.map((m) => ({ ...m, status: byId[m.id]?.status ?? 'open', p: progress(m, all) }));
  const firstOpen = cards.findIndex((c) => c.status !== 'done');
  cards.forEach((c, i) => {
    c.tag = c.status === 'done' ? 'done' : c.status === 'in_progress' || i === firstOpen ? 'now' : i === firstOpen + 1 ? 'next' : 'later';
  });
  const delivered = cards.filter((c) => c.status === 'done').length;
  const colW = (W - 2 * PAD - GAP * (PER_ROW - 1)) / PER_ROW;
  const H = TOP + Math.ceil(cards.length / PER_ROW) * (CARD_H + GAP) + 52;
  const barW = W - 2 * PAD;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">`);
  out.push(`<title id="t">Fluid editor roadmap</title>`);
  out.push(`<desc id="d">${delivered} of ${cards.length} milestones delivered. ${esc(cards.map((c) => `${c.id} ${c.name}: ${c.tag}, reward: ${c.reward}${c.p ? `, ${c.p.text}` : ''}`).join('. '))}.</desc>`);
  out.push(STYLE);
  out.push(`<rect class="bg" width="${W}" height="${H}" rx="16"/>`);
  out.push(`<text x="${PAD}" y="70" font-size="36" font-weight="700" letter-spacing="-0.8">Fluid editor</text>`);
  out.push(`<text x="${PAD}" y="102" font-size="19" class="muted">A 1:1 copy of the Fluid Engine editor. Every milestone ships a reward you can see.</text>`);
  out.push(`<text x="${W - PAD}" y="70" font-size="40" font-weight="700" text-anchor="end">${delivered}<tspan class="muted" font-weight="400"> / ${cards.length}</tspan></text>`);
  out.push(`<text x="${W - PAD}" y="102" font-size="16" text-anchor="end" class="muted">milestones delivered</text>`);
  out.push(`<rect x="${PAD}" y="124" width="${barW}" height="8" rx="4" class="track"/>`);
  if (delivered) out.push(`<rect x="${PAD}" y="124" width="${(barW * delivered) / cards.length}" height="8" rx="4" class="bar"/>`);
  out.push(`<text x="${PAD}" y="168" font-size="16"><tspan class="done">✓ delivered</tspan><tspan class="now" dx="24">◐ in progress</tspan><tspan class="todo" dx="24">○ to do</tspan></text>`);
  out.push(`<text x="${W - PAD}" y="168" font-size="16" text-anchor="end" class="muted">M3 runs beside M2 · the oracle is a real Squarespace site</text>`);
  cards.forEach((c, k) => {
    const x = PAD + (k % PER_ROW) * (colW + GAP);
    const y = TOP + Math.floor(k / PER_ROW) * (CARD_H + GAP);
    const tagCls = { done: 'done', now: 'now', next: 'muted', later: 'todo' }[c.tag];
    const statusCls = { done: 'done', in_progress: 'now', open: 'todo', cancelled: 'todo' }[c.status];
    out.push(`<g data-milestone="${c.id}">`);
    out.push(`<rect x="${x}" y="${y}" width="${colW}" height="${CARD_H}" rx="12" class="card${c.tag === 'now' ? ' on' : ''}"/>`);
    out.push(`<text x="${x + 20}" y="${y + 32}" font-size="13" font-weight="700" letter-spacing="1.5" class="muted">${c.id}</text>`);
    out.push(`<text x="${x + colW - 20}" y="${y + 32}" font-size="13" font-weight="700" letter-spacing="1.5" text-anchor="end" class="${tagCls}">${c.tag.toUpperCase()}</text>`);
    out.push(`<text x="${x + 20}" y="${y + 66}" font-size="${c.name.length > 17 ? 19 : 23}" font-weight="600">${esc(c.name)}</text>`);
    out.push(`<path d="M${x + 20} ${y + 86}H${x + colW - 20}" class="rule"/>`);
    wrap(c.reward, 28).slice(0, 2).forEach((line, i) => out.push(`<text x="${x + 20}" y="${y + 116 + i * 22}" font-size="16">${esc(line)}</text>`));
    if (c.p) {
      const bw = colW - 40;
      out.push(`<rect x="${x + 20}" y="${y + CARD_H - 62}" width="${bw}" height="5" rx="2.5" class="track"/>`);
      if (c.p.done) out.push(`<rect x="${x + 20}" y="${y + CARD_H - 62}" width="${(bw * c.p.done) / c.p.total}" height="5" rx="2.5" class="bar"/>`);
      out.push(`<text x="${x + 20}" y="${y + CARD_H - 42}" font-size="13" class="muted">${esc(c.p.text)}</text>`);
    }
    out.push(`<text x="${x + 20}" y="${y + CARD_H - 16}" font-size="15" class="${statusCls}">${ICON[c.status]} ${STATUS_TEXT[c.status]}</text>`);
    out.push(`</g>`);
  });
  out.push(`<text x="${PAD}" y="${H - 30}" font-size="14" class="muted">Generated by scripts/generate-roadmap.mjs from the board, docs/ROADMAP.md and parity/items.json</text>`);
  out.push(`</svg>\n`);
  return out.join('\n');
}

writeIfChanged(OUT, render(await tasks(), milestones(), items()), 'docs/images/roadmap.svg');
