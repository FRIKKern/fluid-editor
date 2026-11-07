// T10: our Markdown reader against the oracle's HTML for each sample (parity/findings/CAP-T10MD.json),
// and raw HTML treated as untrusted. Runs in npm run check.
import { readFileSync } from 'node:fs';
import { markdownHtml } from '../app/src/markdown.js';

const F = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T10MD.json', import.meta.url)));
let bad = 0, n = 0;
const steps = F.steps;
for (let k = 0; k < steps.length; k++) {
  if (steps[k][0] !== 'setCode') continue;
  const name = steps.slice(k + 1, k + 4).find((s) => s[0] === 'read')[1], want = F.reads[name].htmlOf.replace(/©/g, '&copy;'), got = markdownHtml(steps[k][1]);
  n++;
  if (got !== want) { bad++; console.error(`Markdown ${name}:\n  ours   ${JSON.stringify(got)}\n  oracle ${JSON.stringify(want)}`); }
}
if (n !== 19) { bad++; console.error(`expected 19 samples, read ${n}`); }
// Further samples, mixed ones among them (CAP-T10MD9.json). Whitespace between tags aside, as the block's HTML is read.
const F9 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-T10MD9.json', import.meta.url)));
const squeeze = (t) => t.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
let n9 = 0;
for (let k = 0; k < F9.steps.length; k++) {
  if (F9.steps[k][0] !== 'setCode') continue;
  const name = F9.steps.slice(k + 1).find((s) => s[0] === 'read')[1], want = F9.reads[name].htmlOf.replace(/©/g, '&copy;');
  const got = markdownHtml(F9.steps[k][1]) || F9.reads['empty on the page'].htmlOf; // nothing to show is the placeholder, and the block writes that
  n9++; n++;
  if (squeeze(got) !== squeeze(want)) { bad++; console.error(`Markdown ${name}:\n  ours   ${JSON.stringify(got)}\n  oracle ${JSON.stringify(want)}`); }
}
if (n9 !== 25) { bad++; console.error(`expected 25 further samples, read ${n9}`); }
// What Bold and Bulleted List write on an empty block, and two rules (CAP-93MDEMBED.json): "* " alone is text, not a list.
const R93 = JSON.parse(readFileSync(new URL('../parity/findings/CAP-93MDEMBED.json', import.meta.url))).reads;
for (const name of ['bold empty', 'bullet empty', 'rule alone', 'rule between']) {
  const r = R93[name], got = markdownHtml(r.codeText);
  n++;
  if (got !== r.htmlOf) { bad++; console.error(`Markdown ${name}:\n  ours   ${JSON.stringify(got)}\n  oracle ${JSON.stringify(r.htmlOf)}`); }
}
// Nothing here may reach a page as live markup: not one of these is read on the oracle.
const UNSAFE = [
  '<script>alert(1)</script>', '<SCRIPT SRC=x></SCRIPT>', 'a <script>alert(1)</script> b', '<script>alert(1)', '<style>x{}</style>',
  '<img src=x onerror=alert(1)>', '<b onclick="alert(1)">x</b>', "<div onmouseover='alert(1)'>x</div>", '<a href="javascript:alert(1)">x</a>',
  '<a href="JaVaScRiPt:alert(1)">x</a>', '<a href="java&#115;cript:alert(1)">x</a>', '<a href="&#106;avascript:alert(1)">x</a>', '<a href=" javascript:alert(1)">x</a>',
  '<a href="java\tscript:alert(1)">x</a>', '<a href="vbscript:x">x</a>', '<a href="data:text/html,<script>alert(1)</script>">x</a>',
  '[x](javascript:alert(1))', '[x](JAVASCRIPT:alert(1) "t")', '[x](java&#115;cript:alert(1))', '![x](javascript:alert(1))', '[x][r]\n\n[r]: javascript:alert(1)',
  '<iframe src="javascript:alert(1)"></iframe>', '<svg onload=alert(1)>', '<object data=x></object>', '<img src="x" onerror="alert(1)"', '<img src=x onerror=alert(1)//',
  '<svg><script>alert(1)</script></svg>', '<math><a href="javascript:alert(1)">x</a></math>', '<scr<script>ipt>alert(1)</script>', '<<script>alert(1)</script>',
  '<!-- x --><img src=x onerror=alert(1)>', '<!--><img src=x onerror=alert(1)>-->', '<p title="><script>alert(1)</script>">x</p>', '`<script>` <img src=x onerror=alert(1)>',
  '<input onfocus=alert(1) autofocus>', '<form action="javascript:alert(1)"><button>x</button></form>', '<base href="javascript:alert(1)//">', '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
];
// Tags as a browser would see them: none may be a dropped kind, carry a handler, or point at a script.
const tags = (html) => [...html.matchAll(/<([a-z][a-z\d-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi)];
for (const s of UNSAFE) {
  const html = markdownHtml(s);
  n++;
  const why = tags(html).flatMap(([, name, rest]) => [
    /^(script|style|iframe|svg|math|object|embed|base|meta|link|form|input|button)$/i.test(name) && `tag ${name}`,
    /\son[a-z]+\s*=/i.test(rest) && 'handler',
    /(?:href|src|action)\s*=\s*["']?[^"'>]*(?:java|vb)script/i.test(rest) && 'script link',
    /(?:href|src)\s*=\s*["']?\s*data:/i.test(rest) && 'data link',
  ].filter(Boolean));
  if (why.length) { bad++; console.error(`Unsafe ${JSON.stringify(s)}: ${why.join(', ')}\n  ${html}`); }
}
if (bad) { console.error(`Markdown: ${bad} of ${n} wrong`); process.exit(1); }
console.log(`Markdown: ${n} of ${n} match`);
