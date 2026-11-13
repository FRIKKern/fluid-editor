// oracle-readback.mjs with no browser and no site, for check-readback.mjs:
//   READBACK_STUB='{"dir":"<folder>","diffs":[...]}' node --import ./scripts/oracle/readback-stub.mjs scripts/oracle-readback.mjs --store
// cmux, press and ui answer as a page with Site Styles closed, each footer the stored base. runSets returns the stub's
// diffs and notRead, STYLE_FILE and THEME_FILE are styles.json and themes.json in its dir, and themeStore returns a
// stand-in, so a store is a file appearing there. exit: the top bar shows Exit with Save on, and Exit then 'asks' and
// the page closes, 'stays' (no question, still editing) or 'throws'.
import { registerHooks } from 'node:module';

const at = (p) => new URL(p, import.meta.url).href;
const STUBS = {
  cmux: `import { FOOTER, FOOTER_READ } from ${JSON.stringify(at('./footer.mjs'))};
const stub = JSON.parse(process.env.READBACK_STUB);
let path = '/';
export const goto = (S, url) => { path = new URL(url).pathname; };
export const evalJs = (S, code) => code === FOOTER_READ ? FOOTER.reads[path] ?? null
  : code.includes("has('Save')") ? (stub.exit && !(globalThis.exited && stub.exit === 'asks') ? { edit: false, exit: true, save: 'on' } : { edit: true, exit: false, save: 'none' }) : null;
export const viewport = () => {}, mouse = () => {}, browser = () => {}, pause = async () => {};`,
  press: 'export const pressOnTop = async () => {};',
  ui: `const { exit } = JSON.parse(process.env.READBACK_STUB);
export const exitWithoutSaving = async () => { if (exit === 'throws') throw new Error('Exit: none'); globalThis.exited = true; return exit === 'asks'; };`,
  readback: `export * from ${JSON.stringify(at('./readback.mjs'))};
const stub = JSON.parse(process.env.READBACK_STUB);
export const runSets = async () => ({ diffs: [...(stub.diffs || [])], notRead: [...(stub.notRead || [])] });
export const STYLE_FILE = new URL('styles.json', 'file://' + stub.dir + '/'), THEME_FILE = new URL('themes.json', 'file://' + stub.dir + '/');
export const themeStore = () => ({ stub: true });`,
};
const STUB_OF = { [at('../lib/cmux.mjs')]: 'cmux', [at('./press.mjs')]: 'press', [at('./ui.mjs')]: 'ui', [at('./readback.mjs')]: 'readback' };

registerHooks({
  resolve(spec, ctx, next) {
    const r = next(spec, ctx), name = STUB_OF[r.url];
    // The readback stand-in imports the real module: that one import is not redirected.
    return name && ctx.parentURL !== 'stub:readback' ? { url: `stub:${name}`, shortCircuit: true } : r;
  },
  load(url, ctx, next) {
    return url.startsWith('stub:') ? { format: 'module', source: STUBS[url.slice(5)], shortCircuit: true } : next(url, ctx);
  },
});
