// Start a headless Chrome for our editor's checks, so they never need a visible tab:
//   eval "$(node scripts/headless.mjs)"     prints: export FLUID_SURFACE=cdp:9333
// For the oracle in headless Chrome, see scripts/oracle-headless.mjs.
import { startChrome } from './lib/chrome.mjs';

const port = Number(process.env.CDP_PORT || 9333);
await startChrome(port);
console.log(`export FLUID_SURFACE=cdp:${port}`);
