// The oracle's trial site, in one place. A new Squarespace trial sets
//   FLUID_ORACLE_SITE=<name>.squarespace.com
// and every oracle script follows. With no variable it is DEFAULT_SITE, so nothing changes.
// scripts/check-oracle-site.mjs fails if any other script names a *.squarespace.com site.

export const DEFAULT_SITE = 'halibut-keyboard-jlhd.squarespace.com';

// "<name>", "<name>.squarespace.com" or an address on it, to the host. Anything else stops the script:
// a trial site is always <name>.squarespace.com, and its editor is /config.
export function siteHost(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (!v) return DEFAULT_SITE;
  const host = v.replace(/^https?:\/\//, '').replace(/[/?#].*$/, '');
  const full = host.includes('.') ? host : `${host}.squarespace.com`;
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?\.squarespace\.com$/.test(full)) throw new Error(`FLUID_ORACLE_SITE: "${value}" is not a <name>.squarespace.com trial site`);
  return full;
}

export const HOST = siteHost(process.env.FLUID_ORACLE_SITE);
export const ORIGIN = `https://${HOST}`;
// The editor's page list: where a script starts, and where Exit can land.
export const EDITOR = `${ORIGIN}/config/pages`;
// Matches a URL or a cmux tree line on the trial site. A host holds only [a-z0-9.-], so only the dots need escaping.
export const HOST_RE = new RegExp(HOST.replace(/\./g, '\\.'));

// The pages the oracle scripts open by default. Squarespace makes the path from the title, so a new trial
// names them exactly so. The demo page comes with the template; the two probe pages are made by hand (0006).
export const DEMO = { title: 'How Fluid Engine works', path: '/how-fluid-engine-works' };
export const BLOCKS_PROBE = { title: 'Blocks Probe', path: '/blocks-probe' };
export const GESTURES_PROBE = { title: 'Gestures Probe', path: '/gestures-probe' };
