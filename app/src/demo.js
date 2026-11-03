// The demo page. It is generated from the oracle page "How Fluid Engine works"
// (scripts/oracle-import.mjs), so our page and the oracle share block ids,
// grid areas and content. Gate B compares the two.
import { DEMO } from './demo-data.js';

// The oracle's header (read 2026-11-03); the importer does not capture it yet.
const HEADER = { title: 'Your Site Title', nav: [{ label: 'Services' }, { label: 'About' }, { label: 'Contact' }], actions: [{ label: 'Login' }] };

export function demoModel() {
  return { header: HEADER, ...JSON.parse(JSON.stringify(DEMO)) };
}
