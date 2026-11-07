// What the row walker may press: only what has a name. An unnamed icon could write anything, and a panel with no named
// way out means a reload, not another press.
export const BACK_NAME = /^(back|go back|return)\b/i;
export const isBack = (label) => BACK_NAME.test(String(label || '').trim());
// A row's own name, or its place in a row that has a heading ("Block Alignment", option 2).
export const hasName = (c) => !!c.name && !(/^option \d+$/.test(c.name) && !c.row);

// A row UNREAD marks `no` on this tile is never pressed or typed in. UNREAD's walk entries read "Tile: A, B. Why."
export const noRows = (unread, tile) => {
  const names = new Set();
  for (const e of unread.entries || []) {
    if (e.safeRead !== 'no' || !e.what?.startsWith(`${tile}: `)) continue;
    const list = e.what.slice(tile.length + 2).split(/\. (?=[A-Z])/)[0].replace(/\.$/, '');
    for (const n of list.split(',')) names.add(n.trim().toLowerCase());
  }
  return names;
};
export const onNoList = (c, names) => names.has(String(c.name || '').replace(/^navigate to /i, '').toLowerCase()) || names.has(String(c.row || '').toLowerCase());

// A field that can reach out: a URL, an ID, a name lookup, or anything with a service's name. Read only.
const REACH = /\b(url|uri|link|href|id|api|key|domain|registry|username|handle|token|embed|restaurant|band)\b|acuity|bandsintown|facebook|flickr|google|instagram|mailchimp|opentable|paypal|pinterest|soundcloud|spotify|stripe|tiktok|tock|twitter|vimeo|youtube|zola/i;
export const reachesOut = (c) => (c.kind === 'field' || c.kind === 'area') && (REACH.test(c.name || '') || REACH.test(c.row || ''));

// A tab with a note like this reaches past the block: it is read, and nothing on it is pressed.
export const WIDE_NOTE = /all forms|all blocks|whole site|entire site|every page|site-wide|across your site|affects all/i;
