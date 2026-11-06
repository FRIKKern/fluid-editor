// The phone-only button right of the Animation tab, its menu and the dotted labels (CAP-L6PHONEBTN.json,
// CAP-L6MENU.json, CAP-L6RESETALL.json, CAP-L6PUSH.json, CAP-L6GOTO.json). A phone place is not an override.
import { DESIGN_DEFAULTS, FOLLOW_DESKTOP } from './render.js';
import { setFormView } from './form-fields.js';

const BAGS = ['designMobile', 'btnMobile', 'formMobile', 'socialMobile'];
const filled = (o) => !!o && Object.keys(o).length > 0;
export const hasOverrides = (b) => BAGS.some((k) => filled(b[k]));
export function resetOverrides(b) { for (const k of BAGS) delete b[k]; }

// Desktop takes the phone's values and the phone follows again. Places don't move.
export function pushOverrides(b) {
  const design = { ...b.design };
  for (const [k, v] of Object.entries(b.designMobile || {})) {
    if (v === FOLLOW_DESKTOP) continue;
    if (k === 'color') b.color = v;
    else if ((b.type === 'shape' || b.type === 'image') && k === 'corner') { delete b.corners; if (v) b.radius = `${v}px`; else delete b.radius; }
    else if ((b.type === 'shape' || b.type === 'image') && k === 'corners') { b.corners = v; delete b.radius; }
    else if (v === '' || v === false || v == null || v === DESIGN_DEFAULTS[k] || (k === 'blend' && v === 'normal')) delete design[k];
    else design[k] = v;
  }
  if (filled(design)) b.design = design; else delete b.design;
  const btn = b.btnMobile;
  if (btn) {
    if (btn.fit) b.fit = true; else delete b.fit;
    if (btn.align && btn.align !== 'center') b.halign = btn.align; else delete b.halign;
  }
  for (const [k, v] of Object.entries(b.formMobile || {})) setFormView(b, 'desktop', k, v);
  for (const [k, v] of Object.entries(b.socialMobile || {})) { if (v) b[k] = v; else delete b[k]; }
  resetOverrides(b);
}

// The rows the phone set. Read: Rotate, Offset, Anchor, Stroke, Thickness, Color, Stroke Color, Lightbox, Layout.
// The others follow from those (CAP-L6MENU.json, inferred).
const LABELS = { opacity: 'Opacity', rotate: 'Rotate', sx: 'Scale', sy: 'Scale', tx: 'Offset', ty: 'Offset', kx: 'Skew', ky: 'Skew', ox: 'Anchor', oy: 'Anchor', corner: 'Corner', corners: 'Corner', stroke: 'Stroke', strokeSize: 'Thickness', strokePx: 'Thickness', strokeColor: 'Stroke Color', color: 'Color', bgColor: 'Color', blend: 'Blend Mode', shadow: 'Drop Shadow', blur: 'Blur', background: 'Background' };
const FORM_LABELS = { lightbox: 'Lightbox', lightboxText: 'Button Text', lightboxBg: 'Background Color', buttonAlign: 'Button Alignment', buttonStyle: 'Button Style' };
export function phoneLabels(b) {
  const out = new Set(Object.keys(b.designMobile || {}).map((k) => LABELS[k]));
  for (const k of Object.keys(b.formMobile || {})) out.add(FORM_LABELS[k]);
  if (b.btnMobile) {
    out.add('Layout');
    if ((b.btnMobile.align || 'center') !== (b.halign || 'center')) out.add('Alignment');
  }
  out.delete(undefined);
  return out;
}
export function markPhoneLabels(panel, b) {
  const set = phoneLabels(b);
  if (!set.size) return;
  for (const e of panel.querySelectorAll('.sp-label, .bp-trow > span, .bp-bs-title, .bp-ff-cap')) if (set.has(e.textContent.trim())) e.classList.add('is-phone-set');
}

// Ours draws its own monitor and arrow.
export const phoneButtonHtml = (on) => `<button type="button" class="bp-phone-btn" data-phone-btn aria-label="Phone overrides" aria-haspopup="menu"${on ? '' : ' disabled'}><span><svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.375" aria-hidden="true"><path d="M4 4h14v10H4zM11 14v4M7 18h8"/><path d="M11.5 6.8L9 9l2.5 2.2M9 9h4.5"/></svg></span></button>`;
export const PHONE_MENU_HTML = '<li role="menuitem" data-phone-act="reset">Reset all overrides</li><li role="menuitem" data-phone-act="push">Push to desktop</li><div role="separator"></div><li role="menuitem" data-phone-act="go">Go to desktop</li>';
// 11.5 over the button's top and 59.4 left of it, read at two places in the frame (CAP-L6MENU.json).
export const phoneMenuPlace = (btn) => ({ left: btn.left - 59.4, top: Math.max(8, btn.top + 11.5 - 139) });
