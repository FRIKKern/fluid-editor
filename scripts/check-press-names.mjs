// The row walker presses by name and has no fallback that guesses.
import { readFileSync } from 'node:fs';
import { isBack, hasName } from './lib/press-names.mjs';

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
const src = readFileSync(new URL('./oracle-rows.mjs', import.meta.url), 'utf8');
is('no press by icon', /querySelector\('svg'\)/.test(src), false);
is('uses the name test', /BACK_NAME\.source/.test(src) && /hasName\(c0\)/.test(src), true);
if (fails.length) { console.error(`press names: ${fails.join('; ')}`); process.exit(1); }
console.log('press names ok');
