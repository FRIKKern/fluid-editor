// The row walker presses by name and has no fallback that guesses.
import { readFileSync } from 'node:fs';
import { isBack, hasName, noRows, onNoList, reachesOut, WIDE_NOTE } from './lib/press-names.mjs';

const fails = [];
const is = (what, got, want) => { if (got !== want) fails.push(`${what}: got ${got}, want ${want}`); };
is('Back', isBack('Back'), true);
is('Go back', isBack(' Go back'), true);
is('no name', isBack(''), false);
is('Close', isBack('Close'), false);
is('Backup', isBack('Backup'), false);
is('a named row', hasName({ name: 'Ratio', row: 'Image' }), true);
is('a choice under a heading', hasName({ name: 'option 2', row: 'Block Alignment' }), true);
is('a choice with no heading', hasName({ name: 'option 2', row: '' }), false);
is('nothing at all', hasName({ name: '', row: '' }), false);
const unread = JSON.parse(readFileSync(new URL('../parity/findings/UNREAD.json', import.meta.url), 'utf8'));
is('UNREAD: Zola Registry Name', onNoList({ name: 'Registry Name', row: 'x' }, noRows(unread, 'Zola')), true);
is('UNREAD: Zola Add Padding', onNoList({ name: 'Add Padding', row: 'Add Padding' }, noRows(unread, 'Zola')), false);
is('UNREAD: Donation Funds', onNoList({ name: 'Navigate to Funds', row: 'x' }, noRows(unread, 'Donation')), true);
is('UNREAD: a row under General Fund', onNoList({ name: 'x', row: 'General Fund' }, noRows(unread, 'Donation')), true);
is('UNREAD: Summary empty menu', onNoList({ name: 'No metadata found', row: 'x' }, noRows(unread, 'Summary')), true);
is('reach: an ID', reachesOut({ kind: 'field', name: 'OpenTable Restaurant ID' }), true);
is('reach: a URL', reachesOut({ kind: 'area', name: 'Enter a SoundCloud URL here' }), true);
is('reach: a lookup', reachesOut({ kind: 'field', name: 'Registry Name' }), true);
is('reach: plain words', reachesOut({ kind: 'field', name: 'Button Text', row: 'Lightbox' }), false);
is('reach: not a field', reachesOut({ kind: 'switch', name: 'Link' }), false);
is('wide note', WIDE_NOTE.test('Form style affects all forms on your site.'), true);
is('no wide note', WIDE_NOTE.test('Spacing between items'), false);
const src = readFileSync(new URL('./oracle-rows.mjs', import.meta.url), 'utf8');
is('no press by icon', /querySelector\('svg'\)/.test(src), false);
is('uses the name test', /BACK_NAME\.source/.test(src) && /hasName\(c0\)/.test(src), true);
is('uses the UNREAD, reach and note tests', /onNoList\(c0, NO\)/.test(src) && /reachesOut\(c0\)/.test(src) && /WIDE_NOTE\.test\(panelText\)/.test(src), true);
if (fails.length) { console.error(`press names: ${fails.join('; ')}`); process.exit(1); }
console.log('press names ok');
