// What a link is, read from its href (parity/findings/LINKMENU.json). URL, Email and Phone share
// one href on the block; the form in the link editor is rebuilt from it on reopening.
export function linkKind(href) {
  const v = href || '';
  if (/^mailto:/i.test(v)) return 'email';
  if (/^(tel|sms):/i.test(v)) return 'phone';
  return 'url';
}

// A typed domain gets https:// (LINKMENU.json, one read: example.com/x). A path or a lone word stays.
export const linkValue = (v) => { const t = String(v).trim(); return /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#].*)?$/i.test(t) ? `https://${t}` : t; };

const decode = (v) => { try { return decodeURIComponent(v); } catch { return v; } };

export function parseMail(href) {
  const [to, query = ''] = (href || '').replace(/^mailto:/i, '').split(/\?(.*)/s);
  const out = { to: decode(to), cc: '', bcc: '', subject: '', body: '' };
  for (const pair of query.split('&')) {
    const at = pair.indexOf('=');
    if (at > 0 && pair.slice(0, at) in out) out[pair.slice(0, at)] = decode(pair.slice(at + 1));
  }
  return out;
}

// The oracle writes mailto:to? with cc, bcc, subject and body in that order, and keeps the ? alone.
export function mailHref({ to = '', cc = '', bcc = '', subject = '', body = '' }) {
  const query = [['cc', cc], ['bcc', bcc], ['subject', subject], ['body', body]].filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return to || query.length ? `mailto:${to}?${query.join('&')}` : '';
}

// The field keeps digits and a leading plus: +47 123 45 678 is +4712345678, 12a3 b-4(5) is 12345.
export const phoneDigits = (v) => (String(v).trim().startsWith('+') ? '+' : '') + String(v).replace(/\D/g, '');
export const phoneHref = (number, mode) => (number ? `${mode === 'text' ? 'sms' : 'tel'}:${number}` : '');
export const parsePhone = (href) => ({ number: (href || '').replace(/^(tel|sms):/i, ''), mode: /^sms:/i.test(href || '') ? 'text' : 'call' });

// The panel's link row: a page as name and path, an email as To, +n and Email, a phone as number and Call or Text.
export function linkSummary(href, groups = []) {
  const kind = linkKind(href);
  if (kind === 'email') {
    const m = parseMail(href);
    const more = [m.cc, m.bcc].flatMap((v) => v.split(',')).filter((v) => v.trim()).length;
    return { icon: 'email', title: `${m.to}${more ? `, +${more}` : ''}`, sub: 'Email' };
  }
  if (kind === 'phone') { const p = parsePhone(href); return { icon: 'phone', title: p.number, sub: p.mode === 'text' ? 'Text' : 'Call' }; }
  const page = groups.flatMap((g) => g.pages).find((p) => p.href === href);
  return page ? { icon: 'page', title: page.label, sub: page.href } : { icon: 'url', title: href, sub: '' };
}
