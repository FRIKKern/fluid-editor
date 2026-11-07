// What scripts/oracle-capture.mjs can ask the oracle: each recipe is one question from an unfinished
// item in parity/items.json that only the live site can answer. Demo page: section 2 block 2 is a
// shape, section 2 block 1 a text block, section 0 block 2 a button. Nothing here is ever saved.
const selectEdit = (i, k) => [['select', i, k], ['click', 'Edit']];
const allBlock = (i, k) => ({ block: [i, k], inside: [i, k], controls: true });

const codeLines = (n) => Array.from({ length: n }, (_, i) => `<p>row ${i + 1}</p>`).join('');
const AZ = 'abcdefghijklmnopqrstuvwxyz';
const ENDS2 = [...AZ].flatMap((a) => [...AZ].map((b) => `foo.${a}${b} `)).join('');
const ENDS = 'com org net edu gov mil int info biz name pro aero asia cat coop jobs mobi museum post tel travel xxx arpa academy accountant accountants actor adult agency airforce apartments app army art associates attorney auction audio auto band bank bar barcelona beauty beer berlin best bet bible bid bike bingo bio black blackfriday blog blue boston boutique build builders business buzz cab cafe cam camera camp capital car cards care careers cars casa cash casino catering center ceo charity chat cheap christmas church city claims cleaning click clinic clothing cloud club coach codes coffee college community company computer condos construction consulting contractors cooking cool country coupons courses credit creditcard cricket cruises dance date dating deals degree delivery democrat dental dentist design dev diamonds diet digital direct directory discount doctor dog domains download earth eco education email energy engineer engineering enterprises equipment estate events exchange expert exposed express fail faith family fans farm fashion film finance financial fish fishing fit fitness flights florist flowers football forex forsale foundation fun fund furniture futbol fyi gallery game games garden gay gift gifts gives glass global gmbh gold golf graphics gratis green gripe group guide guitars guru hair haus health healthcare help hiphop hockey holdings holiday homes horse hospital host hosting house how icu immo immobilien inc industries ink institute insurance insure international investments irish jetzt jewelry juegos kaufen kim kitchen kiwi land law lawyer lease legal lgbt life lighting limited limo link live loan loans lol london love ltd luxury maison management market marketing mba media meme memorial men menu miami mma moda mom money mortgage movie nagoya network new news nexus ngo ninja now nyc observer one ong onl online ooo organic page paris partners parts party pet phd photo photography photos physio pics pictures pink pizza place plumbing plus poker porn press productions promo properties property protection pub qpon quebec racing radio realestate realty recipes red rehab reise reisen rent rentals repair report republican rest restaurant review reviews rich rip rocks rodeo rugby run sale salon sarl school schule science security select services sex sexy shiksha shoes shop shopping show singles site ski skin sky social software solar solutions soy space spa sport storage store stream studio study style sucks supplies supply support surf surgery sydney systems taxi team tech technology tennis theater tickets tienda tips tires today tokyo tools top tours town toys trade training tube university uno vacations vegas ventures vet viajes video villas vin vip vision vodka vote voting voyage watch webcam website wedding wiki win wine work works world wtf xyz yoga zip zone google amazon apple comma toolong nope abcd wxyz test local example invalid localhost onion'.split(' ').map((e) => `foo.${e} `).join('');
const SHIFTLEFT = (n) => Array.from({ length: n }, () => ['press', 'Shift+ArrowLeft']);
const SELECTLEFT = (n) => [...SHIFTLEFT(n), ['press', 'Shift']];
const NEWTEXT = [['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['click', 'Write']];
const H = { html: [0, 'new'] };
const LEFT4 = Array.from({ length: 4 }, () => ['press', 'Shift+ArrowLeft']);
const HEADPASTE = { inline: '<b>PASTED</b>', 'one paragraph': '<p>ONE</p>', 'two paragraphs': '<p>ONE</p><p>TWO</p>', 'heading and paragraph': '<h2>HEAD</h2><p>TAIL</p>', 'a list': '<ul><li><p>A</p></li><li><p>B</p></li></ul>', 'plain words': 'plain words' };
const STACK3 = [['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 0], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 1000, 0], ['press', 'Escape'], ['select', 0, 0], ['shiftClick', 0, 1], ['shiftClick', 0, 2], ['click', 'Stack Blocks'], ['pause', 500]];
const ALIGNS = (tag) => [['pressNamed', 'Align Vertically'], ['pause', 300], ...['Align Center', 'Align Bottom', 'Align Top'].flatMap((n) => [['pressNamed', n], ['pause', 400], ['read', `${tag}, ${n}`, { kids: [0, 0] }]]), ['shot', tag.replace(/\W+/g, '-')]];
const WORDS = ["image", "photo", "picture", "gallery", "video", "youtube", "vimeo", "text", "paragraph", "heading", "title", "link", "url", "button", "cta", "quote", "testimonial", "map", "location", "address", "google", "form", "contact", "newsletter", "email", "subscribe", "mailchimp", "shop", "product", "store", "price", "pricing", "donate", "music", "audio", "podcast", "spotify", "soundcloud", "summary", "blog", "post", "archive", "social", "facebook", "instagram", "twitter", "code", "html", "css", "markdown", "embed", "iframe", "chart", "graph", "calendar", "event", "schedule", "booking", "appointment", "acuity", "divider", "line", "spacer", "shape", "menu", "restaurant", "food", "reservation", "table", "opentable", "tock", "pdf", "file", "download", "accordion", "faq", "search", "tag", "rss", "flickr", "zola", "wedding", "bandsintown", "concert", "amazon", "ecommerce", "cart", "scroll", "marquee", "ticker", "animation", "logo", "page", "co", "xyzzy"].map((x) => x);
const Z2 = ['Move Forward', 'Move Backward'];
const UR = ['Undo', 'Redo'];
const BARTIPS = ['Save', 'Desktop View', 'Mobile View', 'Toggle Site Styles editing', 'Toggle preview mode'];
// One Escape from an edit, caret at abcd|ef, then a key: where does it go? Each read also says if the block moved or went.
const ESCR = { html: [0, 'new'], areas: 0, has: ['Bold', 'Write'] };
const ESCAPED = [...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300]];
// Cmd+Z can walk past the start and off the page's list, so each case starts over.
const FRESH = [['exit'], ['enter'], ['blank'], ...NEWTEXT];
const ENTERS = (n) => Array.from({ length: n }, () => ['press', 'Enter']);
const FAST = (n) => [['keysGap', 100, Array.from({ length: n }, () => 'Enter')]];
const WALK = (name, keys) => keys.flatMap((k, n) => [['pressNamed', k], ['pause', 500], ['read', `${name} ${n + 1} ${k}`, ESCR]]);
const WORD1 = ' longer line of words that runs on past the end of the block';
const WORD2 = ' and then on and on over a second line and more words to fill it';
const WORD3 = ' and then again on and on over a third line and more words to fill';
const WORD4 = ' and then again on and on over a fourth line and more words to fill';
const WORD5 = ' and then again on and on over a fifth line and more words to fill it';
const THREE_LINES = [WORD1, WORD2, WORD3].flatMap((w) => [['keysFast', w], ['pause', 1300]]);
const LEAVE = [['press', 'Escape'], ['pause', 200], ['press', 'Escape'], ['pause', 300]];
// Cmd+Z (z) and Cmd+Shift+Z (y), reading after each.
const ZS = (name, keys) => keys.flatMap((k, n) => [['press', k === 'z' ? 'Meta+z' : 'Meta+Shift+z'], ['pause', 300], ['read', `${name} ${n + 1} ${k}`, ESCR]]);
const AFTERESC = (name, steps) => [...ESCAPED, ...steps, ['pause', 300], ['read', name, ESCR], ['keys', 'X'], ['pause', 300], ['read', `${name}, X`, ESCR]];
export const RECIPES = {
  'CAP-ESC1': { question: 'E4: after one Escape from an edit: which keys still reach the text, and which the block?', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...ESCAPED, ['read', 'one Escape', { ...ESCR, controls: true }], ['shot', 'one Escape'], ['keys', 'X'], ['pause', 300], ['read', 'one Escape, X', { ...ESCR, controls: true }], ['shot', 'one Escape, X'],
    ...['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Backspace', 'Delete', 'Enter', 'Shift+Enter', 'Tab', 'Meta+a', 'Meta+b', 'Meta+i', 'Meta+u', 'Meta+k', 'Meta+z', 'Meta+Shift+z', 'Meta+x', 'Meta+c', 'Meta+d', 'Meta+Alt+6'].flatMap((k) => AFTERESC(k, k.includes('Shift') ? [['press', k], ['press', 'Shift']] : [['press', k]])),
    ...AFTERESC('Shift+ArrowLeft', SELECTLEFT(2)),
    ...AFTERESC('a second Escape', [['press', 'Escape']]),
    ...AFTERESC('pressed again', [['pick', 0, 'new'], ['pause', 300]]),
    ...AFTERESC('a second Escape, pressed again', [['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300]]),
    ...AFTERESC('Undo button', [['pressNamed', 'Undo'], ['pause', 400]]),
    ...ESCAPED, ['keys', 'X'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['read', 'X, Escape', ESCR], ['keys', 'Y'], ['pause', 300], ['read', 'X, Escape, Y', ESCR], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['read', 'X, Escape, Y, Escape twice', ESCR], ['keys', 'Z'], ['pause', 300], ['read', 'X, Escape, Y, Escape twice, Z', ESCR],
    ['press', 'Escape'], ['add', 0, 'Text'], ['pause', 400], ['keys', 'N'], ['pause', 300], ['read', 'just added, N', ESCR], ['press', 'Escape'], ['pause', 300], ['read', 'just added, N, Escape', ESCR], ['pick', 0, 'new'], ['pause', 300], ['keys', 'M'], ['pause', 300], ['read', 'just added, N, Escape, pressed, M', ESCR],
  ] },
  'CAP-ESC2': { question: 'E4: after one Escape: a real press, Write, a drag, another block, the page, Duplicate, a menu, the phone, Preview; undo steps across it; shortcuts over a selection. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...AFTERESC('a real press on the block', [['select', 0, 'new'], ['pause', 300]]),
    ...AFTERESC('Write', [['click', 'Write'], ['pause', 300]]),
    ...AFTERESC('Write, Escape', [['click', 'Write'], ['pause', 300], ['press', 'Escape'], ['pause', 300]]),
    ...AFTERESC('a drag', [['drag', 0, 'new', 'middle', 125, 0], ['pause', 300]]),
    ...AFTERESC('a press on the page', [['clickAt', 1300, 700], ['pause', 300]]),
    ...AFTERESC('Duplicate', [['pressNamed', 'Duplicate'], ['pause', 500]]),
    ...AFTERESC('Pin', [['pressNamed', 'Pin'], ['pause', 400], ['press', 'Escape'], ['pause', 300]]),
    ...AFTERESC('Layers', [['pressNamed', 'Open Layers Panel'], ['pause', 500]]),
    ...AFTERESC('the phone and back', [['view', 'Mobile'], ['pause', 700], ['view', 'Desktop'], ['pause', 500]]),
    ...AFTERESC('Preview and back', [['pressNamed', 'Toggle preview mode'], ['pause', 1500], ['pressNamed', 'Toggle preview mode'], ['pause', 1200]]),
    ...ESCAPED, ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['press', 'Shift'], ['press', 'Meta+b'], ['pause', 300], ['read', 'two letters, Bold', ESCR],
    ...ESCAPED, ...SELECTLEFT(2), ['press', 'Meta+u'], ['pause', 300], ['read', 'two letters, Underline', ESCR],
    ...ESCAPED, ...SELECTLEFT(2), ['press', 'Meta+x'], ['pause', 300], ['read', 'two letters, cut', ESCR],
    ...ESCAPED, ['press', 'Meta+Alt+2'], ['pause', 300], ['read', 'Paragraph 1', ESCR],
    ...NEWTEXT, ['keys', 'ab'], ['press', 'Escape'], ['keys', 'cd'], ['pause', 1300], ['keys', 'ef'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ['undoWalk', 'typed either side of Escape', 0, 'new', 6, true],
    ...NEWTEXT, ['keys', 'ab'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ['keys', 'cd'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ['undoWalk', 'a pause before Escape', 0, 'new', 6, true],
    ...NEWTEXT, ['keys', 'abc'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ['read', 'Cmd+Z after Escape', { ...ESCR }], ['press', 'Escape'], ['pause', 300], ['undoWalk', 'Cmd+Z after Escape, walked', 0, 'new', 6, true],
    ...NEWTEXT, ['keys', 'abc'], ['pause', 300], ['click', 'Text Style'], ['click', 'Monospace'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'monospace, end of a line', H], ['keys', 'X'], ['pause', 200], ['read', 'monospace, end of a line, X', H],
    ...NEWTEXT, ['keys', 'ab'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Enter'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['read', 'Enter after Escape, Escape', ESCR], ['keys', 'X'], ['pause', 300], ['read', 'Enter after Escape, Escape, X', ESCR],
  ] },
  'CAP-Y2KEYS': { question: 'Y2: Cmd+Z and Cmd+Shift+Z in an edit: past the start, short gaps, after typing, the caret, an earlier edit, a reopened edit, after one Escape, over Bold, Enter and Shift+Enter, rows, a selection, a link. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 1300], ['keys', 'cc'], ['pause', 300], ...ZS('three bursts', ['z', 'z', 'z', 'z', 'y', 'y', 'y', 'y']), ...LEAVE, ['undoWalk', 'three bursts, left', 0, 'new', 6, true],
    ...FRESH, ['keysGap', 60, ['a', 'b', 'c', 'd']], ['pause', 300], ...ZS('gap 60', ['z', 'z']), ...LEAVE,
    ...FRESH, ['keysGap', 300, ['a', 'b', 'c', 'd']], ['pause', 300], ...ZS('gap 300', ['z', 'z']), ...LEAVE,
    ...FRESH, ['keysGap', 600, ['a', 'b', 'c', 'd']], ['pause', 300], ...ZS('gap 600', ['z', 'z']), ...LEAVE,
    ...FRESH, ['keysGap', 800, ['a', 'b', 'c', 'd']], ['pause', 300], ...ZS('gap 800', ['z', 'z']), ...LEAVE,
    ...FRESH, ['keysGap', 60, ['a', 'b', 'c', 'd', 'ArrowLeft', 'ArrowLeft', 'X']], ['pause', 300], ...ZS('moved in a burst', ['z', 'z']), ['keys', 'Y'], ['pause', 300], ['read', 'moved in a burst, Y', ESCR], ...LEAVE,
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ['press', 'Meta+z'], ['pause', 100], ['keys', 'X'], ['pause', 300], ['read', 'typed after Cmd+Z', ESCR], ...ZS('typed after', ['y', 'z', 'y', 'z', 'z', 'z']), ...LEAVE, ['undoWalk', 'typed after, left', 0, 'new', 6, true],
    ...FRESH, ['keys', 'abcd'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 1300], ['keys', 'X'], ['press', 'End'], ['pause', 200], ...ZS('caret', ['z']), ['keys', 'Y'], ['pause', 300], ['read', 'caret, Y', ESCR], ...LEAVE,
    ...FRESH, ['keys', 'abcd'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 1300], ['keys', 'X'], ['press', 'Home'], ['pause', 200], ...ZS('caret on redo', ['z', 'y']), ['keys', 'Y'], ['pause', 300], ['read', 'caret on redo, Y', ESCR], ...LEAVE,
    ...FRESH, ['keys', 'first'], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'cc'], ['pause', 300], ...ZS('earlier edit', ['z', 'z', 'z', 'y', 'y']), ...LEAVE, ['undoWalk', 'earlier edit, left', 0, 'new', 6, true],
    ...FRESH, ['keys', 'first'], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ...ZS('opened, nothing typed', ['z', 'y']), ...LEAVE, ['undoWalk', 'opened, nothing typed, left', 0, 'new', 6, true],
    ...FRESH, ['pause', 300], ...ZS('just added', ['z']), ...LEAVE, ['read', 'just added, left', ESCR], ['undoWalk', 'just added, walked', 0, 'new', 6, true],
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['keys', 'def'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ...ZS('one Escape', ['z', 'z', 'z', 'y', 'y', 'y']), ['press', 'Escape'], ['pause', 300], ['undoWalk', 'one Escape, left', 0, 'new', 6, true],
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['press', 'Escape'], ['pause', 300], ['click', 'Write'], ['pause', 300], ...ZS('Escape, Write', ['z', 'z', 'y']), ...LEAVE, ['undoWalk', 'Escape, Write, left', 0, 'new', 6, true],
    ...FRESH, ['keys', 'abcd'], ...SELECTLEFT(2), ['click', 'Bold'], ['pause', 300], ...ZS('Bold', ['z', 'z', 'y', 'y']), ...LEAVE, ['undoWalk', 'Bold, left', 0, 'new', 6, true],
    ...FRESH, ['keys', 'ab'], ['press', 'Enter'], ['keys', 'cd'], ['pause', 1300], ...ZS('Enter in a burst', ['z', 'z', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'ab'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['keys', 'cd'], ['pause', 1300], ...ZS('Shift+Enter in a burst', ['z', 'z', 'z', 'z']), ...LEAVE,
    ...FRESH, ['keys', 'abcd'], ['pause', 1300], ['press', 'Backspace'], ['press', 'Backspace'], ['pause', 1300], ...ZS('Backspace', ['z', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'abcd'], ['pause', 1300], ...SELECTLEFT(2), ['keys', 'X'], ['pause', 300], ...ZS('over a selection', ['z']), ['keys', 'Y'], ['pause', 300], ['read', 'over a selection, Y', ESCR], ...LEAVE,
    ...FRESH, ['keys', 'a'], ['pause', 1300], ['press', 'Enter'], ['press', 'Enter'], ['press', 'Enter'], ['press', 'Enter'], ['press', 'Enter'], ['press', 'Enter'], ['pause', 1300], ['read', 'rows, typed', ESCR], ...ZS('rows', ['z', 'y', 'z', 'z']), ...LEAVE, ['read', 'rows, left', ESCR],
    ...FRESH, ['keysList', ['a', '.', 'c', 'o', 'm', 'Space']], ['pause', 1300], ...ZS('a link', ['z', 'z', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ...ZS('all taken, left', ['z', 'z']), ...LEAVE, ['read', 'all taken, buttons', { ...ESCR, btnState: ['Undo', 'Redo'] }],
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ...ZS('one taken, left', ['z']), ...LEAVE, ['read', 'one taken, buttons', { ...ESCR, btnState: ['Undo', 'Redo'] }],
  ] },
  'CAP-Y2KEYS2': { question: 'Y2: the rules fitted to CAP-Y2KEYS on fresh cases: steps that change something else, Undo and Redo buttons in an edit, rows and pushed blocks, Redo after leaving. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'first'], ...LEAVE, ['select', 0, 'new'], ['pause', 300], ['drag', 0, 'new', 'middle', 125, 0], ['pause', 300], ['read', 'dragged, rows', ESCR], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'cc'], ['pause', 300], ...ZS('dragged, rows', ['z', 'z', 'z']), ...LEAVE,
    ...FRESH, ['keys', 'one'], ...LEAVE, ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'two'], ...LEAVE, ['pick', 0, 0], ['click', 'Write'], ['keys', 'cc'], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ...ZS('another block', ['z']), ['read', 'another block, the other', { html: [0, 0], has: ['Bold', 'Write'] }], ...ZS('another block more', ['z', 'y']), ['read', 'another block more, the other', { html: [0, 0], has: ['Bold', 'Write'] }], ...LEAVE,
    ...FRESH, ['pause', 200], ['press', 'Escape'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['pressNamed', 'Undo'], ['pause', 400], ['pressNamed', 'Redo'], ['pause', 400], ['read', 'add, Undo, Redo', ESCR],
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ['read', 'Cmd+Z, buttons', { ...ESCR, btnState: ['Undo', 'Redo'] }], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'Redo button in an edit', ESCR], ...LEAVE,
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'Undo button in an edit', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'then Redo button', ESCR], ['press', 'Meta+z'], ['pause', 300], ['read', 'then Cmd+Z', ESCR], ['press', 'Meta+Shift+z'], ['pause', 300], ['read', 'then Cmd+Shift+Z', ESCR],
    ...FRESH, ['keys', 'first'], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'Undo button, nothing typed', ESCR], ['undoWalk', 'Undo button, nothing typed, walked', 0, 'new', 3, true],
    ...FRESH, ['pause', 300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'Undo button, just added', { areas: 0, has: ['Bold', 'Write'] }], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'Undo button, just added, Redo', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...ENTERS(6), ['pause', 1300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows, Undo button', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows, Undo button twice', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows, Redo button', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...ENTERS(6), ['pause', 1300], ...LEAVE, ['read', 'rows, left then walked', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows, left then walked 1', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows, left then walked 2', ESCR],
    ...FRESH, ...ENTERS(6), ['pause', 1300], ['read', 'rows, one step', ESCR], ...ZS('rows, one step', ['z', 'y', 'z']), ...LEAVE, ['read', 'rows, one step, left', ESCR],
    ['exit'], ['enter'], ['blank'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 0], ['click', 'Write'], ['keys', 'a'], ['pause', 1300], ...ENTERS(8), ['pause', 1300], ['read', 'rows, pushed', { html: [0, 0], areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+z'], ['pause', 300], ['read', 'rows, pushed z', { html: [0, 0], areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+Shift+z'], ['pause', 300], ['read', 'rows, pushed y', { html: [0, 0], areas: 0, has: ['Bold', 'Write'] }], ...LEAVE,
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ...LEAVE, ['pressNamed', 'Redo'], ['pause', 500], ['read', 'left, Redo 1', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'left, Redo 2', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'left, Redo 2, Undo', ESCR],
    ...FRESH, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ...ZS('opened again', ['y', 'z', 'y']), ['keys', 'X'], ['pause', 300], ['read', 'opened again, X', { ...ESCR, btnState: ['Undo', 'Redo'] }], ...ZS('opened again, X', ['y']), ...LEAVE,
    ...FRESH, ['keys', 'first'], ...LEAVE, ['pressNamed', 'Undo'], ['pause', 500], ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ...ZS('undone, then opened', ['y']), ...LEAVE,
  ] },
  'CAP-Y2KEYS3': { question: 'Y2: rows when going back over steps, with Enter at exact gaps: Undo and Redo buttons in an edit and after it, Cmd+Z over two runs, pushed blocks; a step that adds another block under an edit. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'a'], ['pause', 1300], ...FAST(6), ['pause', 1300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows A undo', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows A undo 2', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows A redo', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows A redo 2', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(6), ['pause', 1300], ...LEAVE, ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows B undo', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows B undo 2', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows B redo', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows B redo 2', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 1300], ...FAST(3), ['pause', 1300], ['read', 'rows C typed', ESCR], ...ZS('rows C', ['z', 'z', 'z', 'y', 'y', 'y']), ...LEAVE, ['read', 'rows C left', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 1300], ...FAST(3), ['pause', 1300], ...LEAVE, ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows D undo', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows D undo 2', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows D undo 3', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows D redo', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows D redo 2', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows D redo 3', ESCR],
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 1300], ['keys', 'X'], ['pause', 1300], ['read', 'rows E typed', ESCR], ...ZS('rows E', ['z', 'z', 'z']), ...LEAVE,
    ...FRESH, ...FAST(3), ['pause', 1300], ['read', 'rows F typed', ESCR], ...ZS('rows F', ['z', 'y', 'z']), ...LEAVE, ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows F redo', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows F undo', ESCR],
    ['exit'], ['enter'], ['blank'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['pause', 200], ['drag', 0, 'new', 'middle', 0, 120], ['pause', 400], ['read', 'rows G start', { areas: 0 }], ['press', 'Escape'], ['pause', 300], ['pick', 0, 0], ['click', 'Write'], ['keys', 'a'], ['pause', 1300], ...FAST(8), ['pause', 1300], ['read', 'rows G typed', { areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+z'], ['pause', 300], ['read', 'rows G z', { areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+Shift+z'], ['pause', 300], ['read', 'rows G y', { areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+z'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ['read', 'rows G z z', { areas: 0, has: ['Bold', 'Write'] }], ...LEAVE,
    ...FRESH, ['keys', 'one'], ...LEAVE, ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 0], ['click', 'Write'], ['pause', 300], ['press', 'Meta+z'], ['pause', 400], ['read', 'another added, z', { areas: 0, has: ['Bold', 'Write'] }], ['press', 'Meta+Shift+z'], ['pause', 400], ['read', 'another added, y', { areas: 0, has: ['Bold', 'Write'] }], ...LEAVE,
  ] },
  'CAP-Y2KEYS4': { question: 'Y2: rows on going back to a later step, fresh line counts and spare rows; Redo of a step a row short. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'a'], ['pause', 1300], ...FAST(2), ['pause', 1300], ...FAST(4), ['pause', 1300], ...LEAVE, ...WALK('rows H', ['Undo', 'Undo', 'Undo', 'Redo', 'Redo', 'Redo']),
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(1), ['pause', 1300], ...FAST(1), ['pause', 1300], ...FAST(1), ['pause', 1300], ...ZS('rows I', ['z', 'z', 'z', 'z', 'y', 'y', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(5), ['pause', 1300], ...FAST(4), ['pause', 1300], ['read', 'rows J typed', ESCR], ...ZS('rows J', ['z', 'z', 'y', 'y']), ...LEAVE,
    ...FRESH, ['press', 'Escape'], ['pause', 300], ['select', 0, 'new'], ['pause', 300], ['drag', 0, 'new', 's', 0, 330], ['pause', 400], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 1300], ...FAST(3), ['pause', 1300], ['read', 'rows K typed', ESCR], ...ZS('rows K', ['z', 'z', 'z', 'y', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keysList', ['a', 'b', 'c']], ['pause', 1300], ['keys', ' longer line of words that runs on past the end of the block and then on and on over a second line and a third line and more'], ['pause', 1300], ['read', 'rows L typed', ESCR], ...ZS('rows L', ['z', 'y']), ...LEAVE,
  ] },
  'CAP-Y2KEYS5': { question: 'Y2: the rows rule on fresh cases: other line counts, spare rows, pushed blocks, wrapped text, a reopened edit. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'a'], ['pause', 1300], ...FAST(4), ['pause', 1300], ...FAST(1), ['pause', 1300], ...ZS('rows M', ['z', 'z', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(2), ['pause', 1300], ...FAST(2), ['pause', 1300], ...ZS('rows N', ['z', 'z', 'z', 'y']), ...LEAVE, ...WALK('rows N', ['Undo', 'Redo']),
    ...FRESH, ['press', 'Escape'], ['pause', 300], ['select', 0, 'new'], ['pause', 300], ['drag', 0, 'new', 's', 0, 250], ['pause', 400], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'a'], ['pause', 1300], ...FAST(2), ['pause', 1300], ...FAST(3), ['pause', 1300], ['read', 'rows O typed', ESCR], ...ZS('rows O', ['z', 'z', 'z', 'y']), ...LEAVE,
    ['exit'], ['enter'], ['blank'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['pause', 200], ['drag', 0, 'new', 'middle', 0, 120], ['pause', 400], ['press', 'Escape'], ['pause', 300], ['pick', 0, 0], ['click', 'Write'], ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 1300], ...FAST(4), ['pause', 1300], ['read', 'rows P typed', { areas: 0, has: ['Bold', 'Write'] }], ...['z', 'z', 'y', 'y'].flatMap((k, n) => [['press', k === 'z' ? 'Meta+z' : 'Meta+Shift+z'], ['pause', 300], ['read', `rows P ${n + 1} ${k}`, { areas: 0, has: ['Bold', 'Write'] }]]), ...LEAVE, ...['Undo', 'Undo', 'Redo'].flatMap((k, n) => [['pressNamed', k], ['pause', 500], ['read', `rows P left ${n + 1} ${k}`, { areas: 0 }]]),
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['keysFast', ' longer line of words that runs on past the end of the block'], ['pause', 1300], ['keysFast', ' and then on and on over a second line and a third line and more and more and more and more words'], ['pause', 1300], ['read', 'rows Q typed', ESCR], ...ZS('rows Q', ['z', 'z', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'a'], ['pause', 1300], ...FAST(3), ['pause', 300], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ['press', 'End'], ...FAST(3), ['pause', 1300], ['read', 'rows R typed', ESCR], ...ZS('rows R', ['z', 'z', 'z', 'y', 'y', 'y']), ...LEAVE,
  ] },
  'CAP-Y2KEYS6': { question: 'Y2: rows on going back over wrapped text, one line at a time, with and without spare rows. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'abc'], ['pause', 1300], ...THREE_LINES, ['read', 'rows S typed', ESCR], ...ZS('rows S', ['z', 'z', 'z', 'z', 'y', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['keysFast', WORD1], ['pause', 1300], ['keysFast', WORD2], ['pause', 1300], ['keysFast', WORD3], ['pause', 1300], ['keysFast', WORD4], ['pause', 1300], ['keysFast', WORD5], ['pause', 1300], ['read', 'rows T typed', ESCR], ...ZS('rows T', ['z', 'z', 'z', 'z', 'z', 'z', 'y', 'y', 'y', 'y', 'y']), ...LEAVE,
  ] },
  'CAP-Y2KEYS7': { question: 'Y2: rows going back when the paragraphs stay and only the height changes: spare rows, a mix with Enter, deleted words, a style. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['press', 'Escape'], ['pause', 300], ['select', 0, 'new'], ['pause', 300], ['drag', 0, 'new', 's', 0, 250], ['pause', 400], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'abc'], ['pause', 1300], ...THREE_LINES, ['read', 'rows U typed', ESCR], ...ZS('rows U', ['z', 'z', 'z', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['keysFast', WORD1], ['pause', 1300], ...FAST(2), ['pause', 1300], ['keysFast', WORD2], ['pause', 1300], ['read', 'rows V typed', ESCR], ...ZS('rows V', ['z', 'z', 'z', 'y', 'y']), ...LEAVE,
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ...THREE_LINES, ['press', 'Meta+a'], ['press', 'Backspace'], ['pause', 1300], ['read', 'rows W typed', ESCR], ...ZS('rows W', ['z', 'z']), ...LEAVE,
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['click', 'Text Style'], ['click', 'Heading 1'], ['pause', 1300], ['read', 'rows X typed', ESCR], ...ZS('rows X', ['z', 'y', 'z', 'z']), ...LEAVE,
    ...FRESH, ['keys', 'abc'], ['pause', 1300], ['keysFast', WORD1], ['pause', 1300], ['keysFast', WORD2], ['pause', 300], ...LEAVE, ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows Y left 1', ESCR], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'rows Y left 2', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows Y left 3', ESCR], ['pressNamed', 'Redo'], ['pause', 500], ['read', 'rows Y left 4', ESCR],
  ] },
  'CAP-Y2KEYS8': { question: 'Y2: rows on going back over wrapped text as the first step of an edit: in the edit, reopened, by the buttons. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keysFast', `abc${WORD1}${WORD2}`], ['pause', 1300], ['read', 'rows Z1 typed', ESCR], ...ZS('rows Z1', ['z', 'y']), ...LEAVE, ...WALK('rows Z1', ['Undo', 'Redo']),
    ...FRESH, ['keysFast', `abc${WORD1}`], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ['press', 'Meta+ArrowDown'], ['keysFast', WORD2], ['pause', 1300], ['read', 'rows Z2 typed', ESCR], ...ZS('rows Z2', ['z', 'y']), ...LEAVE, ...WALK('rows Z2', ['Undo', 'Redo']),
    ...FRESH, ['keysFast', `abc${WORD1}${WORD2}${WORD3}`], ...LEAVE, ['pick', 0, 'new'], ['click', 'Write'], ['pause', 300], ['press', 'Meta+ArrowDown'], ['keysFast', WORD4], ['pause', 1300], ...ZS('rows Z3', ['z']), ...LEAVE,
  ] },
  'CAP-Y2KEYS9': { question: 'Y2: the fall on going back at other sizes of text: Paragraph 1 and Paragraph 3 wrapped lines, Heading wrapped lines. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...['Paragraph 1', 'Paragraph 3', 'Heading 4', 'Heading 1'].flatMap((style, n) => [...(n ? FRESH : NEWTEXT), ['keys', 'abc'], ['pause', 300], ['click', 'Text Style'], ['click', style], ['pause', 1300],
      ['keysFast', WORD1], ['pause', 1300], ['keysFast', WORD2], ['pause', 1300], ['keysFast', WORD3], ['pause', 1300], ['read', `rows ${style} typed`, ESCR], ...ZS(`rows ${style}`, ['z', 'z', 'z', 'y', 'y', 'y']), ...LEAVE]),
  ] },
  'CAP-E4BREAK': { question: 'E4: Shift+Enter: mid line, at the end of a line, at the start, twice, in a heading, a list, a quote and monospace, over a selection.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'mid line', H], ['keys', 'X'], ['pause', 200], ['read', 'mid line, X', H],
    ...NEWTEXT, ['keys', 'abc'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'end of a line', H], ['keys', 'X'], ['pause', 200], ['read', 'end of a line, X', H], ['press', 'Backspace'], ['pause', 200], ['read', 'end of a line, X, Backspace', H], ['press', 'Backspace'], ['pause', 200], ['read', 'end of a line, X, Backspace twice', H],
    ...NEWTEXT, ['keys', 'abc'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'start of a line', H], ['keys', 'X'], ['pause', 200], ['read', 'start of a line, X', H],
    ...NEWTEXT, ['keys', 'abc'], ['press', 'Shift+Enter'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'twice at the end', H], ['keys', 'X'], ['pause', 200], ['read', 'twice at the end, X', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['keys', 'X'], ['pause', 200], ['read', 'heading, mid line, X', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['click', 'Bullet List'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['keys', 'X'], ['pause', 200], ['read', 'list, mid line, X', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['click', 'Quote'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['keys', 'X'], ['pause', 200], ['read', 'quote, mid line, X', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['click', 'Text Style'], ['click', 'Monospace'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['keys', 'X'], ['pause', 200], ['read', 'monospace, mid line, X', H],
    ...NEWTEXT, ['keys', 'abcdef'], ...SELECTLEFT(2), ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 200], ['read', 'over two letters', H], ['keys', 'X'], ['pause', 200], ['read', 'over two letters, X', H],
    ...NEWTEXT, ['keys', 'ab'], ['pause', 1300], ['press', 'Shift+Enter'], ['press', 'Shift'], ['pause', 1300], ['keys', 'cd'], ['pause', 1300], ['press', 'Escape'], ['undoWalk', 'undo steps', 0, 'new', 6, true],
  ] },
  'CAP-E4REOPEN3': { question: 'E4: after a Preview, where does the caret start in two lines and once more after that?', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pressNamed', 'Toggle preview mode'], ['pause', 1500], ['pressNamed', 'Toggle preview mode'], ['pause', 1200], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'two lines', H], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'Y'], ['pause', 300], ['read', 'two lines, opened once more', H],
  ] },
  'CAP-E4REOPEN2': { question: 'E4: is the selection kept when an edit is opened again after a change of view, a Preview, or an Undo? Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['view', 'Mobile'], ['pause', 700], ['view', 'Desktop'], ['pause', 500], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'after the phone view', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pressNamed', 'Toggle preview mode'], ['pause', 1500], ['pressNamed', 'Toggle preview mode'], ['pause', 1200], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'after Preview', H],
    ...NEWTEXT, ['keys', 'aa'], ['pause', 1300], ['keys', 'bb'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pressNamed', 'Undo'], ['pause', 500], ['read', 'Undo, left', H], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'after an Undo', H],
  ] },
  'CAP-E4REOPEN': { question: 'E4: an edit left and opened again: where is the caret?', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['press', 'ArrowUp'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'caret on the first line, opened again, typed', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'caret mid word, opened again, typed', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['press', 'Shift'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['keys', 'X'], ['pause', 300], ['read', 'two letters selected, opened again, typed', H],
    ...NEWTEXT, ['keys', 'abcdef'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['press', 'Enter'], ['pause', 500], ['keys', 'X'], ['pause', 300], ['read', 'caret mid word, Enter to open, typed', H],
  ] },
  'CAP-T3EMPTY3': { question: 'T3: two empty lines, left: does the hint stay deselected, selected, on the phone and when the edit is opened again? Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['press', 'Enter'], ['press', 'ArrowUp'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['hintOf', 'caret on the first, left'], ['press', 'Escape'], ['pause', 300], ['hintOf', 'caret on the first, deselected'], ['view', 'Mobile'], ['pause', 700], ['hintOf', 'caret on the first, phone'], ['view', 'Desktop'], ['pause', 500], ['pick', 0, 'new'], ['pause', 300], ['hintOf', 'caret on the first, selected'], ['click', 'Write'], ['pause', 400], ['hintOf', 'caret on the first, opened again'], ['keys', 'x'], ['pause', 300], ['read', 'caret on the first, opened again, typed', H],
    ...NEWTEXT, ['press', 'Enter'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['hintOf', 'caret on the second, left'], ['press', 'Escape'], ['pause', 300], ['pick', 0, 'new'], ['pause', 300], ['click', 'Write'], ['pause', 400], ['hintOf', 'caret on the second, opened again'], ['keys', 'x'], ['pause', 300], ['read', 'caret on the second, opened again, typed', H],
  ] },
  'CAP-T3EMPTY2': { question: 'T3: the hint with more than one empty line: which caret place shows it, leaving, a word below, a heading beside it. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['press', 'Enter'], ['press', 'Enter'], ['pause', 300], ['hintOf', 'three lines, caret on the third'], ['press', 'ArrowUp'], ['pause', 300], ['hintOf', 'three lines, caret on the second'], ['press', 'ArrowUp'], ['pause', 300], ['hintOf', 'three lines, caret on the first'], ['press', 'Escape'], ['pause', 300], ['hintOf', 'three lines, caret on the first, left'], ['read', 'three lines, left, html', H],
    ...NEWTEXT, ['press', 'Enter'], ['press', 'ArrowUp'], ['pause', 200], ['press', 'Meta+a'], ['pause', 300], ['hintOf', 'two lines, select all'],
    ...NEWTEXT, ['press', 'Enter'], ['press', 'ArrowUp'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['hintOf', 'two lines, caret on the first, left'],
    ...NEWTEXT, ['press', 'Enter'], ['keys', 'word'], ['pause', 200], ['press', 'ArrowUp'], ['pause', 300], ['hintOf', 'first empty, a word below, caret on the first'], ['press', 'Escape'], ['pause', 300], ['hintOf', 'first empty, a word below, left'], ['read', 'first empty, a word below, html', H],
    ...NEWTEXT, ['keys', 'word'], ['press', 'Enter'], ['pause', 300], ['hintOf', 'a word, then an empty line'],
    ...NEWTEXT, ['press', 'Enter'], ['click', 'Text Style'], ['click', 'Heading 2'], ['pause', 200], ['hintOf', 'empty, then empty H2, caret on the H2'], ['press', 'ArrowUp'], ['pause', 300], ['hintOf', 'empty, then empty H2, caret on the first'], ['read', 'empty, then empty H2, html', H],
    ...NEWTEXT, ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['pause', 300], ['hintOf', 'empty H2, then empty, caret on the second'], ['read', 'empty H2, then empty, html', H],
    ...NEWTEXT, ['press', 'Enter'], ['keys', 'x'], ['press', 'Backspace'], ['pause', 300], ['hintOf', 'second line typed and emptied'],
  ] },
  'CAP-T3EMPTY': { question: 'T3: the Write here... hint past one empty paragraph: other styles, lists, two empty lines, a space, undo, emptied by select all, Preview. Predicted first.', page: 'Gestures Probe', steps: [
    ['enter'], ['blank'],
    ...['Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Paragraph 1', 'Paragraph 3', 'Monospace'].flatMap((n) => [...NEWTEXT, ['click', 'Text Style'], ['click', n], ['pause', 300], ['hintOf', n], ['read', `${n}, html`, H], ['press', 'Escape'], ['pause', 300], ['hintOf', `${n}, left`]]),
    ...['Quote', 'Bullet List', 'Numbered List'].flatMap((n) => [...NEWTEXT, ['click', n], ['pause', 300], ['hintOf', n], ['read', `${n}, html`, H], ['press', 'Escape'], ['pause', 300], ['hintOf', `${n}, left`]]),
    ...NEWTEXT, ['click', 'Text Alignment'], ['pause', 300], ['read', 'alignment menu', { controls: true }], ['clickIf', 'Text align: center'], ['pause', 300], ['shot', 'centred'], ['hintOf', 'centred'], ['read', 'centred, html', H],
    ...NEWTEXT, ['press', 'Enter'], ['pause', 300], ['shot', 'two lines'], ['hintOf', 'two empty lines'], ['read', 'two empty lines, html', H], ['press', 'ArrowUp'], ['pause', 300], ['hintOf', 'two empty lines, caret on the first'], ['press', 'ArrowDown'], ['press', 'Backspace'], ['pause', 300], ['hintOf', 'one line again'], ['read', 'one line again, html', H],
    ...NEWTEXT, ['press', 'Enter'], ['pause', 200], ['press', 'Escape'], ['pause', 300], ['hintOf', 'two empty lines, left'],
    ...NEWTEXT, ['press', 'Shift+Enter'], ['pause', 300], ['hintOf', 'line break'], ['read', 'line break, html', H],
    ...NEWTEXT, ['keys', ' '], ['pause', 300], ['hintOf', 'a space'], ['read', 'a space, html', H],
    ...NEWTEXT, ['keys', 'a'], ['pause', 300], ['press', 'Meta+z'], ['pause', 300], ['hintOf', 'a letter, undone'], ['read', 'a letter, undone, html', H],
    ...NEWTEXT, ['keys', 'word'], ['press', 'Meta+a'], ['press', 'Backspace'], ['pause', 300], ['hintOf', 'word, select all, Backspace'], ['read', 'word, select all, Backspace, html', H],
    ...NEWTEXT, ['keys', 'word'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Meta+a'], ['press', 'Backspace'], ['pause', 300], ['hintOf', 'H2 word, select all, Backspace'], ['read', 'H2 word, select all, Backspace, html', H],
    ...NEWTEXT, ['press', 'Escape'], ['pause', 300], ['pressNamed', 'Toggle preview mode'], ['pause', 1500], ['hintOf', 'preview'], ['shot', 'preview'], ['pressNamed', 'Toggle preview mode'], ['pause', 1200], ['hintOf', 'back from preview'],
  ] },
  'CAP-TOUCH': { question: 'X11: what do touch and pen do on a block: tap, drag, a long press, a handle?', steps: [
    ['enter'], ['listen'],
    ['touch', 2, 2, 'middle', 0, 0], ['read', 'after tap', { block: [2, 2], section: 2, controls: true }],
    ['touch', 2, 2, 'middle', 125, 0], ['read', 'after touch drag 125 right', { block: [2, 2], section: 2 }],
    ['touch', 2, 2, 'middle', 125, 0, { holdMs: 800 }], ['read', 'after long press then drag', { block: [2, 2], section: 2, controls: true }],
    ['exit'], ['enter'], ['listen'],
    ['select', 2, 2], ['touch', 2, 2, 'se', 125, 75], ['read', 'after touch on a handle', { block: [2, 2], section: 2 }],
    ['exit'], ['enter'], ['listen'],
    ['drag', 2, 2, 'middle', 125, 0, { pointerType: 'pen' }], ['read', 'after pen drag 125 right', { block: [2, 2], section: 2 }],
  ] },
  'CAP-UNDOTYPE': { question: 'Y2: how many undo steps does typing take, in one burst, in two bursts, and across leaving the edit?', steps: [
    ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two three four'], ['read', 'one burst typed', { html: [2, 1] }], ['press', 'Escape'], ['undoWalk', 'one burst', 2, 1],
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', 3000], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', 'two bursts 3s apart', 2, 1],
    ...[300, 800, 1500].flatMap((ms) => [['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', ms], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', `two bursts ${ms}ms apart`, 2, 1]]),
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one'], ['press', 'Escape'], ['pause', 800], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'two edits', 2, 1],
    ['exit'], ['enter'], ['editText', 2, 1], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Italic'], ['press', 'Escape'], ['undoWalk', 'two toolbar actions in one edit', 2, 1],
  ] },
  'CAP-TARGET': { question: 'X2: what does the drop target look like while a block is held?', steps: [
    ['enter'], ['hold', 2, 2, 'middle', 125, 75], ['read', 'held', { block: [2, 2], layers: 2 }], ['shot', 'held'], ['release', 'home'], ['read', 'dropped home', { block: [2, 2] }],
  ] },
  'CAP-ALT': { question: 'X7: does Alt change a resize?', steps: [
    ['enter'], ['hold', 2, 2, 'se', 125, 75, ['Alt']], ['read', 'alt held', { block: [2, 2], layers: 2 }], ['release'], ['read', 'alt dropped', { block: [2, 2] }],
    ['exit'], ['enter'], ['hold', 2, 2, 'se', 125, 75], ['read', 'plain held', { block: [2, 2] }], ['release'], ['read', 'plain dropped', { block: [2, 2] }],
    ['exit'], ['enter'], ['add', 2, 'Image'], ['select', 2, 'new'], ['hold', 2, 'new', 'se', 125, 75, ['Alt']], ['read', 'image alt held', { block: [2, 'new'] }], ['release'], ['read', 'image alt dropped', { block: [2, 'new'] }],
  ] },
  'CAP-HANDLES': { question: 'X6, T2, T11: handles, markup boxes and default area of the block types not read yet', steps: [
    ['enter'],
    ...['Image', 'Form', 'Line', 'Scrolling', 'Map', 'Social Links', 'Quote'].flatMap((t) => [['add', 2, t], ['read', t, allBlock(2, 'new')], ['press', 'Escape']]),
  ] },
  'CAP-PERLAYOUT': { question: 'L6, S1: are block Design values and the section Row Count stored per layout?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Edit'], ['click', 'Design'], ['read', 'design panel', { controls: true }], ['fill', 'Opacity', '50'], ['read', 'desktop after opacity 50', { inside: [2, 1], block: [2, 1] }], ['press', 'Escape'],
    ['view', 'Mobile'], ['read', 'phone after desktop opacity 50', { inside: [2, 1], block: [2, 1] }], ['view', 'Desktop'],
    ['exit'], ['enter'], ['panel', 2], ['click', 'Design'], ['read', 'row count desktop', { controls: true, section: 2 }], ['press', 'Escape'],
    ['view', 'Mobile'], ['panel', 2], ['click', 'Design'], ['read', 'row count phone', { controls: true, section: 2 }], ['fill', 'Row Count', '40'], ['read', 'phone after row count 40', { controls: true, section: 2 }], ['press', 'Escape'],
    ['view', 'Desktop'], ['read', 'desktop after phone row count 40', { section: 2 }],
  ] },
  'CAP-PHONE': { question: 'U4, U5, S4, U10: toolbar separators, Pin, new block placement and section controls in the phone view', steps: [
    ['enter'], ['select', 2, 2], ['click', 'Pin'], ['read', 'pin desktop', { controls: true, thin: true, block: [2, 2] }], ['press', 'Escape'],
    ['exit'], ['enter'], ['read', 'before add', { areas: 2 }], ['add', 2, 'Line'], ['read', 'new line desktop', { block: [2, 'new'], areas: 2 }], ['view', 'Mobile'], ['read', 'new line phone', { block: [2, 'new'], section: 2, areas: 2 }],
    ['exit'], ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'phone hovered section', { controls: true, thin: true, section: 2 }], ['select', 2, 2], ['read', 'phone selected shape', { controls: true, thin: true, block: [2, 2] }],
    ['clickIf', 'Pin'], ['read', 'pin phone', { controls: true, block: [2, 2] }],
  ] },
  'CAP-BUTTON': { question: 'T5: what does a button look like set to Layout Fit instead of Fill?', steps: [
    ['enter'], ...selectEdit(0, 2), ['click', 'Design'], ['read', 'fill', { block: [0, 2], inside: [0, 2] }], ['click', 'Fit'], ['read', 'fit', { block: [0, 2], inside: [0, 2] }], ['shot', 'fit'],
  ] },

  'CAP-E7REOPEN2': { page: 'Gestures Probe', question: 'E7: the box a linked Button opens: its look and its tip, focus and Tab order, Escape, a press on the link button again, after letting go, after Clear and Undo, and for a typed link, an email and a phone. Copy and Remove Link are not pressed, nor the row with a page.', steps: (() => {
    const OPEN = [['click', 'Open link editor popover'], ['pause', 600]];
    const R = (name) => [['read', name, { controls: true, checks: true, focused: true, looks: [100, 284, 440, 420] }], ['read', `${name}, above`, { looks: [100, 190, 440, 284] }]];
    const BTN = [['blank'], ['add', 0, 'Button'], ['press', 'Escape'], ['select', 0, 0], ['pause', 400]];
    const AGAIN = [['select', 0, 0], ['pause', 400], ...OPEN];
    const SET = (name, link) => [...OPEN, ['keysFast', link], ['press', 'Enter'], ['pause', 500], ...R(`${name}, Enter`), ['press', 'Escape'], ['pause', 400], ...R(`${name}, Escape`), ...AGAIN, ...R(name), ['shot', name]];
    const KIND = (kind) => [...OPEN, ['click', 'URL'], ['pause', 300], ['click', kind], ['pause', 400]];
    const EDITAT = [['clickAt', 138, 380], ['pause', 600]];
    const CLOSE = [['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300]];
    return [
      ['enter'], ...BTN, ...SET('page', '/about'),
      ['moveAt', 260, 320], ['pause', 800], ...R('page, on the row'), ['moveAt', 368, 380], ['pause', 800], ...R('page, on Remove Link'), ['moveAt', 1300, 700], ['pause', 800], ...R('page, mouse away'),
      ['press', 'Tab'], ['pause', 200], ...R('Tab 1'), ['press', 'Tab'], ['pause', 200], ...R('Tab 2'), ['press', 'Tab'], ['pause', 200], ...R('Tab 3'), ['press', 'Tab'], ['pause', 200], ...R('Tab 4'),
      ['press', 'Escape'], ['pause', 400], ...R('Escape'),
      ...OPEN, ['click', 'Open link editor popover'], ['pause', 600], ...R('link button again'),
      ...OPEN, ...CLOSE, ['clickAt', 1300, 700], ['pause', 500], ...R('let go'), ...AGAIN, ...R('reselected'),
      ['press', 'Enter'], ['pause', 600], ...R('Edit'), ['shot', 'edit'], ['click', 'Clear selected page'], ['pause', 500], ...R('Edit, Clear'), ['press', 'Escape'], ['pause', 400], ...R('Edit, Clear, Escape'), ...OPEN, ...R('reopened after Clear'), ...CLOSE,
      ['exit'], ['enter'], ...BTN, ...SET('typed', 'a.com'), ...EDITAT, ...R('typed, Edit'), ...CLOSE,
      ['exit'], ['enter'], ...BTN, ...SET('long', 'a-very-long-address-that-goes-on-and-on-and-on-past-the-end-of-the-box.com/with/a/path'), ...CLOSE,
      ['exit'], ['enter'], ...BTN, ...KIND('Email'), ['fill', 'To', 'a@b.no'], ['pause', 400], ...R('email form'), ['press', 'Escape'], ['pause', 400], ...R('email form, Escape'), ...AGAIN, ...R('email'), ['shot', 'email'], ['press', 'Tab'], ['pause', 200], ...R('email, Tab'), ...EDITAT, ...R('email, Edit'), ...CLOSE,
      ['exit'], ['enter'], ...BTN, ...KIND('Phone'), ['fill', 'Enter phone number', '12345678'], ['pause', 400], ...R('phone form'), ['press', 'Escape'], ['pause', 400], ...R('phone form, Escape'), ...AGAIN, ...R('phone'), ['shot', 'phone'], ...EDITAT, ...R('phone, Edit'), ...CLOSE,
      ['exit'], ['enter'], ...BTN, ...SET('to undo', '/about'), ...CLOSE, ['click', 'Undo'], ['pause', 500], ...R('Undo'), ...AGAIN, ...R('Undo, reopened'), ...CLOSE,
    ];
  })() },
  'CAP-E7REOPEN3': { page: 'Gestures Probe', question: 'E7: tested against what ours predicts: the tip on a typed link, an address that is no page, the link button with the field open, Clear and a press away, Undo after Clear, Shift+Tab, the panel, and a Text link opened again.', steps: (() => {
    const OPEN = [['click', 'Open link editor popover'], ['pause', 600]];
    const R = (name) => [['read', name, { controls: true, checks: true, focused: true, looks: [100, 284, 440, 420] }], ['read', `${name}, above`, { looks: [100, 190, 440, 284] }]];
    const BTN = [['blank'], ['add', 0, 'Button'], ['press', 'Escape'], ['select', 0, 0], ['pause', 400]];
    const AGAIN = [['select', 0, 0], ['pause', 400], ...OPEN];
    const LEAVE = [['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['pause', 300]];
    const SET = (link) => [...OPEN, ['keysFast', link], ['press', 'Enter'], ['pause', 500]];
    const PAGE = [...SET('/about'), ['press', 'Escape'], ['pause', 400], ...OPEN];
    return [
      ['enter'], ...BTN, ...SET('a.com'), ...OPEN, ['moveAt', 260, 320], ['pause', 800], ...R('typed, on the row'), ['moveAt', 1300, 700], ['pause', 500], ['press', 'Shift+Tab'], ['pause', 200], ...R('typed, Shift+Tab'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...SET('a-very-long-address-that-goes-on-and-on-and-on-past-the-end-of-the-box.com/with/a/path'), ...OPEN, ['moveAt', 260, 320], ['pause', 800], ...R('long, on the row'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...SET('/nope'), ...R('no page, Enter'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...OPEN, ...R('field'), ...OPEN, ...R('field, link button again'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...PAGE, ['press', 'Enter'], ['pause', 600], ['click', 'Clear selected page'], ['pause', 500], ['clickAt', 1300, 700], ['pause', 500], ...R('Clear, press away'), ...AGAIN, ...R('Clear, press away, reopened'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...PAGE, ['press', 'Enter'], ['pause', 600], ['click', 'Clear selected page'], ['pause', 500], ['press', 'Escape'], ['pause', 400], ['click', 'Undo'], ['pause', 500], ...R('Clear, Undo'), ...AGAIN, ...R('Clear, Undo, reopened'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ...PAGE, ['clickAt', 138, 380], ['pause', 600], ['press', 'Escape'], ['pause', 400], ...R('page, Edit, one Escape'), ...LEAVE,
      ['exit'], ['enter'], ...BTN, ['click', 'Edit'], ['pause', 500], ['click', 'Attach link'], ['pause', 500], ['keysFast', 'a.com'], ['press', 'Enter'], ['pause', 500], ...R('panel, typed, Enter'), ...LEAVE,
      ['exit'], ['enter'], ...NEWTEXT, ['keys', 'hello'], ['press', 'Meta+a'], ['click', 'Link'], ['pause', 500], ['keysFast', '/about'], ['press', 'Enter'], ['pause', 500], ['press', 'Escape'], ['pause', 400], ['click', 'Link'], ['pause', 600], ['read', 'skip text, opened again', { controls: true, checks: true, focused: true }], ['shot', 'text'], ...LEAVE,
    ];
  })() },
  'CAP-LINK': { question: 'E7: what HTML do a typed link, a page link and Open link in new tab write in a text block?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Write'], ['press', 'Meta+a'], ['click', 'Link'], ['read', 'link editor', { controls: true, thin: true }], ['fill', 'Enter link, search, or add files', '/about'], ['press', 'Enter'], ['read', 'typed path, Enter', { html: [2, 1], controls: true }],
    ['click', 'Link'], ['read', 'editor reopened on the link', { html: [2, 1], controls: true }], ['read', 'box before', { checks: true }], ['press', 'Tab'], ['press', 'Tab'], ['press', 'Space'], ['read', 'box ticked by keyboard, editor open', { html: [2, 1], checks: true }], ['press', 'Escape'], ['read', 'editor closed by Escape', { html: [2, 1], checks: true }], ['shot', 'closed'], ['click', 'Link'], ['read', 'editor reopened', { html: [2, 1], checks: true }], ['shot', 'reopened'],
    ['exit'], ['enter'], ['pick', 2, 1], ['click', 'Write'], ['press', 'Meta+a'], ['click', 'Link'], ['clickIf', 'Services'], ['read', 'page link', { html: [2, 1] }],
  ] },
  'CAP-LINEHANDLE': { question: 'X6: which handles does a Line block have, and what does dragging each do?', steps: [
    ['enter'], ['add', 2, 'Line'], ['read', 'just added', allBlock(2, 'new')], ['shot', 'added'],
    ['drag', 2, 'new', 'middle', 0, 400], ['read', 'moved clear of the text', allBlock(2, 'new')], ['shot', 'moved'],
    ['drag', 2, 'new', 'e', 120, 0], ['read', 'east 120 right', { block: [2, 'new'] }],
    ['drag', 2, 'new', 's', 0, 80], ['read', 'south 80 down', { block: [2, 'new'] }],
    ['drag', 2, 'new', 'se', 120, 80], ['read', 'corner', { block: [2, 'new'] }], ['shot', 'after'],
  ] },


  'CAP-PASTEMID': { question: 'E5: what does a paste into the middle of a paragraph do?', steps: [
    ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<b>PASTED</b>'], ['read', 'inline', { html: [2, 1] }],
    ['exit'], ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<p>ONE</p><p>TWO</p>'], ['read', 'two paragraphs', { html: [2, 1] }],
    ['exit'], ['enter'], ['editText', 2, 1], ['pasteMid', 2, 1, '<h2>HEAD</h2><p>TAIL</p>'], ['read', 'heading and paragraph', { html: [2, 1] }],
  ] },
  'CAP-HEADER': { question: 'P8: where do the header title and actions sit above 1520px?', steps: [
    ['enter'], ...[1520, 1700, 1920, 2400].flatMap((w) => [['frame', w, 900], ['read', String(w), { sel: 'header#header .header-announcement-bar-wrapper, header#header .header-title, header#header .header-nav, header#header .header-actions, header#header .header-inner' }]]), ['unframe'],
  ] },
  'CAP-S4PHONE': { question: 'S4: the section bottom handle in the phone view, a drag on it, and a click on it', steps: [
    ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'phone hovered', { sectionHandle: 2, section: 2 }], ['shot', 'hovered'],
    ['sectionDrag', 2, 90], ['read', 'phone 90 down', { section: 2 }], ['hover', 2], ['sectionDrag', 2, -150], ['read', 'phone 150 up', { section: 2 }],
    ['view', 'Desktop'], ['read', 'desktop after', { section: 2 }],
    ['exit'], ['enter'], ['hover', 2], ['read', 'desktop before click', { sectionHandle: 2, section: 2 }], ['sectionDrag', 2, 0], ['read', 'desktop after click', { sectionHandle: 2, section: 2, controls: true }],
  ] },
  'CAP-NORMALIZE': { question: 'R2, R3: which actions turn stretched rows back into uniform rows, and do start rows move?', steps: [
    ...[1, 2, 3].flatMap((n) => [['enter'], ['frame', 800, 900], ['read', `select ${n} before`, { section: 3, areas: 3 }], ['select', 3, 1], ['read', `select ${n} after`, { section: 3, areas: 3 }], ['exit']]),
    ['enter'], ['frame', 800, 900], ['drag', 3, 1, 'middle', 60, 0], ['read', 'dragged 60 right', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['select', 3, 1], ['hold', 3, 1, 'se', 2, 2], ['read', 'resize after', { section: 3, areas: 3 }], ['release', 'home'], ['read', 'resize dropped home', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['editText', 3, 1], ['read', 'edit start after', { section: 3, areas: 3 }], ['press', 'Escape'], ['read', 'edit left', { section: 3, areas: 3 }], ['exit'],
    ['enter'], ['frame', 800, 900], ['select', 3, 1], ['press', 'ArrowRight'], ['read', 'arrow key after', { section: 3, areas: 3 }], ['unframe'],
  ] },
  'CAP-SHAPEWIDE': { question: 'T6: where does the square sit when a shape block is wider, with Stretch off?', steps: [
    ['enter'], ...selectEdit(2, 2), ['clickIf', 'Design'], ['read', 'panel', { controls: true, checks: true, inside: [2, 2], block: [2, 2] }], ['shot', 'panel'], ['clickIf', 'Stretch'], ['read', 'stretch off', { inside: [2, 2], block: [2, 2], checks: true }], ['shot', 'off'],
  ] },
  'CAP-IMAGEMODS': { question: 'X7: an image resize with no modifier and with Shift', steps: [
    ['enter'], ['add', 2, 'Image'], ['hold', 2, 'new', 'se', 125, 75], ['read', 'plain held', { block: [2, 'new'] }], ['release'], ['read', 'plain dropped', { block: [2, 'new'] }],
    ['exit'], ['enter'], ['add', 2, 'Image'], ['hold', 2, 'new', 'se', 125, 75, ['Shift']], ['read', 'shift held', { block: [2, 'new'] }], ['release'], ['read', 'shift dropped', { block: [2, 'new'] }],
  ] },
  'CAP-UNDOSHORT': { question: 'Y2: does a pause under 300 ms split typing into two undo steps?', steps: [
    ...[100, 200].flatMap((ms) => [['enter'], ['editText', 2, 1], ['press', 'Meta+ArrowDown'], ['keys', 'one two'], ['pause', ms], ['keys', ' three four'], ['press', 'Escape'], ['undoWalk', `two bursts ${ms}ms apart`, 2, 1]]).flatMap((x, n, all) => (x[0] === 'enter' && n ? [['exit'], x] : [x])),
  ] },
  'CAP-SECTIONVIEWS': { question: 'S1: what does Edit Section offer on each layout?', steps: [
    ['enter'], ['panel', 2], ['read', 'desktop first tab', { controls: true, checks: true }], ['clickIf', 'Design'], ['read', 'desktop design', { controls: true, checks: true }], ['shot', 'desktop'], ['press', 'Escape'],
    ['view', 'Mobile'], ['panel', 2], ['read', 'phone first tab', { controls: true, checks: true }], ['clickIf', 'Design'], ['read', 'phone design', { controls: true, checks: true }], ['shot', 'phone'],
  ] },
  'CAP-CORNER': { question: 'T15: what does a block Corner do once Background is on?', steps: [
    ['enter'], ['pick', 2, 1], ['click', 'Edit'], ['click', 'Design'], ['click', 'Background'], ['read', 'background on', { block: [2, 1], inside: [2, 1], controls: true }], ['fillValue', '0px', '20'], ['read', 'corner 20', { block: [2, 1], inside: [2, 1], controls: true }], ['shot', 'corner'],
  ] },
  'CAP-HIDDENEYE': { question: 'L5: what does the eye in the Layers panel do on a hidden block?', steps: [
    ['enter'], ['rightClick', 2, 2], ['read', 'menu', { controls: true }], ['click', 'Hide on desktop'], ['read', 'hidden', { block: [2, 2], section: 2 }], ['hover', 3], ['hover', 2], ['read', 'section hovered', { controls: true }], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'layers', { controls: true, block: [2, 2], section: 2 }], ['shot', 'layers'], ['click', 'Display Block'], ['read', 'eye clicked', { controls: true, block: [2, 2], section: 2 }], ['shot', 'eye'],
  ] },
  'CAP-HELDNORMAL': { question: 'R2: do stretched rows normalize while a block is held, before the drop?', steps: [
    ['enter'], ['frame', 800, 900], ['read', 'before', { section: 3, areas: 3 }], ['holdRaw', 3, 1, 'middle', 60, 0], ['read', 'held 60 right', { section: 3, areas: 3, block: [3, 1] }], ['shot', 'held'], ['release', 'home'], ['read', 'dropped home', { section: 3, areas: 3 }], ['unframe'],
  ] },
  'CAP-BLANKSECTION': { question: 'U10: rows and gap of a blank section on desktop and phones', steps: [
    ['enter'], ['read', 'before', { sel: 'main#page .page-section' }], ['hover', 2], ['click', 'Add Section'], ['read', 'picker', { controls: true }], ['click', 'Add Blank'], ['read', 'added', { sel: 'main#page .page-section', section: 3 }], ['shot', 'desktop'], ['view', 'Mobile'], ['read', 'phone', { sel: 'main#page .page-section', section: 3 }], ['shot', 'phone'],
  ] },
  'CAP-BACKGROUND': { question: 'P5: controls and sizes of the section Background tab, and where Color Theme Editor goes. Never uploads.', steps: [
    ['enter'], ['panel', 2], ['click', 'Background'], ['read', 'background', { controls: true, thin: true }], ['shot', 'image'], ['clickIf', 'Video'], ['read', 'video', { controls: true }], ['shot', 'video'], ['clickIf', 'Art'], ['read', 'art', { controls: true }], ['shot', 'art'],
    ['click', 'Colors'], ['read', 'colors', { controls: true }], ['clickIf', 'Color Theme Editor'], ['read', 'theme editor', { controls: true }], ['shot', 'theme'],
  ] },
  'CAP-GROUPFORWARD': { question: 'X8: Move Forward on a group with a block between its members', steps: [
    ['enter'], ['read', 'before', { zs: 2 }], ['select', 2, 0], ['shiftClick', 2, 2], ['read', 'group', { zs: 2, controls: true }], ['shot', 'group'], ['click', 'Move Forward'], ['read', 'forward once', { zs: 2 }], ['clickIf', 'Move Forward'], ['read', 'forward twice', { zs: 2 }], ['clickIf', 'Move Backward'], ['read', 'backward once', { zs: 2 }],
  ] },
  'CAP-PHONELINES': { question: 'U9: the thin lines of the toolbars in the phone view. Reads only.', steps: [
    ['enter'], ['view', 'Mobile'], ['hover', 2], ['read', 'section hovered', { thin: true, controls: true, section: 2 }], ['shot', 'hovered'], ['select', 2, 2], ['read', 'shape selected', { thin: true, controls: true }], ['shot', 'selected'],
  ] },
  'CAP-LINEMIDDLE': { page: 'Gestures Probe', question: 'X6: what is under the pointer on a selected one-row Line, and which presses move it or grow it?', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['read', 'selected', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.1], [0.5, 0.9], [0.45, 0.5], [0.55, 0.5]]] }], ['shot', 'selected'],
    ['drag', 0, 'new', [0.25, 0.5], 0, 120], ['read', 'quarter across, 120 down', { block: [0, 'new'] }],
    ['press', 'Meta+z'], ['read', 'undone', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5]]] }],
    ['drag', 0, 'new', 'middle', 0, 120], ['read', 'middle, 120 down', { block: [0, 'new'] }],
    ['exit'], ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'not selected', { block: [0, 'new'], hit: [0, 'new', [[0.5, 0.5], [0.25, 0.5]]] }], ['drag', 0, 'new', 'middle', 0, 120], ['read', 'unselected middle, 120 down', { block: [0, 'new'] }],
  ] },
  'CAP-ORDER': { page: 'Gestures Probe', question: 'A2: how does DOM order follow a move on desktop and on phones?', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['add', 0, 'Line'], ['add', 0, 'Button'], ['read', 'three added', { areas: 0 }],
    ['drag', 0, 2, 'middle', 700, 300], ['read', 'third block far right and lower', { areas: 0 }], ['drag', 0, 0, 'middle', 0, 400], ['read', 'first block moved below', { areas: 0 }],
    ['view', 'Mobile'], ['read', 'phone view', { areas: 0 }], ['drag', 0, 0, 'middle', 0, 200], ['read', 'first in DOM moved down on phone', { areas: 0 }],
    ['view', 'Desktop'], ['read', 'back on desktop', { areas: 0 }],
  ] },
  'CAP-HIDETYPES': { page: 'Gestures Probe', question: 'L5: Hide on desktop and on mobile on other block types', steps: [
    ['enter'], ['blank'], ...['Image', 'Button', 'Line', 'Form'].flatMap((t) => [['add', 0, t], ['press', 'Escape'], ['rightClick', 0, 'new'], ['click', 'Hide on desktop'], ['read', `${t} hidden on desktop`, { block: [0, 'new'], section: 0 }], ['press', 'Meta+z'], ['rightClick', 0, 'new'], ['click', 'Hide on mobile'], ['read', `${t} hidden on mobile`, { block: [0, 'new'], section: 0 }], ['view', 'Mobile'], ['read', `${t} phone view`, { block: [0, 'new'], section: 0 }], ['view', 'Desktop'], ['press', 'Meta+z']]),
  ] },
  'CAP-S1OTHER': { page: 'Gestures Probe', question: 'S1: is any other section setting per layout? Change each on the phone and read desktop', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'start', { sections: true }], ['view', 'Mobile'], ['panel', 0], ['read', 'phone panel', { controls: true, sections: true }], ['shot', 'panel'],
    ['clickIf', 'L'], ['read', 'phone section L', { sections: true }], ['clickIf', 'Top'], ['read', 'phone top', { sections: true }], ['press', 'Escape'], ['view', 'Desktop'], ['read', 'desktop after', { sections: true }],
  ] },
  'CAP-STACK': { page: 'Gestures Probe', question: 'S3: Stack Blocks and what Stack Options offers', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['add', 0, 'Button'], ['press', 'Escape'], ['drag', 0, 1, 'middle', 0, 200], ['press', 'Escape'], ['select', 0, 0], ['shiftClick', 0, 1], ['read', 'group', { controls: true, areas: 0 }], ['click', 'Stack Blocks'], ['read', 'stacked', { controls: true, areas: 0 }], ['shot', 'stacked'], ['click', 'Stack Options'], ['read', 'options', { controls: true, checks: true }], ['shot', 'options'], ['read', 'vertical', { block: [0, 0], inside: [0, 0] }], ['click', 'Stack Horizontally'], ['read', 'horizontal', { block: [0, 0], inside: [0, 0], controls: true }], ['shot', 'horizontal'], ['click', 'Stack Vertically'], ['read', 'vertical again', { inside: [0, 0] }], ['click', 'Unstack'], ['read', 'unstacked', { areas: 0, controls: true }], ['shot', 'unstacked'],
  ] },
  'CAP-BLEND': { page: 'Gestures Probe', question: 'T15: Blend Mode and Corner on other block types', steps: [
    ['enter'], ['blank'], ...['Image', 'Button', 'Shape', 'Line', 'Form', 'Quote', 'Map', 'Social Links', 'Scrolling', 'Accordion', 'Video', 'Code'].flatMap((t) => [['add', 0, t], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', `${t} design`, { controls: true, checks: true, has: ['Blend Mode', 'Uniform corner radii', 'Background', 'Stroke', 'Blur'] }], ['shot', `${t}-design`], ['clickIf', 'Blend Mode'], ['read', `${t} blend menu`, { controls: true }], ['clickIf', 'Multiply'], ['read', `${t} multiply`, { block: [0, 'new'], inside: [0, 'new'] }], ['press', 'Escape'], ['press', 'Escape']]),
  ] },
  'CAP-ACCORDION': { page: 'Gestures Probe', question: 'T12: the accordion controls still dim in ours', steps: [
    ['enter'], ['blank'], ['add', 0, 'Accordion'], ['click', 'Edit'], ['read', 'content', { controls: true, checks: true }], ['shot', 'content'], ['clickIf', 'Design'], ['read', 'design', { controls: true, checks: true }], ['shot', 'design'], ['clickIf', 'Navigate to Title'], ['read', 'title view', { controls: true }], ['shot', 'title'], ['clickIf', 'Heading 4'], ['read', 'style menu', { controls: true }], ['shot', 'style'], ['clickIf', 'Heading 4'], ['clickIf', 'Back'], ['clickIf', 'Navigate to Description'], ['read', 'description view', { controls: true }], ['clickIf', 'Back'], ['clickIf', 'Navigate to Dividers'], ['read', 'dividers view', { controls: true }], ['shot', 'dividers'], ['clickIf', 'Back'], ['clickIf', 'Plus'], ['read', 'icon menu', { controls: true }], ['shot', 'icon'],
  ] },
  'CAP-ACCORDION2': { page: 'Gestures Probe', question: 'T12: the reorder grip and the more button of Icon Size', steps: [
    ['enter'], ['blank'], ['add', 0, 'Accordion'], ['click', 'Edit'], ['read', 'before', { controls: true, html: [0, 'new'] }], ['dragAt', 595, 391, 595, 520], ['read', 'first dragged below third', { controls: true, html: [0, 'new'] }], ['shot', 'grip'],
    ['clickIf', 'Design'], ['clickAt', 845, 784], ['read', 'more', { controls: true }], ['shot', 'more'],
  ] },
  'CAP-SYNTHCLIP': { page: 'Gestures Probe', question: 'U11, Y4: does the editor take copy and paste events carrying our own DataTransfer? No key presses, nothing reaches the machine clipboard', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['blank'], ['add', 1, 'Line'], ['press', 'Escape'], ['stubClipboard'], ['read', 'before', { areas: 0, clip: true }],
    ['select', 0, 0], ['synthClip', 'copy'], ['read', 'copy in the frame', { clip: true, areas: 0 }], ['synthClip', 'copy', 'top'], ['read', 'copy in the top window', { clip: true, areas: 0 }],
    ['synthClip', 'paste'], ['read', 'paste in the frame', { clip: true, areas: 0 }], ['synthClip', 'paste', 'top'], ['read', 'paste in the top window', { clip: true, areas: 0 }],
    ['press', 'Escape'], ['select', 1, 0], ['synthClip', 'paste'], ['read', 'paste in another section', { clip: true, areas: 1 }], ['synthClip', 'paste', 'top'], ['read', 'paste in another section, top', { clip: true, areas: 1 }],
  ] },
  'CAP-P3FIELD': { page: 'Gestures Probe', question: 'P3: the custom height field above 1000, with a negative number and words, and the slider while held', steps: [
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['read', 'custom', { section: 0, sections: true, range: true }],
    ...['abc', '-1', '7', '12.5'].flatMap((v) => [['typeAt', 1542, 526, v], ['read', `real keys "${v}"`, { section: 0, sections: true, range: true }]]),
    ...['12.5', '12abc', 'abc', '-1', '-5', '', '0', '200'].flatMap((v) => [['fillRange', v], ['read', `typed "${v}"`, { section: 0, sections: true, range: true }]]),
    ['fillRange', '50'], ['read', 'back at 50', { section: 0, sections: true, range: true }],
    ['holdAt', 1397, 526], ['read', 'slider held', { section: 0, sections: true, range: true }], ['moveAt', 1440, 526], ['read', 'slider moved right, held', { section: 0, sections: true, range: true }], ['moveAt', 1340, 526], ['read', 'slider moved left, held', { section: 0, sections: true, range: true }], ['releaseAt'], ['read', 'slider let go', { section: 0, sections: true, range: true }],
    ...['300', '400', '600', '800', '1000', '1001', '5000', '100000'].flatMap((v) => [['fillRange', v], ['read', `typed "${v}"`, { section: 0, sections: true, range: true }], ['press', 'Escape'], ['panel', 0]]),
    ['read', 'panel after 100000', { section: 0, sections: true, range: true }], ['shot', 'after'],
  ] },
  'CAP-L6PHONE': { page: 'Gestures Probe', question: 'L6: Scale, Offset and Skew set on a phone, read on desktop', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop start', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'], controls: true }], ['shot', 'start'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }],
    ['fillRow', 'Scale', 0, '150'], ['fillRow', 'Scale', 1, '80'], ['fillRow', 'Offset', 0, '20'], ['fillRow', 'Offset', 1, '30'], ['fillRow', 'Skew', 0, '10'], ['fillRow', 'Skew', 1, '5'], ['read', 'phone set', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }], ['shot', 'phoneset'], ['press', 'Escape'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone set', { rows: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'], style: [0, 'new'] }],
  ] },
  'CAP-T6RANGE': { page: 'Gestures Probe', question: 'T6: where the three-dot stroke range ends, and what the Reset under Stroke Color is called. A Reset whose label names a theme is read, never pressed.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 4], ['read', 'dots open', { range: true, parts: ['Thickness'], style: [0, 'new'] }], ['shot', 'dots'],
    ...['100', '500', '1000', '0', '-5', '3.5', '20'].flatMap((v) => [['fillRange', v], ['read', `typed ${v}`, { range: true, style: [0, 'new'] }]]),
    ['pressNamed', 'Stroke Color'], ['read', 'stroke color open', { boxes: ['Custom color', 'Color #B564F7'], has: ['Reset to theme', 'Reset'], style: [0, 'new'] }], ['shot', 'popup'],
    ['pressNamed', 'Color #B564F7'], ['read', 'stroke color picked', { controls: true, boxes: ['Custom color'], has: ['Reset to theme', 'Reset'], style: [0, 'new'] }], ['shot', 'picked'],
  ] },
  'CAP-L6RESET': { page: 'Gestures Probe', question: 'L6: Reset to default value, by field, on a block made in this session: focused, not focused, desktop and phone', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'],
    ['read', 'at default', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Rotate', 0, '30'], ['read', 'desktop 30, focused', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'focused'], ['pressReset', 'Rotate', 0], ['read', 'desktop reset, focused', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Scale', 0, '150'], ['fillRow', 'Scale', 1, '80'], ['read', 'scale Y focused', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['pressReset', 'Scale', 1], ['read', 'desktop scale Y reset', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 1, '80'], ['fillRow', 'Offset', 0, '10'], ['clickIf', 'Design'], ['read', 'blurred, mouse elsewhere', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['hoverRow', 'Rotate', 0], ['read', 'blurred, hovered', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'hovered'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
    ['fillRow', 'Rotate', 0, '45'], ['read', 'phone rotate 45', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['pressReset', 'Rotate', 0], ['read', 'phone rotate reset', { reset: ['Rotate', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'phone-rotate'],
    ['fillRow', 'Scale', 1, '50'], ['pressReset', 'Scale', 1], ['read', 'phone scale Y reset', { reset: ['Scale', 1], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Offset', 0, '20'], ['pressReset', 'Offset', 0], ['read', 'phone offset reset', { reset: ['Offset', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['fillRow', 'Skew', 0, '5'], ['pressReset', 'Skew', 0], ['read', 'phone skew reset, no desktop value', { reset: ['Skew', 0], ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone resets', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone after desktop look', { rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] }],
  ] },
  'CAP-L6PHONE2': { page: 'Gestures Probe', question: 'L6: Anchor, Stroke thickness and Corner set on a phone, and desktop values of Scale, Offset, Skew, Anchor, Thickness and Corner flowing to the phone', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { style: [0, 'new'] }],
    ['fillValue', '0px', '12'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 1], ['scrollTo', 'Anchor'], ['pressNamed', 'Position'], ['pressNamed', 'Top Left'], ['pressNamed', 'Position'], ['clickIf', 'Design'], ['read', 'phone set', { style: [0, 'new'], leaves: ['Anchor', 'Rotate', 'Scale', 'Stroke', 'Thickness'] }], ['moveAfter', 'Animation'], ['read', 'phone icon hovered', { controls: true, thin: true }], ['shot', 'phone-icon'], ['scrollTo', 'Shape style'], ['read', 'phone corner', { controls: true, leaves: ['Stretch', 'Color', 'Stroke'] }], ['shot', 'phone-set'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone set', { style: [0, 'new'], controls: true }], ['shot', 'desktop-after'],
    ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillValue', '0px', '8'], ['pressNamed', 'Solid Stroke'], ['scrollTo', 'Thickness'], ['pressPart', 'Thickness', 3], ['fillRow', 'Scale', 0, '120'], ['fillRow', 'Offset', 0, '5'], ['fillRow', 'Skew', 0, '3'], ['scrollTo', 'Anchor'], ['pressNamed', 'Position'], ['pressNamed', 'Bottom Right'], ['read', 'desktop second', { controls: true, ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'desktop-second'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone second flows', { controls: true, ...{ rows: ['Rotate', 'Scale', 'Offset', 'Skew'], style: [0, 'new'] } }], ['shot', 'phone-second'],
  ] },
  'CAP-T6STRETCH': { page: 'Gestures Probe', question: 'T6: Stretch off, the box of each of the 29 shapes in a 341.7 by 235.6 block', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressPart', 'Stretch', 1], ['read', 'stretch off', { parts: ['Stretch'], shape: [0, 'new'] }],
    ...["Rectangle","Circle","Triangle","Diamond","Rabbet","Eight Sided Shield","TV","Octagon","Rounded Pentagon","Gear","Four Point Star","Open Book","Pointed Star","Stepped Cross","Rounded Star","Flower","Four Petal Flower","Four Leaf Clover","Horizontal Stacked Circles","Wide Vertical Stacked Pills","Horizontal Right Leaning Oval","Parallelogram","Arched Window","Pointed Window","Award","Narrow Pow","Egg","Hourglass","Keystone"].flatMap((n) => [['pressAfter', 'Shape style'], ['pressNamed', n], ['read', n, { shape: [0, 'new'] }]]), ['shot', 'last'],
  ] },
  'CAP-T6PLACE': { page: 'Gestures Probe', question: 'T6: where the shape picker and the color popup sit, at a few block places', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'left picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'left popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'middle picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'middle popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'middle'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'right picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'right popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'right'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', -1000, 500], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressAfter', 'Shape style'], ['read', 'low picker', { boxes: ['Circle'], has: ['Design'] }], ['pressNamed', 'Rectangle'], ['pressNamed', 'Color'], ['read', 'low popup', { boxes: ['Custom color', 'Design'], block: [0, 'new'], areas: 0 }], ['pressNamed', 'Color'], ['shot', 'low'],
  ] },
  'CAP-T6LAYOUT': { page: 'Gestures Probe', question: 'T6: a stroke and a color per layout on a Shape, set on the phone, read on desktop, and desktop values flowing down', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone start', { style: [0, 'new'], leaves: ['Color', 'Stroke Color'] }],
    ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['pressNamed', 'Stroke Color'], ['read', 'phone set', { style: [0, 'new'], leaves: ['Color', 'Stroke', 'Stroke Color'] }], ['shot', 'phone-set'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone', { icon: true, style: [0, 'new'] }],
    ['pressNamed', 'Color'], ['pressNamed', 'Color #F2B8B4'], ['pressNamed', 'Color'], ['pressNamed', 'Dashed Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #000000'], ['pressNamed', 'Stroke Color'], ['read', 'desktop set', { style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone keeps its own', { style: [0, 'new'] }],
    ['view', 'Desktop'], ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['pressNamed', 'Stroke Color'], ['read', 'second, desktop', { style: [0, 'new'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'second, phone flows', { style: [0, 'new'], leaves: ['Color', 'Stroke', 'Stroke Color'] }],
  ] },
  'CAP-T6THEME': { page: 'Gestures Probe', question: "T6: a section theme's own shape color, read on a new Shape, with and without a picked color", steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['pressNamed', 'Solid Stroke'], ['press', 'Escape'], ['deselect', 0],
    ['read', 'theme at start', { style: [0, 0], section: 0 }], ['read', 'second at start', { style: [0, 1] }], ['hover', 0], ['panel', 0], ['click', 'Colors'], ['read', 'colors tab', { controls: true }], ['shot', 'colors'],
    ...['Lightest 1', 'Lightest 2', 'Light 1', 'Light 2', 'Bright 1', 'Bright 2', 'Dark 1', 'Dark 2', 'Darkest 1', 'Darkest 2'].flatMap((n) => [['scrollTo', n], ['pressNamed', n], ['read', `${n}: plain`, { style: [0, 0] }], ['read', `${n}: picked`, { style: [0, 1] }]]), ['shot', 'themed'],
  ] },
  'CAP-T6RESET': { page: 'Gestures Probe', question: 'T6: Reset to theme under Stroke Color and Color, on a Shape made in this session: at the start theme, on Dark 1, and on a phone', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Solid Stroke'], ['read', 'start start', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['read', 'start stroke picked', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['shot', 'start-picked'], ['pressNamed', 'Reset to theme'], ['read', 'start stroke reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['shot', 'start-reset'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['read', 'start color picked', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Reset to theme'], ['read', 'start color reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Color'],
    ['press', 'Escape'], ['deselect', 0], ['hover', 0], ['panel', 0], ['click', 'Colors'], ['scrollTo', 'Dark 1'], ['pressNamed', 'Dark 1'], ['press', 'Escape'], ['deselect', 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Solid Stroke'], ['read', 'dark start', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['read', 'dark stroke picked', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['shot', 'dark-picked'], ['pressNamed', 'Reset to theme'], ['read', 'dark stroke reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['shot', 'dark-reset'], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['read', 'dark color picked', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Reset to theme'], ['read', 'dark color reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Color'],
    ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #B564F7'], ['pressNamed', 'Stroke Color'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone flows', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Stroke Color'], ['pressNamed', 'Color #FFCF5A'], ['read', 'phone own', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['pressNamed', 'Reset to theme'], ['read', 'phone reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }], ['shot', 'phone-reset'], ['pressNamed', 'Stroke Color'], ['read', 'phone marks', { leaves: ['Stroke Color', 'Stroke'] }],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone reset', { style: [0, 'new'], has: ['Reset to theme', 'Opacity slider'] }],
  ] },
  'CAP-L6PHONEBTN': { page: 'Gestures Probe', question: 'L6: the phone-only button right of the Animation tab, pressed on a Shape made in this session', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 0, '120'], ['clickIf', 'Design'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone, no own values', { afterBtn: 'Animation', style: [0, 'new'], areas: 0 }], ['shot', 'grey'],
    ['pressAfter', 'Animation'], ['read', 'pressed with none', { afterBtn: 'Animation', style: [0, 'new'], areas: 0, controls: true }], ['shot', 'grey-pressed'],
    ['press', 'Escape'], ['drag', 0, 'new', 'middle', 0, 80], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'moved only', { afterBtn: 'Animation', areas: 0 }],
    ['fillRow', 'Rotate', 0, '45'], ['fillRow', 'Offset', 0, '20'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['clickIf', 'Design'], ['read', 'phone own values', { afterBtn: 'Animation', style: [0, 'new'], areas: 0, rows: ['Rotate', 'Scale', 'Offset'], leaves: ['Rotate', 'Offset', 'Stroke', 'Color'] }], ['shot', 'dark'],
    ['read', 'phone moved', { afterBtn: 'Animation', areas: 0 }],
    ['pressAfter', 'Animation'], ['read', 'pressed', { afterBtn: 'Animation', style: [0, 'new'], areas: 0, rows: ['Rotate', 'Scale', 'Offset'], leaves: ['Rotate', 'Offset', 'Stroke', 'Color'], controls: true }], ['shot', 'pressed'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after', { style: [0, 'new'], areas: 0, rows: ['Rotate', 'Scale', 'Offset'] }],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone after', { afterBtn: 'Animation', style: [0, 'new'], areas: 0, rows: ['Rotate', 'Scale', 'Offset'] }],
  ] },
  'CAP-L6RESETALL': { page: 'Gestures Probe', question: 'L6: Reset all overrides in the phone button menu, on two Shapes made in this session', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '10'], ['press', 'Escape'], ['deselect', 0], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 0, '120'], ['clickIf', 'Design'], ['view', 'Mobile'], ['select', 0, 0], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '15'], ['clickIf', 'Design'], ['press', 'Escape'], ['deselect', 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '45'], ['fillRow', 'Offset', 0, '20'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['clickIf', 'Design'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 0, 80], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'before', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, afterBtn: 'Animation', leaves: ['Rotate', 'Offset', 'Stroke', 'Color'] }], ['read', 'other block before', { style: [0, 0] }], ['pressAfter', 'Animation'], ['read', 'menu', { boxes: ['Reset all overrides', 'Push to desktop', 'Go to desktop'] }], ['pressNamed', 'Reset all overrides'], ['read', 'after reset', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, afterBtn: 'Animation', leaves: ['Rotate', 'Offset', 'Stroke', 'Color'], controls: true }], ['read', 'other block after reset', { style: [0, 0] }], ['shot', 'after-reset'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0 }],
  ] },
  'CAP-L6PUSH': { page: 'Gestures Probe', question: 'L6: Push to desktop in the phone button menu, on two Shapes made in this session', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '10'], ['press', 'Escape'], ['deselect', 0], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 0, '120'], ['clickIf', 'Design'], ['view', 'Mobile'], ['select', 0, 0], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '15'], ['clickIf', 'Design'], ['press', 'Escape'], ['deselect', 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '45'], ['fillRow', 'Offset', 0, '20'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['clickIf', 'Design'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 0, 80], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'before', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, afterBtn: 'Animation', leaves: ['Rotate', 'Offset', 'Stroke', 'Color'] }], ['read', 'other block before', { style: [0, 0] }], ['pressAfter', 'Animation'], ['pressNamed', 'Push to desktop'], ['read', 'after push', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, afterBtn: 'Animation', leaves: ['Rotate', 'Offset', 'Stroke', 'Color'], controls: true }], ['read', 'other block after push', { style: [0, 0] }], ['shot', 'after-push'],
    ['view', 'Desktop'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0 }], ['read', 'other block desktop', { style: [0, 0] }],
  ] },
  'CAP-L6GOTO': { page: 'Gestures Probe', question: 'L6: Go to desktop in the phone button menu, on a Shape made in this session', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '10'], ['press', 'Escape'], ['deselect', 0], ['add', 0, 'Shape'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '30'], ['fillRow', 'Scale', 0, '120'], ['clickIf', 'Design'], ['view', 'Mobile'], ['select', 0, 0], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '15'], ['clickIf', 'Design'], ['press', 'Escape'], ['deselect', 0], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['fillRow', 'Rotate', 0, '45'], ['fillRow', 'Offset', 0, '20'], ['pressNamed', 'Solid Stroke'], ['pressNamed', 'Color'], ['pressNamed', 'Color #FFCF5A'], ['pressNamed', 'Color'], ['clickIf', 'Design'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 0, 80], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'before', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, afterBtn: 'Animation', leaves: ['Rotate', 'Offset', 'Stroke', 'Color'] }], ['read', 'other block before', { style: [0, 0] }], ['pressAfter', 'Animation'], ['pressNamed', 'Go to desktop'], ['read', 'after go', { rows: ['Rotate', 'Scale', 'Offset'], style: [0, 'new'], areas: 0, controls: true }], ['shot', 'after-go'],
  ] },
  'CAP-T5HANDLES': { page: 'Gestures Probe', question: 'T5: the w and n handles on a Fit button, the 3 column stop on w, and the phone least size', steps: [
    ['enter'], ['blank'], ['add', 0, 'Button'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['click', 'Fit'], ['press', 'Escape'], ['read', 'fit start', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }],
    ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, 164.4], ['read', 'room below 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', 'n down 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', 'n down 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', 'n down 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', 'n down 4', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', 'n down 5', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, -41.1], ['read', 'n up 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, -41.1], ['read', 'n up 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }],
    ['select', 0, 'new'], ['drag', 0, 'new', 'w', 58.78, 0], ['read', 'w right 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', 58.78, 0], ['read', 'w right 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', 58.78, 0], ['read', 'w right 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', 58.78, 0], ['read', 'w right 4', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', 58.78, 0], ['read', 'w right 5', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', -58.78, 0], ['read', 'w left 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'w', -58.78, 0], ['read', 'w left 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['shot', 'fit-w'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['read', 'phone start', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }],
    ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 4', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 5', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 6', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 7', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['shot', 'phone-e'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone s up 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone s up 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone s up 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone s up 4', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone s up 5', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['shot', 'phone-s'],
    ['clickIf', 'Edit'], ['clickIf', 'Design'], ['click', 'Fit'], ['press', 'Escape'], ['read', 'phone fit', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 47, 0], ['read', 'phone fit e out 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 47, 0], ['read', 'phone fit e out 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone fit e in 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone fit e in 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone fit e in 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone fit e in 4', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone fit s up 1', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone fit s up 2', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'phone fit s up 3', { areas: 0, inside: [0, 'new'], block: [0, 'new'] }], ['shot', 'phone-fit'],
  ] },
  'CAP-T5PHONE': { page: 'Gestures Probe', question: 'T5: the phone least size of a Fill button, and which container shows at which frame width once the phone has its own', steps: [
    ['enter'], ['blank'], ['add', 0, 'Button'], ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['click', 'Fit'], ['click', 'Fill'], ['press', 'Escape'], ['read', 'phone fill', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }],
    ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 1', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 2', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 3', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 4', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 5', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 6', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 7', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'fill e in 8', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'fill s up 1', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'fill s up 2', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'fill s up 3', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }], ['shot', 'fill-least'],
    ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['click', 'Fit'], ['click', 'Align Right'], ['press', 'Escape'], ['read', 'phone fit right', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }],
    ['view', 'Desktop'], ['press', 'Escape'], ['read', 'desktop', { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }],
    ...[900, 768, 767, 640, 428].flatMap((w) => [['frame', w, 900], ['read', `frame ${w}`, { areas: 0, block: [0, 'new'], sel: '.sqs-block-button-container, .sqs-block-button-element' }]]), ['shot', 'framed'], ['unframe'],
  ] },
  'CAP-T11ZOOM': { page: 'Gestures Probe', question: 'T11: typing anything but a whole number in Map Zoom. The address fields are not touched.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Map'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'start', { parts: ['Zoom'] }],
    ...["5","2.5","12.5","abc","","-1","99","0.3","1.2","12"].flatMap((v) => [['fillRow', 'Zoom', 0, v], ['read', `typed "${v}"`, { parts: ['Zoom'], sel: 'iframe, .sqs-block-map, [data-block-json]' }]]),
    ['fillRow', 'Zoom', 0, '2.5'], ['read', 'typed "2.5" again', { parts: ['Zoom'] }], ['pressNamed', 'increment'], ['read', 'increment from 2.5', { parts: ['Zoom'] }], ['pressNamed', 'decrement'], ['pressNamed', 'decrement'], ['read', 'decrement twice', { parts: ['Zoom'] }], ['shot', 'zoom'],
  ] },
  'CAP-T11SOCIAL': { page: 'Gestures Probe', question: "T11: a social block's rows through a handle pull, and a phone's Style and Thickness against a later desktop press. No press on the rows.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Social Links'], ['press', 'Escape'], ['read', 'start', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }],
    ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, 41.1], ['read', 's down 1', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, 41.1], ['read', 's down 2', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in 1', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in 2', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in 3', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in 4', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in 5', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'narrow'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'narrow s up 1', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 58.78, 0], ['read', 'e out 1', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 58.78, 0], ['read', 'e out 2', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 58.78, 0], ['read', 'e out 3', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }],
    ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 's up 1 row left', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'one-row'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['read', 'phone start', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 1', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 2', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 3', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 4', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 5', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 6', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -47, 0], ['read', 'phone e in 7', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'phone-narrow'],
    ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['pressNamed', 'Square'], ['pressNamed', 'Outline'], ['fillRow', 'Thickness', 0, '4'], ['read', 'phone Square Outline', { icon: true, rows: ['Thickness'], controls: true, parts: ['Style', 'STYLE', 'Thickness', 'THICKNESS'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'phone-style'],
    ['view', 'Desktop'], ['deselect', 0], ['drag', 0, 'new', 's', 0, 41.1], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'desktop after phone', { controls: true, sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['pressNamed', 'Circle'], ['pressNamed', 'Outline'], ['fillRow', 'Thickness', 0, '1'], ['read', 'desktop Circle Outline 1', { icon: true, rows: ['Thickness'], controls: true, block: [0, 'new'] }], ['pressNamed', 'Solid'], ['read', 'desktop Circle Solid', { icon: true, controls: true, sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'desktop-style'],
    ['view', 'Mobile'], ['select', 0, 'new'], ['clickIf', 'Edit'], ['clickIf', 'Design'], ['read', 'phone after desktop press', { icon: true, rows: ['Thickness'], controls: true, sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['shot', 'phone-after'],
  ] },
  'CAP-T11SOCROW': { page: 'Gestures Probe', question: 'T11: a social block pulled to 1 row, and whether a click on its middle still selects it', steps: [
    ['enter'], ['blank'], ['add', 0, 'Social Links'], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'one row', { areas: 0, block: [0, 'new'], sel: '.sqs-svg-icon--outer, .sqs-svg-icon--wrapper' }], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -41.1], ['read', 'pulled again', { areas: 0, block: [0, 'new'] }],
    ['press', 'Escape'], ['deselect', 0], ['select', 0, 'new'], ['read', 'click on the middle', { has: ['Edit'], block: [0, 'new'] }], ['shot', 'clicked'],
    ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in at one row', { areas: 0, block: [0, 'new'] }], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -58.78, 0], ['read', 'e in again', { areas: 0, block: [0, 'new'] }], ['select', 0, 'new'], ['read', 'selected again', { has: ['Edit'], block: [0, 'new'] }], ['shot', 'after-e'], ['drag', 0, 'new', 's', 0, 41.1], ['read', 's down from one row', { areas: 0, block: [0, 'new'] }], ['select', 0, 'new'], ['clickIf', 'Edit'], ['read', 'panel', { has: ['Design', 'Content'] }],
  ] },
  'CAP-T7TIP': { page: 'Gestures Probe', question: 'T7: the ? by Video Storage, by hover, by press, and how it closes', steps: [
    ['enter'], ['blank'], ['add', 0, 'Video'], ['pause', 1000], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 1000], ['scrollTo', 'Video Storage'], ['read', 'start', { has: ['Open storage dialog'], textBox: ['Your plan includes'] }],
    ['moveIcon', 'Video Storage'], ['pause', 800], ['read', 'hover', { textBox: ['Your plan includes'] }], ['shot', 'hover'],
    ['pressNamed', 'Open storage dialog'], ['pause', 800], ['read', 'pressed', { textBox: ['Your plan includes'], has: ['Learn more'] }], ['shot', 'pressed'],
    ['press', 'Escape'], ['pause', 800], ['read', 'after Escape', { textBox: ['Your plan includes'], has: ['Open storage dialog'] }], ['shot', 'escape'],
  ] },
  'CAP-T7CORNER': { page: 'Gestures Probe', question: 'T7: Corner on a video block with no video', steps: [
    ['enter'], ['blank'], ['add', 0, 'Video'], ['pause', 1000], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 800], ['clickIf', 'Design'], ['pause', 600], ['read', 'start', { rows: ['Corner'], controls: true, radii: [0, 'new'], block: [0, 'new'], areas: 0 }], ['shot', 'start'],
    ['fillRow', 'Corner', 0, '20'], ['press', 'Tab'], ['pause', 800], ['read', 'corner 20', { rows: ['Corner'], radii: [0, 'new'], block: [0, 'new'], areas: 0 }], ['shot', 'corner20'],
    ['deselect', 0], ['pause', 400], ['shot', 'deselected'],
  ] },
  'CAP-T7SETTINGS': { page: 'Gestures Probe', question: "T7: the player's Settings button in preview, on the template's video with Player controls All. Three unnamed presses add the section: its button, Intro, the first tile. One unnamed press on the video pauses it.", steps: [
    ['enter'], ['pause', 1500], ['clickAt', 800, 312], ['pause', 1500], ['clickAt', 228, 273], ['pause', 1500], ['clickAt', 745, 340], ['pause', 7000], ['select', 0, 1], ['clickIf', 'Edit'], ['pause', 1500], ['scrollTo', 'Player controls'], ['read', 'edit mode', { frameEls: '.plyr__controls, .plyr__controls button' }],
    ['pressNamed', 'Minimal'], ['pressNamed', 'All'], ['pause', 1200], ['press', 'Escape'], ['deselect', 0], ['click', 'Toggle preview mode'], ['pause', 2500],
    ['moveFrame', '.plyr__controls button[data-plyr=settings]'], ['read', 'playing, mouse over', { frameEls: '.plyr__controls, .plyr__controls button' }],
    ['clickAt', 800, 516], ['pause', 1500], ['read', 'paused', { frameEls: '.plyr__controls, .plyr__controls button, .plyr__control--overlaid' }], ['shot', 'paused'],
    ['pressFrame', '.plyr__controls button[data-plyr=settings]'], ['pause', 700], ['read', 'settings open', { frameEls: '.plyr__menu__container, .plyr__menu__container button, [data-plyr=settings]' }], ['shot', 'settings'],
    ['pressFrame', '.plyr__menu__container button'], ['pause', 700], ['read', 'speed open', { frameEls: '.plyr__menu__container, .plyr__menu__container button' }], ['shot', 'speed'],
    ['press', 'Escape'], ['pause', 500], ['read', 'after Escape', { frameEls: '.plyr__menu__container, [data-plyr=settings]' }], ['click', 'Toggle preview mode'], ['pause', 2500], ['read', 'back', { has: ['Exit', 'Save'] }],
  ] },
  'CAP-T10ROWS': { page: 'Gestures Probe', question: "T10: a code block's rows after more line counts, up and then down", steps: [
    ['enter'], ['blank'], ['add', 0, 'Code'], ['pause', 800], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 1000], ['read', 'start', { areas: 0, frameEls: '.sqs-code-container' }],
    ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 20, 25, 30, 25, 20, 14, 12, 8, 7, 6, 5, 3, 1].flatMap((n, i) => [['setCode', codeLines(n)], ['read', `step ${i} ${n} lines`, { areas: 0, frameEls: '.sqs-code-container' }]]),
  ] },
  'CAP-T10PULL': { page: 'Gestures Probe', question: "T10: a code block's rows after a real mouse pull, and on the phone", steps: [
    ['enter'], ['blank'], ['add', 0, 'Code'], ['pause', 800], ['select', 0, 'new'], ['read', 'start', { areas: 0 }], ['drag', 0, 'new', 's', 0, 164.4], ['read', 'pulled 4 rows taller', { areas: 0 }],
    ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 800], ...[3, 1, 12, 1].flatMap((n, i) => [['setCode', codeLines(n)], ['read', `tall step ${i + 1}, ${n} lines`, { areas: 0, frameEls: '.sqs-code-container' }]]),
    ['setCode', codeLines(12)], ['read', '12 lines', { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -123.3], ['read', 'pull 3 up with 12 lines', { areas: 0 }], ['shot', 'pull-up'],
    ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 800], ['setCode', codeLines(13)], ['read', '13 after pull up', { areas: 0 }], ['setCode', codeLines(12)], ['read', '12 again', { areas: 0 }], ['setCode', codeLines(2)], ['read', '2 lines', { areas: 0 }], ['press', 'Escape'],
    ['view', 'Mobile'], ['read', 'phone start', { areas: 0 }], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 800], ['read', 'phone panel', { panelEls: '.cm-content', frameEls: '.sqs-code-container' }], ['shot', 'phone-panel'],
    ...[6, 20, 2].flatMap((n) => [['setCode', codeLines(n)], ['read', `phone ${n} lines`, { areas: 0, frameEls: '.sqs-code-container' }]]),
    ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, 164.4], ['read', 'phone pulled', { areas: 0 }], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 800], ['setCode', codeLines(1)], ['read', 'phone pulled 1 line', { areas: 0 }],
    ['press', 'Escape'], ['view', 'Desktop'], ['read', 'back on desktop', { areas: 0 }],
  ] },
  'CAP-T10DOWN': { page: 'Gestures Probe', question: "T10: a code block's rows from 12 lines down to each smaller count and back, with a longer wait, and one line-by-line walk down", steps: [
    ['enter'], ['blank'], ['add', 0, 'Code'], ['pause', 800], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 1000],
    ...[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].flatMap((n) => [['setCode', codeLines(12)], ['pause', 1500], ['read', `at 12 before ${n}`, { areas: 0 }], ['setCode', codeLines(n)], ['pause', 1500], ['read', `12 to ${n}`, { areas: 0, frameEls: '.sqs-code-container' }]]),
    ['setCode', codeLines(12)], ['pause', 1500], ...[11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].flatMap((n) => [['setCode', codeLines(n)], ['pause', 1500], ['read', `walk ${n}`, { areas: 0 }]]),
  ] },
  'CAP-T10EMBED': { page: 'Gestures Probe', question: "T10: an embed's rows after a first snippet of several lengths, the same snippet again, then a walk, a pull and the phone", steps: [
    ['enter'], ['blank'],
    ...[1, 2, 3, 4, 6, 8, 10, 14].flatMap((n) => [['add', 0, 'Embed'], ['pause', 800], ['select', 0, 'new'], ['read', `fresh for ${n}`, { block: [0, 'new'], frameEls: '.sqs-embed-container' }], ['clickIf', 'Edit'], ['pause', 800], ['pressNamed', 'Code Snippet'], ['pause', 400], ['pressNamed', 'Navigate to Embed data'], ['pause', 700], ['setCode', codeLines(n)], ['pause', 800], ['read', `first snippet ${n}`, { block: [0, 'new'], frameEls: '.sqs-embed-container' }], ['setCode', codeLines(n) + ' '], ['pause', 800], ['read', `same again ${n}`, { block: [0, 'new'] }], ['setCode', codeLines(n) + '  '], ['pause', 800], ['read', `third time ${n}`, { block: [0, 'new'] }], ['press', 'Escape'], ['deselect', 0], ['pause', 300]]),
  ] },
  'CAP-T10VIEW': { page: 'Gestures Probe', question: "T10: Mode and Display Source Code in the Code Editor view. One unnamed press opens Mode's list at its place in the view.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Code'], ['pause', 800], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 1000], ['setCode', codeLines(3)],
    ['read', 'panel start', { checks: true, htmlOf: '.sqs-code-container', areas: 0 }], ['clickIf', 'Expand'], ['pause', 900], ['clickAt', 585, 306], ['pause', 500], ['read', 'mode list', { controls: true }], ['shot', 'mode-list'],
    ['pressNamed', 'CSS'], ['pause', 700], ['read', 'view on CSS', { checks: true, htmlOf: '.sqs-code-container', areas: 0, panelEls: '.cm-content' }], ['shot', 'view-css'], ['clickIf', 'Close'], ['pause', 900], ['read', 'closed on CSS', { checks: true, htmlOf: '.sqs-code-container', areas: 0, panelEls: '.cm-content' }], ['shot', 'closed-css'],
    ['clickIf', 'Expand'], ['pause', 900], ['clickAt', 585, 306], ['pause', 500], ['pressNamed', 'Markdown'], ['pause', 700], ['read', 'view on Markdown', { checks: true, htmlOf: '.sqs-code-container' }], ['shot', 'view-md'], ['clickIf', 'Close'], ['pause', 900], ['read', 'closed on Markdown', { checks: true, htmlOf: '.sqs-code-container', areas: 0 }],
    ['clickIf', 'Expand'], ['pause', 900], ['clickAt', 585, 306], ['pause', 500], ['pressNamed', 'HTML'], ['pause', 700], ['read', 'view on HTML', { checks: true }], ['clickAt', 1203, 311], ['pause', 600], ['read', 'switch off in view', { checks: true, htmlOf: '.sqs-code-container', areas: 0 }], ['shot', 'view-switch'], ['clickIf', 'Close'], ['pause', 900], ['read', 'closed, switch off', { checks: true, htmlOf: '.sqs-code-container', areas: 0, frameEls: '.sqs-code-container, .sqs-code-container pre' }], ['shot', 'closed-switch'],
  ] },
  'CAP-T10MD': { page: 'Gestures Probe', question: 'T10: what a new Markdown block makes of each kind of syntax', steps: [
    ['enter'], ['blank'], ['add', 0, 'Markdown'], ['pause', 800], ['select', 0, 'new'], ['clickIf', 'Edit'], ['pause', 1000], ['read', 'start', { checks: true, htmlOf: '.sqs-block-markdown .sqs-block-content', panelEls: '.cm-content', areas: 0 }], ['shot', 'start'],
    ...Object.entries({
      headings: '# h1\n## h2\n### h3\n#### h4\n##### h5\n###### h6\n####### h7', setext: 'one\n===\n\ntwo\n---',
      paragraphs: 'a\nb\n\nc', hardBreak: 'a  \nb', emphasis: '*a* _b_ **c** __d__ ***e*** ~~f~~ `g`', escapes: '\\*a\\* &amp; &copy; < >',
      bullets: '- a\n- b\n  - c\n* d\n+ e', numbers: '1. a\n2. b\n3) c\n\n5. d', task: '- [ ] a\n- [x] b',
      quote: '> a\n> b\n>\n>> c', rules: '---\n\n***\n\n___', link: '[a](/x "t") [b](/y) <mailto:a@b.test> [c][1]\n\n[1]: /z', image: '![a](/y.png "t")',
      fence: '\`\`\`\nx = 1\n\`\`\`\n\n\`\`\`js\ny = 2\n\`\`\`', indent: '    code', table: '| a | b |\n|---|---|\n| 1 | 2 |', html: '<b>x</b>\n\n<div>y</div>\n\n<script>0</script>', footnote: 'a[^1]\n\n[^1]: b', definition: 'a\n: b',
    }).flatMap(([k, v]) => [['setCode', v], ['pause', 400], ['read', k, { htmlOf: '.sqs-block-markdown .sqs-block-content', panelEls: '.cm-content', areas: 0 }]]),
    ['shot', 'end'],
  ] },
  'CAP-T14ZOLA': { page: 'Gestures Probe', question: "T14: where Zola lands from the Add Block menu in a fresh section, read over 20 seconds", steps: [
    ['enter'], ['blank'], ['pause', 800], ['add', 0, 'Zola'],
    ...[["pause",1000],["read","Zola at 1 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",2000],["read","Zola at 3 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",3000],["read","Zola at 6 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",4000],["read","Zola at 10 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",10000],["read","Zola at 20 s",{"areas":0,"frameEls":".page-section .fluid-engine"}]],
    ['shot', 'after'],
  ] },
  'CAP-T14BANDS': { page: 'Gestures Probe', question: "T14: where Bandsintown lands from the Add Block menu in a fresh section, read over 20 seconds", steps: [
    ['enter'], ['blank'], ['pause', 800], ['add', 0, 'Bandsintown'],
    ...[["pause",1000],["read","Bandsintown at 1 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",2000],["read","Bandsintown at 3 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",3000],["read","Bandsintown at 6 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",4000],["read","Bandsintown at 10 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",10000],["read","Bandsintown at 20 s",{"areas":0,"frameEls":".page-section .fluid-engine"}]],
    ['shot', 'after'],
  ] },
  'CAP-T14OPENTABLE': { page: 'Gestures Probe', question: "T14: where OpenTable lands from the Add Block menu in a fresh section, read over 20 seconds", steps: [
    ['enter'], ['blank'], ['pause', 800], ['add', 0, 'OpenTable'],
    ...[["pause",1000],["read","OpenTable at 1 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",2000],["read","OpenTable at 3 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",3000],["read","OpenTable at 6 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",4000],["read","OpenTable at 10 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",10000],["read","OpenTable at 20 s",{"areas":0,"frameEls":".page-section .fluid-engine"}]],
    ['shot', 'after'],
  ] },
  'CAP-T14CONTROL': { page: 'Gestures Probe', question: "T14: where Flickr lands from the Add Block menu in a fresh section, read over 20 seconds", steps: [
    ['enter'], ['blank'], ['pause', 800], ['add', 0, 'Flickr'],
    ...[["pause",1000],["read","Flickr at 1 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",2000],["read","Flickr at 3 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",3000],["read","Flickr at 6 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",4000],["read","Flickr at 10 s",{"areas":0,"frameEls":".page-section .fluid-engine"}],["pause",10000],["read","Flickr at 20 s",{"areas":0,"frameEls":".page-section .fluid-engine"}]],
    ['shot', 'after'],
  ] },
  'CAP-TBTOP': { page: 'Gestures Probe', question: "U4: the toolbar of a selected one-row block with no room above: where it sits at each gap to the frame's top, and what a press on the south handle hits. The site's header stays, so no room is made by scrolling. Unnamed presses: the south handle's place, once.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['read', 'no scroll', { areas: 0, controls: true, hits: [0, 'new'] }],
    ...[120, 100, 80, 70, 60, 50, 40, 30, 20, 10, 0].flatMap((g) => [['scrollBlock', 0, 'new', g], ['read', `gap ${g}`, { controls: true, hits: [0, 'new'] }]]),
    ['shot', 'gap0'], ['clickAt', 212.2, 85.3], ['pause', 600], ['read', 'pressed the south handle', { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', 'pressed'],
    ['press', 'Escape'], ['pause', 400], ['read', 'after Escape', { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', 'escaped'],
    ['dragAt', 325.2, 86.3, 325.2, 127.4], ['read', 'dragged from the se handle, 1 row down', { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', 'dragged-se'],
  ] },
  'CAP-TBWIDE': { page: 'Gestures Probe', question: "U4: the same toolbar over wider one-row blocks: what lies on the south handle at gap 0. ", steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'],
    ...[1, 2, 3, 4].flatMap((n) => [['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 58.78, 0], ['press', 'Escape'], ['select', 0, 'new'], ['scrollBlock', 0, 'new', 0], ['read', `${n} columns wider, gap 0`, { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', `w${n}`]]),
    ['press', 'Escape'], ['deselect', 0],
    ['add', 0, 'Line'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -117.56, 0], ['press', 'Escape'], ['select', 0, 'new'], ['scrollBlock', 0, 'new', 0], ['read', 'a new block, 2 columns, gap 0', { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', 'narrow'],
  ] },
  'CAP-TBREMOVE': { page: 'Gestures Probe', question: "U4: a press where the south handle is, on a 7 column one-row block alone in its section at gap 0. Unnamed press: that place, once. It acts on a block made in this session.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'e', 176.34, 0], ['press', 'Escape'], ['select', 0, 'new'], ['scrollBlock', 0, 'new', 0], ['read', 'before', { areas: 0, controls: true, hits: [0, 'new'] }], ['shot', 'before'], ['pressAtHandle', 0, 'new', 's'], ['pause', 800], ['read', 'after the press', { areas: 0, controls: true }], ['shot', 'after'],
  ] },
  'CAP-G4PHONE': { page: 'Gestures Probe', question: 'G4: at what distance does a held drag or resize take the next line on a phone? One real pointer, 1px at a time.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['pause', 800], ['press', 'Escape'], ['view', 'Mobile'], ['pause', 800], ['select', 0, 'new'], ['read', 'start', { areas: 0, section: 0, block: [0, 'new'] }],
    ['walk', 0, 'new', 'middle', 110, 70], ['read', 'move', { walk: true, areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['walk', 0, 'new', 'se', 110, 70], ['read', 'se', { walk: true, areas: 0 }], ['shot', 'after'],
  ] },
  'CAP-G4MARGIN': { page: 'Gestures Probe', question: 'G4: the same walk from a start inside a margin track, left and right', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'middle', -60, 0], ['read', 'in the left margin', { areas: 0, section: 0, block: [0, 'new'] }], ['press', 'Escape'], ['select', 0, 'new'],
    ['walk', 0, 'new', 'middle', 110, 50], ['read', 'move, left margin', { walk: true, areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['walk', 0, 'new', 'se', 110, 50], ['read', 'se, left margin', { walk: true, areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'],
    ['drag', 0, 'new', 'middle', 1500, 0], ['read', 'in the right margin', { areas: 0, block: [0, 'new'] }], ['press', 'Escape'], ['select', 0, 'new'], ['walk', 0, 'new', 'middle', 110, 50], ['read', 'move, right margin', { walk: true, areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['walk', 0, 'new', 'nw', 110, 50], ['read', 'nw, right margin', { walk: true, areas: 0 }], ['shot', 'after'],
  ] },
  'CAP-X6PULLS': { page: 'Gestures Probe', question: "X6: the other handles, w, n and nw, on each type beyond Line, Shape, Text and Image. BLOCKTYPES.json has se, s and e. Each block is made here and removed by its own Remove.", steps: [
    ['enter'], ['blank'],
    ...['Button', 'Video', 'Form', 'Accordion', 'Code', 'Embed', 'Map', 'Social Links', 'Quote', 'Scrolling', 'Newsletter', 'Markdown'].flatMap((n) => [['add', 0, n], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['read', `${n} start`, { areas: 0 }], ['drag', 0, 'new', 'w', 58.78, 0], ['read', `${n} w in 1`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'n', 0, 41.1], ['read', `${n} n in 1`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'nw', -58.78, -41.1], ['read', `${n} nw out 1 and 1`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 500]]),
  ] },
  'CAP-X11FAST': { page: 'Gestures Probe', question: 'X11: a touch on a handle faster than 15px a move, after several holds', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['pause', 800], ['press', 'Escape'], ['read', 'start', { areas: 0 }],
    ...[[0, 240, 0], [60, 240, 0], [100, 240, 0], [300, 240, 0], [0, 0, 240], [100, 0, 240], [0, -240, 0], [100, -240, 0]].flatMap(([h, dx, dy], i) => [['select', 0, 'new'], ['touch', 0, 'new', dx > 0 || dx < 0 ? 'e' : 's', dx, dy, { holdMs: h }], ['pause', 500], ['read', `step ${i} hold ${h} by ${dx},${dy}`, { areas: 0 }], ['press', 'Escape']]),
  ] },
  'CAP-X13SEL': { page: 'Gestures Probe', question: 'X13: a marquee under 30px with a selection, and one that touched a block and left it. Each unnamed: the real mouse on empty canvas.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['pause', 800], ['press', 'Escape'], ['add', 0, 'Shape'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'middle', 700, 0], ['press', 'Escape'], ['read', 'start', { areas: 0, block: [0, 0], frameEls: '.fe-block' }], ['shot', 'start'],
    ['select', 0, 0], ['read', 'first selected', { block: [0, 0], has: ['Edit'] }], ['holdAt', 600, 420], ['moveAt', 620, 420], ['read', 'held 20px', { block: [0, 0], has: ['Edit'] }], ['shot', 'held20'], ['releaseAt'], ['read', 'released at 20px', { block: [0, 0], has: ['Edit'], controls: true }], ['shot', 'released20'],
    ['press', 'Escape'], ['select', 0, 0], ['read', 'first selected again', { block: [0, 0], has: ['Edit'] }], ['holdAt', 600, 420], ['moveAt', 650, 420], ['read', 'box 50px touches nothing', { block: [0, 0], has: ['Edit'] }], ['shot', 'box50'], ['moveAt', 850, 420], ['read', 'box touches the second', { block: [0, 0], has: ['Edit'] }], ['shot', 'touch'], ['moveAt', 650, 420], ['read', 'box left it', { block: [0, 0], has: ['Edit'] }], ['shot', 'left'], ['releaseAt'], ['read', 'released after leaving', { block: [0, 0], has: ['Edit'], controls: true }], ['shot', 'released-left'],
  ] },
  'CAP-X13LABELS': { page: 'Gestures Probe', question: 'X13, U3: the small type label a hovered block shows, on each type. Each block is removed by its own Remove.', steps: [
    ['enter'], ['blank'],
    ...['Text', 'Image', 'Video', 'Button', 'Line', 'Shape', 'Form', 'Accordion', 'Scrolling', 'Quote', 'Map', 'Code', 'Markdown', 'Embed', 'Social Links', 'Newsletter', 'Chart', 'Calendar', 'Menu', 'Audio', 'Search Field', 'Page Link', 'Tag Cloud', 'RSS', 'Archive', 'Instagram', 'Tock', 'SoundCloud', 'Flickr', 'OpenTable', 'Zola', 'Bandsintown'].flatMap((n) => [['add', 0, n], ['pause', 600], ['press', 'Escape'], ['deselect', 0], ['hoverBlock', 0, 'new'], ['pause', 500], ['read', n, { frameEls: '.sqs-block-label-tag', areas: 0 }], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 400]]),
  ] },
  'CAP-LOWMENU': { page: 'Gestures Probe', question: "BLOCKTYPES.json's low-menu entries again, with click waiting for the menu to stop: the name on the block, where it lands and the three drags. Each is made here and removed by its own Remove.", steps: [
    ['enter'], ['blank'],
    ...['Audio', 'Summary', 'Calendar', 'Menu', 'Chart', 'Search Field', 'Page Link', 'Tag Cloud', 'RSS', 'Archive', 'Instagram', 'Tock', 'SoundCloud', 'Flickr', 'OpenTable', 'Zola', 'Bandsintown'].flatMap((n) => [['add', 0, n], ['pause', 1500], ['press', 'Escape'], ['deselect', 0], ['hoverBlock', 0, 'new'], ['pause', 400], ['read', `${n} start`, { frameEls: '.sqs-block-label-tag', areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'se', 117.56, 41.1], ['read', `${n} se`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -82.2], ['read', `${n} s`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -117.56, 0], ['read', `${n} e`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 400]]),
  ] },
  'CAP-LOWMENU2': { page: 'Gestures Probe', question: "CAP-LOWMENU's blocks too tall for the window, whose south handles it could not reach, and the two whose drags moved, in a window 1900 high.", steps: [
    ['window', 1600, 1900], ['enter'], ['blank'],
    ...['Calendar', 'Menu', 'Archive', 'Instagram', 'Zola', 'Bandsintown'].flatMap((n) => [['add', 0, n], ['pause', 3000], ['press', 'Escape'], ['select', 0, 'new'], ['read', `${n} start`, { areas: 0 }], ['drag', 0, 'new', 'se', 117.56, 41.1], ['pause', 1500], ['read', `${n} se`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 's', 0, -82.2], ['pause', 1500], ['read', `${n} s`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['drag', 0, 'new', 'e', -117.56, 0], ['pause', 1500], ['read', `${n} e`, { areas: 0 }], ['press', 'Escape'], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 400]]),
    ['window', 1600, 1000],
  ] },
  'CAP-E4BURST': { page: 'Gestures Probe', question: 'E4: typing around a toolbar action in one burst, undo steps counted with the Undo button', steps: [
    ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['click', 'Bold'], ['keys', 'two'], ['read', 'around Bold', { html: [0, 'new'] }], ['press', 'Escape'], ['undoWalk', 'around Bold, walk', 0, 'new'],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['click', 'Bold'], ['keys', 'two'], ['click', 'Italic'], ['keys', 'three'], ['read', 'around two', { html: [0, 'new'] }], ['press', 'Escape'], ['undoWalk', 'around two, walk', 0, 'new'],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['click', 'Bold'], ['click', 'Bold'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'Bold on and off between, walk', 0, 'new'],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['pause', 3000], ['click', 'Bold'], ['pause', 3000], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'with 3 s around, walk', 0, 'new'],
  ] },
  'CAP-E4ENDS': { page: 'Gestures Probe', question: "E4: which word endings link. foo.xx on every two letters, then about 470 longer names, each followed by a space", steps: [
    ['enter'], ['blank'], ...NEWTEXT, ['keysFast', ENDS2], ['read', 'two letters', { linkTexts: [0, 'new'] }], ...NEWTEXT, ['keysFast', ENDS], ['read', 'longer', { linkTexts: [0, 'new'] }],
  ] },
  'CAP-E4LOOK': { page: 'Gestures Probe', question: "E4: the hue bar's whole gradient, and the list marker's style", steps: [
    ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['press', 'Meta+a'], ['click', 'Bullet List'], ['read', 'bullet', { marker: [0, 'new'], html: [0, 'new'] }], ['click', 'Numbered List'], ['read', 'numbered', { marker: [0, 'new'], html: [0, 'new'] }], ['click', 'Text Color'], ['clickIf', 'Custom'], ['read', 'custom', { gradients: true }], ['shot', 'custom'], ['press', 'Escape'], ['press', 'Escape'],
  ] },
  // Shift+ArrowLeft sends no Shift release, so CAP-E5WHERE's selections pasted as if Shift was still down. Here it's released.
  'CAP-E5WHERE2': { page: 'Gestures Probe', question: 'E5: a synthetic paste over a selection, Shift released first. No machine clipboard.', steps: [
    ['enter'], ['blank'],
    ...Object.keys(HEADPASTE).flatMap((n) => [...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...SELECTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over two paragraphs, ${n}`, { html: [0, 'new'] }]]),
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...SELECTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE['two paragraphs']], ['keys', 'x'], ['read', 'over two paragraphs, two paragraphs, typed', { html: [0, 'new'] }],
    ...['inline', 'one paragraph', 'two paragraphs', 'a list'].flatMap((n) => [...NEWTEXT, ['keys', 'alpha beta'], ...SELECTLEFT(4), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over a word, ${n}`, { html: [0, 'new'] }]]),
    ...NEWTEXT, ['keys', 'alpha beta'], ...SELECTLEFT(4), ['pasteHere', 0, 'new', HEADPASTE['two paragraphs']], ['keys', 'x'], ['read', 'over a word, two paragraphs, typed', { html: [0, 'new'] }],
    ...['inline', 'two paragraphs'].flatMap((n) => [...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['click', 'Text Style'], ['click', 'Paragraph 1'], ['keys', 'beta'], ...SELECTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over a heading and a paragraph, ${n}`, { html: [0, 'new'] }]]),
    ...['inline', 'two paragraphs', 'a list'].flatMap((n) => [...NEWTEXT, ['keys', 'one'], ['click', 'Bullet List'], ['press', 'Enter'], ['keys', 'two'], ...SELECTLEFT(5), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over two list items, ${n}`, { html: [0, 'new'] }]]),
    ...['one paragraph', 'two paragraphs'].flatMap((n) => [...NEWTEXT, ['keys', 'mono text'], ['click', 'Text Style'], ['click', 'Monospace'], ...SELECTLEFT(4), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over a word in monospace, ${n}`, { html: [0, 'new'] }]]),
  ] },
  'CAP-E5WHERE': { page: 'Gestures Probe', question: 'E5: a synthetic paste into a list item, a quote and monospace, and over a selection. No machine clipboard.', steps: [
    ['enter'], ['blank'],
    ...[['list item', [['keys', 'list text'], ['click', 'Bullet List']]], ['quote', [['keys', 'quote text'], ['click', 'Quote']]], ['monospace', [['keys', 'mono text'], ['click', 'Text Style'], ['click', 'Monospace']]]]
      .flatMap(([where, setup]) => [
        ...Object.entries(HEADPASTE).flatMap(([n, h]) => [...NEWTEXT, ...setup, ['pasteMid', 0, 'new', h], ['read', `${where}, ${n}`, { html: [0, 'new'] }]]),
        ...NEWTEXT, ...setup, ['pasteMid', 0, 'new', HEADPASTE['two paragraphs']], ['keys', 'x'], ['read', `${where}, two paragraphs, typed`, { html: [0, 'new'] }],
      ]),
    ...[['two paragraphs', HEADPASTE['two paragraphs']], ['a list', HEADPASTE['a list']]].flatMap(([n, h]) => [...NEWTEXT, ['keys', 'one'], ['click', 'Numbered List'], ['press', 'Enter'], ['keys', 'next'], ['pasteMid', 0, 'new', h], ['read', `first of two items, ${n}`, { html: [0, 'new'] }]]),
    ...['inline', 'one paragraph', 'two paragraphs', 'heading and paragraph', 'a list'].flatMap((n) => [...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...SHIFTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over two paragraphs, ${n}`, { html: [0, 'new'] }]]),
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...SHIFTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE['two paragraphs']], ['keys', 'x'], ['read', 'over two paragraphs, two paragraphs, typed', { html: [0, 'new'] }],
    ...['inline', 'two paragraphs'].flatMap((n) => [...NEWTEXT, ['keys', 'alpha beta'], ...SHIFTLEFT(4), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over a word, ${n}`, { html: [0, 'new'] }]]),
    ...['inline', 'two paragraphs'].flatMap((n) => [...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['click', 'Text Style'], ['click', 'Paragraph 1'], ['keys', 'beta'], ...SHIFTLEFT(6), ['pasteHere', 0, 'new', HEADPASTE[n]], ['read', `over a heading and a paragraph, ${n}`, { html: [0, 'new'] }]]),
    ...NEWTEXT, ['keys', 'one'], ['click', 'Bullet List'], ['press', 'Enter'], ['keys', 'two'], ...SHIFTLEFT(5), ['pasteHere', 0, 'new', HEADPASTE['two paragraphs']], ['read', 'over two list items, two paragraphs', { html: [0, 'new'] }],
  ] },
  'CAP-E5HEAD2': { page: 'Gestures Probe', question: 'E5: beyond CAP-E5HEAD, other headings, more kinds of paste, and where the caret ends. Synthetic paste, no machine clipboard.', steps: [
    ['enter'], ['blank'],
    ...[['H1, two paragraphs', 'Heading 1', '<p>ONE</p><p>TWO</p>'], ['H3, two paragraphs', 'Heading 3', '<p>ONE</p><p>TWO</p>'], ['H4, a list', 'Heading 4', '<ul><li><p>A</p></li><li><p>B</p></li></ul>'], ['H3, heading and paragraph', 'Heading 3', '<h2>HEAD</h2><p>TAIL</p>'],
      ['H2, three paragraphs', 'Heading 2', '<p>ONE</p><p>TWO</p><p>THREE</p>'], ['H2, paragraph and heading', 'Heading 2', '<p>A</p><h3>B</h3>'], ['H2, a lone heading', 'Heading 2', '<h3>X</h3>'], ['H2, bold in the first paragraph', 'Heading 2', '<p><b>ONE</b></p><p>TWO</p>']]
      .flatMap(([n, style, h]) => [...NEWTEXT, ['keys', 'heading text'], ['click', 'Text Style'], ['click', style], ['pasteMid', 0, 'new', h], ['read', n, { html: [0, 'new'] }]]),
    ...[['H2, two paragraphs, typed', '<p>ONE</p><p>TWO</p>'], ['H2, a list, typed', '<ul><li><p>A</p></li><li><p>B</p></li></ul>'], ['H2, one paragraph, typed', '<p>ONE</p>'], ['H2, inline, typed', '<b>PASTED</b>']]
      .flatMap(([n, h]) => [...NEWTEXT, ['keys', 'heading text'], ['click', 'Text Style'], ['click', 'Heading 2'], ['pasteMid', 0, 'new', h], ['keys', 'x'], ['read', n, { html: [0, 'new'] }]]),
  ] },
  'CAP-E4ENTER': { page: 'Gestures Probe', question: 'E4: Enter in headings and quotes, beyond the one H2 read in CAP-E4SCORE.', steps: [
    ['enter'], ['blank'],
    ...[['Heading 1', 'H1'], ['Heading 3', 'H3'], ['Heading 4', 'H4']].flatMap(([style, n]) => [...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', style], ['press', 'Enter'], ['keys', 'beta'], ['read', `${n}, Enter at the end`, { html: [0, 'new'] }]]),
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Quote'], ['press', 'Enter'], ['keys', 'beta'], ['read', 'Quote, Enter at the end', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Quote'], ['press', 'Enter'], ['press', 'Enter'], ['keys', 'beta'], ['read', 'Quote, Enter twice', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['press', 'Enter'], ['keys', 'beta'], ['read', 'H2, Enter twice', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 3'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'Enter'], ['keys', 'x'], ['read', 'H3, Enter in the middle', { html: [0, 'new'] }],
    ...NEWTEXT, ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['keys', 'beta'], ['read', 'empty H2, Enter', { html: [0, 'new'] }],
  ] },
  'CAP-E5HEAD': { page: 'Gestures Probe', question: 'E5: a synthetic paste into the middle of a heading. No keys, own DataTransfer, no machine clipboard.', steps: [
    ['enter'], ['blank'],
    ...Object.entries(HEADPASTE).flatMap(([n, h]) => [...NEWTEXT, ['keys', 'heading text'], ['click', 'Text Style'], ['click', 'Heading 2'], ['read', `${n} before`, { html: [0, 'new'] }], ['pasteMid', 0, 'new', h], ['read', n, { html: [0, 'new'] }]]),
  ] },
  'CAP-L5TYPES': { page: 'Gestures Probe', question: 'L5: Hide on desktop and on mobile on block types beyond Image, Button, Line, Form and Shape', steps: [
    ['enter'], ['blank'], ...['Text', 'Video', 'Accordion', 'Scrolling', 'Quote', 'Map', 'Code', 'Markdown', 'Embed', 'Social Links', 'Newsletter', 'Chart', 'Calendar', 'Menu', 'Audio', 'Search Field', 'Page Link', 'Tag Cloud', 'RSS', 'Archive', 'Instagram', 'Tock', 'SoundCloud', 'Flickr', 'OpenTable', 'Zola', 'Bandsintown', 'Summary'].flatMap((t) => [['add', 0, t], ['pause', 700], ['press', 'Escape'], ['rightClick', 0, 'new'], ['click', 'Hide on desktop'], ['read', `${t} hidden on desktop`, { block: [0, 'new'], section: 0 }], ['press', 'Meta+z'], ['pause', 300], ['rightClick', 0, 'new'], ['click', 'Hide on mobile'], ['read', `${t} hidden on mobile`, { block: [0, 'new'], section: 0 }], ['view', 'Mobile'], ['read', `${t} phone view`, { block: [0, 'new'], section: 0 }], ['view', 'Desktop'], ['press', 'Meta+z'], ['pause', 300], ['press', 'Escape'], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 300]]),
  ] },
  'CAP-Z3AFTER': { page: 'Gestures Probe', question: 'Z3: is the next press lost after a row drag given up by Escape or a release over the page? Against a normal drop. Layers has to open on the first press or the second.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['hover', 0], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'open at the start', { has: ['Layers'] }],
    ...[['Escape', [[0, -40], ['esc']]], ['a release over the page', [[400, 0], [400, 30]]]].flatMap(([n, path]) => [
      ['rowPath', 'Button', ['Line', 'Button', 'Shape'], path, `held, ${n}`], ['read', `after ${n}`, { has: ['Layers'] }],
      ['hover', 0], ['click', 'Open Layers Panel'], ['read', `after ${n}, one press`, { has: ['Layers'] }], ['click', 'Open Layers Panel'], ['read', `after ${n}, two presses`, { has: ['Layers'] }],
      ['pause', 300], ['read', `after ${n}, settled`, { has: ['Layers'] }],
    ]),
    ['read', 'before the normal drop', { has: ['Layers'] }],
  ] },
  'CAP-Z3SCORE': { page: 'Gestures Probe', question: 'Z3: fresh cases for the last rules, no fitting after. Rows held by the real mouse, frames of moves and drops. Unnamed presses on the rows.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['hover', 0], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'start', { zs: 0 }],
    ...[['Line', -23, 'Line up 80, down to 23', [-80]], ['Line', -71, 'Line up 80, back to 70, up to 71', [-80, -70]], ['Shape', 70, 'Shape down 80, back to 70', [80]], ['Shape', 71, 'Shape down 80, back to 70, down to 71', [80, 70]], ['Shape', 23, 'Shape down 30, back to 23', [30]], ['Button', 24, 'Button down 30, back to 0, down to 24', [30, 0]], ['Button', -24, 'Button down 30, up to 24 above', [30]], ['Button', -23, 'Button up 30, back to 23', [-30]]]
      .map(([l, dy, n, pre]) => ['rowFrames', l, ['Line', 'Button', 'Shape'], dy, `frames, ${n}`, pre]),
    ['read', 'nothing dropped', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -5, 'frames, Line up 30, back to 5, dropped', [-30], true], ['read', 'dropped at 5, z', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], 9, 'frames, Line down 9, dropped', [], true], ['read', 'dropped at 9, z', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -80, 'frames, Line up 80, dropped', [], true], ['read', 'dropped up 80, z', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], 25, 'frames, Line down 25, dropped', [], true], ['read', 'dropped down 25, z', { zs: 0 }],
    ['rowFrames', 'Shape', ['Line', 'Button', 'Shape'], 100, 'frames, Shape down 100, dropped', [], true], ['read', 'dropped down 100, z', { zs: 0 }],
    ...[['Button', [[3, 8]], 'right 3, down 8'], ['Button', [[4, 8]], 'right 4, down 8'], ['Button', [[7, 5]], 'right 7, down 5'], ['Button', [[7, 4]], 'right 7, down 4'], ['Button', [[-8, 0], [-8, -1]], 'left 8, up 1']]
      .map(([l, path, n]) => ['rowPath', l, ['Line', 'Button', 'Shape'], path, n, false]),
    ['rowPath', 'Button', ['Line', 'Button', 'Shape'], [[0, -40], ['esc']], 'Button up 40, Escape, released'], ['read', 'Escape, z', { zs: 0 }],
  ] },
  'CAP-Z3PATH2': { page: 'Gestures Probe', question: 'Z3: beyond CAP-Z3PATH: frames of rows moving back and of a drop, a second move after the one that starts it, out over the page and back, Escape while held. Unnamed presses on the rows.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['hover', 0], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'start', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -23, 'frames, Line up 30, back to 23', [-30]], ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -70, 'frames, Line up 80, back to 70', [-80]], ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -24, 'frames, Line up 30, back to 23, up to 24', [-30, -23]], ['rowFrames', 'Button', ['Line', 'Button', 'Shape'], 24, 'frames, Button up 30, down to 24', [-30]],
    ...[['Line', [[0, -30, 'jump'], [0, -31]], 'one move up 30, then 1px'], ['Line', [[0, -30, 'jump'], [0, -80, 'jump']], 'one move up 30, one to 80'], ['Shape', [[0, 30, 'jump'], [0, 31]], 'one move down 30, then 1px'], ['Button', [[400, 0], [0, 0], [0, -30]], 'out over the page and back, up 30']]
      .map(([l, path, n]) => ['rowPath', l, ['Line', 'Button', 'Shape'], path, n, false]),
    ['read', 'nothing dropped', { zs: 0 }],
    ['rowPath', 'Shape', ['Line', 'Button', 'Shape'], [[0, 30, 'jump']], 'one move down 30, dropped'], ['read', 'one move down 30, dropped, z', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -30, 'frames, Line dropped up 30', [], true], ['read', 'frames drop, z', { zs: 0 }],
    ['rowPath', 'Button', ['Line', 'Button', 'Shape'], [[0, -30], ['esc'], [0, -35]], 'up 30, Escape, up to 35, dropped'], ['read', 'Escape, dropped, z', { zs: 0 }],
  ] },
  'CAP-Z3PATH': { page: 'Gestures Probe', question: 'Z3: a Layers row held by the real mouse along paths beyond CAP-Z3WALK: slants, x then y, back again, single jumps, a drop near a limit and outside the panel. And each frame around a pass. Unnamed presses on the rows.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['hover', 0], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'start', { zs: 0 }],
    ...[['Button', [[6, 0], [6, 8]], 'right 6, down 8'], ['Button', [[5, 0], [5, 8]], 'right 5, down 8'], ['Button', [[8, 0], [8, 8]], 'right 8, down 8'], ['Button', [[-6, 0], [-6, -8]], 'left 6, up 8'], ['Button', [[6, -7, 'jump']], 'one move to 6 and 7'], ['Button', [[6, -6, 'jump']], 'one move to 6 and 6'],
      ['Shape', [[9, 0], [9, 30]], 'right 9, down 30'], ['Shape', [[30, 0], [30, 80]], 'right 30, down 80'], ['Line', [[0, -30], [0, -5]], 'up 30, back to 5'], ['Line', [[0, -80], [0, 0]], 'up 80, back home'], ['Button', [[0, -30], [0, 30]], 'up 30, down to 30'],
      ['Line', [[0, -30, 'jump']], 'one move up 30'], ['Line', [[0, -80, 'jump']], 'one move up 80'], ['Button', [[0, -8, 'jump']], 'one move up 8'], ['Shape', [[0, 400, 'jump']], 'one move far down']]
      .map(([l, path, n]) => ['rowPath', l, ['Line', 'Button', 'Shape'], path, n, false]),
    ['read', 'nothing dropped', { zs: 0 }],
    ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -24, 'frames, Line to 24'], ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -71, 'frames, Line to 71'], ['rowFrames', 'Shape', ['Line', 'Button', 'Shape'], 24, 'frames, Shape to 24'], ['rowFrames', 'Line', ['Line', 'Button', 'Shape'], -9, 'frames, Line to 9'],
    ['read', 'still nothing dropped', { zs: 0 }],
    ['rowPath', 'Line', ['Line', 'Button', 'Shape'], [[0, -9]], 'dropped at 9'], ['read', 'dropped at 9, z', { zs: 0 }],
    ['rowPath', 'Line', ['Line', 'Button', 'Shape'], [[0, -23]], 'dropped at 23'], ['read', 'dropped at 23, z', { zs: 0 }],
    ['rowPath', 'Line', ['Line', 'Button', 'Shape'], [[0, -30], [0, 0]], 'up 30, dropped at home'], ['read', 'dropped at home, z', { zs: 0 }],
    ['rowPath', 'Button', ['Line', 'Button', 'Shape'], [[20, 0]], 'right 20, dropped'], ['read', 'right 20, dropped, z', { zs: 0 }],
    ['rowPath', 'Button', ['Line', 'Button', 'Shape'], [[20, 0], [20, -30]], 'right 20, up 30, dropped'], ['read', 'right 20, up 30, dropped, z', { zs: 0 }],
    ['rowPath', 'Button', ['Line', 'Button', 'Shape'], [[400, 0], [400, 30]], 'outside the panel, dropped'], ['read', 'outside the panel, dropped, z', { zs: 0 }],
    ['rowPath', 'Shape', ['Line', 'Button', 'Shape'], [[0, 0, 'jump'], [0, 30, 'jump']], 'one move down 30, dropped'], ['read', 'one move down 30, dropped, z', { zs: 0 }],
    ['rowPath', 'Line', ['Line', 'Button', 'Shape'], [[0, -30], ['esc'], [0, -35]], 'up 30, Escape, up to 35, dropped'], ['read', 'Escape, dropped, z', { zs: 0 }],
  ] },
  'CAP-Z3WALK': { page: 'Gestures Probe', question: 'Z3: a Layers row held by the real mouse, 1px at a time. Unnamed presses on the rows. Up, down, in x, and the blocks z while held.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['hover', 0], ['click', 'Open Layers Panel'], ['pause', 800], ['read', 'start', { zs: 0 }],
    ['rowWalk', 'Line', ['Line', 'Button', 'Shape'], 0, -110, 'Line up 110, kept held and taken home', false], ['read', 'after home', { zs: 0 }],
    ['rowWalk', 'Shape', ['Line', 'Button', 'Shape'], 0, 110, 'Shape down 110, kept held and taken home', false], ['read', 'after home 2', { zs: 0 }],
    ['rowWalk', 'Button', ['Line', 'Button', 'Shape'], 80, 0, 'Button right 80', false], ['rowWalk', 'Button', ['Line', 'Button', 'Shape'], -80, 0, 'Button left 80', false], ['rowWalk', 'Button', ['Line', 'Button', 'Shape'], 0, 8, 'Button down 8', false], ['rowWalk', 'Button', ['Line', 'Button', 'Shape'], 0, -8, 'Button up 8', false],
    ['rowWalk', 'Line', ['Line', 'Button', 'Shape'], 0, -24, 'Line dropped up 24'], ['read', 'dropped 24', { zs: 0, textBox: ['Line', 'Button', 'Shape'] }], ['rowWalk', 'Line', ['Line', 'Button', 'Shape'], 0, -26, 'Line dropped up 26'], ['read', 'dropped 26', { zs: 0, textBox: ['Line', 'Button', 'Shape'] }], ['rowWalk', 'Line', ['Line', 'Button', 'Shape'], 0, -26, 'Line dropped up 26 again'], ['read', 'dropped 26 again', { zs: 0, textBox: ['Line', 'Button', 'Shape'] }], ['rowWalk', 'Shape', ['Line', 'Button', 'Shape'], 0, -72, 'Shape dropped up 72'], ['read', 'dropped up 72', { zs: 0, textBox: ['Line', 'Button', 'Shape'] }], ['rowWalk', 'Line', ['Line', 'Button', 'Shape'], 0, -50, 'a row dropped up 50'], ['read', 'dropped up 50', { zs: 0, textBox: ['Line', 'Button', 'Shape'] }],
  ] },
  'CAP-E4CARET': { page: 'Gestures Probe', question: 'E4: Bold, Italic and Strike with a caret and no selection: at a word end, inside a word, on a space, in an empty line, and pressed again', steps: [
    ['enter'], ['blank'], ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Bold'], ['read', 'word end, Bold', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'typed after', { html: [0, 'new'] }], ['click', 'Bold'], ['read', 'Bold again', { html: [0, 'new'] }], ['keys', 'y'], ['read', 'typed after again', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'inside a word, Bold', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'inside, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Italic'], ['read', 'before a word, Italic', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'before, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha  beta'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'between two spaces, Bold', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'spaces, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['click', 'Bold'], ['read', 'two paragraphs, Bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['click', 'Bold'], ['read', 'empty, Bold', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'empty, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Strike'], ['read', 'word end, Strike', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'Strike, typed', { html: [0, 'new'] }],
  ] },
  'CAP-S3ALIGN': { page: 'Gestures Probe', question: "S3: Align Vertically on a stack's Shape child, then its size and Stretch off, in a row and a column. The toolbar goes away once the panel opens, so each case picks its align first.", steps: [
    ...STACK3, ['pressRow', 'Shape'], ['read', 'start', { kids: [0, 0] }], ...ALIGNS('fill in a row'),
    ...['Align Top', 'Align Center', 'Align Bottom'].flatMap((n) => [['exit'], ...STACK3, ['pressRow', 'Shape'], ['pressNamed', 'Align Vertically'], ['pause', 300], ['pressNamed', n], ['pause', 300], ['press', 'Escape'], ['clickIf', 'Edit'], ['pause', 500], ['typeAt', 1040, 487, '200'], ['read', `${n}, H 200, in a row`, { kids: [0, 0] }], ['click', 'Stretch'], ['pause', 500], ['typeAt', 1040, 439, '100'], ['read', `${n}, W 100, H 200, Stretch off, in a row`, { kids: [0, 0], checks: true }], ['shot', n.replace(/\W+/g, '-')], ['press', 'Escape']]),
    ...['Align Top', 'Align Bottom'].flatMap((n) => [['exit'], ...STACK3, ['pressNamed', 'Stack Options'], ['pause', 300], ['pressNamed', 'Stack Vertically'], ['pause', 500], ['press', 'Escape'], ['select', 0, 0], ['drag', 0, 0, 'middle', 400, 0], ['press', 'Escape'], ['pressRow', 'Shape'], ['read', `${n} selected`, { controls: true }], ['pressNamed', 'Align Vertically'], ['pause', 300], ['pressNamed', n], ['pause', 300], ['press', 'Escape'], ['clickIf', 'Edit'], ['pause', 500], ['fillRow', 'Size', 1, '200'], ['click', 'Stretch'], ['pause', 500], ['fillRow', 'Size', 0, '100'], ['read', `${n}, W 100, H 200, Stretch off, in a column`, { kids: [0, 0], controls: true }], ['press', 'Escape']]),
  ] },
  'CAP-S3TRANSFORMS': { page: 'Gestures Probe', question: "S3: Scale, Offset, Skew and Anchor on a stack's Shape child", steps: [
    ...STACK3, ['pressRow', 'Shape'], ['clickIf', 'Edit'], ['pause', 500], ['clickIf', 'Design'], ['read', 'rows', { leaves: ['Opacity', 'Rotate', 'Scale', 'Offset', 'Skew', 'Anchor'] }],
    ['fillRow', 'Scale', 0, '120'], ['read', 'Scale 120', { kids: [0, 0], rows: ['Scale'] }], ['shot', 'scale'], ['fillRow', 'Offset', 0, '5'], ['read', 'Offset X 5', { kids: [0, 0] }], ['fillRow', 'Offset', 1, '6'], ['read', 'Offset Y 6', { kids: [0, 0] }], ['fillRow', 'Skew', 0, '3'], ['read', 'Skew X 3', { kids: [0, 0] }], ['fillRow', 'Skew', 1, '4'], ['read', 'Skew Y 4', { kids: [0, 0] }], ['scrollTo', 'Anchor'], ['pressNamed', 'Position'], ['pause', 300], ['pressNamed', 'Top Left'], ['pause', 400], ['read', 'Anchor Top Left', { kids: [0, 0] }], ['pressNamed', 'Bottom Right'], ['pause', 400], ['read', 'Anchor Bottom Right', { kids: [0, 0] }], ['shot', 'anchor'], ['press', 'Escape'],
  ] },
  'CAP-S3THICK': { page: 'Gestures Probe', question: "S3: a stack's stroke at each Thickness", steps: [
    ...STACK3, ['clickIf', 'Edit'], ['pause', 500], ['clickIf', 'Design'], ['pressNamed', 'Solid Stroke'], ['pause', 400], ['scrollTo', 'Thickness'], ['read', 'open', { controls: true, parts: ['Thickness'], kids: [0, 0] }], ['shot', 'open'],
    ...[0, 1, 2, 3].flatMap((n) => [['pressPart', 'Thickness', n], ['pause', 400], ['read', `part ${n}`, { parts: ['Thickness'], kids: [0, 0], sel: '.sqs-stack-container, .website-component-block' }]]), ['press', 'Escape'],
  ] },
  'CAP-S3PHONEHUG': { page: 'Gestures Probe', question: "S3: a stack child's Hug on the phone view, then what desktop keeps", steps: [
    ...STACK3, ['read', 'desktop start', { kids: [0, 0] }], ['view', 'Mobile'], ['pause', 800], ['read', 'phone start', { kids: [0, 0] }], 
    ['pressRow', 'Button'], ['clickIf', 'Edit'], ['pause', 600], ['clickIf', 'Design'], ['pause', 400], ['pressCombo', 0], ['pressNamed', 'Hug'], ['pause', 500], ['read', 'Button W Hug', { kids: [0, 0] }], ['shot', 'button'], ['press', 'Escape'],
    ['pressRow', 'Text'], ['clickIf', 'Edit'], ['pause', 600], ['clickIf', 'Design'], ['pause', 400], ['pressCombo', 0], ['pressNamed', 'Hug'], ['pause', 500], ['read', 'Text W Hug', { kids: [0, 0] }], ['press', 'Escape'],
    ['view', 'Desktop'], ['pause', 800], ['read', 'desktop after', { kids: [0, 0] }], ['view', 'Mobile'], ['pause', 800], ['read', 'phone after', { kids: [0, 0] }],
  ] },
  'CAP-P3PANEL': { page: 'Gestures Probe', question: 'P3: where the section panel goes as a typed height grows, and when it goes away: the panel, its host, the frame scroll and the section, from a fresh panel', steps: [
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['read', 'custom', { panelState: true }], ['shot', 'custom'],
    ['fillRange', '50'], ['pause', 1200], ['read', 'up 50', { panelState: true }], ['fillRange', '75'], ['pause', 1200], ['read', 'up 75', { panelState: true }], ['fillRange', '100'], ['pause', 1200], ['read', 'up 100', { panelState: true }], ['fillRange', '110'], ['pause', 1200], ['read', 'up 110', { panelState: true }], ['fillRange', '125'], ['pause', 1200], ['read', 'up 125', { panelState: true }], ['fillRange', '150'], ['pause', 1200], ['read', 'up 150', { panelState: true }], ['fillRange', '200'], ['pause', 1200], ['read', 'up 200', { panelState: true }], ['fillRange', '300'], ['pause', 1200], ['read', 'up 300', { panelState: true }], ['fillRange', '400'], ['pause', 1200], ['read', 'up 400', { panelState: true }], ['fillRange', '500'], ['pause', 1200], ['read', 'up 500', { panelState: true }], ['fillRange', '600'], ['pause', 1200], ['read', 'up 600', { panelState: true }], ['fillRange', '700'], ['pause', 1200], ['read', 'up 700', { panelState: true }], ['fillRange', '800'], ['pause', 1200], ['read', 'up 800', { panelState: true }], ['fillRange', '900'], ['pause', 1200], ['read', 'up 900', { panelState: true }], ['fillRange', '999'], ['pause', 1200], ['read', 'up 999', { panelState: true }], ['fillRange', '1000'], ['pause', 1200], ['read', 'up 1000', { panelState: true }], ['fillRange', '1500'], ['pause', 1200], ['read', 'up 1500', { panelState: true }], ['fillRange', '2000'], ['pause', 1200], ['read', 'up 2000', { panelState: true }], ['fillRange', '3000'], ['pause', 1200], ['read', 'up 3000', { panelState: true }], ['fillRange', '4000'], ['pause', 1200], ['read', 'up 4000', { panelState: true }], ['fillRange', '5000'], ['pause', 1200], ['read', 'up 5000', { panelState: true }], ['fillRange', '10000'], ['pause', 1200], ['read', 'up 10000', { panelState: true }],
    ['shot', 'up-end'],
  ] },
  'CAP-P3JUMP': { page: 'Gestures Probe', question: 'P3: jumps to a tall height from a small one, each from a fresh section, and whether the panel comes back by scrolling', steps: [
    ...[[200, 999], [50, 999], [999, 200], [200, 600], [200, 800], [200, 900], [200, 5000], [50, 1000], [300, 400], [50, 400], [1000, 1001], [50, 300]].flatMap(([a, b]) => [['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['fillRange', String(a)], ['pause', 1200], ['read', `from ${a}`, { panelState: true }], ['fillRange', String(b)], ['pause', 1200], ['read', `${a} to ${b}`, { panelState: true, controls: true }], ['shot', `${a}-${b}`], ['exit']]),
  ] },
  'CAP-P3EDGE': { page: 'Gestures Probe', question: 'P3: the height where the section panel goes away, with the page at the top and after a reopen scrolled the section to the middle, and in a taller window', steps: [
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['fillRange', '300'], ['pause', 400], ['read', 'top 300', { panelState: true }], ['fillRange', '310'], ['pause', 400], ['read', 'top 310', { panelState: true }], ['fillRange', '320'], ['pause', 400], ['read', 'top 320', { panelState: true }], ['fillRange', '330'], ['pause', 400], ['read', 'top 330', { panelState: true }], ['fillRange', '340'], ['pause', 400], ['read', 'top 340', { panelState: true }], ['fillRange', '350'], ['pause', 400], ['read', 'top 350', { panelState: true }], ['fillRange', '360'], ['pause', 400], ['read', 'top 360', { panelState: true }], ['fillRange', '370'], ['pause', 400], ['read', 'top 370', { panelState: true }], ['fillRange', '380'], ['pause', 400], ['read', 'top 380', { panelState: true }], ['fillRange', '390'], ['pause', 400], ['read', 'top 390', { panelState: true }], ['fillRange', '400'], ['pause', 400], ['read', 'top 400', { panelState: true }], ['exit'],
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['fillRange', '300'], ['press', 'Escape'], ['panel', 0], ['pause', 800], ['read', 'reopened at 300', { panelState: true }], ['fillRange', '350'], ['pause', 400], ['read', 'reopened 350', { panelState: true }], ['fillRange', '400'], ['pause', 400], ['read', 'reopened 400', { panelState: true }], ['fillRange', '450'], ['pause', 400], ['read', 'reopened 450', { panelState: true }], ['fillRange', '500'], ['pause', 400], ['read', 'reopened 500', { panelState: true }], ['fillRange', '520'], ['pause', 400], ['read', 'reopened 520', { panelState: true }], ['fillRange', '540'], ['pause', 400], ['read', 'reopened 540', { panelState: true }], ['fillRange', '560'], ['pause', 400], ['read', 'reopened 560', { panelState: true }], ['fillRange', '580'], ['pause', 400], ['read', 'reopened 580', { panelState: true }], ['fillRange', '600'], ['pause', 400], ['read', 'reopened 600', { panelState: true }], ['fillRange', '650'], ['pause', 400], ['read', 'reopened 650', { panelState: true }], ['exit'],
    ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 534], ['fillRange', '50'], ['pause', 400], ['read', 'small 50, soon', { panelState: true }], ['pause', 3000], ['read', 'small 50, 3 s on', { panelState: true }], ['fillRange', '75'], ['pause', 400], ['read', 'small 75, soon', { panelState: true }], ['pause', 3000], ['read', 'small 75, 3 s on', { panelState: true }], ['fillRange', '100'], ['pause', 400], ['read', 'small 100, soon', { panelState: true }], ['pause', 3000], ['read', 'small 100, 3 s on', { panelState: true }], ['fillRange', '110'], ['pause', 400], ['read', 'small 110, soon', { panelState: true }], ['pause', 3000], ['read', 'small 110, 3 s on', { panelState: true }], ['fillRange', '125'], ['pause', 400], ['read', 'small 125, soon', { panelState: true }], ['pause', 3000], ['read', 'small 125, 3 s on', { panelState: true }], ['fillRange', '150'], ['pause', 400], ['read', 'small 150, soon', { panelState: true }], ['pause', 3000], ['read', 'small 150, 3 s on', { panelState: true }], ['exit'],
    ['window', 1600, 1400], ['enter'], ['blank'], ['panel', 0], ['clickAt', 1538, 589], ['pause', 500], ['read', 'tall window, custom', { panelState: true }], ['fillRange', '200'], ['pause', 400], ['read', 'tall window 200', { panelState: true }], ['fillRange', '250'], ['pause', 400], ['read', 'tall window 250', { panelState: true }], ['fillRange', '270'], ['pause', 400], ['read', 'tall window 270', { panelState: true }], ['fillRange', '280'], ['pause', 400], ['read', 'tall window 280', { panelState: true }], ['fillRange', '290'], ['pause', 400], ['read', 'tall window 290', { panelState: true }], ['fillRange', '300'], ['pause', 400], ['read', 'tall window 300', { panelState: true }], ['fillRange', '320'], ['pause', 400], ['read', 'tall window 320', { panelState: true }], ['fillRange', '340'], ['pause', 400], ['read', 'tall window 340', { panelState: true }], ['fillRange', '350'], ['pause', 400], ['read', 'tall window 350', { panelState: true }], ['fillRange', '360'], ['pause', 400], ['read', 'tall window 360', { panelState: true }], ['fillRange', '370'], ['pause', 400], ['read', 'tall window 370', { panelState: true }], ['fillRange', '380'], ['pause', 400], ['read', 'tall window 380', { panelState: true }], ['fillRange', '400'], ['pause', 400], ['read', 'tall window 400', { panelState: true }], ['exit'], ['window', 1600, 1000],
  ] },
  'CAP-S3HUGMENU': { page: 'Gestures Probe', question: "S3: is Hug offered for a stack's Shape child? Its W and H menus on the phone, in a desktop row and in a desktop column. Nothing picked.", steps: [
    ...STACK3, ['view', 'Mobile'], ['pause', 800], ['pressRow', 'Shape'], ['clickIf', 'Edit'], ['pause', 600], ['pressCombo', 0], ['read', 'phone W', { panelEls: '[role=option]' }], ['shot', 'phone W'], ['pressCombo', 0], ['pause', 300], ['pressCombo', 1], ['read', 'phone H', { panelEls: '[role=option]' }], ['shot', 'phone H'], ['pressCombo', 1], ['pause', 300], ['exit'],
    ...STACK3, ['pressRow', 'Shape'], ['clickIf', 'Edit'], ['pause', 600], ['pressCombo', 0], ['read', 'row W', { panelEls: '[role=option]' }], ['shot', 'row W'], ['pressCombo', 0], ['pause', 300], ['pressCombo', 1], ['read', 'row H', { panelEls: '[role=option]' }], ['shot', 'row H'], ['pressCombo', 1], ['pause', 300], ['exit'],
    ...STACK3, ['pressNamed', 'Stack Options'], ['pause', 300], ['pressNamed', 'Stack Vertically'], ['pause', 500], ['press', 'Escape'], ['select', 0, 0], ['drag', 0, 0, 'middle', 400, 0], ['press', 'Escape'], ['pressRow', 'Shape'], ['clickIf', 'Edit'], ['pause', 600], ['pressCombo', 0], ['read', 'column W', { panelEls: '[role=option]' }], ['shot', 'column W'], ['pressCombo', 0], ['pause', 300], ['pressCombo', 1], ['read', 'column H', { panelEls: '[role=option]' }], ['shot', 'column H'], ['pressCombo', 1], ['pause', 300],
  ] },
  'CAP-E4FRESH': { page: 'Gestures Probe', question: 'E4: fresh cases after a written prediction. Bold, Italic and Strike with a caret in mixed text, lists, headings, code and links; their nesting; Cmd+B; undo steps by time alone.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'mixed, caret in the plain word', { html: [0, 'new'] }], ['click', 'Bold'], ['read', 'mixed, pressed again', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'mixed, caret in the bold word', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Italic'], ['click', 'Bold'], ['read', 'Italic then Bold', { html: [0, 'new'] }], ['click', 'Bold'], ['read', 'Bold off keeps Italic', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Italic'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'Bold over a part in Italic', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowRight'], ['click', 'Italic'], ['read', 'Italic over a part in Bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+b'], ['read', 'Cmd+B', { html: [0, 'new'] }], ['press', 'Meta+i'], ['read', 'Cmd+I', { html: [0, 'new'] }], ['press', 'Meta+b'], ['read', 'Cmd+B again', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['click', 'Bold'], ['read', 'caret on an empty line, Bold', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'empty line, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['click', 'Bold'], ['read', 'a heading', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['press', 'Meta+a'], ['click', 'Bullet List'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'a list', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Monospace'], ['click', 'Bold'], ['read', 'monospace', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha.com x'], ['click', 'Bold'], ['read', 'a link', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Color'], ['click', 'Bright'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'a colored word', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+a'], ['click', 'Strike'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'Bold on struck text', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Strike'], ['click', 'Strike'], ['keys', 'x'], ['read', 'Strike twice, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Strike'], ['keys', 'x'], ['click', 'Strike'], ['keys', 'y'], ['read', 'Strike, x, Strike, y', { html: [0, 'new'] }],
    ...NEWTEXT, ['click', 'Strike'], ['keys', 'x'], ['read', 'empty, Strike, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Strike'], ['press', 'ArrowLeft'], ['keys', 'x'], ['read', 'Strike, caret moved, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'abcd'], ['press', 'Meta+a'], ['click', 'Strike'], ['press', 'ArrowRight'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Strike'], ['keys', 'x'], ['read', 'inside struck text, Strike, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Strike'], ['click', 'Bold'], ['keys', 'x'], ['read', 'Strike, Bold, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['press', 'Enter'], ['keys', 'x'], ['read', 'Strike, Enter, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'caret, a color', { html: [0, 'new'] }], ['press', 'Escape'], ['read', 'caret, a color, Escape', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['click', 'Text Highlight'], ['read', 'caret, Highlight', { html: [0, 'new'] }],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keysList', ['o', 'n', 'e', 'Meta+b', 't', 'w', 'o']], ['press', 'Escape'], ['undoWalk', 'a burst with Cmd+B in it', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['pause', 3000], ['keysList', ['Meta+b', 't', 'w', 'o']], ['press', 'Escape'], ['undoWalk', 'a pause before Cmd+B, none after', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keysList', ['o', 'n', 'e', 'Meta+b']], ['pause', 3000], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'no pause before Cmd+B, one after', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'a'], ['pause', 500], ['keys', 'b'], ['pause', 500], ['keys', 'c'], ['pause', 500], ['keys', 'd'], ['press', 'Escape'], ['undoWalk', 'letters 0.8 s apart', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'a'], ['pause', 1500], ['keys', 'b'], ['press', 'Escape'], ['undoWalk', 'letters 1.8 s apart', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['click', 'Strike'], ['keys', 'x'], ['press', 'Escape'], ['undoWalk', 'Strike with a caret', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['click', 'Bold'], ['keys', 'x'], ['press', 'Escape'], ['undoWalk', 'Bold on an empty block', 0, 'new', 12, true],
  ] },
  'CAP-E4FRESH2': { page: 'Gestures Probe', question: 'E4: second fresh cases after a written prediction. The caret at a mark\'s edge, nesting with color and highlight, Text Color and Clear Formatting with a caret, Enter and Backspace with a pending Strike.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'caret after plain, before bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ...LEFT4, ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['click', 'Bold'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'caret after bold, before plain', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ...LEFT4, ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['click', 'Bold'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'caret at the start, bold after it', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['click', 'Bold'], ['click', 'Bold'], ['read', 'empty line, Bold twice', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Strike'], ['press', 'ArrowRight'], ['click', 'Italic'], ['read', 'Italic on struck text', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha.com x'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'color over a link', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Highlight'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'Bold over a highlight', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Highlight'], ['press', 'ArrowRight'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'color over a highlight', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['click', 'Bright'], ['press', 'Escape'], ['read', 'color, Escape', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'color, Escape, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['click', 'Text Color'], ['click', 'Bright'], ['press', 'Escape'], ['keys', 'x'], ['read', 'empty, color, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Color'], ['click', 'Bright'], ['press', 'ArrowRight'], ['click', 'Text Color'], ['click', 'Darkest'], ['read', 'a color over part in another', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'one color, the popover', { html: [0, 'new'], has: ['Bright'] }], ['clickIf', 'Bright'], ['read', 'the same color twice', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['clickIf', 'Custom'], ['fill', 'Hex', '#00ff00'], ['press', 'Tab'], ['read', 'caret, custom color', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Italic'], ['press', 'ArrowRight'], ['click', 'Clear Formatting'], ['read', 'caret, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Text Color'], ['click', 'Bright'], ['press', 'Escape'], ['click', 'Clear Formatting'], ['read', 'all selected, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Bold'], ['press', 'Enter'], ['keys', 'x'], ['read', 'bold, Enter, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['press', 'Backspace'], ['keys', 'x'], ['read', 'Strike, Backspace, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['click', 'Strike'], ['click', 'Bold'], ['keys', 'x'], ['read', 'empty, Strike, Bold, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['click', 'Italic'], ['keys', 'x'], ['read', 'Strike, Italic, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Highlight'], ['keys', 'x'], ['read', 'caret, Highlight, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['press', 'Enter'], ['press', 'Enter'], ['keys', 'x'], ['read', 'Strike, two Enters, typed', { html: [0, 'new'] }],
  ] },
  'CAP-E4FRESH3': { page: 'Gestures Probe', question: 'E4: third fresh cases after a written prediction. A selection over paragraphs and over mixed text, Clear Formatting on a selection, a caret near a highlight, Strike at the edge of struck text, typing after Escape.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'selection over paragraphs, Bold', { html: [0, 'new'] }], ['click', 'Bold'], ['read', 'selection over paragraphs, Bold off', { html: [0, 'new'] }], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'selection over paragraphs, a color', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'selection over mixed text, Bold', { html: [0, 'new'] }], ['click', 'Bold'], ['read', 'selection over mixed text, off', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bold'], ['press', 'ArrowRight'], ['press', 'ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['click', 'Bold'], ['read', 'part of a bold word, Bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...Array.from({ length: 8 }, () => ['press', 'ArrowLeft']), ['press', 'Shift+ArrowLeft'], ['press', 'Shift+ArrowLeft'], ['click', 'Bold'], ['press', 'ArrowRight'], ['press', 'ArrowRight'], ['press', 'ArrowRight'], ['press', 'ArrowRight'], ['click', 'Bold'], ['read', 'a word bold at its start, caret at its end', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Monospace'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'monospace, selection, Bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Italic'], ['click', 'Strike'], ['click', 'Clear Formatting'], ['read', 'selection, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Text Color'], ['click', 'Bright'], ['click', 'Clear Formatting'], ['read', 'a color, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Text Highlight'], ['click', 'Clear Formatting'], ['read', 'a highlight, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha.com x'], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Clear Formatting'], ['read', 'a link, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Meta+a'], ['click', 'Bold'], ['click', 'Clear Formatting'], ['read', 'a heading, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bullet List'], ['click', 'Clear Formatting'], ['read', 'a list, Clear Formatting', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Strike'], ['press', 'ArrowLeft'], ['click', 'Strike'], ['keys', 'x'], ['read', 'Strike at the left edge of struck text, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Highlight'], ['read', 'a highlight on a word', { html: [0, 'new'] }], ['press', 'ArrowRight'], ['read', 'a highlight, caret after', { html: [0, 'new'] }], ['keys', 'x'], ['read', 'a highlight, caret after, typed', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Highlight'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'a highlight, caret in plain text, Bold', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Text Highlight'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'a highlight, caret in plain text, a color', { html: [0, 'new'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Escape'], ['read', 'typed, Escape', { has: ['Bold'] }], ['keys', 'x'], ['read', 'typed, Escape, typed', { html: [0, 'new'], has: ['Bold'] }],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['click', 'Bright'], ['read', 'a color, the bar', { has: ['Bold'] }], ['press', 'Escape'], ['read', 'a color, Escape, the bar', { has: ['Bold'] }], ['press', 'Escape'], ['read', 'a color, two Escapes, the bar', { has: ['Bold'] }], ['keys', 'x'], ['read', 'a color, two Escapes, typed', { html: [0, 'new'] }],
  ] },
  'CAP-U3STACKPILL': { page: 'Gestures Probe', question: "U3: a stack's pill, hovered and selected, on desktop and the phone. Unnamed presses: real clicks on blocks, a drag.", steps: [
    ...STACK3, ['read', 'stack selected', { frameEls: '.sqs-block-label-tag', controls: true }], ['press', 'Escape'], ['pause', 300], ['deselect', 0], ['hoverBlock', 0, 0], ['pause', 500], ['read', 'stack hovered', { frameEls: '.sqs-block-label-tag', areas: 0 }], ['shot', 'stackpill'],
    ['select', 0, 0], ['pause', 300], ['pressRow', 'Shape'], ['pause', 400], ['read', 'child selected', { frameEls: '.sqs-block-label-tag' }], ['press', 'Escape'], ['pause', 300], ['press', 'Escape'], ['deselect', 0],
    ['view', 'Mobile'], ['pause', 500], ['hoverBlock', 0, 0], ['pause', 500], ['read', 'stack hovered, phone', { frameEls: '.sqs-block-label-tag' }],
  ] },
  'CAP-U3GROUPHIT': { page: 'Gestures Probe', question: "U3, U4: a group's eight handles, each hit box up to its edge, and the group toolbar's shadow against one block's. Unnamed presses: real clicks on blocks, a drag.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 500, 120], ['press', 'Escape'], ['select', 0, 0], ['pause', 300], ['read', 'one block', { cursorEls: true, shadowOf: 'Duplicate' }],
    ['shiftClick', 0, 1], ['pause', 400], ['read', 'group', { cursorEls: true, shadowOf: 'Duplicate', controls: true }], ['shot', 'group'],
  ] },
  'CAP-U3GUIDES': { page: 'Gestures Probe', question: 'U3: what is drawn while a block is held, on the types beyond text and shape. One hold per type. Unnamed presses: real holds on blocks.', steps: [
    ['enter'], ['blank'],
    ...['Image', 'Button', 'Line', 'Video', 'Accordion', 'Form', 'Quote', 'Map', 'Code', 'Scrolling', 'Embed', 'Markdown'].flatMap((n) => [['add', 0, n], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 300], ['hold', 0, 'new', 'middle', 123, 77], ['pause', 300], ['read', `${n} held`, { block: [0, 'new'], layers: 0, cursorEls: true, frameEls: '.sqs-block-label-tag' }], ['release'], ['pause', 400], ['select', 0, 'new'], ['pressNamed', 'Remove'], ['pause', 500]]),
  ] },
  'CAP-U4ZCOUNT': { page: 'Gestures Probe', question: 'U4: do Move Forward and Backward count only overlapping blocks with nothing pinned? Text and Shape overlap, a Line on top of the order overlaps neither. Unnamed presses: real clicks on blocks, a drag.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Line'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 700, 300], ['press', 'Escape'], ['pause', 300], ['read', 'start', { stack: 0 }],
    ['select', 0, 0], ['pause', 300], ['read', 'first selected', { controls: true, thin: true, stack: 0 }], ['press', 'Escape'], ['pause', 300], ['deselect', 0],
    ['select', 0, 1], ['pause', 300], ['read', 'second selected', { controls: true, thin: true, stack: 0 }], ['press', 'Escape'], ['pause', 300], ['deselect', 0],
    ['select', 0, 2], ['pause', 300], ['read', 'third selected', { controls: true, thin: true, stack: 0 }],
  ] },
  'CAP-U4PINALONE': { page: 'Gestures Probe', question: 'U4: does a pinned block alone in its section show Move Forward and Backward? And Pin to a slider move after a non-px value.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 300], ['read', 'alone', { controls: true, thin: true }], ['pressNamed', 'Pin'], ['pause', 600], ['read', 'pin open', { controls: true, thin: true, range: true }], ['shot', 'pinopen'],
    ['pressNamed', 'Pin to Top on Scroll'], ['pause', 500], ['read', 'pinned, popover open', { range: true, block: [0, 'new'] }], ['press', 'Escape'], ['pause', 500], ['read', 'pinned alone', { controls: true, thin: true, block: [0, 'new'] }], ['shot', 'pinned'],
  ] },
  'CAP-U4TIPS': { page: 'Gestures Probe', question: "U4: the tip's delay in the page's own clock, and the tip on a Button that is not Primary", steps: [
    ['enter'], ['blank'], ['add', 0, 'Button'], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 400], ['read', 'button', { controls: true, thin: true }],
    ['tipDelay', 'Duplicate', 'Duplicate delay', 5], ['tipDelay', 'Remove', 'Remove delay', 3], ['tipRead', 'Primary', 'tip on Primary'], ['shot', 'tip'],
  ] },
  'CAP-U5WORDS': { page: 'Gestures Probe', question: 'U5: the words behind Add Block search. Words typed by real keys; no tile and no Enter pressed.', steps: [
    ['enter'], ['blank'], ['hover', 0], ['pause', 400], ['click', 'Add Block'], ['pause', 1000], ['searchWords', 'words', WORDS], ['press', 'Escape'],
  ] },
  'CAP-U4ZPRESS': { page: 'Gestures Probe', question: 'U4: what Move Forward and Backward step over. The order is Text, Line, Shape; Text and Shape overlap, the Line overlaps neither, and sits between them. Unnamed presses: real clicks on blocks, a drag.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['add', 0, 'Line'], ['press', 'Escape'], ['drag', 0, 'new', 'middle', 700, 300], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['pause', 300], ['read', 'start', { stack: 0 }],
    ['select', 0, 'new'], ['pause', 300], ['read', 'Shape selected', { btnState: Z2, stack: 0 }],
    ['pressNamed', 'Move Forward'], ['pause', 400], ['read', 'Shape, Forward', { btnState: Z2, stack: 0 }],
    ['pressNamed', 'Move Backward'], ['pause', 400], ['read', 'Shape, Backward', { btnState: Z2, stack: 0 }],
    ['pressNamed', 'Move Backward'], ['pause', 400], ['read', 'Shape, Backward again', { btnState: Z2, stack: 0 }],
    ['pressNamed', 'Move Backward'], ['pause', 400], ['read', 'Shape, Backward a third time', { btnState: Z2, stack: 0 }],
    ['pressNamed', 'Move Forward'], ['pause', 400], ['read', 'Shape, Forward again', { btnState: Z2, stack: 0 }],
  ] },
  'CAP-U4PINUNIT': { page: 'Gestures Probe', question: 'U4: a move of the Pin offset slider after a value that is not in px. Unnamed presses: real clicks on the block, keys on the slider.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 300], ['pressNamed', 'Pin'], ['pause', 600], ['read', 'open', { panelEls: 'input' }],
    ['fillValue', '0px', '5vh'], ['pause', 500], ['read', '5vh', { panelEls: 'input', block: [0, 'new'] }], ['rangeKey', 'ArrowRight'], ['read', '5vh, ArrowRight', { panelEls: 'input', block: [0, 'new'] }], ['rangeKey', 'ArrowRight'], ['read', '5vh, ArrowRight twice', { panelEls: 'input', block: [0, 'new'] }],
    ['press', 'Escape'], ['pause', 400],
  ] },
  'CAP-U4PINDRAG': { page: 'Gestures Probe', question: 'U4: a real drag of the Pin offset slider after a value that is not in px. Unnamed presses: real clicks on the block, a drag on the slider by its place.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 300], ['pressNamed', 'Pin'], ['pause', 600], ['fillValue', '0px', '5vh'], ['pause', 500], ['read', '5vh', { panelEls: 'input[aria-label="Offset"]' }], ['shot', 'fivevh'],
    ['dragAt', 79, 394, 150, 394], ['pause', 500], ['read', 'dragged', { panelEls: 'input[aria-label="Offset"]', block: [0, 'new'] }], ['shot', 'dragged'], ['press', 'Escape'], ['pause', 400],
  ] },
  'CAP-U3GUIDES2': { page: 'Gestures Probe', question: 'U3: an Image and a Line held near a corner, then every layer in the grid. Unnamed presses: real holds on blocks.', steps: [
    ['enter'], ['blank'], ['add', 0, 'Image'], ['pause', 800], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 300], ['hold', 0, 'new', [0.1, 0.1], 123, 77], ['pause', 300], ['read', 'Image held by its corner', { block: [0, 'new'], layers: 0, frameEls: '.sqs-block-label-tag' }], ['shot', 'imageheld'], ['release'], ['pause', 500], ['read', 'dropped', { areas: 0 }],
  ] },
  'CAP-U4BTNTIP': { page: 'Gestures Probe', question: 'U4: the tip on a Button that is not Primary', steps: [
    ['enter'], ['blank'], ['add', 0, 'Button'], ['press', 'Escape'], ['select', 0, 'new'], ['pause', 400], ['pressNamed', 'Primary'], ['pause', 600], ['read', 'menu', { controls: true, thin: true }], ['shot', 'btnmenu'], ['click', 'Secondary'], ['pause', 600], ['read', 'secondary', { controls: true, thin: true }], ['tipRead', 'Secondary', 'tip on Secondary'], ['shot', 'tipsec'],
  ] },
  'CAP-E4SCORE': { page: 'Gestures Probe', question: 'E4: the last score. Cases not read before, on the rules as they stand. Predictions pushed first, no fitting after.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Italic'], ['press', 'ArrowLeft'], ['click', 'Italic'], ['read', 'Italic, caret at the left edge of italic', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'Bold, caret at the start of a bold line', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowLeft'], ['press', 'ArrowLeft'], ['click', 'Bold'], ['read', 'Bold, caret at the end of a plain line, next line bold', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Quote'], ['click', 'Bold'], ['read', 'Bold with a caret in a quote', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Style'], ['click', 'Heading 2'], ['press', 'Enter'], ['keys', 'beta'], ['click', 'Bold'], ['read', 'Bold with a caret, heading and paragraph', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['press', 'Meta+a'], ['press', 'Meta+b'], ['read', 'Cmd+B on a selection over paragraphs', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['press', 'Enter'], ['keys', 'beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'Bold over an empty line', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Strike'], ['press', 'Meta+a'], ['click', 'Strike'], ['read', 'Strike over text partly struck', H], ['click', 'Strike'], ['read', 'Strike over all of it again', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['press', 'ArrowRight'], ...LEFT4, ['click', 'Italic'], ['read', 'Italic on a part of bold', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['press', 'ArrowRight'], ...LEFT4, ['click', 'Text Color'], ['click', 'Bright'], ['read', 'a color on a part of bold', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ['press', 'Meta+a'], ['click', 'Bold'], ['press', 'ArrowRight'], ...LEFT4, ['click', 'Clear Formatting'], ['read', 'Clear Formatting on a part of bold', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['press', 'Meta+a'], ['click', 'Italic'], ['click', 'Clear Formatting'], ['read', 'Clear Formatting over paragraphs', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['click', 'Bright'], ['click', 'Clear Formatting'], ['read', 'Clear Formatting with a caret on a color', H],
    ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['press', 'Enter'], ['keys', 'three'], ['press', 'Meta+a'], ['click', 'Bullet List'], ['read', 'three lines, Bullet List', H], ['click', 'Numbered List'], ['read', 'then Numbered List', H], ['click', 'Numbered List'], ['read', 'then Numbered List again', H],
    ...NEWTEXT, ['keys', 'one'], ['press', 'Enter'], ['keys', 'two'], ['press', 'Meta+a'], ['click', 'Quote'], ['read', 'two lines, Quote', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['keys', 'beta'], ['click', 'Bold'], ['press', 'Enter'], ['keys', 'x'], ['read', 'Bold on both, Enter, typed', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['press', 'Enter'], ['press', 'Backspace'], ['keys', 'x'], ['read', 'Strike, Enter, Backspace, typed', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Strike'], ['click', 'Text Color'], ['click', 'Bright'], ['keys', 'x'], ['read', 'Strike, a color, typed', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Enter'], ['click', 'Strike'], ['keys', 'x'], ['read', 'Strike on an empty second line, typed', H],
    ...NEWTEXT, ['keys', 'alpha'], ['click', 'Text Color'], ['click', 'Bright'], ['click', 'Bold'], ['read', 'a color with a caret, then Bold', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Text Highlight'], ['click', 'Strike'], ['read', 'Highlight, then Strike', H],
    ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Text Highlight'], ['click', 'Text Style'], ['click', 'Heading 2'], ['read', 'Highlight, then a heading', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['keys', 'x'], ['read', 'a bold selection typed over', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowRight'], ['keys', 'x'], ['read', 'typed at the end of a bold word', H],
    ...NEWTEXT, ['keys', 'alpha beta'], ...LEFT4, ['click', 'Bold'], ['press', 'ArrowLeft'], ['keys', 'x'], ['read', 'typed just before a bold word', H],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['pause', 3000], ['click', 'Text Color'], ['click', 'Bright'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'typing around a color', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bold'], ['pause', 3000], ['click', 'Clear Formatting'], ['press', 'Escape'], ['undoWalk', 'Bold, a wait, Clear Formatting', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['pause', 3000], ['click', 'Text Style'], ['click', 'Heading 2'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'typing around a style', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keys', 'one'], ['click', 'Bullet List'], ['keys', 'two'], ['press', 'Escape'], ['undoWalk', 'typing around a list', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['keysList', ['o', 'n', 'e', 'Meta+b', 'Meta+i']], ['press', 'Escape'], ['undoWalk', 'a burst with Cmd+B and Cmd+I', 0, 'new', 12, true],
  ] },
  'CAP-E4GAP': { page: 'Gestures Probe', question: 'E4: does selecting start the undo clock? Bold at clear gaps from typing and from selecting, the real gaps stamped in the page.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['stamp', 0, 'new'], ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'as in the score: typed, Cmd+A, Bold pressed, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'as in the score: typed, Cmd+A, Bold pressed', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keysList', ['a', 'l', 'p', 'h', 'a', 'Meta+a']], ['pause', 200], ['keysList', ['Meta+b']], ['read', 'typed and Cmd+A in one burst, 0.5 s, Cmd+B, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed and Cmd+A in one burst, 0.5 s, Cmd+B', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keysList', ['a', 'l', 'p', 'h', 'a', 'Meta+a']], ['pause', 1200], ['keysList', ['Meta+b']], ['read', 'typed and Cmd+A in one burst, 1.5 s, Cmd+B, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed and Cmd+A in one burst, 1.5 s, Cmd+B', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keysList', ['a', 'l', 'p', 'h', 'a']], ['pause', 2700], ['keysList', ['Meta+a']], ['pause', 200], ['keysList', ['Meta+b']], ['read', 'typed, 3 s, Cmd+A, 0.5 s, Cmd+B, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, 3 s, Cmd+A, 0.5 s, Cmd+B', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keysList', ['a', 'l', 'p', 'h', 'a']], ['pause', 2700], ['keysList', ['Meta+a']], ['pause', 1200], ['keysList', ['Meta+b']], ['read', 'typed, 3 s, Cmd+A, 1.5 s, Cmd+B, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, 3 s, Cmd+A, 1.5 s, Cmd+B', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keysList', ['a', 'l', 'p', 'h', 'a']], ['pause', 200], ['keysList', ['Meta+b']], ['read', 'typed, 0.5 s, Cmd+B, no selection, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, 0.5 s, Cmd+B, no selection', 0, 'new', 12, true],
  ] },
  'CAP-E4GAP2': { page: 'Gestures Probe', question: 'E4: the real gap to a Bold press on the bar, by the DOM change it makes, with and without a selection.', steps: [
    ['enter'], ['blank'],
    ...NEWTEXT, ['stamp', 0, 'new'], ['keys', 'alpha'], ['press', 'Meta+a'], ['click', 'Bold'], ['read', 'typed, Cmd+A pressed, Bold pressed, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, Cmd+A pressed, Bold pressed', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keys', 'alpha'], ['keysList', ['Meta+a']], ['click', 'Bold'], ['read', 'typed, Cmd+A with no wait, Bold pressed, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, Cmd+A with no wait, Bold pressed', 0, 'new', 12, true],
    ['exit'], ['enter'], ['blank'], ...NEWTEXT, ['stamp', 0, 'new'], ['keys', 'alpha'], ['pause', 300], ['click', 'Bold'], ['read', 'typed, 0.3 s, Bold pressed, stamps', { stamps: true }], ['press', 'Escape'], ['undoWalk', 'typed, 0.3 s, Bold pressed', 0, 'new', 12, true],
  ] },
  'CAP-U6REDO': { page: 'Gestures Probe', question: "U6: Redo's hover while it can redo, against Undo's", steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['pause', 400], ['read', 'can undo', { btnState: UR }], ['hoverNamed', 'Undo'], ['read', 'Undo hovered', { btnState: UR }], ['pressNamed', 'Undo'], ['pause', 800], ['read', 'undone, pointer on Undo', { btnState: UR }], ['hoverNamed', 'Redo'], ['read', 'Redo hovered', { btnState: UR }], ['shot', 'redo'],
  ] },
  'CAP-U6OVERLAY': { page: 'Gestures Probe', question: "U6: the overlay under Exit's dialog, as computed styles. Nothing pressed in the dialog: Escape closes it.", steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['pause', 400], ['read', 'before', { fullEls: true }], ['pressNamed', 'Exit'], ['pause', 700], ['read', 'dialog', { fullEls: true }], ['shot', 'dialog'], ['press', 'Escape'], ['pause', 700], ['read', 'after Escape', { fullEls: true }],
  ] },
  'CAP-U6TIPS': { page: 'Gestures Probe', question: "U6: the bar's tips at more window widths. Hovers only, then Preview by name for its two.", steps: [
    ['enter'], ['blank'],
    ...[1024, 1280, 1440, 1600, 1920, 2400].flatMap((w) => [['window', w, 1000], ['pause', 800], ...BARTIPS.flatMap((l) => [['tipRead', l, `${w} ${l}`]])]),
    ['window', 1600, 1000], ['pause', 800], ['pressNamed', 'Toggle preview mode'], ['pause', 1500], ['read', 'preview', { controls: true, thin: true }], ['shot', 'preview'],
  ] },
  'CAP-U9FADE': { page: 'Gestures Probe', question: 'U9: Add Section and the section outline, frame by frame, as the pointer comes on and goes off', steps: [
    ['enter'], ['blank'], ['fadeWatch', 0, 'first'], ['fadeWatch', 0, 'second'], ['fadeWatch', 0, 'third'],
  ] },
  'CAP-U9SHADOW': { page: 'Gestures Probe', question: "U9: the canvas's shadow as computed styles, phone and desktop", steps: [
    ['enter'], ['read', 'desktop', { shadowChain: '#sqs-site-frame' }], ['view', 'Mobile'], ['pause', 900], ['read', 'phone', { shadowChain: '#sqs-site-frame' }], ['shot', 'phone'],
  ] },
  'CAP-U9PHONEPANEL': { page: 'Gestures Probe', question: "U9: the phone panel's top: more readings, on three sections", steps: [
    ['enter'], ['blank'], ['blank'], ['blank'], ['view', 'Mobile'], ['pause', 900],
    ...[0, 1, 2].flatMap((i) => [['panel', i], ['pause', 600], ['read', `section ${i}`, { panelBox: i }], ['press', 'Escape'], ['pause', 500]]),
    ['panel', 1], ['pause', 600], ['read', 'section 1 again', { panelBox: 1 }], ['shot', 'phonepanel'], ['press', 'Escape'], ['pause', 500],
  ] },
  'CAP-U9SCROLL': { page: 'Gestures Probe', question: 'U9: an open section panel while the frame scrolls in steps of 20, down and back', steps: [
    ['enter'], ['blank'], ['blank'], ['blank'], ['blank'], ['panel', 1], ['pause', 700], ['read', 'open', { panelBox: 1 }], ['scrollWalk', 'down', 20, 40], ['scrollWalk', 'up', -20, 40], ['press', 'Escape'], ['pause', 400],
  ] },
  'CAP-U9SCROLL2': { page: 'Gestures Probe', question: 'U9: an open section panel, scrolled down a little and back, in steps of 20, then 5', steps: [
    ['enter'], ['blank'], ['blank'], ['blank'], ['blank'], ['panel', 1], ['pause', 700], ['read', 'open', { panelBox: 1 }], ['scrollWalk', 'down', 20, 15], ['scrollWalk', 'up', -20, 30], ['scrollWalk', 'down again by 5', 5, 30], ['scrollWalk', 'up by 5', -5, 40], ['press', 'Escape'], ['pause', 400],
  ] },
  'CAP-SECTIONMODEL': { page: 'Gestures Probe', question: 'U10: what Duplicate, Move, Remove and the Add Section picker do to the page', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['blank'], ['read', 'two sections', { sections: true }],
    ['hover', 0], ['click', 'Duplicate Section'], ['read', 'first duplicated', { sections: true }], ['hover', 0], ['click', 'Move Section Down'], ['read', 'first moved down', { sections: true }], ['hover', 1], ['click', 'Remove Section'], ['read', 'remove asks', { sections: true, controls: true }], ['shot', 'asks'], ['click', 'Remove'], ['read', 'second removed', { sections: true }],
    ['hover', 0], ['click', 'Add Section'], ['read', 'picker', { controls: true }], ['shot', 'picker'], ['clickIf', 'Team'], ['read', 'Team', { controls: true }], ['shot', 'team'],
  ] },
  'CAP-BASESIZE': { page: 'Gestures Probe', question: 'U12: Base Size limits. Reset is not pressed.', steps: [
    ['enter'], ['click', 'Toggle Site Styles editing'], ['read', 'panel', { controls: true }], ['click', 'Open Fonts style disclosure'], ['read', 'fonts', { controls: true }], ['shot', 'fonts'], ['fillValue', '16', '1'], ['read', 'typed 1', { controls: true, sel: 'h1' }], ['shot', 'one'], ['press', 'Tab'], ['read', 'after tab', { controls: true }], ['fillValue', '12', '999'], ['read', 'typed 999', { controls: true, sel: 'h1' }], ['shot', 'big'],
  ] },
  'CAP-GROUP3': { page: 'Gestures Probe', question: 'X8: a second group, of three blocks, for the scale rule', steps: [
    ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Shape'], ['press', 'Escape'], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'added', { areas: 0 }], ['drag', 0, 0, 'middle', 700, 200], ['press', 'Escape'], ['drag', 0, 1, 'middle', 200, 0], ['press', 'Escape'], ['read', 'spread', { areas: 0 }], ['select', 0, 0], ['shiftClick', 0, 1], ['shiftClick', 0, 2], ['read', 'group', { areas: 0 }], ['groupDrag', 0, 240, 120], ['read', 'corner out', { areas: 0 }], ['shot', 'out'], ['groupDrag', 0, -360, -160], ['read', 'corner in', { areas: 0 }],
  ] },
  'CAP-TEXTWIDTH': { page: 'Gestures Probe', question: 'X8, R2: rows of a long text block as it widens and narrows, and select with stretched rows', steps: [
    ['enter'], ['blank'], ['add', 0, 'Text'], ['press', 'Escape'], ['pick', 0, 'new'], ['click', 'Write'], ['keys', 'Start of a long text here'], ['pasteMid', 0, 'new', "<p>Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines. Row height follows the width so a layout keeps its proportions when the window changes and text wraps onto more lines.</p>"], ['press', 'Escape'], ['press', 'Escape'], ['read', 'pasted', { areas: 0, section: 0 }], ['shot', 'pasted'],
    // One column at a time out to 24 and back, so a row taken off shows where it happens.
    ...Array.from({ length: 16 }, (_, n) => [['press', 'Escape'], ['pick', 0, 0], ['drag', 0, 0, 'e', 58.78, 0], ['read', `wider ${n + 1}`, { areas: 0, section: 0, textH: [0, 0] }]]).flat(), ...Array.from({ length: 20 }, (_, n) => [['press', 'Escape'], ['pick', 0, 0], ['drag', 0, 0, 'e', -58.78, 0], ['read', `narrower ${n + 1}`, { areas: 0, section: 0, textH: [0, 0] }]]).flat(),
    ['press', 'Escape'], ['frame', 800, 900], ['read', 'frame 800', { areas: 0, section: 0 }], ['shot', 'stretched'], ...[1, 2, 3].flatMap((n) => [['select', 0, 0], ['read', `select ${n}`, { areas: 0, section: 0 }], ['press', 'Escape'], ['press', 'Escape']]), ['pick', 0, 0], ['drag', 0, 0, 'e', 60, 0], ['read', 'widened at 800', { areas: 0, section: 0 }], ['unframe'],
  ] },

  // The stored finding also pressed real Cmd+C and Cmd+V, before the ruling against them. Those steps are gone from this recipe: never press them.
  'CAP-COPYPASTE': { page: 'Gestures Probe', question: 'U11, Y4: Copy and Paste of a block, inside a section, between sections and between pages, with the clipboard calls kept in memory', steps: [
    ['enter'], ['blank'], ['add', 0, 'Line'], ['press', 'Escape'], ['add', 0, 'Button'], ['press', 'Escape'], ['blank'], ['add', 1, 'Line'], ['press', 'Escape'], ['stubClipboard'], ['read', 'before', { areas: 0, clip: true }],
    ['rightClick', 0, 0], ['click', 'Copy'], ['read', 'after copy', { clip: true, areas: 0 }], ['rightClick', 0, 0], ['click', 'Paste'], ['read', 'pasted on the source', { clip: true, areas: 0 }], ['shot', 'pasted'], ['rightClick', 0, 0], ['click', 'Paste'], ['read', 'pasted again', { areas: 0 }], ['press', 'Meta+z'], ['read', 'one undo', { areas: 0 }],
    ['rightClick', 1, 0], ['click', 'Paste'], ['read', 'pasted in another section', { areas: 1 }],
    ['rightClick', 0, 0], ['click', 'Copy'], ['toPage', 'Blocks Probe'], ['blank'], ['read', 'another page', { sections: true }], ['add', 0, 'Line'], ['press', 'Escape'], ['read', 'line on another page', { areas: 0 }], ['rightClick', 0, 0], ['shot', 'menu'], ['clickIf', 'Paste'], ['read', 'pasted on another page', { areas: 0 }], ['exit'], ['read', 'left', { sections: true }],
  ] },

};
