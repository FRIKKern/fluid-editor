// The demo page. It is generated from the oracle page "How Fluid Engine works"
// (scripts/oracle-import.mjs), so our page and the oracle share block ids,
// grid areas and content. Gate B compares the two.
import { DEMO } from './demo-data.js';

export function demoModel() {
  return JSON.parse(JSON.stringify(DEMO));
}
