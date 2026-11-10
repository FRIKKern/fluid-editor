// Editor shell. The page renders inside an iframe (like #sqs-site-frame), so
// media queries see the preview width. All gestures write to the model only
// on commit; during a gesture we change inline styles and editor layers.
import { DIVIDER_WIDTHS, DIVIDER_HEIGHTS, artDefaults, bindVideoPlayer, watchShapeRects, rectPath, cornerFor, shapeFill, phoneOwn, FOLLOW_DESKTOP, setLiveView, ruleForget, quoteOf, newsletterOf, PHONE_HEIGHTS, phoneHeightAt } from './render.js';
import { imageShapeById } from './image-shapes.js';
import { openImageEditor } from './image-editor.js';
import { EFFECTS, IMAGE_EFFECT_SCRIPT, effectData, effectDefaults, paintEffectTiles, shuffleEffect } from './image-effects.js';
import { socialLook, ACCORDION_STYLES, ACCORDION_ICON, ACCORDION_LINE, ACCORDION_PAD, ACCORDION_WIDTH, BLEND_MODES, renderPage, renderSection, renderHeader, headerTheme, HEADER_SCRIPT, exportHtml, LAST_LINE, COLS, DESIGN_DEFAULTS, STROKE_PX, designBag, designFor, ACCORDION_DESCRIPTION, stackAxes, kidSize, kidSizeKey, DEFAULT_SOCIAL, socialKind, mapOf, MAP_ZOOMS } from './render.js';
import * as fmt from './text-format.js';
import { LINK_ENDINGS } from './link-endings.js';
import { cleanPaste, insertPaste } from './paste.js';
import { toolbarItems, toolbarHtml, toolbarPosition, groupToolbarHtml } from './toolbar.js';
import { sectionChromeHtml, sectionChromeLayout, sectionPanelTop, sectionPanelHtml, sectionPanelScrolled, PANEL_BAND_CLOSES_AT, layoutsOpenTop } from './section-chrome.js';
import { sectionMix, applyLayout, fitLayout, layoutsPanelHtml, layoutsPickTop, sectionLook, layoutTheme, layoutShown, restep } from './section-layouts.js';
import { artSeg, artShuffled, clampArt } from './section-art-rows.js';
import { linkKind, linkValue, mailHref, phoneDigits, phoneHref } from './link-kinds.js';
import { phoneOrder, resizedAhead, newBlockSlot, stoppedSlot, followDesktopEdit, followNewBlock, closeUp, phoneOverlaps } from './phone-order.js';
import { codeLines, gutterWidth } from './code-look.js';
import { foldRanges, foldRows, foldedLine, lineOf, foldsOf, fullOf, realOf, toggleFold, openFold, dropFolds, adoptFolds, foldArrow, foldDelete, noteSelection, syncFolds, foldUndo, foldReplace, foldCopy, foldCut } from './code-fold.js';
import { mdWrap, mdLines as mdLinesEdit, mdHeading, mdState, mdEnter, mdBackspace, mdLinkIn, mdSetLink, mdAddDefinition, mdChangeLink, mdRemoveLink } from './markdown-edit.js';
import { anchorPopHtml, APPEAR, anchorText, blockPanelHtml, blockPanelPosition, CODE_PANEL_WIDTH, codeModalHtml, mdModalHtml, mdLinkSummaryHtml, linkBoxHtml, shapePickerHtml, shapeColorHtml, mapStylesHtml, DESIGN_FIELDS, designText, designRange, PAD_PCT, linkPopoverHtml, linkPopoverPosition, pinPopoverHtml, pinRangeValue , blendValue } from './block-panel.js';
import { dialogOf, dialogHtml, DIALOG_DEFAULTS, chartOf, chartCsv, parseCsv } from './dialogs.js';
import { addBlockMenuHtml, layersPanelHtml, contextMenuHtml, arrangeMenuHtml, copyPropsMenuHtml, pastePropsMenuHtml, buttonStyleMenuHtml } from './menus.js';
import { textBarHtml, textBarPosition } from './text-bar.js';
import { addSectionPanelHtml, blankSection } from './add-section.js';
import { SUB as SS_SUB, siteStylesHtml, stylePopoverHtml, stylePopoverPosition, packFontLinks } from './site-styles.js';
import { TIERS, TIER_NAMES, CUSTOM_RADIUS, tierValues } from './button-tiers.js';
import { formOption, OPTION_RADIUS, FORM_KINDS, FORM_CUSTOM_RADIUS, formValues } from './form-rows.js';
import { formColor } from './form-colors.js';
import { fontListHtml, fontRowsHtml, fontListTop, watchFontRows } from './font-list.js';
import { ALL_FONT_PACKS, fontLink, siteStylesHead, baseSize, resolveSiteStyles, VARS as PALETTE_VARS, BASE_VARS } from './site-style-packs.js';
import { hslToRgb, rgbToHsl, rgbToHsv, hsvToRgb, hexToRgb, hueToRgb, clampByte, rgbToHslParts } from './color-math.js';
import { dotPopHtml, dotPopTop, fromColor, DOT_POP_HEIGHT } from './site-palette.js';
import { rowValue } from './theme-rows.js';
import { PRESETS as PALETTE_PRESETS } from './theme-rows-data.js';
import { demoModel } from './demo.js';
import { rowOn, ownOf, animPhoneOrder, TABS, REST, newAnimation, poseKey, typed, scrubbed, commas, defaultOf, playPreview, holdPose, releasePose, playTile, playStage, bindTriggers, startPageMotion, stopPageMotion, PRESETS } from './animations.js';
import { animListHtml, animPickerHtml, animEditorHtml, animOptionsHtml, barAt, POSE_RANGE } from './anim-panel.js';
import { messageBox, cleanMessage } from './form-message.js';
import { standinPanelOf, PLAN_PARTS, planHeight } from './standin-panels.js';
import { hasOverrides, resetOverrides, pushOverrides, markPhoneLabels, markAnimLabels, phoneButtonHtml, PHONE_MENU_HTML, phoneMenuPlace } from './phone-overrides.js';
import { newField, writeFieldText, writeFieldSet, postOf, followOf, addFollow, deleteFollow, deleteOption, moveOption, formView, setFormView, bindPhonePrefix } from './form-fields.js';

const KEY = 'fluid-editor:model:v2';
const $ = (id) => document.getElementById(id);
const frame = $('site-frame');
const panel = $('panel');
const stage = $('stage');

const centerLine = () => (1 + LAST_LINE[bp]) / 2; // the middle of the canvas: line 14, on phones line 6
let model = load() ?? demoModel();
let savedJson = JSON.stringify(model);
let bp = 'desktop';
setLiveView(bp); // the frame draws Blur and Background color for the view it shows (render.js liveStyle)
let sel = null; // { sid, bid }
let editing = null; // text edit session
let gesture = null; // move or resize session
// A press with nothing selected, not yet let go and not past the drag's 10 px: Add Section stays (CAP-U9FADE4D.json).
let pressFresh = false;
const undoStack = [];
const redoStack = [];
const notes = [];
let doc = null;
let win = null;

// ---------- storage ----------
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(model));
    return true;
  } catch {
    return false;
  }
}

// ---------- model helpers ----------
const S = (sid) => model.sections.find((s) => s.id === sid);
// A block in the section, or a child of a stack there (picked from Layers, S3).
const B = (sid, bid) => { for (const b of S(sid).blocks) { if (b.id === bid) return b; const k = b.children?.find((c) => c.id === bid); if (k) return k; } return undefined; };
const parentStack = (sid, bid) => S(sid)?.blocks.find((b) => b.children?.some((c) => c.id === bid));
const lay = (b) => b.layout[bp];
const sectionEl = (sid) => doc.querySelector(`section[data-section-id="${sid}"]`);
const feEl = (sid) => sectionEl(sid).querySelector('.fluid-engine');
const blockEl = (bid) => doc.querySelector(`.fe-block[data-block-id="${bid}"], .stack-child-container[data-kid="${bid}"]`);
const setArea = (el, a) => { el.style.gridArea = a.join(' / '); };
const same = (a, b) => a.every((v, i) => v === b[i]);

function growRows(s) {
  s.rows[bp] = Math.max(s.rows[bp], ...s.blocks.map((b) => b.layout[bp].area[2] - 1));
}

function note(text) {
  notes.unshift(text);
  notes.length = Math.min(notes.length, 6);
}

// force: a drop that moves nothing is still an undo step on the oracle (GROUPRESIZE.json, TEXTUNDO.json).
function commit(before, label, force = false) {
  if (!force && JSON.stringify(model) === before) return;
  undoStack.push(before);
  redoStack.length = 0;
  followPhoneRows(before);
  note(label);
  updateUi();
}

// A2: only a section whose blocks an edit changed. A saved page stays as it loads, and undo brings
// the order back with the model. Not while its text is being edited: the close commits again.
let softening = false; // one Escape: the model follows, the page isn't touched
function followPhoneRows(before) {
  const old = JSON.parse(before);
  for (const s of model.sections) {
    const was = old.sections.find((o) => o.id === s.id);
    if (!was || editing?.sid === s.id || JSON.stringify(was.blocks) === JSON.stringify(s.blocks)) continue;
    // The first phone edit of a section that still follows desktop keeps the DOM order, even when a block moves
    // below another (CAP-A2PHONEEDIT e1 to e7, 7 of 7, two reads each). A later edit follows rule R or sorts again.
    const first = bp === 'mobile' && was.phoneFollows === true && !was.phoneEdited;
    const reflowed = phoneFollowsMove(s, was);
    if (first && s.phoneEdited) { if (reflowed && !softening) renderSectionDom(s.id); continue; }
    // Rule R (fitted on CAP-A2SECONDEDIT; predictions first, CAP-A2RESIZEAHEAD-PREDICTED.json: 6 of 6 fresh, two reads each):
    // on a later phone edit, a block resized on the phone goes to its row's place, then ahead of the first block it overlaps.
    // Misses seen corpus rebuild reads (CAP-A2CORPUS1STEPS s5, CAP-A2CORPUS2 p1).
    const next = (bp === 'mobile' && s.phoneFollows != null && resizedAhead(s.blocks, was.blocks)) || phoneOrder(s.blocks);
    if (next.every((b, k) => b === s.blocks[k])) { if (reflowed && !softening) renderSectionDom(s.id); continue; }
    s.blocks.splice(0, s.blocks.length, ...next);
    if (softening) continue; // The text stays open, in its place in the page; the close draws this
    // New phone rows need new CSS, or the phone shows the old stack and a press lands on the old place.
    if (reflowed) { renderSectionDom(s.id); continue; }
    const fe = sectionEl(s.id) && feEl(s.id);
    if (!fe) continue;
    const els = next.map((b) => fe.querySelector(`:scope > .fe-block[data-block-id="${b.id}"]`));
    if (els.some((e) => !e)) continue;
    let at = fe.querySelector(':scope > .fe-block');
    for (const el of els) {
      if (el === at) { do at = at.nextElementSibling; while (at && !at.matches('.fe-block')); } else fe.insertBefore(el, at);
    }
  }
}

// A section built here follows any desktop move or resize on the phone until the phone is moved by
// hand (CAP-DESKMOVE*.json). A saved page has no flag: a saved section can't be read (0006), so it stays.
function phoneFollowsMove(s, was) {
  if (s.phoneFollows == null) return false;
  const same = s.blocks.flatMap((b) => { const o = was.blocks.find((x) => x.id === b.id); return o ? [[b, o]] : []; });
  const changed = (name, part) => same.some(([b, o]) => part(b.layout[name].area).join() !== part(o.layout[name].area).join());
  // A block taken away, on either width: the stack closes up, keeping the gaps above the others
  // (CAP-TURNTEST4 d1, CAP-A2EDITS2 p and h, CAP-A2ROUND1 a).
  const gone = was.blocks.filter((o) => !s.blocks.some((b) => b.id === o.id)).map((o) => o.layout.mobile.area);
  closeUp(s, gone);
  if (bp === 'mobile') {
    if (!gone.length && changed('mobile', (a) => a)) s.phoneEdited = true;
    if (!gone.length) for (const [b, o] of same) { const n = b.layout.mobile.area, p = o.layout.mobile.area; if (n[2] - n[0] !== p[2] - p[0] || n[3] - n[1] !== p[3] - p[1]) b.phoneResized = true; }
    // Why it stopped counts for a new block later: a hand move, or overlap from a phone resize (CAP-A2ROUND2 m1 against f1).
    if (!gone.length && s.phoneFollows !== false) {
      const moved = changed('mobile', (a) => a.slice(0, 2));
      if (moved || phoneOverlaps(s)) { s.phoneFollows = false; s.phoneStop = moved ? 'move' : 'overlap'; }
    }
    return gone.length > 0;
  }
  // Typing in a text counts as an edit even when no size changes, so the order turns (CAP-A2TYPED3 y5).
  const typed = same.some(([b, o]) => b.html !== o.html);
  if (!(s.phoneFollows && (changed('desktop', (a) => a) || typed))) return gone.length > 0;
  const top = () => s.blocks.reduce((t, b) => (b.layout.mobile.area[0] < t.layout.mobile.area[0] ? b : t));
  const first = top(), moved = followDesktopEdit(s), now = top();
  // A text edit that brings a one-phone-row block back to first on the phone drops each Text it changed to the
  // rows its content needs, and the section gives those rows back; a move that does the same leaves it
  // (CAP-A2SHRINKB1, B1: 10 of 10 fresh, both builds agreeing). Read with two blocks, the one-row Line last
  // before the edit; with more blocks "was not first" is inferred.
  const na = now.layout.mobile.area;
  if (typed && now !== first && na[0] === 1 && na[2] === 2) {
    const m = measure(feEl(s.id));
    for (const [b, o] of same) {
      if (b.type !== 'text' || b.html === o.html) continue;
      const a = b.layout.desktop.area, give = a[2] - a[0] - contentRows(b, m);
      if (give <= 0) continue;
      b.layout.desktop.area = [a[0], a[1], a[2] - give, a[3]];
      s.rows.desktop = Math.max(...s.blocks.map((x) => x.layout.desktop.area[2] - 1), s.rows.desktop - give);
    }
  }
  return moved || gone.length > 0;
}

// A focused field keeps the panel from redrawing, so Undo and Redo let go of it, then give it back: the field shows the
// value undone, keeps the focus and puts the caret at its end (CAP-T15CHEAP.json, read on Design; inferred on Animation's fields).
const leaveField = () => {
  const f = document.activeElement?.closest?.('#block-panel input[data-afield], #block-panel input[type="text"][data-design]');
  if (!f) return null;
  f.blur();
  return f.dataset.afield ? `input[data-afield="${f.dataset.afield}"]` : `input[type="text"][data-design="${f.dataset.design}"]`;
};
const backToField = (q) => { if (q) caretAtEnd(blockPanel.querySelector(q)); };
function undo(button = false) {
  // The Undo button during an edit: the edit closes, its last step goes, and the block lets go (CAP-Y2EDIT.json, CAP-ESC1.json).
  const ed = editing;
  // The Undo button lets a block selected with only its toolbar go as well; Cmd+Z keeps it (CAP-E7REOPEN3.json "Clear, Undo",
  // CAP-82UNDO.json). Not read: with a panel, menu or popover open, or a group: the block stays.
  const bare = button && !ed && sel && !sel.more?.length && designOpen !== sel.bid && !vAlignOpen && !shapeUi
    && [linkPop, pinPop, addMenu, layersPanel, contextMenu, layoutsPanel, $('button-style-menu'), $('arrange-menu')].every((el) => el.hidden);
  if (ed) finishTextEdit();
  if (!undoStack.length) { if (ed) select(null); return; }
  unsettled = null;
  stored = null;
  const held = leaveField();
  if (shapeUi && !shapeUi.section && sel && B(sel.sid, sel.bid)?.type === 'video') closeShapePop(); // CAP-T7COLOR3.json
  const now = JSON.stringify(model);
  redoStack.push(textRises.get(now) ?? now);
  // The layout a section shows before Undo sets the step of the one it goes back to, with the Layouts panel open or
  // closed (restep: CAP-U10WALK2.json, CAP-U10UNDOCLOSED-A.json). Only sections the Undo changes, in the same mix.
  const was = new Map(model.sections.map((s) => { const m = s.id === layoutsSid ? layoutsMix : sectionMix(s); return [s.id, [JSON.stringify(s), m?.key, m?.list.length ? layoutShown(s, m, null) : null]]; }));
  model = JSON.parse(undoStack.pop());
  for (const s of model.sections) {
    const [json, key, left] = was.get(s.id) || [];
    if (json == null || json === JSON.stringify(s) || !s.blocks.length) continue;
    const m = s.id === layoutsSid ? openedMix() : sectionMix(s);
    if (m && m.key === key) restep(s, m, left);
  }
  note('Undo');
  // The open section panel keeps the custom height it showed, number and slider, and its pressed Height and
  // Alignment buttons, until it opens again; the section takes the state undone (difference 99, CAP-P3UNDO.json,
  // CAP-P3UNDO2.json; the buttons CAP-P3ALIGN.json, CAP-P3ALIGN2.json, CAP-P3ALIGN4.json). Redo is not read.
  const shown = sectionPanel.hidden ? [] : [...sectionPanel.querySelectorAll('.sp-custom-height input')].map((e) => e.value);
  if (shown.length === 2) heightShown = [secSid(), ...shown];
  if (!sectionPanel.hidden && secSid()) segShown = [secSid(), Object.fromEntries(['height', 'valign'].map((a) => [a, sectionPanel.querySelector(`[data-sact="${a}"][aria-pressed="true"]`)?.dataset.v]))];
  renderAll();
  syncLayouts();
  if (ed || bare) select(null); else backToField(held);
}
function redo() {
  const ed = editing;
  if (ed) finishTextEdit();
  if (!redoStack.length) { if (ed) select(null); return; }
  unsettled = null;
  stored = null;
  const held = leaveField();
  undoStack.push(JSON.stringify(model));
  const had = new Set(model.sections.flatMap((o) => o.blocks.map((x) => x.id)));
  model = JSON.parse(redoStack.pop());
  note('Redo');
  renderAll();
  syncLayouts();
  if (ed) { select(null); return; }
  // A block that comes back comes back selected (CAP-Y2KEYS.json).
  const back = model.sections.flatMap((o) => o.blocks.filter((x) => !had.has(x.id)).map((x) => ({ sid: o.id, bid: x.id })));
  if (back.length === 1) select(back[0]); else backToField(held);
}

// ---------- rendering ----------
// After undo, redo or a reload of the model the selected block may no longer exist.
function dropMissingSelection() {
  if (!sel) return;
  const s = model.sections.find((x) => x.id === sel.sid);
  const ids = [sel.bid, ...(sel.more || [])].filter((id) => s?.blocks.some((b) => b.id === id));
  sel = ids.length ? { sid: sel.sid, bid: ids[0], more: ids.slice(1) } : null;
}

// The site header lies over the first section in the canvas too, as in the oracle editor;
// the first section is padded by its height after every render (render.js HEADER_SCRIPT).
function fitHeader() {
  const h = doc.getElementById('header');
  const first = doc.querySelector('main#page .page-section');
  if (first) first.style.paddingTop = h ? `${h.getBoundingClientRect().height}px` : '';
}
// The header follows the model: a model without one (a replayed trace) shows none.
let headerJson = null;
function renderHeaderOnce() {
  const json = JSON.stringify(model.header || null), theme = headerTheme(model);
  if (json === headerJson) { const on = doc.getElementById('header'); if (on) on.dataset.sectionTheme = theme; return; }
  headerJson = json;
  const old = doc.getElementById('header') || doc.getElementById('header-slot');
  if (!old) return;
  if (!model.header) { old.outerHTML = '<div id="header-slot"></div>'; return; }
  old.outerHTML = renderHeader(model.header, theme);
  new win.Function(HEADER_SCRIPT)();
}
// Site Styles picks (U12): their fonts and rules sit at the end of the canvas's head.
let appliedStyles = null;
let onStylesApplied = null;
function applySiteStyles() {
  const next = JSON.stringify(model.siteStyles || null);
  if (next === appliedStyles) return;
  appliedStyles = next;
  for (const el of doc.head.querySelectorAll('[data-fe-site-styles]')) el.remove();
  doc.head.insertAdjacentHTML('beforeend', siteStylesHead(model.siteStyles));
  themeColors = null;
  onStylesApplied?.();
}
function renderAll() {
  dropMissingSelection();
  applySiteStyles();
  renderHeaderOnce();
  doc.getElementById('page').innerHTML = renderPage(model);
  fitHeader();
  for (const s of model.sections) decorate(s.id);
  drawSelection();
  updateUi();
}

function renderSectionDom(sid) {
  const ids = [sid, ...model.sections.filter((s) => s.blocks.some((b) => b.codeOf === sid)).map((s) => s.id)];
  for (const id of new Set(ids)) {
    const tmp = doc.createElement('div');
    tmp.innerHTML = renderSection(S(id), model);
    sectionEl(id).replaceWith(tmp.firstElementChild);
    decorate(id);
  }
  renderHeaderOnce();
  fitHeader();
  drawSelection();
}

function decorate(sid) {
  const fe = feEl(sid);
  fe.classList.add('is-editing');
  fe.setAttribute('role', 'grid');
  fe.setAttribute('aria-multiselectable', 'true');
  fe.dataset.gridIsVisible = 'false';
  for (const el of fe.querySelectorAll(':scope > .fe-block')) {
    el.setAttribute('role', 'gridcell');
    el.tabIndex = 0;
    el.dataset.isSelected = String(sel?.bid === el.dataset.blockId);
    el.dataset.isNearDraggedBlock = 'false';
    el.dataset.isMatchingWidth = 'false';
    el.dataset.isMatchingHeight = 'false';
  }
  drawLabels(sid);
}

// The label pill of every block (U3, parity/findings/MARKS.json, labels): 22px above the block, seen
// only on hover. Its box is in the page all the time and takes the pointer, even at opacity 0.
const LABELS = { text: 'Text', button: 'Button', shape: 'Shape', image: 'Image', video: 'Video', form: 'Form', accordion: 'Accordion', scrolling: 'Scrolling', line: 'Line', map: 'Map', code: 'Code', markdown: 'Markdown', embed: 'Embed', social: 'Social Links', stack: 'Stack' };
function drawLabels(sid) {
  const fe = feEl(sid);
  for (const el of fe.querySelectorAll(':scope > .fe-label')) el.remove();
  for (const b of S(sid).blocks) {
    if (!lay(b) || lay(b).hidden) continue;
    const g = doc.createElement('div');
    g.className = 'fe-label';
    g.dataset.for = b.id;
    setArea(g, lay(b).area);
    const tag = doc.createElement('span');
    tag.className = 'fe-label-tag';
    // A stand-in is a Shape in the model and goes by the name the Add Block menu gave it (CAP-X13LABELS.json).
    tag.textContent = b.label === 'form' ? 'Form' : b.type === 'shape' && ADD_TYPES.some(([name]) => name === b.label) ? b.label : LABELS[b.type] || 'Block';
    g.append(tag);
    fe.append(g);
  }
}

// Hover (U3): the same two rings as a selection, under it (10000 + z, Z5), with the block's pill.
// Not while a block is held, and not on a block that is selected.
let hoverBid = null;
function drawHover() {
  for (const el of doc.querySelectorAll('.fe-indicator.is-hover')) el.remove();
  for (const el of doc.querySelectorAll('.fe-label.is-on')) el.classList.remove('is-on');
  if (!hoverBid || gesture?.type && gesture.type !== 'pending') return;
  // The pointer on a block the box touches: its label, on the ring it has (CAP-X13SEL2.json).
  if (boxUp && boxTouched.ids.includes(hoverBid)) { feEl(boxTouched.sid).querySelector(`:scope > .fe-label[data-for="${hoverBid}"]`)?.classList.add('is-on'); return; }
  if (sel && [sel.bid, ...(sel.more || [])].includes(hoverBid)) return;
  const el = blockEl(hoverBid);
  if (!el) return;
  const sid = el.closest('section').dataset.sectionId;
  const b = B(sid, hoverBid);
  if (!b) return;
  const ind = doc.createElement('div');
  ind.className = 'fe-indicator is-hover';
  setArea(ind, lay(b).area);
  ind.style.zIndex = String(10000 + lay(b).z);
  feEl(sid).append(ind);
  feEl(sid).querySelector(`:scope > .fe-label[data-for="${hoverBid}"]`)?.classList.add('is-on');
}
function setHover(bid) {
  if (bid === hoverBid) return;
  hoverBid = bid;
  drawHover();
}

// The band in each gap of a selected stack, seen on hover (S3.json gapHandle): as wide as the gap
// and as long as the stack, with a 5 by 24 grip in its middle. A drag changes the gap by half its way.
function drawGapHandles(b, el) {
  if (b.gap === 'fill' || !el) return;
  const kids = [...el.querySelectorAll(':scope .sqs-stack-container > .stack-child-container')].filter((k) => k.offsetParent);
  const row = win.getComputedStyle(el.querySelector('.sqs-stack-container')).flexDirection === 'row';
  const host = el.querySelector('.sqs-block-stack'), q = host.getBoundingClientRect();
  const ox = q.left + host.clientLeft, oy = q.top + host.clientTop;
  kids.slice(0, -1).forEach((k, n) => {
    const a = k.getBoundingClientRect(), c = kids[n + 1].getBoundingClientRect();
    const h = doc.createElement('div');
    h.className = `stack-gap-handle${row ? ' is-row' : ''}`;
    h.style.cssText = row ? `left:${a.right - ox}px;top:0;width:${c.left - a.right}px;height:100%` : `left:0;top:${a.bottom - oy}px;width:100%;height:${c.top - a.bottom}px`;
    h.append(doc.createElement('i'));
    host.append(h);
  });
}
function startGapDrag(e, row) {
  const { sid, bid } = sel, b = B(sid, bid), before = JSON.stringify(model);
  const g0 = b.gap ?? 20, p0 = row ? e.clientX : e.clientY;
  const move = (ev) => { b.gap = Math.max(0, g0 + Math.round(((row ? ev.clientX : ev.clientY) - p0) / 2)); renderSectionDom(sid); };
  const up = () => { win.removeEventListener('pointermove', move); win.removeEventListener('pointerup', up); commit(before, `Gap set on ${bid}`); };
  win.addEventListener('pointermove', move); win.addEventListener('pointerup', up);
}

function drawSelection() {
  drawSelectionLayers();
  drawHover();
  placeToolbar();
}
// Thin rings on blocks that aren't the selection: those a box touches, those a group leaves.
function drawRings({ sid, ids }) {
  for (const id of ids) {
    const b = B(sid, id), el = blockEl(id);
    if (!b || !el) continue;
    el.dataset.isSelected = 'true';
    const ind = doc.createElement('div');
    ind.className = 'fe-indicator is-member';
    setArea(ind, lay(b).area);
    ind.dataset.z = lay(b).z;
    ind.style.zIndex = String(10000 + lay(b).z);
    feEl(sid).append(ind);
  }
}
function drawSelectionLayers() {
  for (const el of doc.querySelectorAll('.fe-indicator, .stack-gap-handle')) el.remove();
  // A held block stays selected (traces T0004 to T0006 mid); only its layers go away.
  if (gesture?.type === 'move' || gesture?.type === 'resize' || gesture?.type === 'gresize') return;
  for (const el of doc.querySelectorAll('[data-is-selected="true"]')) el.dataset.isSelected = 'false';
  if (leftRings) drawRings(leftRings);
  if (boxUp && !marquee) drawRings(boxTouched);
  if (!sel) return;
  const b = B(sel.sid, sel.bid);
  const el = blockEl(sel.bid);
  if (el) el.dataset.isSelected = 'true';
  const ind = doc.createElement('div');
  ind.className = 'fe-indicator';
  const stack = parentStack(sel.sid, sel.bid);
  // A child: its eight handles on its own box, and a thin line around the stack.
  if (stack) {
    const line = doc.createElement('div');
    line.className = 'fe-indicator is-member';
    setArea(line, lay(stack).area);
    line.dataset.z = lay(stack).z;
    feEl(sel.sid).append(line);
    ind.classList.add('is-kid');
    for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const h = doc.createElement('div');
      h.className = 'fe-handle';
      h.dataset.dir = dir;
      ind.append(h);
    }
    el?.append(ind);
    return;
  }
  if (b.type === 'stack' && !gesture && !sel.more?.length) drawGapHandles(b, el);
  setArea(ind, gesture?.target || lay(b).area);
  ind.style.zIndex = '999999';
  ind.dataset.z = lay(b).z;
  for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
    const h = doc.createElement('div');
    h.className = 'fe-handle';
    h.dataset.dir = dir;
    ind.append(h);
  }
  feEl(sel.sid).append(ind);
  for (const id of sel.more || []) {
    const o = B(sel.sid, id);
    const el2 = blockEl(id);
    if (el2) el2.dataset.isSelected = 'true';
    const ind2 = doc.createElement('div');
    ind2.className = 'fe-indicator';
    setArea(ind2, gesture?.moreTargets?.[id] || lay(o).area);
    ind2.dataset.z = lay(o).z;
    feEl(sel.sid).append(ind2);
  }
  // A group (X8, gap review screenshot): one outline with eight handles around all selected
  // blocks; each block keeps a thin outline. The handles resize the group (GROUPRESIZE.json).
  if (marquee || sel.more?.length) for (const el3 of feEl(sel.sid).querySelectorAll('.fe-indicator')) { el3.classList.add('is-member'); el3.replaceChildren(); el3.style.zIndex = String(10000 + parseInt(el3.dataset.z, 10)); }
  if (!marquee && sel.more?.length) {
    const areas = [sel.bid, ...sel.more].map((id) => (id === sel.bid ? gesture?.target : gesture?.moreTargets?.[id]) || lay(B(sel.sid, id)).area);
    const box = [Math.min(...areas.map((a) => a[0])), Math.min(...areas.map((a) => a[1])), Math.max(...areas.map((a) => a[2])), Math.max(...areas.map((a) => a[3]))];
    const g = doc.createElement('div');
    g.className = 'fe-indicator is-group';
    setArea(g, box);
    g.style.zIndex = '999999';
    for (const dir of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) {
      const h = doc.createElement('div');
      h.className = 'fe-handle';
      h.dataset.dir = dir;
      g.append(h);
    }
    feEl(sel.sid).append(g);
  }
}

// ---------- floating block toolbar (U4) ----------
const toolbar = $('block-toolbar');
function zInfo(sid, b) {
  const L = lay(b);
  const hit = (a, o) => a[0] < o[2] && o[0] < a[2] && a[1] < o[3] && o[1] < a[3];
  // A pin in the section, in this layout, counts every block as if it overlapped (TOOLBARS.json zButtons).
  const pinned = S(sid).blocks.some((o) => o.layout[bp]?.sticky);
  const over = S(sid).blocks.filter((o) => o !== b && o.layout[bp] && (pinned || hit(L.area, o.layout[bp].area)));
  const stack = phoneStack(sid);
  return { overlaps: over.length > 0, above: over.some((o) => o.layout[bp].z > L.z), below: over.some((o) => o.layout[bp].z < L.z), first: stack[0] === b, last: stack[stack.length - 1] === b };
}
let groupAlignOpen = false;
let vAlignOpen = null; // The block whose toolbar menu is open: barMenu says which.
let barMenu = 'align'; // align, stackopts or halign (toolbar.js BAR_MENUS).
// Group Move Forward and Backward (parity/findings/GROUPRESIZE.json): is a block outside the group
// above its top one or below its bottom one? The oracle's case is one block above a group of two.
function groupZ(sid, ids) {
  const inside = S(sid).blocks.filter((o) => ids.includes(o.id)).map((o) => lay(o).z);
  const outside = S(sid).blocks.filter((o) => !ids.includes(o.id)).map((o) => lay(o).z);
  // A block between the members counts both ways (CAP-GROUPFORWARD.json).
  const between = outside.some((z) => z > Math.min(...inside) && z < Math.max(...inside));
  // Forward and Backward show when a member overlaps a block outside the group; overlaps inside it don't count (CAP-GROUPBAR.json).
  const pinned = S(sid).blocks.some((o) => o.layout[bp]?.sticky), others = S(sid).blocks.filter((o) => !ids.includes(o.id) && o.layout[bp]), members = S(sid).blocks.filter((o) => ids.includes(o.id));
  const shows = others.length > 0 && (pinned || members.some((m) => others.some((o) => overlaps(lay(m).area, o.layout[bp].area))));
  return { shows, above: between || outside.some((z) => z > Math.max(...inside)), below: between || outside.some((z) => z < Math.min(...inside)) };
}
// The next block outside the group crosses it, and the z values stay the same set: 1, 2, 3 with
// the group on 1 and 2 becomes group 2, 3 and the other block 1.
function groupZSwap(sid, ids, up) {
  const all = S(sid).blocks.map((o) => lay(o)).sort((a, b) => a.z - b.z);
  const members = S(sid).blocks.filter((o) => ids.includes(o.id)).map((o) => lay(o));
  const zs = all.map((L) => L.z);
  const top = Math.max(...members.map((L) => L.z)), bottom = Math.min(...members.map((L) => L.z));
  const out = (L) => !members.includes(L);
  // With none beyond the group, a block between the members crosses: the lower member passes it
  // going forward (CAP-GROUPFORWARD.json). Backward from there is inferred.
  const other = up ? all.find((L) => L.z > top && out(L)) || all.find((L) => L.z > bottom && out(L)) : [...all].reverse().find((L) => L.z < bottom && out(L)) || [...all].reverse().find((L) => L.z < top && out(L));
  if (!other) return;
  const rest = all.filter((L) => L !== other);
  const at = rest.findIndex((L) => members.includes(L));
  const lastAt = rest.length - 1 - [...rest].reverse().findIndex((L) => members.includes(L));
  rest.splice(up ? at : lastAt + 1, 0, other);
  rest.forEach((L, k) => { L.z = zs[k]; });
}
function placeGroupToolbar() {
  const g = doc.querySelector('.fe-indicator.is-group');
  if (!g) { toolbar.hidden = true; return; }
  const z = groupZ(sel.sid, [sel.bid, ...sel.more]);
  const key = `group|${sel.bid}|${sel.more.join(',')}|${groupAlignOpen}|${z.shows}|${z.above}|${z.below}|${bp}`;
  if (toolbar.dataset.key !== key) { toolbar.innerHTML = groupToolbarHtml(groupAlignOpen, z, bp === 'mobile'); toolbar.dataset.key = key; }
  const phone = bp === 'mobile';
  const p = toolbarPosition(frame.getBoundingClientRect(), stage.getBoundingClientRect(), g.getBoundingClientRect(), phone);
  toolbar.style.left = `${p.left - (phone ? 1 : 7)}px`; // CAP-GROUPBAR.json
  // Its first button stops at the same y as one block's, on desktop and a phone (CAP-GROUPBARTOP.json, CAP-PHONEBAR.json).
  toolbar.style.top = `${Math.max(p.top - 7, frame.getBoundingClientRect().top - stage.getBoundingClientRect().top + 22)}px`;
  toolbar.hidden = false;
}
function placeToolbar() {
  if (marquee) { toolbar.hidden = true; return; }
  toolbar.classList.toggle('is-group', !!sel?.more?.length);
  if (sel?.more?.length && !gesture?.type?.match(/move|resize/) && !(editing && !editing.soft) && doc && !document.body.classList.contains('is-preview')) { placeGroupToolbar(); return; }
  if (!sel || sel.more?.length || gesture?.type === 'move' || gesture?.type === 'resize' || (editing && !editing.soft) || !doc || designOpen === sel.bid) { toolbar.hidden = true; return; }
  const b = B(sel.sid, sel.bid);
  const el = blockEl(sel.bid);
  if (!b || !el) { toolbar.hidden = true; return; }
  const z = zInfo(sel.sid, b);
  const align = { current: lay(b).justify || 'flex-start', open: vAlignOpen === sel.bid, menu: barMenu, stackDir: stackAxes(b, bp).direction, hAlign: b.halign || 'center', hNamed: b.type === 'image' };
  const key = `${sel.bid}|${bp}|${JSON.stringify(z)}|${b.buttonStyle || ""}|${b.fit || ''}|${b.video?.src ? 1 : ''}|${JSON.stringify(align)}`;
  if (toolbar.dataset.key !== key) {
    const inStack = !!parentStack(sel.sid, sel.bid);
    toolbar.innerHTML = toolbarHtml(toolbarItems(b.type === 'shape' && b.label ? 'stand-in' : b.type, bp, z, !!b.fit, inStack), z, align);
    markLinkBar();
    toolbar.dataset.key = key;
    // The menu sits 4px under the bar, centred on the button.
    const vm = toolbar.querySelector('.tb-vmenu');
    if (vm) vm.style.left = `${toolbar.querySelector(`[data-tb="${vm.dataset.for}"]`).offsetLeft + 18 - 62}px`;
    // The style button names the current style (BUTTONSTYLE.json).
    const sb = toolbar.querySelector('[data-tb="primary"]');
    if (sb && b.buttonStyle) { const n = b.buttonStyle[0].toUpperCase() + b.buttonStyle.slice(1); sb.setAttribute('aria-label', n); sb.querySelector('.tb-text').textContent = n; }
  }
  const p = toolbarPosition(frame.getBoundingClientRect(), stage.getBoundingClientRect(), el.getBoundingClientRect(), bp === 'mobile');
  toolbar.style.left = `${p.left}px`;
  toolbar.style.top = `${p.top}px`;
  toolbar.hidden = false;
}
toolbar.addEventListener('mousedown', (e) => e.preventDefault());
toolbar.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tb]');
  if (!btn || !sel || btn.classList.contains('is-off')) return;
  const act = btn.dataset.tb;
  const { sid, bid } = sel;
  if (!/^(align|stackopts|halign|valign:.*|sopt:.*|halign:.*)$/.test(act) && vAlignOpen) { vAlignOpen = null; placeToolbar(); }
  if (sel.more?.length) {
    // The group toolbar.
    if (act === 'align-menu') { groupAlignOpen = !groupAlignOpen; placeToolbar(); return; }
    groupAlignOpen = false;
    const before = JSON.stringify(model);
    const ids = [bid, ...sel.more];
    if (act === 'stack') stackBlocks();
    if (act === 'z+' || act === 'z-') groupZSwap(sid, ids, act === 'z+');
    if (act.startsWith('align:')) alignGroup(act.slice(6));
    if (act === 'gduplicate') for (const id of ids) duplicateBlock(sid, id);
    if (act === 'gremove') { S(sid).blocks = S(sid).blocks.filter((o) => !ids.includes(o.id)); sel = null; }
    renderSectionDom(sid);
    commit(before, `${btn.getAttribute('aria-label')} on ${ids.length} blocks`);
    return;
  }
  const b = B(sid, bid);
  if (act === 'write') { startTextEdit(sid, bid); placeToolbar(); return; }
  // A button's Edit panel opens on Content (parity/findings/BUTTONEDIT.json).
  if (act === 'edit' && dialogOf(b)) { designOpen = bid; dlgTab = dialogOf(b).tabs?.[0] || null; updateUi(); return; } // T12's older dialogs (dialogs.js)
  // Edit opens on the tab this block type's panel last showed, kept for the session; none yet: the type's first (CAP-T15EDITTAB.json).
  if (act === 'edit') { kidSizeOpen = null; designOpen = bid; designTab = tabOfType.get(b.standin || b.type) || (b.type === 'form' || b.type === 'button' || b.type === 'embed' || b.type === 'accordion' || b.type === 'image' || b.type === 'social' || b.type === 'map' || (b.type === 'video' && !b.html) || (b.type === 'code' && b.html != null) || b.type === 'markdown' || b.standin === 'newsletter' || standinPanelOf(b) ? 'Content' : 'Design'); updateUi(); return; }
  // The toolbar link button opens the same link editor, centred under the button and 7px
  // below it (measured 2026-11-04 on the oracle demo button).
  if (act === 'link' && (b.type === 'button' || b.type === 'stack' || b.type === 'image')) {
    // A press on it with the editor open only closes it (CAP-E7REOPEN2.json).
    if (linkBarClosed) { linkBarClosed = false; btn.focus(); return; }
    openLinkPopover(b, (st) => { const r = (toolbar.querySelector('[data-tb="link"]') || btn).getBoundingClientRect(); return { left: Math.max(8, r.left + r.width / 2 - 160 - st.left), top: r.bottom + 7 - st.top }; }, null, true); return;
  }
  // Pin (parity/findings/PIN.json): the first click pins to the top with no offset, in the layout
  // on screen, and opens the popover; one undo step. After Remove Pin it pins again where the pin was,
  // each option's offset kept (CAP-U4UNPIN.json, CAP-U4REPIN.json: Center 3vh back on Center, Top 5vh back on Top).
  if (act === 'pin') {
    if (!pinPop.hidden) { pinPop.hidden = true; return; } // A second click closes it and leaves the pin.
    if (!lay(b).sticky) { const before = JSON.stringify(model); lay(b).sticky = lay(b).unpinned || { anchor: 'top', offset: 0 }; delete lay(b).unpinned; renderSectionDom(sid); commit(before, `Pinned ${bid}`); }
    openPin(sid, bid);
    return;
  }
  // Align Vertically (parity/findings/TOOLBARS.json alignMenu): a menu of three that stays open
  // after a pick, one undo step each, in the layout on screen.
  if (act === 'align' || act === 'stackopts' || act === 'halign') { pinPop.hidden = true; setTbTip(null); vAlignOpen = vAlignOpen === bid && barMenu === act ? null : bid; barMenu = act; placeToolbar(); return; }
  if (act.startsWith('sopt:')) {
    const v = act.slice(5), before = JSON.stringify(model);
    if (v === 'unstack') { vAlignOpen = null; unstack(sid, b); } else b.direction = v;
    renderSectionDom(sid);
    commit(before, `${btn.getAttribute('aria-label')} on ${bid}`);
    placeToolbar();
    return;
  }
  if (act.startsWith('halign:')) {
    const before = JSON.stringify(model);
    b.halign = act.slice(7);
    renderSectionDom(sid);
    commit(before, `${btn.getAttribute('aria-label')} on ${bid}`);
    placeToolbar();
    return;
  }
  if (act.startsWith('valign:')) {
    const v = act.slice(7), L = lay(b);
    if (L.justify === v && L.align === v) return;
    const before = JSON.stringify(model);
    L.justify = v; L.align = v;
    renderSectionDom(sid);
    commit(before, `${btn.getAttribute('aria-label')} on ${bid}`);
    return;
  }
  if (act === 'primary' && b.type === 'button') {
    const m = $('button-style-menu');
    if (!m.hidden) { m.hidden = true; return; }
    m.innerHTML = buttonStyleMenuHtml(b.buttonStyle || 'primary');
    const r = btn.getBoundingClientRect(), st = stage.getBoundingClientRect();
    m.style.left = `${r.left - 37 - st.left}px`; m.style.top = `${r.bottom + 12 - st.top}px`;
    m.dataset.sid = sid; m.dataset.bid = bid; m.hidden = false;
    return;
  }
  if (act === 'primary' || act === 'link') { note(`${btn.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  const before = JSON.stringify(model);
  if (act === 'z+' || act === 'z-') zSwap(sid, b, act === 'z+');
  if (act === 'up' || act === 'down') moveInStack(sid, b, act === 'up');
  if (act === 'duplicate') duplicateBlock(sid, bid);
  if (act === 'remove') { removeOne(sid, bid); sel = null; }
  renderSectionDom(sid);
  commit(before, `${btn.getAttribute('aria-label')} on ${bid}`);
});

// A scroll alone lets the selection go once it is wholly out of the canvas: above (973 px, CAP-U9B1.json, S) or below,
// one block or a group, and a Text being typed in, whose edit closes; each read twice, predictions pushed first
// (CAP-U9OFF.json). A press alone changes nothing until the let go (CAP-U9B1.json, P). Partly in view it stays
// (CAP-GROUPBARTOP.json, CAP-PHONEBAR.json, its bottom 180 and 50 below the top). Wholly out is the line between the reads,
// inferred; a group partly out, and the Text's words after its edit closes, are not read (ours keeps the words).
function letGoOutOfView() {
  if (!sel || (gesture && gesture.type !== 'pending')) return;
  const H = win.innerHeight, out = (id) => { const q = blockEl(id)?.getBoundingClientRect(); return !!q && (q.bottom <= 0 || q.top >= H); };
  if (![sel.bid, ...(sel.more || [])].every(out)) return;
  // A Text being typed in lets go too, but its edit stays open: the bar and the frame's selection go, the keys still type
  // (at its start, the frame scrolling to show it) and undo and redo step it (CAP-Y2REDOPULL2.json part S, CAP-Y2REDOPULL.json).
  if (editing && !editing.soft) { editing.barGone = true; win.getSelection().removeAllRanges(); renderTextBar(); }
  select(null);
}
function select(next) {
  if (unsettled && (next?.sid !== unsettled.sid || next?.bid !== unsettled.bid)) settleTextRows();
  sel = next;
  if (!boxUp) leftRings = null;
  drawSelection();
  updateUi();
}

// ---------- geometry ----------
function measure(fe) {
  const cs = win.getComputedStyle(fe);
  const r = fe.getBoundingClientRect();
  const cg = parseFloat(cs.columnGap) || 0;
  const rg = parseFloat(cs.rowGap) || 0;
  const cols = cs.gridTemplateColumns.split(' ').map(parseFloat);
  const rows = cs.gridTemplateRows.split(' ').map(parseFloat);
  const colStart = [];
  let x = r.left;
  for (const w of cols) {
    colStart.push(x);
    x += w + cg;
  }
  const colEnd = cols.map((w, i) => colStart[i] + w);
  const rowMin = Math.min(...rows);
  return { r, cols, rows, cg, rg, colStart, colEnd, rowMin, pitch: rowMin + rg };
}

// Rows a block needs so its content fits without stretching a row.
// The form on the page, not the copy a Lightbox holds to open.
const FORM_ON_PAGE = '.fe-form:not(.form-lightbox .fe-form)';
function contentRows(b, m, normalizing = false, widthPull = false, exact = false) {
  // Content that follows the width (STANDINS.json). A pull that changes the width lets it run over by
  // less than the gap until the next gesture; one that changes only the height does not.
  // A stand-in with a phone height counts it there, as one whose content follows the width (CAP-68PULL.json).
  if (b.standin || (b.phoneHeight && bp === 'mobile')) {
    const c = blockEl(b.id)?.querySelector('.sqs-block-content');
    if (!c) return 1;
    // A Quote's padding sits around its content box and still takes rows (CAP-75QUOTE.json).
    const o = win.getComputedStyle(c.parentElement), h = c.getBoundingClientRect().height + parseFloat(o.paddingTop) + parseFloat(o.paddingBottom);
    if (exact) return (h + m.rg) / m.pitch;
    // An Instagram runs over by up to 0.13 of a row before it takes another: more than 0.106, less than 0.16 (CAP-X6DESKROWS.json).
    // A stand-in's phone height the same (CAP-X6PHONEROWS.json: OpenTable keeps 8 rows at 8.03, Menu 31 at 31.09).
    const give = b.standin === 'instagram' || (b.phoneHeight && bp === 'mobile') ? 0.13 : 0.02;
    return Math.max(1, widthPull ? Math.ceil(h / m.pitch) : Math.ceil((h + m.rg) / m.pitch - give));
  }
  if (b.type === 'shape' || b.type === 'image' || b.type === 'line' || b.type === 'map') return 1; // free down to 1 row (BLOCKTYPES.json)
  // A form: the least rows that hold it, with no give (FORMFIELDS.json, blockFits).
  // A form taller than its block stretches the grid's rows, so the pitch is read with the form out of it.
  if (b.type === 'form') {
    const f = blockEl(b.id)?.querySelector(formView(b, bp).lightbox ? '.lightbox-handle-wrapper' : FORM_ON_PAGE);
    if (!f) return 1;
    const h = f.getBoundingClientRect().height;
    f.style.display = 'none';
    const free = measure(f.closest('.fluid-engine'));
    f.style.display = '';
    return Math.max(1, Math.ceil((h + free.rg) / free.pitch));
  }
  if (b.type === 'code' || b.type === 'embed' || b.type === 'markdown') return Math.max(1, codeRowsFor(codeHeight(b), m));
  const root = blockEl(b.id);
  // Alone on a phone a new Accordion stretches every row, so the pitch is read with it out, as a form's is (CAP-X6FLOORSPHONE.json).
  if (b.type === 'accordion') {
    const list = root?.querySelector('.accordion-items-container');
    if (!list) return 1;
    const h = list.offsetHeight;
    list.style.display = 'none';
    const free = measure(list.closest('.fluid-engine'));
    list.style.display = '';
    return Math.max(1, Math.ceil((h + free.rg) / free.pitch - 0.02));
  }
  // A Fit button in the view on screen: its height is its own (BUTTONDESIGN.json).
  const fit = b.type === 'button' ? [...(root?.querySelectorAll('.sqs-block-button-container:not(.sqs-stretched)') || [])].find((e) => e.offsetHeight) : null;
  // Fill resizes down to 1 row even when its text wraps; normalize still keeps the text (CAP-NORMALIZE.json).
  if (b.type === 'button' && !fit && !normalizing) return 1;
  const c = fit || root?.querySelector('.accordion-items-container, .sqs-block-video-placeholder--empty, .native-video-player') || root?.querySelector('.sqs-block-content');
  if (!c) return 1;
  // A text block's stroke counts: it sits outside the text (BLOCKDESIGN.json).
  const outer = b.type === 'text' ? root.querySelector('.sqs-block') : null, edge = outer ? outer.offsetHeight - outer.clientHeight : 0;
  if (exact) return (c.offsetHeight + edge + m.rg) / m.pitch;
  return Math.max(1, Math.ceil((c.offsetHeight + edge + m.rg) / m.pitch - 0.02));
}

// Remove row stretch: measure every block in pixels and convert back to
// grid lines on uniform rows. Same idea as the Squarespace engineering post:
// it runs at the start of a drag or keyboard move.
// Like the oracle (trace T0001): normalization is not an undo step, and it does
// not mark a saved page as changed. Callers take their undo snapshot after it.
function normalize(sid) {
  const wasClean = JSON.stringify(model) === savedJson;
  const fe = feEl(sid);
  const m = measure(fe);
  const stretched = m.rows.filter((h) => h > m.rowMin + 0.5).length;
  if (!stretched) return 0;
  const s = S(sid);
  const top = m.r.top;
  let moved = 0;
  const next = s.blocks.map((b) => {
    const br = blockEl(b.id).getBoundingClientRect();
    const a = lay(b).area;
    const r0 = Math.max(1, Math.round((br.top - top) / m.pitch) + 1);
    // A block keeps its rows and grows only if its content needs more (CAP-NORMALIZE.json): a heading
    // or a shape in stretched rows does not take their height.
    const n = Math.max(a[2] - a[0], contentRows(b, m, true));
    return [r0, a[1], r0 + n, a[3]];
  });
  s.blocks.forEach((b, i) => {
    if (!same(lay(b).area, next[i])) moved++;
    lay(b).area = next[i];
  });
  s.rows[bp] = Math.max(Math.ceil((m.r.height + m.rg) / m.pitch - 0.02), ...next.map((a) => a[2] - 1));
  if (wasClean) savedJson = JSON.stringify(model);
  renderSectionDom(sid);
  note(`Normalized ${stretched} stretched rows, ${moved} blocks remapped`);
  return stretched;
}

// Flags the oracle sets during a gesture (traces T0004 to T0007): blocks next to or
// overlapping the target get data-is-near-dragged-block; during a resize, blocks with
// the same width or height get data-is-matching-width / -height. "Next to" is within
// 2 tracks, the closest gap seen flagged (T0004).
// parity/findings/GUIDES.json: during a resize a near block gets a faint ring, a same-size block
// and the target a yellow bar; a drag draws neither, although the flags are the same.
function flagNeighbours(g, t) {
  const s = S(g.sid);
  let anyW = false, anyH = false;
  for (const o of s.blocks) {
    const el = blockEl(o.id);
    if (!el) continue;
    const a = lay(o).area;
    const mine = o.id === g.bid || g.members?.includes(o.id);
    const gapC = Math.max(a[1] - t[3], t[1] - a[3], 0);
    const gapR = Math.max(a[0] - t[2], t[0] - a[2], 0);
    // parity/findings/NEAR.json: near when both gaps are at most 1 line. The dragged block has the
    // same rule, from where it started: near on a short drag (T0004), not on a far one (T0010).
    el.dataset.isNearDraggedBlock = String(gapC <= 1 && gapR <= 1);
    const resizing = g.type === 'resize' || g.type === 'gresize';
    el.dataset.isMatchingWidth = String(!mine && resizing && a[3] - a[1] === t[3] - t[1]);
    el.dataset.isMatchingHeight = String(!mine && resizing && a[2] - a[0] === t[2] - t[0]);
    const w = el.dataset.isMatchingWidth === 'true', h = el.dataset.isMatchingHeight === 'true';
    anyW ||= w; anyH ||= h;
    const marks = g.marks?.[o.id];
    if (marks) setMarks(marks, { near: !mine && gapC <= 1 && gapR <= 1, w, h });
  }
  setMarks(g.tind, { w: anyW, h: anyH });
  // The center line turns solid yellow when the target is centered (GUIDES.json).
  // A held block sets this itself in updateMove, from where it is and not from its target.
  if (g.type !== 'move') g.line?.classList.toggle('is-centered', t[1] + t[3] === 2 * centerLine());
}

function setMarks(el, { near = false, w = false, h = false }) {
  if (!el) return;
  el.classList.toggle('is-near', near);
  el.classList.toggle('is-match-w', w);
  el.classList.toggle('is-match-h', h);
}

// A layer with the marks of GUIDES.json: two nested borders and four end ticks.
function marksLayer(fe, cls, area, z) {
  const el = layer(fe, `fe-marks ${cls}`, area, z);
  el.innerHTML = '<i class="fe-marks-in"></i><i class="fe-tick is-l"></i><i class="fe-tick is-r"></i><i class="fe-tick is-t"></i><i class="fe-tick is-b"></i>';
  return el;
}

function clearFlags(sid) {
  for (const el of feEl(sid).querySelectorAll(':scope > .fe-block')) {
    el.dataset.isNearDraggedBlock = 'false';
    el.dataset.isMatchingWidth = 'false';
    el.dataset.isMatchingHeight = 'false';
  }
}

// G7: scroll the canvas while the pointer stays near its top or bottom edge.
// The oracle does this (trace T0010 moved 30px more than the pointer); band and
// speed here are our own, not measured.
// Auto-scroll (G7, parity/findings/AUTOSCROLL.json): the oracle scrolls the frame in 10px
// steps about every 70ms while the pointer is within 60px of the bottom edge (40px of the
// top), and stops once the pointer plus the scroll since the drag began would be outside the
// window. So a pointer held d px from the edge scrolls the next multiple of 10 above d, and a
// pointer outside the window scrolls nothing (trace T0013).
const EDGE_BOTTOM = 60;
const EDGE_TOP = 40;
const SCROLL_STEP = 10;
const SCROLL_EVERY = 70; // ms
function autoScroll(g) {
  if (g.scrolling) return;
  g.scrolling = true;
  if (g.scroll0 == null) g.scroll0 = win.scrollY;
  const tick = () => {
    if (gesture !== g || !g.lastEvent) { g.scrolling = false; return; }
    const y = g.lastEvent.clientY;
    const h = win.innerHeight;
    const moved = win.scrollY - g.scroll0;
    let dir = 0;
    if (y <= h && h - y <= EDGE_BOTTOM && y + moved <= h) dir = 1;
    else if (y >= 0 && y <= EDGE_TOP && y + moved >= 0) dir = -1;
    if (!dir) { g.scrolling = false; return; }
    win.scrollBy(0, dir * SCROLL_STEP);
    g.pageScrolled = true;
    updateMove(g.lastEvent);
    win.setTimeout(tick, SCROLL_EVERY);
  };
  // At once: a pointer that crosses the edge in one move still scrolls one step (CAP-LONGDRAG).
  tick();
}

// One SVG per row, drawn the oracle's way (parity/findings/MARKS.json, grid): a pattern one cell wide
// and one row tall, its rect 1px under the tile so the stroke fits on all four sides.
function showGrid(sid, rowCount) {
  const fe = feEl(sid);
  fe.dataset.gridIsVisible = 'true';
  for (const el of fe.querySelectorAll('.fe-grid-row')) el.remove();
  const cs = win.getComputedStyle(fe);
  const gap = parseFloat(cs.columnGap);
  const margin = Math.round(parseFloat(cs.gridTemplateColumns) + gap);
  const inset = 2 * margin - 1;
  const tile = (fe.clientWidth - inset + gap - 1) / COLS[bp];
  const cellH = measure(fe).rowMin - 1;
  const frag = doc.createDocumentFragment();
  for (let r = 1; r <= rowCount; r++) {
    const row = doc.createElement('div');
    row.className = gesture?.shownRows ? 'fe-grid-row' : 'fe-grid-row is-fresh';
    row.style.gridArea = `${r} / 1 / ${r} / -1`;
    const id = `fe-grid-${sid}-${r}`;
    row.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" style="height:100%;width:calc(100% - ${inset}px);position:absolute;left:${margin}px"><defs><pattern id="${id}" height="100%" width="${tile}px" patternUnits="userSpaceOnUse"><rect height="${cellH}px" width="${tile - gap - 1}px" x="0.5" y="0.5" rx="3" stroke-width="1" stroke="#B7B7B7" fill="#F2F2F240"></rect></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"></rect></svg>`;
    frag.append(row);
  }
  fe.prepend(frag);
  if (gesture) gesture.shownRows = rowCount;
}

function layer(fe, cls, a, z) {
  const el = doc.createElement('div');
  el.className = cls;
  setArea(el, a);
  if (z != null) el.style.zIndex = String(z);
  fe.append(el);
  return el;
}

// G4 (parity/findings/SNAP.json): a grid line held by the pointer moves when the leading edge
// passes the middle of the next track, so the first step takes half a pitch plus half a gap.
// A side margin counts as its width less one gap, and half a pixel: that fits a step at 51 on desktop
// and 14 on a phone (CAP-G4MARGIN.json, CAP-G4PHONE.json), why half is not known. d is the pointer's distance from `line`.
function snapColumn(m, line, d, lo, hi) {
  const n = m.colStart.length;
  const at = (l) => (l <= n ? m.colStart[l - 1] : m.colEnd[n - 1] + m.cg);
  const half = (t) => t === 1 || t === n ? (m.colEnd[t - 1] - m.colStart[t - 1] - m.cg + 1) / 2 : (m.colEnd[t - 1] - m.colStart[t - 1]) / 2;
  const p = at(line) + d;
  let l = line;
  while (l < hi && p >= at(l) + m.cg + half(l)) l++;
  while (l > lo && p <= at(l) - m.cg - half(l - 1)) l--;
  return l;
}
const rightEdgeOut = (m, line, d) => snapColumn(m, line, d, line, m.colStart.length + 1) === m.colStart.length + 1;
const leftEdgeOut = (m, line, d) => snapColumn(m, line, d, 1, line) === 1;
// The east line of a box on the left margin track, pulled d to the right: its left edge's steps, the last waiting for the right edge.
const marginEast = (m, c1, d, hi, top) => { const e = Math.min(top, c1 + snapColumn(m, 1, d, 1, 1 + hi - c1) - 1); return e === top && !rightEdgeOut(m, c1, d) ? top - 1 : e; };
// The same rule for rows, on a uniform pitch, also past the last row (traces T0013, T0014).
const snapRow = (m, line, d) => line + Math.sign(d) * Math.max(0, Math.round((Math.abs(d) - m.rg / 2) / m.pitch));

// ---------- gestures ----------
// Marquee (X13, parity/findings/X13.json): a drag of 30px from empty space in a section draws a 3px
// rgb(0, 114, 240) box. The blocks of that section it touches join the selection while held, with
// thin outlines only; on release they replace it. A box that touched nothing leaves it alone. A press
// with no drag is a click and clears it. No auto-scroll, and Escape does nothing while held.
let marquee = false; // a box up with nothing selected before it: what it touches is the selection
let boxUp = false, boxTouched = { sid: null, ids: [] };
let leftRings = null; // after a group and a box that touched nothing: rings, and nothing selected
function startMarquee(e, fe) {
  // No text selection while the box is drawn: the oracle shows none.
  e.preventDefault();
  const sid = fe.closest('section').dataset.sectionId;
  const x0 = e.clientX, y0 = e.clientY;
  const prior = sel;
  const priorIds = prior ? [prior.bid, ...(prior.more || [])] : [];
  let box = null, touched = [];
  const pick = (ids) => (ids.length ? { sid, bid: ids[0], more: ids.slice(1) } : prior);
  const move = (ev) => {
    const x1 = ev.clientX, y1 = ev.clientY;
    if (!box && Math.hypot(x1 - x0, y1 - y0) < 30) return;
    if (!box) { box = doc.createElement('div'); box.className = 'fe-marquee'; doc.body.append(box); boxUp = true; marquee = !prior; }
    const L = Math.min(x0, x1), T = Math.min(y0, y1), R = Math.max(x0, x1), Bm = Math.max(y0, y1);
    Object.assign(box.style, { left: `${L}px`, top: `${T}px`, width: `${R - L}px`, height: `${Bm - T}px` });
    touched = [...fe.querySelectorAll(':scope > .fe-block')].filter((b) => { const q = b.getBoundingClientRect(); return q.width && q.left <= R && q.right >= L && q.top <= Bm && q.bottom >= T; }).map((b) => b.dataset.blockId);
    // A selection keeps its toolbar and handles under the box, the touched blocks get rings (CAP-X13SEL2.json).
    boxTouched = { sid, ids: touched.filter((id) => !priorIds.includes(id)) };
    if (prior) drawSelection(); else select(pick(touched));
  };
  const up = () => {
    doc.removeEventListener('pointermove', move);
    doc.removeEventListener('pointerup', up);
    doc.removeEventListener('pointercancel', up);
    marquee = false;
    boxUp = false;
    box?.remove();
    if (!box) { select(null); return; }
    // A group takes in what the box touched, one block gives way to it (CAP-X13SEL3.json, CAP-X13SEL5.json).
    if (touched.length) select(pick(prior?.more?.length && prior.sid === sid ? [...new Set([...priorIds, ...touched])] : touched));
    else if (prior?.more?.length) { select(null); leftRings = { sid: prior.sid, ids: priorIds }; drawSelection(); }
    else select(prior);
  };
  doc.addEventListener('pointermove', move);
  doc.addEventListener('pointerup', up);
  doc.addEventListener('pointercancel', up);
}

let pressedAfterEscape = false;
function onDown(e) {
  if (document.body.classList.contains('is-preview')) return;
  if (e.button !== 0) return;
  const handle = e.target.closest('.fe-handle');
  const blk = e.target.closest('.fe-block');
  if (editing) {
    const same = blk && blk.dataset.blockId === editing.bid;
    if (same && !editing.soft && !editing.barGone) return;
    // After one Escape a press on the block takes the keys from the text and opens nothing (CAP-ESC2.json); the same once a step
    // has pulled the frame's scroll and taken the bar (CAP-Y2BAR3.json).
    pressedAfterEscape = same;
    finishTextEdit();
  }
  const gapBand = e.target.closest('.stack-gap-handle');
  if (gapBand && sel) { e.preventDefault(); startGapDrag(e, gapBand.classList.contains('is-row')); return; }
  if (handle && sel && parentStack(sel.sid, sel.bid)) { e.preventDefault(); startKidResize(e, handle.dataset.dir); return; }
  if (handle && sel) {
    e.preventDefault();
    // Like a drag, a group too: the move past 10px changes nothing, the next one starts it (HOLD.json).
    // Starting the resize takes the handle out of the page, and a touch's later events stay on it,
    // out of reach of the page's listener. Unprevented, the browser pans and the release is lost.
    if (e.pointerType === 'touch') handle.addEventListener('touchmove', onTouchMove, { passive: false });
    gesture = { type: 'pending', resizeDir: handle.dataset.dir, sid: sel.sid, bid: sel.bid, pointerId: e.pointerId, t0: e.timeStamp, x0: e.clientX, y0: e.clientY, py0: e.clientY - feEl(sel.sid).getBoundingClientRect().top, before: JSON.stringify(model) };
    return;
  }
  if (!blk) {
    const fe = e.target.closest('section')?.querySelector('.fluid-engine');
    if (fe && !e.target.closest('.fe-handle, .fe-indicator')) startMarquee(e, fe);
    else select(null);
    return;
  }
  e.preventDefault();
  const sid = blk.closest('section').dataset.sectionId;
  const bid = blk.dataset.blockId;
  // Shift-click adds or removes a block from the selection, as on the oracle (X8).
  if (e.shiftKey && sel && sel.sid === sid) {
    const ids = [sel.bid, ...(sel.more || [])];
    const next = ids.includes(bid) ? ids.filter((x) => x !== bid) : [...ids, bid];
    select(next.length ? { sid, bid: next[0], more: next.slice(1) } : null);
    return;
  }
  const wasSelected = !pressedAfterEscape && sel && sel.sid === sid && sel.bid === bid && !sel.more?.length;
  pressedAfterEscape = false;
  const keep = sel && sel.sid === sid && [sel.bid, ...(sel.more || [])].includes(bid) && sel.more?.length;
  // A click on the selected child keeps it; a drag from there moves the whole stack (S3.json children).
  const onKid = sel && sel.sid === sid && parentStack(sid, sel.bid)?.id === bid && e.target.closest(`[data-kid="${sel.bid}"]`);
  pressFresh = !sel;
  // The block is selected on let go, or when a drag starts, not on the press (CAP-U9FADE4D.json, CAP-SELECTLETGO.json).
  const pick = onKid ? null : keep ? { sid, bid, more: [sel.bid, ...sel.more].filter((x) => x !== bid) } : { sid, bid };
  const r = (blockEl(bid) || blk).getBoundingClientRect(); // After one Escape the press redrew the section: blk is gone (CAP-X2UNREAD under)
  gesture = {
    type: 'pending', sid, bid: blk.dataset.blockId, pointerId: e.pointerId, t0: e.timeStamp, wasSelected, pick,
    onWords: wasSelected && B(sid, bid)?.type === 'text' && onWords(blk, e.clientX, e.clientY),
    // After one Escape a drag from the text opens the editor again and moves nothing; a click there opens nothing
    // (CAP-TEXTPRESS a10, CAP-TEXTPRESS3 r1 and r2; CAP-ESC2.json). The press redrew the section, so look the block up again.
    escWords: !wasSelected && sel?.sid === sid && sel.bid === bid && !sel.more?.length && B(sid, bid)?.type === 'text' && onWords(blockEl(bid) || blk, e.clientX, e.clientY),
    x0: e.clientX, y0: e.clientY, grabX: e.clientX - r.left, grabY: e.clientY - r.top,
    before: JSON.stringify(model),
  };
}

function onMove(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    gesture.moves = (gesture.moves || 0) + 1;
    if (gesture.onWords) return;
    if (gesture.escWords) { if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 10) gesture.escDrag = true; return; }
    // The oracle starts a drag once the pointer has moved more than 10px (11 does, 10 does not).
    // The move that crosses it changes nothing, and a release right after it is no drag: the next
    // move starts the drag (parity/findings/HOLD.json).
    if (!gesture.armed) {
      gesture.armed = Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 10;
      if (gesture.armed && pressFresh) { pressFresh = false; placeChrome(); }
      return;
    }
    if (gesture.resizeDir) startResize(e, gesture.resizeDir);
    else beginMove(e);
  }
  gesture.lastEvent = { clientX: e.clientX, clientY: e.clientY };
  if (gesture.type === 'move') updateMove(e);
  else if (gesture.type === 'resize') updateResize(e);
  else if (gesture.type === 'gresize') updateGroupResize(e);
  // Only a move scrolls the page: a resize held near the edge leaves it where it is (CAP-RESIZESCROLL.json).
  if (gesture.type === 'move') autoScroll(gesture);
}

// A drag that starts inside the text of a selected Text, new or written and right of the words too,
// opens its editor and doesn't move it. From the empty part under the text it moves, like any block
// (CAP-TEXTPRESS.json, CAP-TEXTWIDTH7.json d1 to d6).
function onWords(blk, x, y) {
  const q = blk.querySelector('.sqs-html-content')?.getBoundingClientRect();
  return !!q && x >= q.left && x <= q.right && y >= q.top && y <= q.bottom;
}

function onUp(e) {
  if (!gesture || e.pointerId !== gesture.pointerId) return;
  if (gesture.type === 'pending') {
    // A click on a text block that was already selected opens its editor (E1, as on the oracle).
    const g = gesture;
    gesture = null;
    if (g.pick) select(g.pick);
    if (pressFresh) { pressFresh = false; placeChrome(); }
    // A Text's corner let go short of a drag is not selected, any corner: a bottom one pulled 5 or 10 px (CAP-X2EDGES.json),
    // se and ne pressed with no move (CAP-X2UNREAD.json), sw and nw pressed with no move, ne 5 and 9 px right, nw 5 up
    // (CAP-X2LEFT.json), twice each.
    const corner = g.resizeDir || '';
    if (/^(se|sw|ne|nw)$/.test(corner) && !g.members && e.pointerType !== 'touch' && B(g.sid, g.bid)?.type === 'text') { select(null); return; }
    if ((g.wasSelected || g.escDrag) && B(g.sid, g.bid)?.type === 'text') startTextEdit(g.sid, g.bid);
    return;
  }
  const g = gesture;
  const s = S(g.sid);
  const b = B(g.sid, g.bid);
  lay(b).area = g.target;
  for (const o of g.more || []) if (o.target && o.target[0] >= 1 && o.target[1] >= 1 && o.target[3] <= LAST_LINE[bp]) lay(B(g.sid, o.id)).area = o.target;
  growRows(s);
  endGesture();
  renderSectionDom(g.sid);
  if (g.type === 'gresize') stored = storedRows(g);
  // 98, candidate R1 under test (CAP-98SPLIT-PREDICTED.json): a lone Text made wider and left short arms the
  // stored rows too, worked out at the next layout gesture, so a block added since counts (CAP-98.json).
  else if (g.type === 'resize' && !g.members && b.type === 'text' && g.target[3] - g.target[1] > g.orig[3] - g.orig[1]) stored = { sid: g.sid, bp, lone: b.id };
  if (g.fits && !/[ns]/.test(g.dir)) {
    fitTextRows(s, b, g);
    if (b.type === 'text' && g.target[3] - g.target[1] < g.orig[3] - g.orig[1]) unsettled = { sid: s.id, bid: b.id, bp };
  }
  // A mouse or pen let go well below the block's old bottom lands on the grid, not on the block's
  // overlay, and the block ends up not selected; touch keeps it, and so does text (HANDLEUP.json).
  if (g.type === 'resize' && e.pointerType !== 'touch' && b.type !== 'text' && !g.members && e.clientY - g.bottom0 > LET_GO_BELOW) select(null);
  // A Text let go off a bottom corner is not selected, whichever way it was pulled: se 5 to 80 right, 60 left, up and
  // down, sw 60 left and down. Off a top corner it stays level with the old top (ne 60 right, nw 60 left) and is not
  // selected 60 above it (ne, nw 60 up). Off its east side it stays (CAP-X2STEPS.json, CAP-X2EDGES.json).
  // Not read: a top corner pulled down, between level and 60 above, and touch.
  if (g.type === 'resize' && e.pointerType !== 'touch' && b.type === 'text' && !g.members && /^(se|sw)$/.test(g.dir)) select(null);
  if (g.type === 'resize' && e.pointerType !== 'touch' && b.type === 'text' && !g.members && /^(ne|nw)$/.test(g.dir) && g.top0 - e.clientY > LET_GO_ABOVE) select(null);
  if (g.type === 'move' && g.pick) select(g.pick);
  if (g.type === 'move' && g.pageScrolled) scrolledMove = { sid: g.sid, bid: g.bid };
  // After a south resize let go over the block last moved while the page scrolled under it, the page scrolls so that block's
  // bottom sits at the frame's bottom; let go elsewhere, or with no such block, none (rule H, predicted first in
  // CAP-R2PTR-PREDICTED.json: 4 of 4 fresh in CAP-R2PTR.json, where R5 without the pointer held 2; fits R5's reads, the 233 of
  // CAP-DRAGSCROLL f3, CAP-RESIZESCROLL p3, q3, CAP-RESIZESCROLL2 s1, s3 to s5, and CAP-R2X2LAST.json's se, sw and plain moves,
  // CAP-R2REMEMBER.json's let go beside it). Any south corner. The block stays remembered through a plain move of another
  // block and a resize that used it (CAP-R2X2LAST.json plain, CAP-R2TWICE.json, twice each). An east resize does not (t3).
  if (g.type === 'resize' && /s/.test(g.dir)) {
    const q = scrolledMove && blockEl(scrolledMove.bid)?.getBoundingClientRect();
    const over = q && e.clientX >= q.left && e.clientX < q.right && e.clientY >= q.top && e.clientY < q.bottom;
    if (over && q.bottom > win.innerHeight) win.scrollTo(0, Math.floor(win.scrollY + q.bottom - win.innerHeight));
  }
  // Narrowed by a corner, it takes the rows its text needs only when let go: Escape, another block or the next drag, not the
  // drop's own unselecting (CAP-SINGLEAGAIN.json f3, CAP-ONEROWHANDLE.json: 1 row at the drop, 2 and a section row more after Escape).
  if (g.type === 'resize' && b.type === 'text' && /^(se|sw|ne|nw)$/.test(g.dir) && g.target[3] - g.target[1] < g.orig[3] - g.orig[1]) unsettled = { sid: s.id, bid: b.id, bp };
  commit(g.before, `${g.type === 'move' ? 'Moved' : 'Resized'} ${g.bid} to ${g.target.join('/')}`, true);
}
const LET_GO_BELOW = 32; // between the two reads: 30 stays selected, 35 does not
// A Text's top corners: level with the old top stays selected (CAP-X2EDGES.json), 10, 20, 40, 50 and 60 above do not
// (CAP-X2UNREAD.json, twice each). The line is between 0 and 10: 5 is inferred.
const LET_GO_ABOVE = 5;

// Widening or narrowing a text block that fits its text keeps it fitted: its rows follow the text
// (CAP-TEXTWIDTH.json, CAP-TEXTWIDTH2.json). One made taller by hand keeps its rows (HANDLEUP.json).
function fitTextRows(s, b, g) {
  const a = lay(b).area, narrowing = g.target[3] - g.target[1] < g.orig[3] - g.orig[1];
  // Narrowing, the oracle takes the text's height at the width one pointer step before the end: 4.9px
  // for a column over 12 steps, 19.6 for four (CAP-TEXTWIDTH4.json). Text that then runs over
  // stretches the rows until the block is let go.
  const c = narrowing ? blockEl(b.id)?.querySelector('.sqs-block-content') : null;
  if (c) c.style.width = `${c.getBoundingClientRect().width + Math.abs(g.stepX || 0)}px`;
  const m = measure(feEl(s.id)), need = contentRows(b, m), span = a[2] - a[0];
  if (c) c.style.width = '';
  // Narrowing only adds rows. Widening takes rows off only if the need for them fell, and then by the
  // height lost: a line of text keeps two rows, and 268.9 to 224.1 goes from 7 rows to 5, though 224.1
  // needs 6 (CAP-TEXTWIDTH7.json). The next gesture takes back what it needs.
  // An Instagram post follows its width, both ways (STANDINS.json).
  const lost = b.type !== 'text' ? span - Math.max(2, need) : narrowing ? span - Math.max(g.orig[2] - g.orig[0], need) : need < g.need0 ? Math.min(span - 1, Math.ceil((g.height0 - textHeight(b)) / m.pitch)) : 0;
  if (!lost) return;
  // A Text that falls on widening moves the blocks below as a shrink by typing does, and the section gives up rows as its
  // lowest block rises (CAP-R2WIDEFALL.json: 1 row under, 4 under, pushed by the typing, lower to the right; alone, 12 go
  // to 8 in CAP-TEXTWIDTH.json). Not built: on the saved demo section the blocks below stay (CAP-TEXTWIDTH2.json).
  const fall = lost > 0 && !narrowing;
  // Rule S (CAP-R2SUBPIXEL-PREDICTED.json, predictions first, 13 of 14 fresh): a one-line Text widened by its east side keeps
  // its rows at the drop when x of its new right grid line has a fractional part under 0.5 px, and falls to the rows it needs
  // when let go (CAP-R2WIDEDROP.json, CAP-R2ENDLINE-A/B/C.json, CAP-R2SUBPIXEL.json). Miss: written on column 3 and widened
  // to line 15 (x .28) it falls at the drop, twice in two sessions.
  if (fall && b.type === 'text' && g.dir === 'e' && oneLine(b) && lineX(m, g.target[3]) % 1 < 0.5) {
    unsettled = { sid: s.id, bid: b.id, bp, lost };
    return;
  }
  if (fall && b.type === 'text') moveWithText(s, b, a, -lost);
  const lowest = () => Math.max(...s.blocks.map((o) => o.layout[bp].area[2])), before = lowest();
  a[2] -= lost;
  if (fall && b.type !== 'text') s.rows[bp] -= before - lowest();
  else if (!fall) { s.rows[bp] = g.rows0; growRows(s); }
  renderSectionDom(s.id);
}

// After narrowing, those rows last until the block is let go: Escape, another block or the next drag.
// Then the rows the text needs at its real width are added (CAP-TEXTWIDTH4.json, CAP-TEXTWIDTH5.json).
// Widened under rule S, the rows it would lose last the same way, and fall then (lost).
// Time alone does nothing. No undo step of its own. Growing pushes as typing does.
let unsettled = null;
let scrolledMove = null; // the block last moved while the page scrolled under it (R5 above)
function settleTextRows() {
  const u = unsettled;
  unsettled = null;
  const s = u && u.bp === bp ? S(u.sid) : null, b = s?.blocks.find((o) => o.id === u.bid);
  if (!b) return;
  if (u.lost) {
    const a = lay(b).area;
    moveWithText(s, b, a, -u.lost);
    a[2] -= u.lost;
    renderSectionDom(s.id);
    return;
  }
  const content = blockEl(b.id)?.querySelector('.sqs-block-content');
  if (!content) return;
  // Text that runs over stretches the rows, so the pitch is read with the text out, as a form's is.
  content.style.display = 'none';
  const free = measure(feEl(s.id));
  content.style.display = '';
  const a = lay(b).area, d = contentRows(b, free) - (a[2] - a[0]);
  if (d <= 0) return;
  moveWithText(s, b, a, d);
  a[2] += d;
  renderSectionDom(s.id);
}

// A touch drags like a mouse unless the browser pans first (TOUCHHOLD.json): it takes the pointer
// when a first move goes past its pan distance after a short press. A drag that has started, or a
// press held this long, keeps the pointer. Measured between 60 and 100 ms. The same on a handle (CAP-X11FAST.json).
const TOUCH_HOLD = 100;
function onTouchMove(e) {
  if (gesture && (gesture.type !== 'pending' || gesture.moves > 1 || e.timeStamp - gesture.t0 >= TOUCH_HOLD)) e.preventDefault();
}

function onCancel(e) {
  if (gesture && e.pointerId === gesture.pointerId) cancelGesture();
}

// After a group resize leaves a Text or Quote short of its content, the next layout gesture moves rows in
// (CAP-X8NEXT.json, CAP-X8LAG.json): d is the overflow in rows, rounded, and L the short block's bottom line.
// The short block grows d, a block across L grows d, and so does one ending on L that starts on or above the
// short block's top; any other block that ends on or below L moves d, and blocks above L stay, in the whole
// section (CAP-X8LAG2.json). A press, a select, typing and undo don't do it. Candidate, refit 2.
let stored = null;
function storedRows(g) {
  const m = measure(feEl(g.sid)), s = S(g.sid);
  let d = 0, L = 0, t0 = 0, tid = null;
  for (const id of g.kept.keys()) {
    const b = B(g.sid, id), a = lay(b).area, over = Math.round(contentRows(b, m, false, false, true) - (a[2] - a[0]));
    if (over > d) { d = over; L = a[2]; t0 = a[0]; tid = id; }
  }
  if (d <= 0) return null;
  const areas = new Map();
  for (const b of s.blocks) {
    const a = [...lay(b).area];
    if (b.id === tid || (a[0] < L && a[2] > L) || (a[2] === L && a[0] <= t0)) a[2] += d;
    else if (a[2] >= L) { a[0] += d; a[2] += d; }
    areas.set(b.id, a);
  }
  return { sid: g.sid, bp, areas, d };
}
function showStored() {
  let t = stored;
  const shift = new Map();
  stored = null;
  const lone = !!t.lone;
  if (t.lone) t = t.bp === bp && S(t.sid) && B(t.sid, t.lone) ? storedRows({ sid: t.sid, kept: new Map([[t.lone, true]]) }) : null;
  if (!t) return shift;
  const s = t.bp === bp ? S(t.sid) : null;
  if (!s) return shift;
  for (const b of s.blocks) if (t.areas.has(b.id)) { shift.set(b.id, t.areas.get(b.id)[0] - lay(b).area[0]); lay(b).area = t.areas.get(b.id); }
  // X8 R1, refit 1 under test (CAP-98SECTION-A-PREDICTED.json, CAP-98SECTION-B-PREDICTED.json): a lone widening's stored rows give the section d rows
  // too, then it grows to its blocks as before (CAP-98.json 10 to 11 rows; CAP-98SPLIT.json 12 + 1, its blocks need 14).
  if (lone) s.rows[bp] += t.d;
  growRows(s);
  renderSectionDom(s.id);
  return shift;
}

function prepare(e, type, extra = {}) {
  if (unsettled) settleTextRows();
  const shift = stored ? showStored() : null;
  const g = gesture?.type === 'pending' ? gesture : { sid: sel.sid, bid: sel.bid, pointerId: e.pointerId, before: JSON.stringify(model) };
  Object.assign(g, { type }, extra);
  gesture = g;
  try {
    doc.documentElement.setPointerCapture(e.pointerId);
  } catch {}
  normalize(g.sid);
  g.before = JSON.stringify(model);
  const s = S(g.sid);
  const b = B(g.sid, g.bid);
  const fe = feEl(g.sid);
  g.orig = [...lay(b).area];
  g.rows0 = s.rows[bp];
  g.target = [...g.orig];
  g.m = measure(fe);
  // A block the stored rows moved is held where they put it (CAP-X8LAG.json, l3 and l6).
  if (shift?.get(g.bid) && g.grabY != null) g.grabY -= shift.get(g.bid) * g.m.pitch;
  fe.style.gridAutoRows = `${g.m.rowMin}px`;
  showGrid(g.sid, s.rows[bp]);
  g.original = layer(fe, 'fe-original-position', g.orig);
  fe.classList.add('is-gesture');
  // parity/findings/GUIDES.json: the target ring on top of everything, and the center line of the
  // section behind the blocks. Phones show the line only while it is yellow (HOLD.json).
  g.tind = marksLayer(fe, 'fe-transform-indicator', g.orig);
  g.line = doc.createElement('div');
  g.line.className = bp === 'desktop' ? 'fe-center-line' : 'fe-center-line is-phone';
  const section = fe.closest('section');
  section.insertBefore(g.line, section.querySelector(':scope > .content-wrapper'));
  if (type === 'resize') {
    g.marks = {};
    for (const o of s.blocks) if (o.id !== g.bid) g.marks[o.id] = marksLayer(fe, 'is-other', lay(o).area, 100000 + lay(o).z);
  }
  // The flags show from the first move, also on a drag too short to change the target (T0004).
  flagNeighbours(g, g.target);
  drawSelection();
  placeChrome();
  return g;
}

function beginMove(e) {
  // A block not yet selected stays unselected while it is dragged, and is selected on the drop (CAP-SELECTLETGO.json, a 12 to 14 px, c 70 px).
  // That the block selected before is let go at the drag's start is inferred: it was not read.
  // A block already in the selection stays selected, a group too (trace T0022).
  const p = gesture.pick, fresh = p && !(sel?.sid === p.sid && [sel.bid, ...(sel.more || [])].includes(p.bid));
  if (fresh) select(null);
  else if (p) select(p);
  else if (sel?.bid !== gesture.bid && !sel?.more?.length) select({ sid: gesture.sid, bid: gesture.bid });
  if (!fresh) gesture.pick = null;
  const g = prepare(e, 'move');
  g.more = (sel?.more || []).map((id) => ({ id, orig: [...lay(B(g.sid, id)).area] }));
  // A group's ring is around all its blocks from the start.
  if (g.more.length) setArea(g.tind, boxOf([g.orig, ...g.more.map((o) => o.orig)]));
  const el = blockEl(g.bid);
  el.classList.add('is-dragging');
}

function updateMove(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  const [r0, c0, r1, c1] = g.orig;
  const w = c1 - c0;
  const h = r1 - r0;
  const left = e.clientX - g.grabX;
  const y = e.clientY - g.grabY;
  const baseLeft = m.colStart[c0 - 1];
  const baseTop = top + (r0 - 1) * m.pitch;
  const solo = !g.more.length;
  const blockWidth = m.colEnd[c1 - 2] - baseLeft;
  const colPitch = m.colStart[2] - m.colStart[1];
  // The edge in front decides (G4, SNAP.json): the right one going right, the left one going left.
  // A block on the left margin track goes right by its left edge, as its width is about to change.
  // A group stops when its box reaches the side of the grid (HOLD.json).
  const origs = [g.orig, ...g.more.map((o) => o.orig)];
  const cLo = Math.min(...origs.map((a) => a[1]));
  const cHi = Math.max(...origs.map((a) => a[3]));
  const cMin = c0 + 1 - cLo;
  // A box that starts on the left margin track goes as far as the last column, not the right margin.
  // A phone does go into it, one block or a group (CAP-G4MARGIN2.json to CAP-G4MARGIN4.json, CAP-G4GROUPMARGIN.json).
  const cMax = Math.max(c0, c0 + (cLo === 1 && bp !== 'mobile' ? LAST_LINE[bp] - 1 : LAST_LINE[bp]) - cHi);
  const dx = left - baseLeft;
  // A group steps by its box's edges, not the held block's (CAP-G4LAST2.json): bl is the box's left line, bw its width, sh the held block's offset in it.
  const bl = solo ? c0 : cLo, bw = solo ? w : cHi - cLo, sh = c0 - bl;
  // A lone block on the right margin track goes left by its right edge, the mirror of the left margin, as far as the
  // first column, not the left margin, its last step waiting for its left edge to pass the left margin's middle: read on
  // 1, 2, 4, 7, 8, 10, 11, 12 and 13 wide (CAP-X2STEPS.json, CAP-X2STEPS3.json, CAP-X2WIDTHS.json to CAP-X2WIDTHS3.json,
  // CAP-X2RESIZED.json), inferred for the widths not read. A table, not a rule: 6 wide keeps the left edge rule, resized
  // or not, cause not known (HOLD.json, CAP-X2WIDTHS3.json G and H, CAP-X2RESIZED.json). A group and a phone are not read.
  const fromRight = dx < 0 && solo && bp !== 'mobile' && bl + bw === m.colStart.length + 1 && bw !== 6 && bw !== 9;
  let nb = (dx > 0 && bl > 1) || fromRight ? snapColumn(m, bl + bw, dx, (fromRight ? 2 : cMin - sh) + bw, cMax - sh + bw) - bw : snapColumn(m, bl, dx, cMin - sh, cMax - sh);
  if (fromRight && nb === 2 && bl > 2 && !leftEdgeOut(m, bl, dx)) nb = 3;
  // Rule T, refit 2, the last (CAP-X2T9-PREDICTED.json, predictions first). A lone 6 or 9 wide on the right margin track, whose
  // box is (width - 1) columns plus that track (M, K = M / pitch): with K under 1 it takes the left edge rule from the first pixel
  // (CAP-X2TWIDTHS.json at 1280, CAP-X2TREFIT.json at 1440). Otherwise, with n = width - 1 + round(K), a move left is on
  // 27 - (n + 2) until -(M / 2 + 5), then on 27 - (n + 1), or the left edge rule's column when that is further left, and a move
  // right goes to 27 - (width - 1 + ceil((M - 12) / pitch)). Fits the 6 wide at 1280 to 1920 (CAP-X2SIX.json, CAP-X2TWIDTHS.json,
  // CAP-X2TREFIT.json, HOLD.json, CAP-X2WIDTHS3.json G, CAP-X2W456B.json) and the 9 wide at 1600 (CAP-X2W39.json). 9 wide follows
  // the left edge rule, not the mirror.
  if (dx !== 0 && solo && bp !== 'mobile' && (bw === 6 || bw === 9) && bl + bw === m.colStart.length + 1) {
    const M = m.cols[m.cols.length - 1], n = bw - 1 + Math.round(M / colPitch), end = bl + bw;
    if (M >= colPitch) nb = Math.min(nb, dx > 0 ? end - (bw - 1 + Math.ceil((M - 12) / colPitch)) : dx > -(M / 2 + 5) ? end - n - 2 : end - n - 1);
  }
  // X2 read facts, not a rule (T is frozen): a lone 3 wide on the right margin track, read only at 1600 (M 89.125; CAP-X2T9.json
  // w3 rows8, R1 and R2 agree on 18 moves). A move right goes to 23; left, from the first pixel to -48 it is on 21, from -54 to
  // -139 on 22, then the mirror about 6px sooner than the table, and line 1 (not the table's 2) once its left edge passes the
  // left margin's middle (-1347; -1341 is on 2). The cuts between reads are not read: -(M / 2 + 5) between -48 and -54, and
  // the 6px shift fits every read (6 to 13 do; the true shift is not read). Other frame widths keep the table.
  if (dx !== 0 && solo && bp !== 'mobile' && bw === 3 && bl + bw === m.colStart.length + 1 && Math.abs(m.cols[m.cols.length - 1] - 89.125) < 0.5) {
    const end = bl + bw, s = dx - 6;
    nb = dx > 0 ? end - 4 : dx > -(m.cols[m.cols.length - 1] / 2 + 5) ? end - 6 : leftEdgeOut(m, bl, dx) ? 1 : Math.min(end - 5, snapColumn(m, end, s, 2 + bw, cMax + bw) - bw);
  }
  // From the left margin track the last step waits for the right edge to pass the right margin's middle
  // (MARGINSTEPS.json, CAP-G4MARGIN3.json, CAP-G4MARGIN4.json, CAP-G4MARGIN5.json).
  if ((solo || bp === 'mobile') && bl === 1 && nb === cMax - sh && cMax > c0 && !rightEdgeOut(m, bl + bw, dx)) nb = cMax - sh - 1;
  const nc0 = nb + sh;
  // A group's ring stops when its box reaches the top (HOLD.json).
  const nr0 = Math.max(r0 + 1 - Math.min(...origs.map((a) => a[0])), snapRow(m, r0, y - baseTop));
  let t = [nr0, nc0, nr0 + h, nc0 + w];
  // Center snap (G5, parity/findings/GUIDES.json, HOLD.json): within half a column of the center
  // the line is yellow. A block of an odd width cannot center on it, so there the target takes one
  // more column and is centered, and a drop keeps it. Not for a group.
  const q = fe.getBoundingClientRect();
  const near = solo && Math.abs(left + blockWidth / 2 - (q.left + q.right) / 2) <= colPitch / 2;
  if (near && w % 2) {
    const cs = centerLine() - (w + 1) / 2;
    t = [nr0, cs, nr0 + h, cs + w + 1];
  }
  // Other selected blocks move by the same number of rows and columns.
  for (const o of g.more) {
    const dr = nr0 - r0, dc = nc0 - c0;
    o.target = [o.orig[0] + dr, o.orig[1] + dc, o.orig[2] + dr, o.orig[3] + dc];
  }
  // A group has one ring around all its blocks (GUIDES.json).
  const all = [t, ...g.more.map((o) => o.target)];
  const box = [Math.min(...all.map((a) => a[0])), Math.min(...all.map((a) => a[1])), Math.max(...all.map((a) => a[2])), Math.max(...all.map((a) => a[3]))];
  if (!same(t, g.target)) {
    g.target = t;
    setArea(g.tind, box);
    flagNeighbours(g, box);
    // The grid follows the target down and back up, never below its own rows (HOLD.json).
    const rows = Math.max(g.rows0, box[2] - 1);
    if (rows !== g.shownRows) showGrid(g.sid, rows);
  }
  // On phones a group's line goes by where the box is, like a lone block's (HOLD.json).
  const groupLeft = m.colStart[cLo - 1];
  const groupNear = Math.abs(left - baseLeft + groupLeft + (m.colEnd[cHi - 2] - groupLeft) / 2 - (q.left + q.right) / 2) <= colPitch / 2;
  g.line.classList.toggle('is-centered', solo ? near : bp === 'desktop' ? box[1] + box[3] === 2 * centerLine() : groupNear);
  // The held block follows the pointer but stays inside the grid (HOLD.json): it stops at the top,
  // the left, 4px short of the right on desktop and on phones, and at the bottom.
  const el = blockEl(g.bid);
  const b = fe.getBoundingClientRect();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  if (solo) {
    // A lone block takes the target's width. Wider, its left edge stays. Narrower, the place it
    // was pressed stays under the pointer.
    const width = m.colEnd[t[3] - 2] - m.colStart[t[1] - 1];
    el.style.width = `${width}px`;
    const shown = left + Math.max(0, blockWidth - width) * g.grabX / blockWidth;
    const yShown = clamp(y, top, b.bottom - el.getBoundingClientRect().height);
    el.style.transform = `translate(${clamp(shown, b.left, b.right - 4 - width) - baseLeft}px, ${yShown - baseTop}px)`;
    return;
  }
  // A group keeps its widths. The top, left and bottom of its box stop at the grid. On the right
  // each block stops by itself: where it would have the 4px gap if it stood at the box's left.
  const rows = origs.map((a) => a[0]), ends = origs.map((a) => a[2]);
  // On phones the block also gets a lone block's shift when its target is narrower; on desktop a
  // group from the margin track gets none (HOLD.json).
  const shift = bp === 'desktop' ? 0 : Math.max(0, blockWidth - (m.colEnd[t[3] - 2] - m.colStart[t[1] - 1])) * g.grabX / blockWidth;
  const ty = clamp(y - baseTop, -(Math.min(...rows) - 1) * m.pitch, b.bottom - top - ((Math.max(...ends) - 1) * m.pitch - m.rg));
  for (const [id, a] of [[g.bid, g.orig], ...g.more.map((o) => [o.id, o.orig])]) {
    const el2 = blockEl(id);
    const wide = m.colEnd[a[3] - 2] - m.colStart[a[1] - 1];
    if (el2) el2.style.transform = `translate(${clamp(left + shift - baseLeft, b.left - groupLeft, b.right - 4 - wide - groupLeft)}px, ${ty}px)`;
  }
}

function startResize(e, dir) {
  if (sel.more?.length) {
    const members = [sel.bid, ...sel.more];
    const g = prepare(e, 'gresize', { dir, members });
    g.more = sel.more.map((id) => ({ id, orig: [...lay(B(g.sid, id)).area] }));
    // A Text or a Quote keeps the rows its content needs at the press, however narrow the group gets (CAP-X8TYPES.json, CAP-X8TYPES2.json).
    g.kept = new Map(members.filter((id) => B(g.sid, id).type === 'text' || B(g.sid, id).standin === 'quote').map((id) => [id, contentRows(B(g.sid, id), g.m)]));
    g.box0 = boxOf([g.orig, ...g.more.map((o) => o.orig)]);
    g.box = g.box0;
    setArea(g.tind, g.box0);
    flagNeighbours(g, g.box0);
    return;
  }
  prepare(e, 'resize', { dir });
  const held = B(gesture.sid, gesture.bid), span = lay(held).area[2] - lay(held).area[0];
  gesture.fits = (held.type === 'text' || held.standin === 'instagram') && !gesture.members && [contentRows(held, gesture.m), 2].includes(span) && span >= contentRows(held, gesture.m);
  if (gesture.fits) { gesture.need0 = contentRows(held, gesture.m); gesture.height0 = textHeight(held); }
  const q0 = blockEl(held.id).getBoundingClientRect();
  gesture.bottom0 = q0.bottom;
  gesture.top0 = q0.top;
  // On a phone a stand-in's content stretches its rows. A south pull counts from the rows that content needs on the plain
  // pitch, the phone's 24px row (render.js) and its gap, and steps on that pitch: one row down gives ceil((height + gap) / pitch) + 1 (CAP-68PULL.json).
  if (bp === 'mobile' && (held.standin || held.phoneHeight)) {
    const h = blockEl(held.id).querySelector('.sqs-block-content').getBoundingClientRect().height, rg = gesture.m.rg, pitch = PHONE_ROW + rg;
    gesture.free = { pitch, rg, need: Math.max(1, Math.ceil((h + rg) / pitch - 0.13)) }; // 0.13 of a row of give (CAP-X6PHONEROWS.json)
    // Held, the block leaves the flow and its rows would close up, the page with them, and the frame's scroll would jump: the grid
    // keeps its height until the gesture ends.
    const fe = feEl(gesture.sid);
    fe.style.minHeight = `${fe.getBoundingClientRect().height}px`;
  }
}

const boxOf = (areas) => [Math.min(...areas.map((a) => a[0])), Math.min(...areas.map((a) => a[1])), Math.max(...areas.map((a) => a[2])), Math.max(...areas.map((a) => a[3]))];

// One axis of a block in a resized group, k being the exact size ratio. From the side of the box that stays, a block's near
// line goes to D * k and its far line to (D - 1) * k + K, K being k with a half rounded down. A half goes to the larger line
// number, so an edge on the box stays there, except at a tie when the box's start moves (CAP-X8ROWS.json to CAP-X8ROWS3.json).
function scaleSpan(a0, a1, b0, b1, n0, n1, fromEnd) {
  const k = (n1 - n0) / (b1 - b0), K = Math.ceil(k - 0.5 - 1e-9), up = (v) => Math.floor(v + 0.5 + 1e-9);
  if (fromEnd) {
    const end = up(n1 - (b1 - a1) * k), start = Math.min(end - 1, up(n1 - (b1 - a0 - 1) * k - K));
    return start < n0 ? [n0, n0 + 1] : [start, end];
  }
  const start = up(n0 + (a0 - b0) * k), end = Math.max(start + 1, up(n0 + (a1 - 1 - b0) * k + K));
  return end > n1 ? [n1 - 1, n1] : [start, end];
}

function updateGroupResize(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  let [r0, c0, r1, c1] = g.box0;
  // One block's handle rule, from the press (CAP-G4GROUPRESIZE.json).
  const dx = e.clientX - g.x0, dy = e.clientY - top - g.py0;
  // A box on the left margin track grows by its left edge's steps, as one block does (CAP-G4LAST.json margin group).
  if (g.dir.includes('e')) { const hi = LAST_LINE[bp], top = bp === 'mobile' ? hi : hi - 1; c1 = c0 === 1 && dx > 0 && c1 < top ? Math.max(c0 + 1, marginEast(m, c1, dx, hi, top)) : snapColumn(m, c1, dx, c0 + 1, hi); }
  if (g.dir.includes('w')) c0 = snapColumn(m, c0, dx, 1, c1 - 1);
  if (g.dir.includes('s')) r1 = Math.max(r0 + 1, snapRow(m, r1, dy));
  if (g.dir.includes('n')) r0 = Math.min(r1 - 1, Math.max(1, snapRow(m, r0, dy)));
  const [br0, bc0, br1, bc1] = g.box0;
  const place = (id, a) => {
    const [cs, ce] = scaleSpan(a[1], a[3], bc0, bc1, c0, c1, g.dir.includes('w'));
    const [rs0, re] = scaleSpan(a[0], a[2], br0, br1, r0, r1, g.dir.includes('n'));
    const el = blockEl(id);
    setArea(el, [rs0, cs, re, ce]);
    // A text block keeps the rows its content needs by moving its start up.
    const need = g.kept.get(id) ?? contentRows(B(g.sid, id), m);
    const rs = re - rs0 < need ? Math.max(r0, re - need) : rs0;
    const t = [rs, cs, Math.max(re, rs + need), ce];
    setArea(el, t);
    return t;
  };
  const moved = [g.orig, ...g.more.map((o) => o.orig)].map((a, k) => place(k ? g.more[k - 1].id : g.bid, a));
  g.target = moved[0];
  g.more.forEach((o, k) => { o.target = moved[k + 1]; });
  g.box = [r0, c0, r1, c1];
  setArea(g.tind, g.box);
  flagNeighbours(g, g.box);
  if (r1 - 1 > g.shownRows) showGrid(g.sid, r1 - 1);
}

// Where a side pull stops, the same from each side, by type or by a stand-in's name (CAP-X6FLOORS.json, CAP-X6PHONEFLOORS.json;
// a button whatever its text, BUTTONDESIGN.json; CAP-T5PHONE.json, CAP-T11SOCIAL.json). Text, Shape and Line stop at 1.
const LEAST_COLS_PHONE = { scrolling: 3 }; // CAP-X6PHONEFLOORS.json, the only one that differs on a phone
const LEAST_COLS = { markdown: 2, social: 2, button: 3, accordion: 3, Product: 3, Donation: 3, Quote: 3, 'Page Link': 3, 'Tag Cloud': 3, RSS: 3, Tock: 3, SoundCloud: 3, Flickr: 3, OpenTable: 3, Zola: 3, Bandsintown: 3, video: 4, form: 4, scrolling: 4, Audio: 4, map: 4, code: 4, embed: 4, Instagram: 4, 'Pricing Plan': 6, Calendar: 6, Menu: 6, 'Search Field': 6, Archive: 6, Newsletter: 7, Scheduling: 8, Summary: 8, Chart: 8 };

function updateResize(e) {
  const g = gesture;
  const fe = feEl(g.sid);
  const m = g.m;
  const top = fe.getBoundingClientRect().top;
  let [r0, c0, r1, c1] = g.orig;
  const x = e.clientX;
  const y = e.clientY;
  if (x !== g.lastX) { g.stepX = x - (g.lastX ?? x); g.lastX = x; }
  const held = B(g.sid, g.bid), leastCols = (bp === 'mobile' ? LEAST_COLS_PHONE[held.type] : null) ?? LEAST_COLS[held.label] ?? LEAST_COLS[held.type] ?? 1;
  const q = fe.getBoundingClientRect();
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
  // While held the block's own box follows the pointer and only the ring snaps (HOLD.json). It stops at
  // its floor and at the sides of the grid, with no 4px on the right.
  const dx = x - g.x0, dy = y - top - g.py0;
  const left0 = m.colStart[c0 - 1];
  let L = left0, R = m.colEnd[c1 - 2];
  // Its floor in pixels, so what it needs is measured at no less than the width it can end at (CAP-X6FLOORS.json: Accordion 11 rows, Quote 9).
  const leastPx = m.colEnd[leastCols] - m.colStart[1];
  if (g.dir.includes('e')) R = clamp(R + dx, L + leastPx, q.right);
  if (g.dir.includes('w')) L = clamp(L + dx, q.left, R - leastPx);
  const el = blockEl(g.bid);
  // Out of the flow, so its height does not push the grid's rows. Its area is still its place.
  Object.assign(el.style, { position: 'absolute', left: '0', top: '0', width: `${R - L}px` });
  if (g.dir.includes('e')) {
    // The step counts from the press, wherever on the handle that was (CAP-G4GRAB.json).
    const lo = Math.min(c0 + leastCols, LAST_LINE[bp]), hi = LAST_LINE[bp], d = dx;
    // A block on the left margin track grows by its left edge's steps, as a move does. It stops as a move does, and its last
    // step waits the same way (CAP-G4MARGIN.json, CAP-G4MARGIN2.json, CAP-G4MARGIN5.json, CAP-G4MARGIN6.json, BLOCKTYPES.json columnSnap).
    const top = bp === 'mobile' ? hi : hi - 1;
    if (c0 === 1 && d > 0 && c1 < top) {
      c1 = Math.max(lo, marginEast(m, c1, d, hi, top));
    } else c1 = snapColumn(m, c1, d, lo, hi);
  }
  if (g.dir.includes('w')) c0 = snapColumn(m, c0, dx, 1, Math.max(1, c1 - leastCols));
  if (g.dir.includes('s')) r1 = g.free ? r0 + g.free.need + Math.sign(dy) * Math.max(0, Math.round((Math.abs(dy) - g.free.rg / 2) / g.free.pitch)) : Math.max(r0 + 1, snapRow(m, r1, dy));
  if (g.dir.includes('n')) r0 = Math.min(r1 - 1, Math.max(1, snapRow(m, r0, dy)));
  // Guard: a target cannot be shorter than the content at the width the block has now.
  // A stand-in on a phone takes at least the rows of the height it drew at the press, on a side pull too, and keeps them as it
  // narrows; one whose content grows as it narrows, like a Quote, takes that (CAP-X6PHONEFLOORS.json).
  let need = Math.max(g.free && !g.dir.includes('n') ? g.free.need : 1, contentRows(B(g.sid, g.bid), m, false, /[ew]/.test(g.dir)));
  // A side pull gives these stand-ins the rows of the oracle's content at the new width and never gives rows back, on desktop
  // and on a phone (CAP-X6DESKROWS.json, CAP-X6PHONEROWS.json). An Instagram follows its tiles both ways: its rows at the snapped width.
  const side = /^[ew]$/.test(g.dir);
  if (side && held.standin === 'instagram') {
    // Held, it is out of the flow: measured now, the grid's rows aren't the ones its content stretched at the press. A phone's
    // grid keeps its height while held, so its rows go by the plain pitch.
    const { width, height } = el.style;
    Object.assign(el.style, { width: `${m.colEnd[c1 - 2] - m.colStart[c0 - 1]}px`, height: '' });
    need = contentRows(held, bp === 'mobile' ? { pitch: PHONE_ROW + m.rg, rg: m.rg } : measure(fe));
    Object.assign(el.style, { width, height });
    r1 = r0 + need;
  } else if (side && bp === 'desktop' && deskHeight(held.label, c1 - c0) !== undefined) {
    // A Summary takes the rows of its content's height before the pull, at the width it was pressed at, so it widens into
    // the rows of its narrower content (CAP-X6SUMMARYWALK.json: P, 9 of 11 predicted, the 2 misses pulls that moved nothing).
    // Pulled past its floor it sits there long enough to reflow: the landed width's (refit 1, CAP-X6DESKROWS.json w far in, seen;
    // CAP-X6SUMMARYFAR.json 2 of 3 fresh, frozen: from 22 columns it reached the floor late and kept the pressed width's, inferred).
    const [, o0, , o1] = g.orig;
    const past = held.label === 'Summary' && (g.dir === 'e' ? snapColumn(m, o1, dx, o0 + 1, LAST_LINE[bp]) < o0 + leastCols : snapColumn(m, o0, dx, 1, o1 - 1) > o1 - leastCols);
    const cols = held.label === 'Summary' && !past ? o1 - o0 : c1 - c0;
    need = Math.max(need, Math.ceil((deskNeed(held, cols) + m.rg) / m.pitch - 0.02));
  }
  else if (side && bp === 'mobile' && held.phoneHeight) {
    // A pointer past the floor, where it would snap under it, takes the rows with no give: Menu 31.09 rows high is 31 at
    // its floor and 32 past it, from either side (CAP-X6FARSETTLE.json, 7 of 7 predicted).
    const [, o0, , o1] = g.orig;
    const past = g.dir === 'e' ? snapColumn(m, o1, dx, o0 + 1, LAST_LINE[bp]) < o0 + leastCols : snapColumn(m, o0, dx, 1, o1 - 1) > o1 - leastCols;
    need = Math.max(g.free?.need ?? 1, Math.ceil(((phoneHeightAt(held.label, c1 - c0) ?? held.phoneHeight) + m.rg) / (PHONE_ROW + m.rg) - (past ? 0.02 : 0.13)));
  }
  // A Text on a corner pull takes the floor its text had one pointer step before, as a side pull does at the drop: narrowed
  // from one row it stays one row, and the text runs over until let go (CAP-TEXTWIDTH7.json f3, CAP-SINGLEAGAIN.json f3,
  // CAP-ONEROWHANDLE.json, 3 reads, se). Other corners inferred.
  if (held.type === 'text' && /^(se|sw|ne|nw)$/.test(g.dir)) { const now = need; need = g.needPrev ?? now; g.needPrev = now; }
  // A Video on a corner pull: the rows its new width takes go on the bottom, whatever the top does (CAP-X6PULLS.json, CAP-X6AGAIN.json).
  if (held.type === 'video' && g.dir.includes('n') && /[ew]/.test(g.dir) && g.orig[2] - g.orig[0] < need) r1 = g.orig[0] + need;
  if (r1 - r0 < need) {
    if (g.dir.includes('n')) {
      r0 = Math.max(1, r1 - need);
      if (r1 - r0 < need) r1 = r0 + need;
    } else {
      r1 = r0 + need;
    }
  }
  const t = [r0, c0, r1, c1];
  g.target = t;
  setArea(g.tind, t);
  flagNeighbours(g, t);
  // The grid follows the target down and back up, never below its own rows.
  const rows = Math.max(g.rows0, t[2] - 1);
  if (rows !== g.shownRows) showGrid(g.sid, rows);
  // The box's height: the content's rows at the least, and it stops at the top and bottom of the grid.
  const [or0, , or1] = g.orig;
  const top0 = (or0 - 1) * m.pitch, least = need * m.pitch - m.rg;
  let T = top0, Bt = (or1 - 1) * m.pitch - m.rg;
  if (g.dir.includes('s')) Bt = clamp(Bt + dy, T + least, fe.getBoundingClientRect().height);
  if (g.dir.includes('n')) T = clamp(T + dy, 0, Bt - least);
  el.style.height = `${Bt - T}px`;
  el.style.transform = `translate(${L - left0}px, ${T - top0}px)`;
}

function endGesture() {
  const g = gesture;
  gesture = null;
  if (!g || g.type === 'pending') return;
  const fe = feEl(g.sid);
  fe.dataset.gridIsVisible = 'false';
  fe.style.gridAutoRows = '';
  fe.style.minHeight = '';
  clearFlags(g.sid);
  fe.classList.remove('is-gesture');
  g.line?.remove();
  for (const el of fe.querySelectorAll('.fe-grid-row, .fe-original-position, .fe-marks')) el.remove();
  for (const o of g.more || []) { const el2 = blockEl(o.id); if (el2) { el2.style.transform = ''; el2.style.gridArea = ''; } }
  const el = blockEl(g.bid);
  if (el) {
    el.classList.remove('is-dragging');
    el.style.transform = '';
    el.style.gridArea = '';
    for (const k of ['width', 'height', 'position', 'left', 'top']) el.style[k] = '';
  }
  try {
    doc.documentElement.releasePointerCapture(g.pointerId);
  } catch {}
}

function cancelGesture() {
  pressFresh = false;
  const g = gesture;
  if (!g) return;
  endGesture();
  model = JSON.parse(g.before);
  note('Cancelled');
  renderAll();
}

// ---------- keyboard ----------
const ARROWS = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] };

function onKey(e) {
  const mod = e.metaKey || e.ctrlKey;
  // A press on a code editor's column leaves the focus on the editor: a key does nothing there, and Meta+Z is the page's (CAP-T10UNDO.json, CAP-T10UNDO2.json).
  if (e.target.matches?.('.bp-code') && !(mod && e.key.toLowerCase() === 'z') && e.key !== 'Escape') return;
  if (editing) {
    // One Escape takes the text bar and leaves the block selected, and keys still reach the text. The next Escape,
    // or Tab then, lets the block go (CAP-ESC1.json).
    if (e.key === 'Escape' || (e.key === 'Tab' && editing.soft)) {
      e.preventDefault();
      if (editing.soft) { finishTextEdit(); select(null); } else softenTextEdit();
      return;
    }
    // Cmd+Z and Cmd+Shift+Z are the edit's own: one step, and the edit stays open (CAP-Y2EDIT.json). A field keeps its own.
    if (mod && !e.altKey && e.code === 'KeyZ' && !e.target.closest?.('input, textarea, select')) {
      e.preventDefault();
      const ed = editing, y0 = win.scrollY;
      ed.caretGone = false;
      if (e.shiftKey) textRedo(ed); else textUndo(ed);
      textStepScrolled(ed, y0);
      return;
    }
    if (e.key === 'Enter' && e.shiftKey && !mod && !e.altKey) {
      e.preventDefault();
      if (fmt.insertLineBreak(doc, editing.ce, win.getSelection())) { joinOrStep(editing); onTextInput(); }
      return;
    }
    // The oracle's text shortcuts: Cmd+Opt+6..3 Heading 1..4, Cmd+Opt+2..0 Paragraph 1..3,
    // Cmd+Opt+M Monospace (listed in its Text Style menu), Cmd+B and Cmd+I. e.code, because
    // Option changes e.key on macOS.
    const STYLE_KEYS = { Digit6: 'h1', Digit5: 'h2', Digit4: 'h3', Digit3: 'h4', Digit2: 'p.sqsrte-large', Digit1: 'p', Digit0: 'p.sqsrte-small', KeyM: 'pre' };
    if (mod && e.altKey && STYLE_KEYS[e.code]) { e.preventDefault(); applyFormat('style', STYLE_KEYS[e.code]); renderTextBar(); return; }
    if (mod && !e.altKey && !e.shiftKey && (e.code === 'KeyB' || e.code === 'KeyI')) { e.preventDefault(); applyFormat(e.code === 'KeyB' ? 'bold' : 'italic'); return; }
    return;
  }
  // Cmd+Shift+H hides the selection on desktop (the oracle's right-click menu shows the shortcut).
  if (sel && !gesture && mod && e.shiftKey && !e.altKey && e.code === 'KeyH') {
    e.preventDefault();
    const before = JSON.stringify(model);
    const sid = sel.sid;
    hideBlocks(sid, [sel.bid, ...(sel.more || [])], 'desktop');
    renderSectionDom(sid);
    commit(before, 'Hid on desktop with Cmd+Shift+H');
    return;
  }
  // Cmd+C and Cmd+V copy and paste blocks (the oracle's right-click menu shows the shortcuts).
  if (mod && !e.shiftKey && !e.altKey && !gesture && (e.code === 'KeyC' || e.code === 'KeyV') && !e.target.closest?.('input, textarea, select, [contenteditable="true"]')) {
    if (e.code === 'KeyC' && sel) { e.preventDefault(); copyBlocks(); return; }
    const to = sel?.sid || hoverSid;
    if (e.code === 'KeyV' && blockClip && to) {
      e.preventDefault();
      const before = JSON.stringify(model);
      pasteBlocks(to);
      renderSectionDom(to);
      commit(before, 'Pasted a block');
      return;
    }
  }
  // Shift+S stacks the selection (the oracle's right-click menu shows the shortcut).
  if (sel && !gesture && e.shiftKey && !mod && !e.altKey && e.code === 'KeyS') {
    e.preventDefault();
    const before = JSON.stringify(model);
    const sid = sel.sid;
    stackBlocks();
    renderSectionDom(sid);
    commit(before, 'Stacked with Shift+S');
    return;
  }
  if (mod && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (gesture) return;
    if (e.shiftKey) redo();
    else undo();
    return;
  }
  if (e.key === 'Escape') {
    if (boxUp || leftRings && !sel) return;
    // An open menu or popover goes first; the block stays selected until the next Escape.
    if (vAlignOpen || !pinPop.hidden) { closeFloating(); return; }
    if (gesture && gesture.type !== 'pending') cancelGesture();
    else {
      // A typed accordion field keeps its text: Escape commits it first (CAP-T12READS-H.json).
      const f = document.activeElement;
      if (blockPanel.contains(f) && f.matches('[data-content="accTitle"], [data-content="accDescription"]')) f.blur();
      accordionEscape(); select(null);
    }
    return;
  }
  // Keys measured on the oracle (parity/findings/KEYS.json, KEYS2.json).
  if (sel && !gesture && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    const before = JSON.stringify(model);
    const ids = [sel.bid, ...(sel.more || [])];
    const sid = sel.sid;
    for (const id of ids) removeOne(sid, id);
    sel = null;
    renderSectionDom(sid);
    commit(before, `Removed ${ids.length} block${ids.length > 1 ? 's' : ''}`);
    return;
  }
  if (sel && !gesture && mod && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    const before = JSON.stringify(model);
    duplicateBlock(sel.sid, sel.bid);
    renderSectionDom(sel.sid);
    commit(before, 'Duplicated a block');
    return;
  }
  // A child picked from Layers lives in its stack: arrow keys do nothing (S3.json fromLayers.arrowKeys).
  if (ARROWS[e.key] && sel && !gesture && parentStack(sel.sid, sel.bid)) { e.preventDefault(); return; }
  if (ARROWS[e.key] && sel && !gesture && mod) {
    // Cmd+Arrow moves the block's end edges: Left and Right the end column, Up and Down the end row.
    e.preventDefault();
    normalize(sel.sid);
    const before = JSON.stringify(model);
    const b = B(sel.sid, sel.bid);
    const [dr, dc] = ARROWS[e.key];
    const a = lay(b).area;
    const next = [a[0], a[1], Math.max(a[0] + 1, a[2] + dr), Math.min(LAST_LINE[bp], Math.max(a[1] + 1, a[3] + dc))];
    if (b.type === 'text') next[2] = Math.max(next[2], a[0] + contentRows(b, measure(feEl(sel.sid))));
    lay(b).area = next;
    growRows(S(sel.sid));
    renderSectionDom(sel.sid);
    commit(before, `Keyboard resized ${sel.bid} to ${next.join('/')}`);
    return;
  }
  if (ARROWS[e.key] && sel && !gesture) {
    e.preventDefault();
    normalize(sel.sid);
    const before = JSON.stringify(model);
    const [dr, dc] = ARROWS[e.key];
    const group = [sel.bid, ...(sel.more || [])].map((id) => B(sel.sid, id));
    const nexts = group.map((b) => { const a = lay(b).area; return [a[0] + dr, a[1] + dc, a[2] + dr, a[3] + dc]; });
    if (nexts.every((n) => n[0] >= 1 && n[1] >= 1 && n[3] <= LAST_LINE[bp])) {
      group.forEach((b, k) => { lay(b).area = nexts[k]; });
      growRows(S(sel.sid));
    }
    const b = group[0];
    renderSectionDom(sel.sid);
    commit(before, `Keyboard moved ${sel.bid} to ${lay(b).area.join('/')}`);
  }
}

// ---------- text editing ----------
function onDblClick(e) {
  const blk = e.target.closest('.fe-block');
  if (!blk || editing) return;
  const sid = blk.closest('section').dataset.sectionId, b = B(sid, blk.dataset.blockId);
  // A double-click on a Markdown block opens its panel (CAP-T10MD3.json).
  if (b?.type === 'markdown') { select({ sid, bid: b.id }); designOpen = b.id; designTab = 'Content'; updateUi(); return; }
  startTextEdit(sid, blk.dataset.blockId);
}

const textHeight = (b) => blockEl(b.id)?.querySelector('.sqs-block-content')?.offsetHeight ?? 0;
// A Text whose content is under one and a half of its first line's height (rule S).
const oneLine = (b) => {
  const c = blockEl(b.id)?.querySelector('.sqs-block-content'), p = c?.querySelector('p, h1, h2, h3, h4, pre');
  const lh = p ? parseFloat(win.getComputedStyle(p).lineHeight) : NaN;
  return lh > 0 && c.offsetHeight < 1.5 * lh;
};
// x of grid line k (1 is the left edge of the first column), on the browser's 1/64 px layout steps: the computed track
// widths are rounded to 4 places, which adds up to 805.4994 for line 14 at 1600, where the box is at 805.5.
const lineX = (m, k) => Math.round((k - 1 < m.colStart.length ? m.colStart[k - 1] : m.colEnd[m.colEnd.length - 1]) * 64) / 64;
const selectionLeft = new Map(); // block id: the html it was left with and where its selection was
const previewed = new Map(); // the text of each block when Preview last forgot its selection
const pathFrom = (root, node) => { const path = []; for (let n = node; n !== root; n = n.parentNode) path.unshift([...n.parentNode.childNodes].indexOf(n)); return path; };
const nodeAtPath = (root, path) => path.reduce((n, k) => n?.childNodes[k], root);

function startTextEdit(sid, bid) {
  if (editing?.soft && editing.bid === bid) { editing.soft = false; blockEl(bid).classList.add('is-text-editing'); editing.ce.focus(); renderTextBar(); placeToolbar(); return; }
  const b = B(sid, bid);
  if (!b || b.type !== 'text' || editing) return;
  select({ sid, bid: b.id });
  const before = JSON.stringify(model);
  const el = blockEl(b.id);
  el.classList.add('is-text-editing');
  const ce = el.querySelector('.sqs-html-content');
  ce.contentEditable = 'true';
  ce.focus();
  // The caret starts inside the last text, so a press finds its block even when it's empty (CAP-E4ENTER.json).
  // Opened again, the selection is where it was left (CAP-E4REOPEN.json), unless the text changed since. A Preview
  // forgets it and the caret starts at the very start (CAP-E4REOPEN2.json).
  const range = doc.createRange();
  const fromStart = previewed.get(b.id) === b.html; // A change since, an Undo say, puts it back at the end (CAP-E4REOPEN2.json)
  range.selectNodeContents([...ce.querySelectorAll('h1, h2, h3, h4, p, pre')].at(fromStart ? 0 : -1) ?? ce);
  range.collapse(fromStart);
  const s = win.getSelection();
  s.removeAllRanges();
  s.addRange(range);
  const kept = selectionLeft.get(b.id), keptA = kept?.html === ce.innerHTML && nodeAtPath(ce, kept.anchor), keptF = keptA && nodeAtPath(ce, kept.focus);
  if (keptF) s.setBaseAndExtent(keptA, kept.anchorOffset, keptF, kept.focusOffset);
  const fe = feEl(sid);
  const m = measure(fe);
  fe.style.gridAutoRows = `${m.rowMin}px`;
  editing = { sid, bid: b.id, before, ce, m, area: [...lay(b).area], need: contentRows(b, m), height0: textHeight(b), prevHeight: textHeight(b), marks: [before], atMark: true, prevHtml: ce.innerHTML, prevArea: [...lay(b).area], lastInput: 0 };
  ce.addEventListener('beforeinput', onTextBeforeInput);
  ce.addEventListener('input', onTextInput);
  ce.addEventListener('paste', onPaste);
  ce.addEventListener('focus', () => { if (editing) editing.keysOff = false; });
  doc.addEventListener('selectionchange', onTextSelection);
  renderPanel();
  renderTextBar();
  // select() above showed the block toolbar; writing hides it, so no edge of it shows by the text bar (an oracle shot with
  // the editor open: nothing but its own shadow above or below the bar).
  placeToolbar();
}

// Paste (E5): our own cleanup with the oracle's rules (app/src/paste.js).
function onPaste(e) {
  const ed = editing;
  if (!ed) return;
  e.preventDefault();
  const dt = e.clipboardData;
  insertPaste(doc, ed.ce, win.getSelection(), cleanPaste(doc, dt.getData('text/html'), dt.getData('text/plain')), dt.getData('text/plain'));
  onTextInput();
}

// Edit > Design (parity/findings/DESIGN.json): Background and Blur switches, Opacity,
// Rotate, Scale X and Y, Offset X and Y, Skew X and Y. The values go into the block's
// transform-vars rule (render.js designCss). Stroke and Blend Mode are not built.
let designOpen = null;
let designTab = 'Design';
const tabOfType = new Map(); // a block type's last panel tab (CAP-T15EDITTAB.json)
let blendOpen = false;
let bstyleOpen = false;
let fihOpen = false;
// The Animation tab (T15): which view, for which row of b.animations. i is null while a new row
// has no preset yet: nothing is added until a tile or Start blank is pressed.
const ANIM_LIST = { view: 'list', i: null, trigger: 'hover', tab: null, menu: false };
let anim = { ...ANIM_LIST };
let animClip = null; // copied rows
let animPosed = null; // the block held in the pose of the End, Start or Range tab
let animPlaying = false;
let animPlay = null; // after the next draw: 'tiles'
let embedData = false;
// A stand-in's view (Audio's Podcast, Summary's Size and Spacing), for the block it was opened on.
let spView = null;
let accView = null; // 'acc-item:<n>' or 'acc-dividers'
let accGrew = false; // an edit in the item view on show made the block grow
let imageView = null; // the image Shape picker's tab, or null
let fxView = null; // the Image Effect panel: 'list', 'settings' or null
let fxOpen = []; // its settings groups that are open: they all start closed
const blockPanel = $('block-panel');
const dialogEl = $('block-dialog');
dialogEl.addEventListener('scroll', () => dialogEl.style.setProperty('--dl-scroll', `${dialogEl.scrollTop}px`));
let dlgTab = null; // the open tab of T12's dialog
let shapeUi = null; // the open popup of a shape's Design tab: { kind, bid, custom }
let codeCommit = false;
function renderBlockPanel() {
  settleVideoColors();
  if (shapeUi && !shapeUi.section && (!sel || shapeUi.bid !== sel.bid || designOpen !== sel.bid)) closeShapePop();
  if (shapeUi?.kind === 'anchor') queueMicrotask(() => { if (shapeUi?.kind === 'anchor') renderShapePop(); }); // an undo too
  const b = sel && designOpen === sel.bid && !sel.more?.length ? B(sel.sid, sel.bid) : null;
  if (b && dialogOf(b)) { blockPanel.hidden = true; renderDialog(b); return; }
  if (!dialogEl.hidden) { dialogEl.hidden = true; dialogEl.dataset.key = ''; }
  if (!sel || sel.bid !== linkPop.dataset.bid) closeLinkPopover();
  if (!b && accView) for (const li of doc.querySelectorAll('.accordion-item[data-is-open]')) if (li.previousElementSibling || li.parentElement.dataset.isExpandedFirstItem !== 'true') li.removeAttribute('data-is-open');
  if (!b) { anim = { ...ANIM_LIST }; syncAnimView(null); blendOpen = false; bstyleOpen = false; fihOpen = false; embedData = false; spView = null; accView = null; imageView = null; ffView = null; showFormPost(null); fxView = null; panelMoved = null; if (!blockPanel.hidden) { blockPanel.hidden = true; } if (designOpen && (!sel || designOpen !== sel.bid)) designOpen = null; return; }
  if (b.type !== 'image' || b.mode !== 'shape' || designTab !== 'Design') imageView = null; // undo can leave Shape
  if (b.type !== 'image' || b.empty || designTab !== 'Design') fxView = null;
  if (fxView === 'settings' && !b.effect) fxView = 'list'; // undo can take the effect away
  if (b.type !== 'accordion' || (accView?.startsWith('acc-item:') && !b.items[Number(accView.slice(9))])) accView = null; // undo can take the item away
  const content = b.type === 'button' ? { label: b.label, href: b.href, pages: siteLinkGroups() } : b.type === 'image' ? { src: b.src, href: b.href, pages: siteLinkGroups(), alt: b.alt, filename: b.filename, empty: !!b.empty, focal: b.focal, aspect: b.aspect, lightbox: !!b.lightbox }
    : b.type === 'video' && !b.html ? { kind: 'video', description: b.description, video: b.video }
    : b.type === 'markdown' ? { kind: 'markdown', text: b.text || '' }
    : b.type === 'code' && b.html != null ? { kind: 'code', html: b.html, mode: b.codeMode || 'html', showSource: !!b.showSource }
    : b.type === 'accordion' ? { kind: 'accordion', items: b.items, expandFirst: b.expandFirst, multiple: b.multiple, dividers: b.dividers, showFirst: b.showFirst, showLast: b.showLast, iconSize: b.iconSize, iconThickness: b.iconThickness, iconLeft: b.iconLeft, rowPadding: b.rowPadding, icon: b.icon, titleStyle: b.titleStyle, titleAlign: b.titleAlign, descStyle: b.descStyle, descWidth: b.descWidth, descPad: b.descPad, descAlign: b.descAlign, descPlace: b.descPlace, dividerSize: b.dividerSize, dividerOpacity: b.dividerOpacity }
    : b.type === 'line' ? { kind: 'line' }
    : b.type === 'social' ? (() => { const l = socialLook(b, bp === 'mobile'); return { kind: 'social', links: socialList(), err: socErr, iconBorder: l.iconBorder, iconStyle: l.iconStyle, iconThick: l.iconThick, iconSize: l.iconSize, align: l.align }; })()
    : b.type === 'map' ? { kind: 'map', ...mapOf(b), mapName: b.mapName, mapAddress: b.mapAddress, mapCity: b.mapCity, mapCountry: b.mapCountry }
    : b.type === 'form' ? { kind: 'form', formName: b.formName || `${pageTitle()} Form`, button: b.button || 'Send', ...formView(b, bp), highlight: b.highlight || 'none', fihOpen, lightboxBg: shapeColorOf(b, 'lightboxBg'), fields: b.fields || [], post: postOf(b), pages: siteLinkGroups() }
    : b.type === 'embed' ? { kind: 'embed', html: b.html, as: b.embedAs || 'link', url: b.embedUrl, invalid: b.embedInvalid, description: b.description }
    : b.standin === 'quote' ? { kind: 'quote', ...quoteOf(b), appear: b.appear }
    : b.standin === 'newsletter' ? { kind: 'newsletter', ...newsletterOf(b), post: postOf(b), pages: siteLinkGroups() }
    : standinPanelOf(b) ? { kind: 'standin', name: b.label, values: b.sp || {} } : null;
  if (spView && (spView.bid !== b.id || content?.kind !== 'standin')) spView = null;
  if ((!content || content.kind === 'line') && designTab === 'Content') designTab = 'Design';
  if (b.type === 'markdown') designTab = 'Content'; // it has no other tab (CAP-T10MD3.json)
  if (content?.kind === 'newsletter' ? designTab === 'Animation' : designTab === 'Storage') designTab = content ? 'Content' : 'Design'; // only a Newsletter has Storage, and it has no Animation
  if (b.type !== 'social') { socView = null; socErr = ''; } else if (socView?.startsWith('soc-row:') && !socialList()[Number(socView.slice(8))]) socView = null; // undo can take the row away
  if ((b.type !== 'form' && b.standin !== 'newsletter') || blockPanel.dataset.bid !== b.id) ffView = null; else if (ffOpen() && !(ffField(b) && (!ffView.startsWith('ff-opt:') || followOf(ffField(b), ffView.split(':')[2]).length))) ffView = 'ff-list'; // undo can take the field away
  showFormPost(b);
  const mdField = b.type === 'markdown' && blockPanel.querySelector('textarea[data-content="markdown"]');
  if (mdField && mdField === document.activeElement && fullOf(mdField) !== (b.text || '')) { dropFolds(mdField); mdField.value = b.text || ''; mdLines(mdField); paintMdBar(mdField); } // undo with the field still in focus
  if (codeCommit) return; // the field's own text changed nothing else here, and a redraw would take a press on Mode from under it
  if (blockPanel.contains(document.activeElement) && document.activeElement.matches('[data-content],[data-afield],[data-ff-field],[data-ff-opt],[data-ff-post],[data-form-lbtext],.bp-rt')) return; // keep a field being typed in
  const shape = b.type === 'shape' && b.standin !== 'quote' && b.standin !== 'newsletter' && !standinPanelOf(b) ? { radius: cornerFor(b, bp).first, stretch: b.stretch !== false, shape: b.shape, corners: shownCorners(b), color: shapeFill(b, bp) || themeInk(b, 'fill'), strokeInk: themeInk(b, 'stroke') } : null;
  const image = b.type === 'image' ? { mode: b.mode || 'fill', shapeId: b.imageShape || 'circle', corner: cornerFor(b, bp).first, corners: shownCorners(b), empty: !!b.empty, stretch: !!b.stretch, overlay: !!b.overlay, overlayColor: shapeColorOf(b, 'overlay'), blendName: BLEND_MODES.find((m) => blendValue(m) === (b.overlayBlend || 'normal')), lightbox: !!b.lightbox, themeName: b.lightboxTheme === 'light' ? 'Light Overlay' : 'Dark Overlay', fxView, fxOpen, effect: b.effect } : null;
  const stack = b.type === 'stack' ? { ...stackAxes(b, bp), gap: b.gap ?? 20, gapOpen: stackGapOpen, pad: b.padding, four: !!b.padFour } : null;
  const kidBox = parentStack(sel.sid, sel.bid) ? blockEl(sel.bid)?.getBoundingClientRect() : null;
  const kid = kidBox ? { ...kidSize(b, bp), open: kidSizeOpen, noHug: b.type === 'shape' && b.stretch !== false, fixed: { w: `${Math.round(kidBox.width)}px`, h: `${Math.round(kidBox.height)}px` } } : null;
  const buttonView = b.type !== 'button' ? null : bp === 'mobile' && b.btnMobile ? b.btnMobile : { fit: b.fit, align: b.halign };
  const button = buttonView ? { style: b.buttonStyle || 'primary', fit: !!buttonView.fit, align: buttonView.align || 'center' } : null;
  const lookWas = blockPanel.dataset.bid === b.id && !blockPanel.hidden ? blockPanel.querySelector('.bp-code.is-look textarea') : null;
  const lookKeep = lookWas && { value: fullOf(lookWas), folds: foldsOf(lookWas), start: lookWas.selectionStart, end: lookWas.selectionEnd, dir: lookWas.selectionDirection, top: lookWas.scrollTop };
  blockPanel.innerHTML = blockPanelHtml(designFor(b, bp), designTab, content, (b.type === 'form' || b.standin === 'newsletter') && designTab === 'Content' && ffView ? ffView : b.type === 'social' && designTab === 'Content' && socView ? socView : b.type === 'accordion' && accView ? accView : spView ? `sp-view:${spView.label}` : imageView ? `image-shape:${imageView}` : fxView ? 'image-fx' : designTab === 'Content' && embedData ? 'embed-data' : designTab === 'Animation' ? animListHtml(animRowsOf(b), bp === 'mobile', bp === 'mobile' ? { order: animPhoneOrder(b.animations || []), own: (b.animations || []).map((a) => !!a.phone) } : {}) : (blendOpen ? 'blend' : bstyleOpen ? 'bstyle' : null), shape, image, stack, button, kid);
  // The phone's Transforms head has no More actions (CAP-COVERAGE.json, difference 77).
  if (bp === 'mobile') for (const m of blockPanel.querySelectorAll('.bp-more')) m.remove();
  if (blockPanel.dataset.bid !== b.id || (anim.i != null && !b.animations?.[anim.i]) || (anim.view === 'editor' && anim.i == null)) anim = { ...ANIM_LIST }; // another block, or undo took the row away
  if (designTab === 'Animation' && anim.view !== 'list') blockPanel.innerHTML = anim.view === 'picker' ? animPickerHtml(anim.trigger, animRowsOf(b)[anim.i], anim.menu) : animEditorHtml(animRowsOf(b)[anim.i], anim.tab);
  if (fxView) paintEffectTiles(blockPanel, b.src);
  if (b.type === 'markdown') paintMdBar(blockPanel.querySelector('textarea[data-content="markdown"]'));
  blockPanel.style.width = (b.type === 'code' || b.type === 'markdown') && designTab === 'Content' ? `${CODE_PANEL_WIDTH}px` : '';
  syncAnimView(b);
  // An item's view holds that item open on the canvas (ACCORDION.json).
  if (b.type === 'accordion') showAccordionItem(b);
  placeBlockPanel();
  blockPanel.hidden = false;
  const lookNow = blockPanel.querySelector('.bp-code.is-look textarea');
  if (lookNow && lookKeep?.value === lookNow.value) { adoptFolds(lookNow, lookKeep.folds); lookNow.setSelectionRange(lookKeep.start, lookKeep.end, lookKeep.dir); lookNow.scrollTop = lookKeep.top; } // the band stays when focus leaves (CAP-T10LOOK.json)
  paintCode(lookNow); // measures, so it must be showing
  if (blockPanel.dataset.bid !== b.id) { blockPanel.dataset.bid = b.id; blockPanel.scrollTop = 0; } // another block starts at the top
  if (shapeUi) renderShapePop(); // undo can change what an open popup shows
  drawPhoneControls(b);
}
// T12's older dialogs (dialogs.js, CAP-DIALOGS.json): no way out inside them. A press on the section beside one closes
// it and lets the block go; Escape and a press on its own block leave it open. It sits by the block's right edge, at a
// height read against the window: 235 to 241 whatever the block's top, so ours holds it to the frame (inferred).
const dialogPages = () => [...new Set([...(model.header?.nav || []).map((n) => n.label), ...SITE_PAGES])].sort((x, y) => x.localeCompare(y));
// Edit gives the first control that takes input the focus, with its ring (CAP-T12PALETTES.json: Chart Type on Chart, read
// once; CAP-T12DIALOGFOCUS4.json: SoundCloud, Bandsintown and Flickr, rows out under 0005 that still take it, read twice). A row that redraws the dialog keeps the focus on its own control.
const DIALOG_FIRST = '.dl-row select:not([disabled]), .dl-row input[type="text"]:not([disabled]), .dl-row textarea:not([disabled])';
function renderDialog(b) {
  const d = dialogOf(b), key = JSON.stringify([b, dlgTab]), opening = dialogEl.hidden;
  if (dialogEl.dataset.key !== key) {
    const top = dialogEl.scrollTop, left = dialogEl.querySelector('.dl-grid')?.scrollLeft ?? 0, had = dialogEl.contains(document.activeElement) ? document.activeElement.dataset.dl : null;
    dialogEl.innerHTML = dialogHtml(b, dlgTab, dialogPages());
    if (dialogEl.dataset.bid === b.id) { dialogEl.scrollTop = top; const g = dialogEl.querySelector('.dl-grid'); if (g) g.scrollLeft = left; }
    dialogEl.dataset.key = key;
    dialogEl.dataset.bid = b.id;
    if (had) dialogEl.querySelector(`[data-dl="${had}"]`)?.focus({ preventScroll: true });
  }
  const el = blockEl(b.id), f = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
  dialogEl.style.width = `${d.w}px`;
  dialogEl.style.height = `${d.h}px`;
  dialogEl.style.left = `${f.left - st.left + el.getBoundingClientRect().right + d.dx}px`;
  dialogEl.style.top = `${f.top - st.top + d.top}px`;
  dialogEl.hidden = false;
  if (opening) dialogEl.querySelector(DIALOG_FIRST)?.focus({ preventScroll: true });
}
// A row's change is one undo step. A gallery row that changes the content's height refits the rows to it, as Flickr
// read four times (CAP-ROWSFLICKR.json) and Instagram 13 times (CAP-T12INSTAASPECT-*.json).
// A change that shrinks an Instagram's content drops the rows it lost, rounded up, and one more, never under the fit:
// max(fit, rows - 1 - ceil(drop / pitch)), new or not, after keys or a pull (CAP-T12INSTAFLOOR-2.json: 5 of 5 unseen, frozen).
// One that grows the content fits it.
// Chart's rows only grow: a title over its 8 rows kept them, and a Flip that took 44 off kept 11 (CAP-T12CHARTLOOK.json).
function setDialogValue(k, v) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  const content = () => blockEl(b.id)?.querySelector('.sqs-block-content')?.getBoundingClientRect().height;
  const was = content();
  if (JSON.stringify(v) === JSON.stringify(DIALOG_DEFAULTS[k])) delete b[k]; else b[k] = v;
  renderSectionDom(sel.sid);
  const now = content();
  if (b.standin && now !== was) {
    const a = lay(b).area, m = formPitch(b), fit = contentRows(b, m); // the pitch with the content out, as it stretches the rows
    const need = b.standin === 'instagram' && now < was ? Math.max(fit, a[2] - a[0] - 1 - Math.ceil((was - now) / m.pitch)) : fit;
    setFormRows(b, S(sel.sid), b.standin === 'chart' ? Math.max(need, a[2] - a[0]) : need);
  }
  commit(before, `${dialogOf(b).title} changed`);
}
dialogEl.addEventListener('click', (e) => {
  // A press outside the Are You Sure? box, on the dialog, lands on a layer over it and does what Cancel does: the box goes, the
  // text stays and Update takes the focus (CAP-T12CHARTASK.json: the Data tab read covered, a press at its spot closed the box
  // and left the tab and the text as they were).
  if (e.target.closest('.dl-veil')) { dialogEl.querySelector('.dl-confirm')?.remove(); e.target.remove(); dialogEl.querySelector('[data-dl-action="csv"]')?.focus({ preventScroll: true }); return; }
  const tab = e.target.closest('[data-dl-tab]');
  if (tab) { dlgTab = tab.dataset.dlTab; dialogEl.scrollTop = 0; renderDialog(B(sel.sid, sel.bid)); return; }
  const box = e.target.closest('button[data-dl]');
  if (box && !box.disabled) setDialogValue(box.dataset.dl, box.getAttribute('aria-checked') !== 'true');
  // The + under the rows adds a row of 0s, the + after the series a series of 0s, and the focus goes to its name (CAP-T12CHARTCELLS2.json,
  // CAP-T12CHARTCELLS3.json). One undo step each.
  const add = e.target.closest('[data-dl-add]');
  if (add && sel) {
    const data = chartOf(B(sel.sid, sel.bid)).data.map((row) => [...row]), n = data[0].length - 1;
    if (add.dataset.dlAdd === 'row') data.push(['', ...Array(n).fill('0')]); else data.forEach((row, r) => row.push(r ? '0' : ''));
    setDialogValue('chartData', data);
    dialogEl.querySelector(`[data-dl-cell="${add.dataset.dlAdd === 'row' ? `${data.length - 1},0` : `0,${n + 1}`}"]`)?.focus({ preventScroll: true });
    // The row + scrolls the panel to its end: 42 in the one read (CAP-T12CHARTCELLS2.json, rows 555 to 513). Inferred: to the end.
    if (add.dataset.dlAdd === 'row') dialogEl.scrollTop = dialogEl.scrollHeight;
    else { const g = dialogEl.querySelector('.dl-grid'); if (g) g.scrollLeft = g.scrollWidth; }
    return;
  }
  // Update asks first: Are You Sure?, centred on the button, Confirm focused; Cancel keeps the box's text, Confirm makes it the
  // data (CAP-T12CHARTCELLS2.json, CAP-T12CHARTCONFIRM.json).
  const upd = e.target.closest('[data-dl-action="csv"]');
  if (upd && !upd.disabled) {
    dialogEl.querySelectorAll('.dl-confirm, .dl-veil').forEach((x) => x.remove());
    const row = upd.closest('.dl-row'), box = document.createElement('div'), veil = document.createElement('div');
    veil.className = 'dl-veil'; veil.style.height = `${dialogEl.scrollHeight}px`;
    box.className = 'dl-confirm'; box.setAttribute('role', 'dialog');
    box.style.top = `${row.offsetTop + row.offsetHeight / 2 - 69}px`; box.style.left = `${(dialogEl.clientWidth - 350) / 2}px`;
    box.innerHTML = '<div class="dl-confirm-title">Are You Sure?</div><div class="dl-confirm-text">This will overwrite the current chart data.</div><button type="button" data-dl-confirm="cancel">Cancel</button><button type="button" data-dl-confirm="ok">Confirm</button>';
    dialogEl.append(veil, box); box.querySelector('[data-dl-confirm="ok"]').focus({ preventScroll: true });
    return;
  }
  const answer = e.target.closest('[data-dl-confirm]');
  if (answer) {
    answer.closest('.dl-confirm').remove(); dialogEl.querySelector('.dl-veil')?.remove();
    if (answer.dataset.dlConfirm === 'ok') { const t = dialogEl.querySelector('[data-dl-area]'); setDialogValue(t.dataset.dlArea, parseCsv(t.value)); }
  }
});
dialogEl.addEventListener('input', (e) => {
  const area = e.target.closest('[data-dl-area]');
  if (area && sel) { const u = dialogEl.querySelector('[data-dl-action="csv"]'); if (u) u.disabled = area.value === chartCsv(chartOf(B(sel.sid, sel.bid)).data); return; }
  const r = e.target.closest('input[type="range"][data-dl]');
  if (r) r.parentElement.querySelector('.dl-count').textContent = `${r.value} ${r.getAttribute('aria-label')}`;
});
// Tab from a Chart cell goes to the next cell, its text selected, skipping the + (CAP-T12CHARTCELLS2.json, CAP-T12CHARTCELLS3.json).
// The change redraws the grid, so the next cell is found again by its place after it.
dialogEl.addEventListener('keydown', (e) => {
  const cell = e.key === 'Tab' && sel && e.target.closest?.('[data-dl-cell]');
  if (!cell) return;
  const all = [...dialogEl.querySelectorAll('[data-dl-cell]:not(:disabled)')], next = all[all.indexOf(cell) + (e.shiftKey ? -1 : 1)];
  if (!next) return;
  e.preventDefault();
  const key = next.dataset.dlCell;
  cell.blur();
  const to = dialogEl.querySelector(`[data-dl-cell="${key}"]`);
  to?.focus({ preventScroll: true }); to?.select?.();
});
dialogEl.addEventListener('change', (e) => {
  const cell = e.target.closest('[data-dl-cell]');
  if (cell && sel) {
    const [r, k] = cell.dataset.dlCell.split(',').map(Number), data = chartOf(B(sel.sid, sel.bid)).data.map((row) => [...row]);
    data[r][k] = cell.value;
    setDialogValue('chartData', data);
    return;
  }
  const c = e.target.closest('[data-dl]');
  if (!c || !sel) return;
  setDialogValue(c.dataset.dl, c.type === 'range' ? Number(c.value) : c.value);
  if (c.type === 'range') c.blur();
});
const dialogOpen = () => !dialogEl.hidden && sel && designOpen === sel.bid;
function holdDialogEscape(e) {
  if (dialogOpen()) dialogEl.querySelector('.dl-confirm')?.classList.add('is-key'); // a key shows Confirm's ring (CAP-T12CHARTASK.json escape)
  if (e.key === 'Escape' && dialogOpen()) { e.preventDefault(); e.stopImmediatePropagation(); }
}
window.addEventListener('keydown', holdDialogEscape, true);
function dialogPress(e) {
  if (!dialogOpen()) return;
  const on = e.target.closest?.('.fe-block')?.dataset.blockId;
  if (on === sel.bid) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  designOpen = null;
  // On another block the dialog closes and the open block goes, and the pressed one is not taken (CAP-T12DIALOGOTHER2.json,
  // CAP-T12DIALOGOTHER3.json: no block toolbar after, the section's controls on hover). On the section the press goes on and lets it go.
  if (on) { e.preventDefault(); e.stopImmediatePropagation(); select(null); return; }
  renderBlockPanel();
}
// A phone's dotted labels and its button right of the Animation tab, on any block with that tab.
const phoneMenu = $('phone-menu');
phoneMenu.innerHTML = PHONE_MENU_HTML;
const closePhoneMenu = () => { phoneMenu.hidden = true; };
function drawPhoneControls(b) {
  const tabs = blockPanel.querySelector('.sp-tabs');
  if (bp !== 'mobile') { closePhoneMenu(); return; }
  markPhoneLabels(blockPanel, b);
  if (designTab === 'Animation') { markAnimLabels(blockPanel, b.animations?.[anim.i]?.phone); closePhoneMenu(); return; }
  if (tabs?.querySelector('[data-btab="Animation"]')) tabs.insertAdjacentHTML('beforeend', phoneButtonHtml(hasOverrides(b)));
  else closePhoneMenu();
}
blockPanel.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-phone-btn]');
  if (!btn) return;
  if (!phoneMenu.hidden) { closePhoneMenu(); return; }
  const at = phoneMenuPlace(btn.getBoundingClientRect());
  phoneMenu.style.left = `${at.left}px`;
  phoneMenu.style.top = `${at.top}px`;
  phoneMenu.hidden = false;
});
document.addEventListener('pointerdown', (e) => { if (!phoneMenu.hidden && !e.target.closest('#phone-menu, [data-phone-btn]')) closePhoneMenu(); }, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !phoneMenu.hidden) { e.preventDefault(); e.stopPropagation(); closePhoneMenu(); } }, true);
phoneMenu.addEventListener('click', (e) => {
  const act = e.target.closest('[data-phone-act]')?.dataset.phoneAct;
  if (!act || !sel) return;
  closePhoneMenu();
  if (act === 'go') { setBp('desktop'); return; }
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), top = blockPanel.scrollTop;
  // The form coming back is a rise the next step answers, as Lightbox off (FORMFIELDS.json, lightbox.offThenPress).
  if (act === 'reset' && b.type === 'form' && formView(b, 'mobile').lightbox && !formView(b, 'desktop').lightbox) b.formH = { ...b.formH, [bp]: formHeight(b) };
  (act === 'reset' ? resetOverrides : pushOverrides)(b);
  renderSectionDom(sel.sid);
  commit(before, act === 'reset' ? 'Reset all overrides' : 'Push to desktop');
  renderBlockPanel();
  blockPanel.scrollTop = top;
});
function syncAnimView(b) {
  const el = b ? blockEl(b.id) : null, a = b && designTab === 'Animation' && anim.view === 'editor' && !document.body.classList.contains('is-preview') ? animRowsOf(b)[anim.i] : null, key = a && poseKey(anim.tab);
  if (animPosed && (animPosed !== el || !key)) { releasePose(animPosed); animPosed = null; }
  if (key && el && !animPlaying) { holdPose(el, a[key]); animPosed = el; }
  const play = animPlay;
  animPlay = null;
  if (play === 'tiles' && b) blockPanel.querySelectorAll('.an-tile[data-anim-tile]').forEach((t) => { const p = PRESETS[anim.trigger].find((x) => x.id === t.dataset.animTile); if (p) playTile(t.querySelector('.an-sq'), newAnimation(anim.trigger, p.id)); });
}
function animRowsOf(b) { return (b.animations || []).map((a) => rowOn(a, bp)); }
function animRows() { return animRowsOf(B(sel.sid, sel.bid)); }
function animEdit(label, change) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  b.animations = [...(b.animations || [])];
  change(b.animations);
  if (!b.animations.length) delete b.animations;
  renderSectionDom(sel.sid);
  commit(before, label);
  renderBlockPanel();
}
// Preview plays on the block itself. The tab's pose comes back when it ends.
function animPreview(a) {
  const el = blockEl(sel.bid);
  if (!el || !a) return;
  animPlaying = true;
  playPreview(el, a, () => { animPlaying = false; if (sel && designOpen === sel.bid) syncAnimView(B(sel.sid, sel.bid)); }, anim.view === 'editor' && anim.tab === 'End');
}
function openAnimOptions(mode, target, extra = {}) {
  shapeUi = { kind: 'animopts', bid: sel.bid, custom: null, mode, rect: target.getBoundingClientRect(), ...extra };
  renderShapePop();
  shapePop.hidden = false;
}
// A press on anything else in the tab ends a preview that is playing.
function animStopPreview() {
  if (!animPlaying) return;
  animPlaying = false;
  const el = sel && blockEl(sel.bid);
  if (el) releasePose(el);
}
// A preset's editor opened by its tile's Edit plays the row once on the stage (CAP-T15FLOATOPEN1.json and CAP-T15FLOATOPEN2.json
// agree): its slow-starting run first shows at 844 ms, so it starts about 170 ms after the press; not if the editor has changed by then.
let stageOpenTimer = 0;
function stageOnOpen() {
  clearTimeout(stageOpenTimer);
  const sq = blockPanel.querySelector('.an-stage .an-sq'), at = anim.i;
  stageOpenTimer = setTimeout(() => { const a = animRows()[at]; if (a && sq?.isConnected && anim.view === 'editor' && anim.i === at) playStage(sq, a); }, 170);
}
function animAction(el) {
  if (el.dataset.anim !== 'play') animStopPreview();
  const act = el.dataset.anim, i = el.dataset.i == null ? null : Number(el.dataset.i), rows = animRows();
  if (act === 'add') { anim = { ...ANIM_LIST, view: 'picker' }; animPlay = 'tiles'; }
  else if (act === 'back') {
    if (anim.view === 'editor') { anim = { ...anim, view: 'picker', tab: anim.tab }; animPlay = 'tiles'; }
    else anim = { ...ANIM_LIST, tab: anim.tab };
  } else if (act === 'open') {
    // A row that left its preset opens on its values, one on a preset opens the picker.
    const a = rows[i];
    anim = { ...ANIM_LIST, view: a.preset === 'custom' ? 'editor' : 'picker', i, trigger: a.trigger, tab: TABS[a.trigger].includes(anim.tab) ? anim.tab : TABS[a.trigger][0] };
    if (anim.view === 'picker') animPlay = 'tiles';
  } else if (act === 'remove') { const bk = B(sel.sid, sel.bid); animEdit('Remove animation', (l) => { if (bp === 'mobile' && l[i].phone) bk.animPhoneGone = true; l.splice(i, 1); }); return; }
  else if (act === 'play') { animPreview(rows[i ?? anim.i]); return; }
  else if (act === 'menu') anim.menu = !anim.menu;
  else if (act === 'trigger') { anim = { ...anim, trigger: el.dataset.v, menu: false }; animPlay = 'tiles'; }
  else if (act === 'gear') { anim = { ...anim, view: 'editor', tab: TABS[anim.trigger].includes(anim.tab) ? anim.tab : TABS[anim.trigger][0] }; renderBlockPanel(); stageOnOpen(); return; }
  else if (act === 'blank') {
    const a = newAnimation(anim.trigger);
    const at = anim.i ?? rows.length;
    animEdit('Start blank', (l) => { animPlace(l, at, a); });
    anim = { ...anim, view: 'editor', i: at, menu: false, tab: TABS[a.trigger].includes(anim.tab) ? anim.tab : TABS[a.trigger][0] };
  } else if (act === 'tab') anim.tab = el.dataset.v;
  else if (act === 'sel') { openAnimOptions('sel', el, { key: el.dataset.key }); return; }
  else if (act === 'listacts' || act === 'rowacts') { openAnimOptions(act === 'listacts' ? 'list' : 'row', el, { i }); return; }
  else if (act === 'edge') { animSet(el.dataset.key, el.dataset.v); return; }
  else if (act === 'reset') { const k = el.dataset.key; document.activeElement?.blur(); animSet(k, k.includes(':') ? REST[parseInt(k.split(':')[1], 10)] : defaultOf(animRows()[anim.i], k)); return; }
  renderBlockPanel();
}
// A tile: a new row, or this row takes the preset. It plays at once and the tile stays chosen.
function animPick(id) {
  if (id === 'custom') return;
  const a = newAnimation(anim.trigger, id), at = anim.i ?? animRows().length;
  anim = { ...anim, i: at, menu: false };
  animEdit(`Animation ${id}`, (l) => { animPlace(l, at, a); });
  animPreview(a);
}
// A pick: a new row, or on this row. On a phone it stays the phone's alone, and desktop keeps its row.
function animPlace(l, at, a) {
  if (bp === 'mobile' && l[at]) l[at] = { ...l[at], phone: ownOf(a) };
  else l[at] = l[at]?.phone ? { ...a, phone: l[at].phone } : a;
}
// One value, in the layout being edited.
function animPut(l, i, key, v) {
  if (bp !== 'mobile') { l[i] = { ...l[i] }; animWrite(l[i], key, v); return; }
  const was = rowOn(l[i], 'mobile'), now = { ...was };
  animWrite(now, key, v);
  const own = { ...l[i].phone, preset: 'custom', [key]: v };
  for (const k of ['bounce', 'custom']) if (now[k] !== was[k]) own[k] = now[k];
  l[i] = { ...l[i], phone: own };
}
function animWrite(a, key, v) {
  a.preset = 'custom';
  if (key.includes(':')) { const [k, n] = key.split(':'); a[k] = [...a[k]]; a[k][parseInt(n, 10)] = v; return; }
  a[key] = v;
  if (key === 'ease' && v === 'Spring') a.bounce ??= '0.3';
  if (key === 'ease' && v === 'Custom') a.custom ??= '0, 0, 1, 1';
}
// After a change the stage square stays still, on every trigger; the mouse on the stage plays it (CAP-T15STAGE2.json, CAP-T15STAGE6-*.json).
function animSet(key, v) {
  animEdit(`Animation ${key}`, (l) => { animPut(l, anim.i, key, v); });
}
blockPanel.addEventListener('change', (e) => {
  const input = e.target.closest('[data-afield]');
  if (!input || !sel || anim.i == null) return;
  const a = animRows()[anim.i], key = input.dataset.afield;
  if (key === 'snap') { animSet(key, input.checked); return; }
  if (key === 'custom') { const c = input.value.split(',').map(Number); if (c.length === 4 && c.every(Number.isFinite)) animSet(key, c.join(', ')); else { input.blur(); renderBlockPanel(); } return; }
  const cur = key.includes(':') ? a[key.split(':')[0]][parseInt(key.split(':')[1], 10)] : a[key];
  const v = typed(input.value, cur);
  input.blur();
  if (v == null || v === cur) { renderBlockPanel(); return; }
  animSet(key, v);
});
// Enter takes the value and keeps the focus, and with it Reset (CAP-L6RESET.json). The blur fires the change, which draws the panel again.
blockPanel.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || !e.target.matches('[data-afield]')) return;
  const key = e.target.dataset.afield;
  e.target.blur();
  blockPanel.querySelector(`[data-afield="${key}"]`)?.focus();
});
// Reset shows only while its field has focus (CAP-L6RESET.json), so the press must leave the focus there.
blockPanel.addEventListener('mousedown', (e) => { if (e.target.closest('.sc-reset')) e.preventDefault(); });
const CORNER_RANGE = [0, 1000];
const caretAtEnd = (i) => { if (!i) return; i.focus(); i.setSelectionRange(i.value.length, i.value.length); };
// A drag on a field's edge moves its value, one undo step when let go. A click does nothing.
blockPanel.addEventListener('pointerdown', (e) => {
  const hit = e.target.closest('.sc-hit');
  if (!hit || !sel) return;
  e.preventDefault();
  const box = hit.closest('.sc-box'), input = box.querySelector('input'), x0 = e.clientX, start = input.value, before = JSON.stringify(model), b = B(sel.sid, sel.bid);
  const key = input.dataset.afield, dk = input.dataset.design, corner = input.dataset.shape === 'radius';
  if (corner && input.value === 'Mixed') return;
  let moved = false;
  // The ring, <>, Reset and the bar show while it moves (CAP-T6FIELDS.json).
  const shown = (v, range, off) => {
    box.classList.add('is-scrub');
    box.querySelector('.sc-reset')?.classList.toggle('is-on', off);
    const bar = box.querySelector('.sc-bar i');
    if (bar && range) bar.style.transform = `translateX(${barAt(v, range)}%)`;
  };
  const move = (ev) => {
    const dx = ev.clientX - x0;
    if (!moved && !dx) return;
    moved = true;
    if (corner) {
      const v = Math.max(0, Math.min(1000, Math.round(parseFloat(start) + dx * 0.4))), cur = cornerFor(b, bp).corners;
      input.value = `${v}px`;
      writeCorner(b, cur ? cur.map(() => v) : null, v);
      renderSectionDom(sel.sid);
      shown(v, CORNER_RANGE, v !== 0);
    } else if (key) {
      let v = scrubbed(start, dx, key);
      const pose = /:(\d)/.exec(key);
      // A drag stops at its bar's ends, as Design's: Opacity 100%, Scale 0 and 200%, Offset 1,000px, Skew 60°, read twice
      // (CAP-T15FIELDS2.json), Rotate -360° and 360° (CAP-Y2BAR.json, R1 and R2); a value typed past an end is not pulled back.
      if (pose) {
        const [lo, hi] = POSE_RANGE[pose[1]], s0 = parseFloat(String(start).replace(/,/g, '')), n = parseFloat(v), unit = String(v).replace(/^-?[\d.]+/, '');
        v = `${Math.min(Math.max(hi, s0), Math.max(Math.min(lo, s0), n))}${unit}`;
      }
      input.value = commas(v);
      animPut(b.animations, anim.i, key, v);
      syncAnimView(b);
      shown(v, pose && POSE_RANGE[pose[1]], pose ? v !== REST[pose[1]] : v !== defaultOf(animRows()[anim.i], key));
    } else {
      // A drag stops at its bar's ends: Scale 0 and 200%, Offset 1,000px, Skew 60° (CAP-T15CHEAP.json). Inferred: a value typed
      // past an end is not pulled back by the drag, which only moves it toward the bar.
      const f = DESIGN_FIELDS.find((x) => x[0] === dk), s0 = parseFloat(start.replace(/,/g, '')), [lo, hi] = designRange(dk) || [f[3], f[4]];
      const v = Math.min(Math.max(hi, s0), Math.max(Math.min(lo, s0), Math.round((s0 + dx * 0.4) * 10) / 10)), bag = designBag(bp);
      input.value = designText(dk, v);
      b[bag] = { ...(b[bag] || {}), [dk]: v };
      renderSectionDom(sel.sid);
      shown(v, designRange(dk), v !== DESIGN_DEFAULTS[dk]);
    }
  };
  // Let go: the focus goes to the input, the caret at its end, and the bar goes.
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    if (!moved) return;
    box.classList.remove('is-scrub');
    if (corner) { commit(before, 'Corner'); renderBlockPanel(); caretAtEnd(blockPanel.querySelector('[data-shape="radius"]')); return; }
    // The drag is one undo step: the change takes the model from before it (CAP-T15CHEAP.json undo).
    if (dk) { rangeDrag = { before, fit: null }; input.focus(); input.dispatchEvent(new Event('change', { bubbles: true })); return; }
    commit(before, `Animation ${key}`);
    renderBlockPanel();
    caretAtEnd(blockPanel.querySelector(`input[data-afield="${key}"]`));
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
});
blockPanel.addEventListener('mouseover', (e) => {
  const st = e.target.closest?.('.an-stage');
  if (st && !st.contains(e.relatedTarget) && sel) { const a = animRows()[anim.i]; if (a) playStage(st.querySelector('.an-sq'), a); return; } // once each time the mouse comes onto it (CAP-T15STAGE3.json, CAP-T15STAGE6-*.json)
  const t = e.target.closest?.('.an-tile[data-anim-tile]');
  if (!t || t.contains(e.relatedTarget)) return;
  const p = PRESETS[anim.trigger].find((x) => x.id === t.dataset.animTile);
  if (p) playTile(t.querySelector('.an-sq'), newAnimation(anim.trigger, p.id));
});
// A Loop's square stays at its End until the mouse leaves the stage (inferred: the read after leaving found it at rest).
blockPanel.addEventListener('mouseout', (e) => {
  const st = e.target.closest?.('.an-stage');
  if (st && !st.contains(e.relatedTarget) && animRows()[anim.i]?.trigger === 'loop' && animRows()[anim.i].type !== 'Ping Pong') releasePose(st.querySelector('.an-sq'));
});
let panelMoved = null; // the block whose panel was dragged; it stays where it was dropped
function placeBlockPanel() {
  if (!designOpen || !sel || panelMoved === designOpen) return;
  if (animPlaying || animPosed) return; // an animation moves the block, not its panel
  const el = blockEl(sel.bid);
  if (!el) return;
  // The box before Offset, Rotate and Scale: they move the block, not its panel, open or opened again (CAP-PANELSTILL.json, CAP-PANELSTILL2.json).
  const under = el.offsetParent.getBoundingClientRect(), left = under.left + el.offsetParent.clientLeft + el.offsetLeft, top = under.top + el.offsetParent.clientTop + el.offsetTop;
  const box = { left, top, right: left + el.offsetWidth, bottom: top + el.offsetHeight };
  const p = blockPanelPosition(box, frame.getBoundingClientRect(), stage.getBoundingClientRect(), blockPanel.offsetWidth || 320);
  // A child stays on its right and overlaps it at the window's edge (S3.json children panels).
  if (parentStack(sel.sid, sel.bid)) p.left = Math.min(box.right + frame.getBoundingClientRect().left - stage.getBoundingClientRect().left + 18, stage.getBoundingClientRect().width - 340);
  blockPanel.style.left = `${p.left}px`;
  blockPanel.style.top = `${p.top}px`;
  formMessage.sync();
}
blockPanel.addEventListener('click', (e) => {
  if (shapeUi?.kind === 'animopts') closeShapePop();
  const rd = e.target.closest('[data-design-reset]');
  if (rd && sel) { e.preventDefault(); const input = rd.parentElement.querySelector('input[data-design]'); input.value = DESIGN_DEFAULTS[rd.dataset.designReset]; input.dispatchEvent(new Event('change', { bubbles: true })); return; }
  const an = e.target.closest('[data-anim]');
  if (an && sel) { e.preventDefault(); animAction(an); return; }
  const tile = e.target.closest('[data-anim-tile]');
  if (tile && sel) { e.preventDefault(); animPick(tile.dataset.animTile); return; }
  if (e.target.closest('[data-blend-toggle]')) { blendOpen = !blendOpen; renderBlockPanel(); return; }
  const ds = e.target.closest('[data-dset]');
  if (ds && sel) {
    setDesign(ds.dataset.dset, ds.dataset.v || null);
    // A new fill opens its colours at once (CAP-T7DESIGN.json).
    if (ds.dataset.dset === 'background' && ds.dataset.v && B(sel.sid, sel.bid)?.type === 'video') { renderBlockPanel(); blockPanel.querySelector('[data-shape-act="bgColor"]')?.click(); }
    return;
  }
  const st = e.target.closest('[data-stack]');
  if (st && sel) { stackAct(st.dataset.stack); return; }
  const o = e.target.closest('[data-blend]');
  if (o && sel) { blendOpen = false; setDesign('blend', o.dataset.blend === 'normal' ? null : o.dataset.blend); return; }
  if (blendOpen && !e.target.closest('.bp-listbox')) { blendOpen = false; renderBlockPanel(); }
  if (e.target.closest('[data-bpstyle-toggle]')) { bstyleOpen = !bstyleOpen; renderBlockPanel(); return; }
  if (e.target.closest('[data-bpstyle-edit]')) { bstyleOpen = false; setSiteStyles(true); ssView = 'Buttons'; renderSsPanel(); return; }
  if (e.target.closest('[data-fih-toggle]')) { const top = blockPanel.scrollTop; fihOpen = !fihOpen; renderBlockPanel(); blockPanel.scrollTop = top; blockPanel.querySelector('.bp-fih-grid')?.scrollIntoView({ block: 'nearest' }); return; }
  const fset = e.target.closest('[data-form-set]');
  if (fset && sel) { setFormDesign(fset.dataset.formSet, fset.dataset.v); return; }
  const bst = e.target.closest('[data-bpstyle]');
  if (bst && sel) { bstyleOpen = false; setButtonStyle(sel.sid, sel.bid, bst.dataset.bpstyle); return; }
  const bset = e.target.closest('[data-btn-set]');
  if (bset && sel) { setButtonView(bset.dataset.btnSet, bset.dataset.v); return; }
  if (bstyleOpen && !e.target.closest('.bp-bs-list')) { bstyleOpen = false; renderBlockPanel(); }
  const l = e.target.closest('[data-link]');
  if (l && sel) { onLinkAction(l.dataset.link, l); return; }
  const t = e.target.closest('[data-btab]');
  if (!t) return;
  designTab = t.dataset.btab;
  const tb = sel && B(sel.sid, sel.bid);
  if (tb) tabOfType.set(tb.standin || tb.type, designTab);
  closeLinkPopover();
  closeShapePop(); // CAP-T7DESIGN.json
  renderBlockPanel();
});

// Drag the panel by its header (U13). Tabs and other controls in the header still click. The panel
// holds the pointer: over the canvas iframe the moves would otherwise go to the iframe and the panel stop.
blockPanel.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('[data-drag-panel], .sp-tabs');
  if (!h || e.target.closest('button') || e.button !== 0) return;
  e.preventDefault();
  const st = stage.getBoundingClientRect(), r = blockPanel.getBoundingClientRect();
  const dx = e.clientX - r.left, dy = e.clientY - r.top;
  blockPanel.setPointerCapture(e.pointerId);
  const move = (ev) => {
    // The limits follow the window, not the editor area (parity/findings/MARKS.json).
    blockPanel.style.left = `${Math.max(20, Math.min(ev.clientX - dx, innerWidth + 6 - r.width)) - st.left}px`;
    blockPanel.style.top = `${Math.max(22, Math.min(ev.clientY - dy, innerHeight + 22 - r.height)) - st.top}px`;
    panelMoved = designOpen;
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

// The Stack's Design panel (S3.json panel), one undo step each. Direction and Position belong to
// the layout on screen; Gap, Padding, Background, Stroke and Corner to both.
let stackGapOpen = false, kidSizeOpen = null;
function stackAct(act) {
  const i = act.indexOf(':'), k = i < 0 ? act : act.slice(0, i), v = act.slice(i + 1);
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  const here = bp === 'mobile' ? (b.phone ||= {}) : b;
  if (k === 'gapopen') { stackGapOpen = !stackGapOpen; renderBlockPanel(); return; }
  if (k === 'kidopen') { kidSizeOpen = kidSizeOpen === v ? null : v; renderBlockPanel(); return; }
  if (k === 'kid') { const [axis, val] = v.split(':'); kidSizeOpen = null; b[kidSizeKey(bp)] = { ...b[kidSizeKey(bp)], [axis]: val }; }
  if (k === 'dir') here.direction = v;
  if (k === 'pos') [here.posX, here.posY] = v.split(',');
  if (k === 'gap') { stackGapOpen = false; b.gap = v === 'fill' ? 'fill' : Number(v); }
  if (k === 'four') {
    if (v === '1') b.padFour = true;
    else { delete b.padFour; if (b.padding) b.padding = { t: b.padding.t, b: b.padding.t, l: b.padding.l, r: b.padding.l }; }
  }
  if (k === 'vpad') {
    // Four fields start from the two; back to two takes the top's and the right's (the way back is inferred).
    const bag = designBag(bp), cur = designFor(b, bp), d = (b[bag] ||= {}), y = cur.padY ?? 6, x = cur.padX ?? 6;
    if (v === '1') Object.assign(d, { padFour: true, padT: y, padR: x, padB: y, padL: x });
    else { d.padY = cur.padT ?? y; d.padX = cur.padR ?? x; for (const f of ['padFour', 'padT', 'padR', 'padB', 'padL']) delete d[f]; }
    renderSectionDom(sel.sid); commit(before, `padding on ${b.id}`); renderBlockPanel(); return;
  }
  if (k === 'cornerreset') { const bag = designBag(bp), d = (b[bag] ||= {}); d.corner = 0; if (bag === 'design') delete d.corners; else d.corners = null; }
  if (k === 'fill') b.design = { ...b.design, background: true };
  if (k === 'nofill' && b.design) delete b.design.background;
  if (k === 'corners') {
    const bag = designBag(bp), cur = designFor(b, bp), d = (b[bag] ||= {});
    // Back to one value: the top left one for all four.
    if (v === '1') { d.corners = Array(4).fill(cur.corner || 0); d.corner = 0; } else { d.corner = cur.corners?.[0] || 0; d.corners = null; if (bag === 'design') delete d.corners; }
  }
  renderSectionDom(sel.sid);
  commit(before, `${k} set on ${b.id}`);
  renderBlockPanel();
}
// Gap: any number in px, kept above zero, a unit ignored; words keep the last value. Padding and
// Corner: a bare number is px; Padding keeps another unit as typed (S3.json gap, padding).
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-stack-field]');
  if (!f || !sel) return;
  const b = B(sel.sid, sel.bid), k = f.dataset.stackField, before = JSON.stringify(model), raw = f.value.trim();
  if (k === 'gap') {
    if (/^fill$/i.test(raw)) b.gap = 'fill';
    else if (Number.isFinite(parseFloat(raw))) b.gap = Math.max(0, parseFloat(raw));
  } else if (k === 'kw' || k === 'kh') {
    const val = /^fill$/i.test(raw) ? 'Fill' : /^hug$/i.test(raw) ? 'Hug' : /^[\d.]+$/.test(raw) ? `${raw}px` : /^[\d.]+(px|%)$/.test(raw) ? raw : null;
    if (val) b[kidSizeKey(bp)] = { ...b[kidSizeKey(bp)], [k[1]]: val };
  } else if (k === 'corner' || /^c\d$/.test(k)) {
    const n = Math.max(0, parseFloat(raw));
    if (Number.isFinite(n)) {
      const bag = designBag(bp), cur = designFor(b, bp), d = (b[bag] ||= {});
      if (k === 'corner') { if (cur.corners) d.corners = Array(4).fill(n); else d.corner = n; } else { d.corners = [...cur.corners]; d.corners[Number(k[1])] = n; }
    }
  } else if (/^[\d.]+([a-z%]+)?$/i.test(raw)) {
    const val = /^[\d.]+$/.test(raw) ? `${raw}px` : raw;
    const p = (b.padding ||= { t: '0px', r: '0px', b: '0px', l: '0px' });
    if (k === 'y') { p.t = val; p.b = val; } else if (k === 'x') { p.l = val; p.r = val; } else p[k] = val;
  }
  renderSectionDom(sel.sid);
  commit(before, `${k} set on ${b.id}`);
  renderBlockPanel();
});

// One design value of the selected block, as one undo step (null removes it).
function setButtonStyle(sid, bid, style) {
  const b = B(sid, bid);
  if (!b) return;
  const before = JSON.stringify(model);
  if (b.type === 'form') { formStep(b); setFormView(b, bp, 'buttonStyle', style === 'primary' && bp !== 'mobile' ? '' : style); }
  else if (style === 'primary') delete b.buttonStyle; else b.buttonStyle = style;
  renderSectionDom(sid);
  commit(before, `Button style ${style}`);
}
// A form's Button Alignment and First Input Highlight (FORMADD.json); left and none are the defaults.
function setFormDesign(key, v) {
  const b = B(sel.sid, sel.bid);
  if (!b) return;
  const before = JSON.stringify(model);
  const top = blockPanel.scrollTop;
  formStep(b);
  if (key === 'buttonAlign') setFormView(b, bp, key, v === 'left' && bp !== 'mobile' ? '' : v);
  else if (v === 'none') delete b[key]; else b[key] = v;
  renderSectionDom(sel.sid);
  commit(before, `Form ${key} ${v}`);
  blockPanel.scrollTop = top;
}
// Fit, Fill and Alignment of the view on screen (BUTTONDESIGN.json): the first change on the phone
// starts from what the phone was following, and later desktop changes leave it alone.
function setButtonView(key, v) {
  const b = B(sel.sid, sel.bid);
  const before = JSON.stringify(model);
  if (bp === 'mobile') {
    const o = b.btnMobile || { ...(b.fit ? { fit: true } : {}), ...(b.halign ? { align: b.halign } : {}) };
    if (key === 'fit') { if (v) o.fit = true; else delete o.fit; }
    if (key === 'align') { if (v === 'center') delete o.align; else o.align = v; }
    b.btnMobile = o;
  } else if (key === 'fit') { if (v) b.fit = true; else delete b.fit; } else if (v === 'center') delete b.halign; else b.halign = v;
  renderSectionDom(sel.sid);
  commit(before, `Button ${key} set on ${b.id}`);
}
// A text block's rows follow its box (BLOCKDESIGN.json): they grow when the text no longer fits, and
// fall by what the fit fell. A block made taller by hand keeps the rest: 8 rows, fit 3 to 2, gives 7.
const FIT_KEYS = new Set(['background', 'stroke', 'strokeSize', 'strokePx', 'pad', 'padY', 'padX', 'padT', 'padB', 'padL', 'padR']);
function designChange(b, keys, change, fitBefore = null) {
  // A video's rows follow its height by the rule of a code block's, and what is below it goes along (CAP-T7DESIGN2.json, CAP-T7DESIGN3.json, CAP-T7ORDER.json).
  if (b.type === 'video' && keys.some((k) => FIT_KEYS.has(k))) {
    const was = codeHeight(b);
    change();
    renderSectionDom(sel.sid);
    fitRows(b, was);
    return;
  }
  if (b.type === 'form') return formDesignStep(b, change);
  const s = S(sel.sid), fits = (b.type === 'text' || b.type === 'social') && keys.some((k) => FIT_KEYS.has(k));
  const was = fitBefore ?? (fits ? contentRows(b, measure(feEl(sel.sid))) : 0);
  change();
  renderSectionDom(sel.sid);
  if (!fits) return;
  const now = contentRows(b, measure(feEl(sel.sid))), a = lay(b).area, rows = a[2] - a[0];
  const next = Math.max(now, now < was ? rows - (was - now) : rows);
  if (next === rows) return;
  const lowest = () => Math.max(...s.blocks.map((o) => o.layout[bp].area[2])), before = lowest();
  a[2] = a[0] + next;
  if (next < rows) s.rows[bp] -= before - lowest(); else growRows(s);
  renderSectionDom(sel.sid);
}
function setDesign(k, v) {
  const b = B(sel.sid, sel.bid);
  const before = JSON.stringify(model);
  const bag = designBag(bp);
  designChange(b, [k], () => {
    const d = { ...(b[bag] || {}) };
    // Removing a value on the phone is a value too: desktop's would flow back in (PERLAYOUT.json).
    if (v == null && bag === 'designMobile') d[k] = k === 'blend' ? 'normal' : '';
    else if (v == null) delete d[k];
    else d[k] = v;
    // Custom starts from the size it leaves (BLOCKDESIGN.json).
    const cur = designFor(b, bp);
    // Add fill after a Reset on a video shows what Reset left: no fill, a black stroke (CAP-T7COLOR.json, CAP-T7COLOR4.json).
    if (k === 'background' && v && b.type === 'video') { if (cur.bgColor === '') d.bgClear = 1; if (cur.strokeColor === '') d.strokeColor = 'rgb(0, 0, 0)'; }
    if (k === 'pad' && v === 'custom') { d.padY = cur.padY ?? PAD_PCT[cur.pad] ?? 6; d.padX = cur.padX ?? PAD_PCT[cur.pad] ?? 6; }
    if (k === 'strokeSize' && v === 'custom') d.strokePx = cur.strokePx ?? STROKE_PX[cur.strokeSize || (b.type === 'shape' ? 'M' : 'S')];
    if (Object.keys(d).length) b[bag] = d; else delete b[bag];
  });
  commit(before, `${k} set on ${b.id}`);
}
blockPanel.addEventListener('keydown', (e) => {
  const t = e.target.closest('[data-blend-toggle]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); blendOpen = !blendOpen; renderBlockPanel(); }
});

// Image Fit, Fill and Shape (parity/findings/IMAGEMODES.json), one undo step each.
blockPanel.addEventListener('click', (e) => {
  const m = e.target.closest('[data-image-mode]');
  if (!m || !sel) return;
  const b = B(sel.sid, sel.bid);
  if (!b || b.type !== 'image' || (b.mode || 'fill') === m.dataset.imageMode) return;
  const before = JSON.stringify(model);
  if (m.dataset.imageMode === 'fill') delete b.mode; else b.mode = m.dataset.imageMode;
  renderSectionDom(sel.sid);
  commit(before, `image mode ${m.dataset.imageMode} on ${b.id}`);
  renderBlockPanel();
});

// Image Corner (Fit and Fill) goes through the shape's fields below. Overlay, Lightbox and Stretch
// The Shape picker (IMAGESHAPES.json): opens on the chosen shape's tab; a tab only changes the list.
blockPanel.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-image-nav]'), tab = e.target.closest('[data-image-tab]'), pick = e.target.closest('[data-image-shape]');
  if ((!nav && !tab && !pick) || !sel) return;
  const b = B(sel.sid, sel.bid);
  if (nav) { imageView = nav.dataset.imageNav === 'shape' ? imageShapeById(b.imageShape).tab : null; renderBlockPanel(); blockPanel.scrollTop = 0; return; }
  if (tab) { imageView = tab.dataset.imageTab; renderBlockPanel(); blockPanel.scrollTop = 0; return; }
  const id = pick.dataset.imageShape;
  if ((b.imageShape || 'circle') === id) return;
  setShape((x) => { if (id === 'circle') delete x.imageShape; else x.imageShape = id; }, `image shape ${id}`);
});
// (parity/findings/IMAGEDESIGN.json), one undo step each: off, Overlay keeps its color and blend.
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-image-set]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  setShape((b) => { if (f.checked) b[f.dataset.imageSet] = true; else delete b[f.dataset.imageSet]; }, `${f.dataset.imageSet} ${f.checked ? 'on' : 'off'}`);
}, true);
// A Quote's Appear (CAP-DESIGNTAB-EFFECTS2.json): its list over the row, Site Default 20 above the row's top.
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-appear]');
  if (!a || !sel) return;
  if (shapeUi?.kind === 'appear') { closeShapePop(); return; }
  shapeUi = { kind: 'appear', bid: sel.bid, custom: null, rect: a.getBoundingClientRect() };
  renderShapePop();
});
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-image-sel]');
  if (!a || !sel) return;
  if (shapeUi?.kind === 'imagesel' && shapeUi.key === a.dataset.imageSel) { closeShapePop(); return; }
  shapeUi = { kind: 'imagesel', key: a.dataset.imageSel, bid: sel.bid, custom: null, rect: a.getBoundingClientRect() };
  if (a.dataset.imageSel === 'vblend') a.blur(); // No ring while its list is open (CAP-VBLEND.json list); a pick brings it back.
  renderShapePop();
});
// Image Effect (IMAGEEFFECT.json): a tile, a seg, a switch and Shuffle are one undo step each and the
// panel stays where it is. A slider moves the picture as it goes and is one step when let go.
function setEffect(change, label) {
  const top = blockPanel.scrollTop;
  setShape(change, label);
  blockPanel.scrollTop = top;
}
blockPanel.addEventListener('click', (e) => {
  const t = e.target.closest('[data-fx-nav],[data-fx-tile],[data-fx-shuffle],[data-fx-group],[data-fx-seg],[data-fx-sel]');
  if (!t || !sel) return;
  const b = B(sel.sid, sel.bid), d = t.dataset;
  if (d.fxNav) {
    if (d.fxNav === 'back') fxView = fxView === 'settings' ? 'list' : null; else fxView = d.fxNav;
    if (fxView !== 'settings') fxOpen = [];
    renderBlockPanel(); blockPanel.scrollTop = 0;
  } else if (d.fxTile) {
    if (d.fxTile === (b.effect?.kind || 'none')) return;
    setEffect((x) => { if (d.fxTile === 'none') delete x.effect; else x.effect = effectDefaults(d.fxTile); }, `image effect ${d.fxTile}`);
  } else if ('fxShuffle' in d) {
    setEffect((x) => { x.effect = shuffleEffect(x.effect); }, 'image effect shuffle');
  } else if (d.fxGroup) {
    const top = blockPanel.scrollTop;
    fxOpen = fxOpen.includes(d.fxGroup) ? fxOpen.filter((g) => g !== d.fxGroup) : [...fxOpen, d.fxGroup];
    renderBlockPanel(); blockPanel.scrollTop = top;
  } else if (d.fxSeg) {
    if (b.effect[d.fxSeg] === d.fxVal) return;
    setEffect((x) => { x.effect[d.fxSeg] = d.fxVal; Object.assign(x.effect, EFFECTS[x.effect.kind].presets?.[d.fxSeg]?.[d.fxVal]); }, `image effect ${d.fxSeg} ${d.fxVal}`);
  } else {
    if (shapeUi?.kind === 'fxmenu') { closeShapePop(); return; }
    shapeUi = { kind: 'fxmenu', key: d.fxSel, bid: sel.bid, custom: null, rect: t.getBoundingClientRect() };
    renderShapePop();
  }
});
let fxBefore = null;
blockPanel.addEventListener('input', (e) => {
  const r = e.target.closest('[data-fx-range]');
  if (!r || !sel) return;
  fxBefore ??= JSON.stringify(model);
  const b = B(sel.sid, sel.bid), v = Number(r.value), min = Number(r.min), max = Number(r.max);
  b.effect[r.dataset.fxRange] = v;
  const at = (x) => ((x - min) / (max - min)) * 100, zero = at(Math.max(min, Math.min(max, 0)));
  r.style.setProperty('--from', `${Math.min(zero, at(v))}%`); r.style.setProperty('--to', `${Math.max(zero, at(v))}%`);
  r.parentElement.querySelector('[data-fx-field]').value = v;
  const box = blockEl(sel.bid)?.querySelector('.imageEffectContainer');
  if (box) box.dataset.effect = effectData(b.effect);
});
blockPanel.addEventListener('change', (e) => {
  const r = e.target.closest('[data-fx-range]'), f = e.target.closest('[data-fx-field]'), s = e.target.closest('[data-fx-switch]');
  if ((!r && !f && !s) || !sel) return;
  if (r) { const before = fxBefore; fxBefore = null; if (before) { renderSectionDom(sel.sid); commit(before, `image effect ${r.dataset.fxRange}`); } return; }
  if (s) { setEffect((x) => { x.effect[s.dataset.fxSwitch] = s.checked; }, `image effect ${s.dataset.fxSwitch}`); return; }
  const key = f.dataset.fxField, n = parseFloat(f.value), v = Number.isNaN(n) ? B(sel.sid, sel.bid).effect[key] : Math.max(Number(f.dataset.min), Math.min(Number(f.dataset.max), Math.round(n)));
  setEffect((x) => { x.effect[key] = v; }, `image effect ${key}`);
  renderBlockPanel();
});
// Focal point (IMAGEDESIGN.json): a press or a drag on the thumbnail puts the point under the
// pointer, inside the picture; the canvas follows at once; an arrow key moves it by 0.1. One undo step.
const focalAt = (v) => Math.max(0, Math.min(1, v));
function showFocal(ring, xy) {
  ring.style.left = `${xy[0] * 100}%`; ring.style.bottom = `${(1 - xy[1]) * 100}%`;
  const img = doc?.getElementById(`block-${sel.bid}`)?.querySelector('.fluid-image-container img');
  if (img) img.style.objectPosition = `${xy[0] * 100}% ${xy[1] * 100}%`;
}
function writeFocal(before, xy) {
  const b = B(sel.sid, sel.bid);
  if (xy[0] === 0.5 && xy[1] === 0.5) delete b.focal; else b.focal = xy;
  renderSectionDom(sel.sid);
  if (JSON.stringify(model) !== before) commit(before, `focal point on ${b.id}`);
}
blockPanel.addEventListener('pointerdown', (e) => {
  const fr = e.target.closest('.bp-pic-frame');
  if (!fr || !sel || e.button) return;
  e.preventDefault();
  const ring = fr.querySelector('.bp-focal'), q = fr.getBoundingClientRect(), before = JSON.stringify(model);
  const at = (ev) => [focalAt((ev.clientX - q.left) / q.width), focalAt((ev.clientY - q.top) / q.height)];
  let xy = at(e);
  showFocal(ring, xy);
  const move = (ev) => { xy = at(ev); showFocal(ring, xy); };
  const up = () => { fr.removeEventListener('pointermove', move); fr.removeEventListener('pointerup', up); fr.removeEventListener('pointercancel', up); writeFocal(before, xy); ring.focus(); };
  // Captured: the pointer may cross the canvas, which is another document.
  fr.setPointerCapture(e.pointerId);
  fr.addEventListener('pointermove', move);
  fr.addEventListener('pointerup', up);
  fr.addEventListener('pointercancel', up);
});
blockPanel.addEventListener('keydown', (e) => {
  const ring = e.target.closest('.bp-focal'), step = { ArrowLeft: [-0.1, 0], ArrowRight: [0.1, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] }[e.key];
  if (!ring || !step || !sel) return;
  e.preventDefault(); e.stopPropagation();
  const before = JSON.stringify(model), cur = B(sel.sid, sel.bid).focal || [0.5, 0.5], xy = [focalAt(cur[0] + step[0]), focalAt(cur[1] + step[1])];
  showFocal(ring, xy);
  writeFocal(before, xy);
});
// The Lightbox in preview (IMAGEDESIGN.json): a press on the picture opens it over a black 0.95
// page; the close button or a press beside the picture ends it.
function bindLightbox(d) {
  d.addEventListener('click', (e) => {
    if (!d.body.classList.contains('is-preview')) return;
    const box = d.querySelector('.cdk-image-lightbox');
    if (box) { if (!e.target.closest('.cdk-image-lightbox-padder img')) box.remove(); return; }
    const img = e.target.closest('.image-lightbox .fluid-image-container')?.querySelector('img');
    if (!img) return;
    const big = d.createElement('div');
    big.className = 'cdk-image-lightbox';
    big.innerHTML = '<div class="sqs-lightbox-overlay"></div><div class="cdk-image-lightbox-padder"><img alt=""></div><button type="button" class="sqs-lightbox-close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
    const pic = big.querySelector('img');
    pic.src = img.src; pic.alt = img.alt;
    pic.style.setProperty('--lightbox-aspect', img.naturalWidth / img.naturalHeight || 1);
    d.body.append(big);
  });
}

// Shape Corner radius and Stretch (parity/findings/SHAPEDESIGN.json), one undo step each.
// Corner is per layout (CAP-L6CORNER.json): four equal corners read as Uniform when the view comes back.
let cornerFour = null; // the block and view that just pressed Individual
function shownCorners(b) {
  const { corners: c, first } = cornerFor(b, bp), four = cornerFour === `${b.id}:${bp}`;
  return c && (four || new Set(c).size > 1) ? c : four ? Array(4).fill(first) : null;
}
function writeCorner(b, corners, one) {
  if (bp === 'mobile') {
    const d = { ...(b.designMobile || {}) };
    delete d.corner; delete d.corners;
    if (corners) d.corners = corners; else d.corner = one;
    b.designMobile = d;
    return;
  }
  delete b.corners; delete b.radius;
  if (corners) b.corners = corners; else if (one) b.radius = `${one}px`;
}
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-shape]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  const b = B(sel.sid, sel.bid);
  if (!b || (b.type !== 'shape' && b.type !== 'image')) return;
  const before = JSON.stringify(model);
  const typed = document.activeElement === f ? f.dataset.shape : null; // Enter keeps the focus, and with it Reset (CAP-L6RESET.json)
  if (f.dataset.shape === 'radius') {
    if (f.value === 'Mixed') return;
    const v = Math.max(0, Math.min(1000, parseFloat(f.value) || 0)), cur = cornerFor(b, bp).corners;
    writeCorner(b, cur ? cur.map(() => v) : null, v);
  }
  if (f.dataset.shape?.startsWith('corner:')) writeCorner(b, shownCorners(b).map((v, n) => (n === Number(f.dataset.shape.slice(7)) ? Math.max(0, Math.min(1000, parseFloat(f.value) || 0)) : v)));
  if (f.dataset.shape === 'stretch') { if (f.checked) delete b.stretch; else b.stretch = false; }
  renderSectionDom(sel.sid);
  commit(before, `${f.dataset.shape} set on ${b.id}`);
  renderBlockPanel();
  if (typed) blockPanel.querySelector(`input[data-shape="${typed}"]`)?.focus();
}, true);
blockPanel.addEventListener('click', (e) => {
  const r = e.target.closest('[data-corner-reset]');
  if (!r || !sel) return;
  e.preventDefault();
  const input = r.parentElement.querySelector('input[data-shape="radius"]');
  input.value = '0'; // the default, and on a phone it stays the phone's own (CAP-L6CORNER.json)
  if (cornerFor(B(sel.sid, sel.bid), bp).corners) setShape((b) => writeCorner(b, null, 0), 'Reset corners');
  else input.dispatchEvent(new Event('change', { bubbles: true }));
});

// Social Links and Map (parity/findings/T11.json). The rows are one list for the whole site.
let socView = null, socErr = '';
function socialList() { return model.socialLinks || DEFAULT_SOCIAL; }
function changeSocialList(change, label) {
  const before = JSON.stringify(model);
  model.socialLinks = structuredClone(socialList());
  change(model.socialLinks);
  for (const s of model.sections) if (JSON.stringify(s.blocks).includes('"type":"social"')) renderSectionDom(s.id);
  commit(before, label);
  renderBlockPanel();
}
// A press that makes the icons shorter sets the rows to the fit; one that makes them taller only grows them to fit.
function setSocial(change, label) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), s = S(sel.sid);
  const tall = () => blockEl(b.id)?.querySelector('.sqs-svg-icon--outer')?.offsetHeight || 0;
  const was = tall();
  change(b);
  renderSectionDom(sel.sid);
  const now = tall(), need = contentRows(b, measure(feEl(sel.sid))), a = lay(b).area, rows = a[2] - a[0], next = now < was ? need : Math.max(rows, need);
  if (next !== rows) {
    const lowest = () => Math.max(...s.blocks.map((o) => o.layout[bp].area[2])), low = lowest();
    a[2] = a[0] + next;
    if (next < rows) s.rows[bp] -= low - lowest(); else growRows(s);
    renderSectionDom(sel.sid);
  }
  commit(before, label);
  renderBlockPanel();
}
function setMap(change, label) {
  const before = JSON.stringify(model);
  change(B(sel.sid, sel.bid));
  renderSectionDom(sel.sid);
  commit(before, label);
  renderBlockPanel();
}
// Edit Form Fields (FORMFIELDS.json): one undo step per change. The block's rows follow the form.
let ffView = null, ffBefore = null;
function setFormRows(b, s, need) {
  const a = lay(b).area, rows = a[2] - a[0];
  if (need === rows) return;
  const lowest = () => Math.max(...s.blocks.map((o) => o.layout[bp].area[2])), low = lowest();
  a[2] = a[0] + need;
  if (need < rows) s.rows[bp] -= low - lowest(); else growRows(s);
  renderSectionDom(sel.sid);
}
const fitForm = (b, s) => setFormRows(b, s, contentRows(b, measure(feEl(sel.sid))));
// Quote's fields (CAP-T12QUOTE.json) and Newsletter's (CAP-T12NEWSLETTER.json): each key shows on the block at once, the
// rows follow the content both ways, and a field's edit is one undo step when the field is left.
const STANDIN_FIELDS = 'textarea[data-content="quote"], textarea[data-content="source"], [data-content^="nl"]';
// Refit 1, seen only (CAP-T12QUOTEROWS.json): content that grows takes the rows up to hold it; content that shrinks past a
// row lets them go down to the whole rows it fills, so 6 rows at 4.93 go to 4, and 4 rows stay at 3.27. Seen 7 of 8 on
// Quote; the miss: Source emptied at 8.69 keeps 9 rows on the oracle, 8 here. Newsletter's 15 reads, also seen (no
// predictions were pushed for them), all fit: its Title, Description, Disclaimer, Show Name Field, Layout and Alignment.
function refitStandin(b, change) {
  const x0 = contentRows(b, formPitch(b), false, false, true), rows = lay(b).area[2] - lay(b).area[0];
  change();
  renderSectionDom(sel.sid);
  const x = contentRows(b, formPitch(b), false, false, true), up = Math.max(1, Math.ceil(x - 0.02));
  setFormRows(b, S(sel.sid), x > x0 ? Math.max(rows, up) : up < rows ? Math.max(1, Math.floor(x + 0.02)) : rows);
}
let quoteBefore = null, standinIdle = 0;
blockPanel.addEventListener('input', (e) => {
  const t = e.target.closest(STANDIN_FIELDS);
  if (!t || !sel) return;
  const b = B(sel.sid, sel.bid);
  quoteBefore ??= JSON.stringify(model);
  refitStandin(b, () => { b[t.dataset.content] = t.isContentEditable ? cleanMessage(t) : t.value; });
  // A pause in typing ends an undo step: the text so far is one step, what is typed after it the next (CAP-T12NLREADS1.json,
  // CAP-T12NLREADS2.json, CAP-T12NLGAP.json, Newsletter's Title and Button Text: keys 500 or 700 ms apart are one step, 1000 or
  // 1300 ms apart two; emptying the field does not split it). 850 ms, between the reads, is inferred, as is Form Name; the
  // rich text boxes and Quote were not read.
  clearTimeout(standinIdle);
  if (b.standin === 'newsletter' && t.tagName === 'INPUT') standinIdle = setTimeout(() => { if (quoteBefore == null || document.activeElement !== t) return; const before = quoteBefore; quoteBefore = null; t.dataset.idled = '1'; commit(before, 'Newsletter changed'); }, 850);
});
// After such a step the field may be left with the text it had when it was entered, which fires no change: the rest commits here.
blockPanel.addEventListener('focusout', (e) => { const t = e.target; if (!t.dataset?.idled) return; delete t.dataset.idled; clearTimeout(standinIdle); if (quoteBefore != null) t.dispatchEvent(new Event('change', { bubbles: true })); });
let standinFlush = null, panelPress = false;
blockPanel.addEventListener('pointerdown', () => { panelPress = true; }, true);
window.addEventListener('pointerup', () => { panelPress = false; }, true);
blockPanel.addEventListener('change', (e) => {
  if (!e.target.closest(STANDIN_FIELDS) || quoteBefore == null) return;
  const before = quoteBefore, name = B(sel.sid, sel.bid)?.standin === 'newsletter' ? 'Newsletter' : 'Quote';
  quoteBefore = null;
  const go = () => { if (standinFlush !== go) return; standinFlush = null; commit(before, `${name} changed`); };
  standinFlush = go;
  // A bar press on a rich text box keeps its focus, and the press is its own step: commit now. Leaving it waits as above.
  if (e.target.isContentEditable && document.activeElement === e.target) { go(); return; }
  // A tick later, so a press on the other field has its focus first and the redraw leaves that field alone. A press
  // that left the field waits for its click: the redraw would take the switch or pick from under it.
  if (panelPress) window.addEventListener('pointerup', () => setTimeout(go), { once: true }); else setTimeout(go);
});
// A stand-in panel's rows (standin-panels.js): each change keeps its value on the block, one undo step; the tile stays.
// A Pricing Plan's Elements switches move its rows on desktop: growth to what the content needs, a shrink by the content
// lost, in rows, rounded up (CAP-T12PPROWS-PREDICTED3.json, refit 2, frozen: 45 of 46 unseen in CAP-T12READS-H.json;
// the miss: Benefits off from 5 rows at 8 columns, the oracle kept 5). Phone: not read, rows stay.
function setStandinValue(key, v) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), a = lay(b).area;
  const all = b.label === 'Pricing Plan' && bp === 'desktop' && PLAN_PARTS.some(([k]) => k === key) ? deskHeight(b.label, a[3] - a[1]) : undefined;
  const h0 = all === undefined ? 0 : planHeight(b, all);
  b.sp = { ...b.sp, [key]: v };
  if (all !== undefined) {
    const m = measure(feEl(sel.sid)), X = (h) => (h + m.rg) / m.pitch, x = X(planHeight(b, all)), rows = a[2] - a[0], up = Math.max(1, Math.ceil(x - 0.02));
    setFormRows(b, S(sel.sid), x > X(h0) ? Math.max(rows, up) : up < rows ? Math.max(1, rows - Math.ceil(X(h0) - x + 0.05)) : rows);
  }
  commit(before, `${b.label} ${key} changed`);
}
blockPanel.addEventListener('change', (e) => {
  const t = e.target.closest('input[data-sp-set], select[data-sp-set], input[data-sp-field], textarea[data-sp-field], .bp-rt[data-sp-field], input[data-sp-range]');
  if (!t || !sel) return;
  if (t.isContentEditable) { const v = cleanMessage(t), b = B(sel.sid, sel.bid); if (v !== (b.sp?.[t.dataset.spField] ?? '')) setStandinValue(t.dataset.spField, v); return; }
  if (t.tagName === 'SELECT') return setStandinValue(t.dataset.spSet, t.value);
  if (t.dataset.spSet) return setStandinValue(t.dataset.spSet, t.checked);
  if (t.dataset.spRange) return setStandinValue(t.dataset.spRange, Number(t.value));
  const f = t.dataset.spField;
  if (t.dataset.min == null) return setStandinValue(f, t.value);
  const n = Math.round(parseFloat(t.value));
  if (Number.isFinite(n)) setStandinValue(f, Math.max(Number(t.dataset.min), Math.min(Number(t.dataset.max), n))); else renderBlockPanel();
});
blockPanel.addEventListener('input', (e) => {
  const r = e.target.closest('input[data-sp-range]');
  const f = r && blockPanel.querySelector(`input[data-sp-field="${r.dataset.spRange}"]`);
  if (f) f.value = r.value;
  if (r) r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
});
blockPanel.addEventListener('click', (e) => {
  const sv = e.target.closest('[data-sp-view]');
  if (sv && sel) { spView = sv.dataset.spView === 'back' ? null : { bid: sel.bid, label: sv.dataset.spView }; renderBlockPanel(); return; }
  // Product's image shape picker opens and closes its tiles; a pick re-draws the panel, which closes them.
  const pick = e.target.closest('[data-sp-pick]');
  // The tiles reach past the panel's foot (CAP-T12READS-E.json: 567 high at the picker's top left), so they sit fixed there.
  if (pick) { const l = pick.nextElementSibling, r = pick.getBoundingClientRect(); Object.assign(l.style, { left: `${r.left}px`, top: `${r.top}px` }); l.hidden = !l.hidden; return; }
  const t = e.target.closest('button[data-sp-set]');
  if (t && sel) setStandinValue(t.dataset.spSet, t.dataset.v);
});
// Newsletter's Show Name Field, Layout and Alignment: one undo step each, after the step of a field just left.
function setNewsletter(key, v) {
  standinFlush?.();
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  refitStandin(b, () => { if (v) b[key] = v; else delete b[key]; });
  commit(before, 'Newsletter changed');
}
blockPanel.addEventListener('change', (e) => {
  const t = e.target.closest('input[data-nl-set]');
  if (t && sel) setNewsletter(t.dataset.nlSet, t.checked);
});
blockPanel.addEventListener('click', (e) => {
  const t = e.target.closest('button[data-nl-set]');
  if (t && sel) setNewsletter(t.dataset.nlSet, t.dataset.v);
});
// What a form's rows answer to: the form or its message, and any padding and stroke round it.
function formHeight(b) {
  const root = blockEl(b.id), lb = formView(b, bp).lightbox;
  const f = root.querySelector(lb ? '.lightbox-handle-wrapper' : '.form-wrapper:not(.form-lightbox .form-wrapper)');
  const c = root.querySelector('.sqs-block'), edge = c.offsetHeight - c.clientHeight;
  return Math.round((f.getBoundingClientRect().height + edge) * 10) / 10;
}
const formPitch = (b) => {
  const f = blockEl(b.id).querySelector('.sqs-block');
  f.style.display = 'none';
  const free = measure(f.closest('.fluid-engine'));
  f.style.display = '';
  return free;
};
const formBoxed = (b) => { const d = designFor(b, bp); return !formView(b, bp).lightbox && !!(d.background || d.stroke); };
// A form's rows settle one step late (FORMFIELDS.json, blockFits.rule). A step reads the form as the step before left
// it. If that changed the height, a rise makes the rows hold it, with 2px of give, and a fall takes them down when more
// than one row is spare. A form with Lightbox on has its own rule, and one with a Background or Stroke stays as it is.
function formStep(b) {
  const h = formHeight(b), last = b.formH?.[bp] ?? h;
  b.formH = { ...b.formH, [bp]: h };
  if (h === last || formView(b, bp).lightbox || formBoxed(b)) return;
  const { rg, pitch } = formPitch(b), rows = lay(b).area[2] - lay(b).area[0];
  const up = Math.ceil((h + rg - 2) / pitch), fall = Math.ceil((h - rg) / pitch);
  setFormRows(b, S(sel.sid), h > last ? Math.max(rows, up) : rows > fall + 1 ? fall : rows);
}
// A Background or Stroke going on drops the rows to a few and the block hugs what it holds: 3 on a new form. The reads
// from other rows have no rule, so they stand named (blockFits.boxed). Going off grows them to hold the block as it was.
function formDesignStep(b, change) {
  const wasBoxed = formBoxed(b);
  formStep(b);
  const h = b.formH[bp];
  change();
  renderSectionDom(sel.sid);
  const boxed = formBoxed(b);
  if (boxed === wasBoxed) return;
  const rows = lay(b).area[2] - lay(b).area[0], { rg, pitch } = formPitch(b);
  setFormRows(b, S(sel.sid), boxed ? Math.min(rows, 3) : Math.max(rows, Math.ceil((h + rg - 2) / pitch)));
}
// A delete fits at once: its reads found no rule to build (FORMFIELDS.json, lightbox.deleteThenOn).
function setForm(change, label, deleted = false) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), form = b.type === 'form'; // or Newsletter's Post-Submit
  if (form) b.fields ||= [];
  if (!deleted && form) formStep(b);
  change(b);
  renderSectionDom(sel.sid);
  if (deleted && !formView(b, bp).lightbox) { fitForm(b, S(sel.sid)); b.formH = { ...b.formH, [bp]: formHeight(b) }; }
  commit(before, label);
  renderBlockPanel();
  blockPanel.scrollTop = Math.min(blockPanel.scrollTop, blockPanel.scrollHeight);
}
// Lightbox on: the rows lose what the form gave up, not down to the least that holds the button, so
// the count depends on the rows it had. Off: the rows stay until the next change (FORMFIELDS.json, lightbox).
function setFormLightbox(on) {
  const b = B(sel.sid, sel.bid), s = S(sel.sid), before = JSON.stringify(model), top = blockPanel.scrollTop;
  const h = on ? blockEl(b.id).querySelector(FORM_ON_PAGE).getBoundingClientRect().height : 0;
  if (!on) b.formH = { ...b.formH, [bp]: formHeight(b) }; // the form coming back is a rise the next step answers
  setFormView(b, bp, 'lightbox', on);
  // Lightbox on takes a Background off for good; a Stroke, Blend Mode and Blur stay (FORMFIELDS.json, lightbox.designSet).
  if (on && designFor(b, bp).background) { const bag = designBag(bp), d = { ...b[bag] }; if (bag === 'designMobile') d.background = false; else delete d.background; if (Object.keys(d).length) b[bag] = d; else delete b[bag]; }
  renderSectionDom(sel.sid);
  if (on) {
    const w = blockEl(b.id).querySelector('.lightbox-handle-wrapper'), hh = w.getBoundingClientRect().height;
    w.style.display = 'none';
    const free = measure(feEl(sel.sid));
    w.style.display = '';
    const a = lay(b).area, low = Math.max(...s.blocks.map((o) => o.layout[bp].area[2]));
    a[2] = Math.max(a[0] + 1, a[2] - Math.ceil((h - hh) / free.pitch));
    s.rows[bp] -= low - Math.max(...s.blocks.map((o) => o.layout[bp].area[2]));
    renderSectionDom(sel.sid);
  }
  commit(before, on ? 'Lightbox on' : 'Lightbox off');
  renderBlockPanel();
  blockPanel.scrollTop = top;
}
blockPanel.addEventListener('change', (e) => {
  if (sel && e.target.closest('[data-form-lightbox]')) setFormLightbox(e.target.checked);
  if (sel && e.target.closest('[data-form-lbtext]')) { const before = ffBefore; ffBefore = null; if (before) commit(before, 'Lightbox button text'); }
});
// The button's word shows as it is typed; the rows move only when its height does.
blockPanel.addEventListener('input', (e) => {
  const t = e.target.closest('[data-form-lbtext]');
  if (!t || !sel) return;
  ffBefore ??= JSON.stringify(model);
  const b = B(sel.sid, sel.bid), h = blockEl(b.id).querySelector('.lightbox-handle').offsetHeight;
  setFormView(b, bp, 'lightboxText', t.value);
  renderSectionDom(sel.sid);
  if (blockEl(b.id).querySelector('.lightbox-handle').offsetHeight !== h) fitForm(b, S(sel.sid));
});
// The field the open view edits: a field, or a follow-up of one of its options.
const ffField = (b) => { const [v, n, i, k] = ffView.split(':'); return v === 'ff-fu' ? followOf(b.fields[n], i)[k] : b.fields[n]; };
const ffOpen = () => /^ff-(edit|fu|opt):/.test(ffView || '');
let ffReturn = null; // where Back goes from Add Follow-Up and from a follow-up's editor
// While Edit Post-Submit is open the block shows what comes after a submit (FORMFIELDS.json, postSubmit).
function showFormPost(b) {
  const on = b?.type === 'form' && ffView === 'ff-post' ? blockEl(b.id)?.querySelector('.form-wrapper') : null;
  for (const w of on ? [on] : doc?.querySelectorAll('.form-wrapper.is-post-view') || []) w.classList.toggle('is-post-view', !!on);
  if (on) for (const w of doc.querySelectorAll('.form-wrapper.is-post-view')) if (w !== on) w.classList.remove('is-post-view');
}
const setPost = (k, v, label) => setForm((b) => { b.post = { ...b.post, [k]: v }; }, label);
function showFf(view) { ffView = view; renderBlockPanel(); blockPanel.scrollTop = 0; }
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-ff]');
  if (!a || !sel || e.target.closest('.bp-ff-grip, .bp-ffo-grip')) return;
  const [act, arg, arg2, arg3] = a.dataset.ff.split(':'), n = Number(arg), o = Number(arg2);
  if (act === 'list') showFf('ff-list');
  else if (act === 'post') showFf('ff-post');
  else if (act === 'post-mode') setPost('redirect', arg === 'redirect', 'After Submission');
  else if (act === 'post-align') setPost('align', arg, 'Message alignment');
  else if (act === 'post-position') setPost('position', arg, 'Message position');
  else if (act === 'back') {
    closeLinkPopover();
    const [v, fn] = (ffView || '').split(':');
    showFf(v === 'ff-fu' || v === 'ff-fuadd' ? ffReturn : v === 'ff-opt' ? `ff-edit:${fn}` : ffView === 'ff-list' || ffView === 'ff-post' ? null : 'ff-list');
  }
  else if (act === 'opt') showFf(`ff-opt:${n}:${o}`);
  else if (act === 'fu') { ffReturn = `ff-opt:${n}:${o}`; showFf(`ff-fu:${n}:${o}:${arg3}`); }
  else if (act === 'fu-add') { ffReturn = `ff-opt:${n}:${o}`; showFf(`ff-fuadd:${n}:${o}`); }
  else if (act === 'fu-tile') {
    const [, fn, oi] = ffView.split(':');
    setForm((b) => { ffView = `ff-fu:${fn}:${oi}:${addFollow(b.fields[fn], Number(oi), arg)}`; }, `${arg} follow-up added`);
    blockPanel.scrollTop = 0;
  }
  else if (act === 'fu-del') { ffView = `ff-edit:${n}`; setForm((b) => deleteFollow(b.fields[n], o, Number(arg3)), 'Follow-up deleted', true); blockPanel.scrollTop = 0; }
  else if (act === 'opt-del') { ffView = `ff-edit:${n}`; setForm((b) => deleteOption(b.fields[n], o), 'Option deleted', true); blockPanel.scrollTop = 0; }
  else if (act === 'add') showFf('ff-add');
  else if (act === 'edit') showFf(`ff-edit:${n}`);
  else if (act === 'tile') { ffView = 'ff-list'; setForm((b) => b.fields.push(newField(arg)), `${arg} field added`); blockPanel.scrollTop = 0; }
  else if (act === 'delete' || act === 'del') { ffView = 'ff-list'; setForm((b) => b.fields.splice(n, 1), 'Field deleted', true); blockPanel.scrollTop = 0; }
  else if (act === 'dup') { ffView = 'ff-list'; setForm((b) => b.fields.splice(n + 1, 0, JSON.parse(JSON.stringify(b.fields[n]))), 'Field duplicated'); blockPanel.scrollTop = 0; }
  else if (act === 'opt-add') setForm((b) => { const l = ffField(b).options; l.push(`Option ${l.length + 1}`); }, 'Option added');
  else if (act === 'max') setForm((b) => { const f = ffField(b); f.maxFiles = Math.max(1, (f.maxFiles || 1) + n); }, 'Max files');
});
// A typed value shows at once and makes its undo step when the field is left.
blockPanel.addEventListener('input', (e) => {
  const q = e.target.closest('[data-ff-post]');
  if (q && sel) {
    ffBefore ??= JSON.stringify(model);
    const b = B(sel.sid, sel.bid);
    if (b.type === 'form') formStep(b);
    b.post = { ...b.post, [q.dataset.ffPost]: q.isContentEditable ? cleanMessage(q) : q.value };
    renderSectionDom(sel.sid);
    showFormPost(b);
    if (q.dataset.ffPost === 'html') paintCode(q);
    return;
  }
  const t = e.target.closest('[data-ff-field],[data-ff-opt]');
  if (!t || !sel || !ffOpen()) return;
  ffBefore ??= JSON.stringify(model);
  formStep(B(sel.sid, sel.bid));
  const f = ffField(B(sel.sid, sel.bid));
  if (t.dataset.ffOpt != null) f.options[Number(t.dataset.ffOpt)] = t.value;
  else writeFieldText(f, t.dataset.ffField, t.value);
  renderSectionDom(sel.sid);
  if (t.dataset.ffField === 'label') blockPanel.querySelector('.bp-ff-title').textContent = t.value || t.placeholder || 'Hidden';
});
blockPanel.addEventListener('change', (e) => {
  if (sel && e.target.closest('[data-ff-post]')) {
    const before = ffBefore;
    ffBefore = null;
    if (before) commit(before, 'Post-submit changed');
    return;
  }
  if (!sel || !ffOpen()) return;
  if (e.target.closest('[data-ff-field],[data-ff-opt]')) {
    const before = ffBefore;
    ffBefore = null;
    if (before) commit(before, 'Field changed');
    return;
  }
  const t = e.target.closest('[data-ff-set]');
  if (t) setForm((b) => writeFieldSet(ffField(b), t.dataset.ffSet, t.checked), 'Field changed');
});
function addSocialLink(field) {
  if (!socialKind(field.value.trim())) { socErr = 'URL not found'; const v = field.value; renderBlockPanel(); const f = blockPanel.querySelector('[data-soc-add]'); if (f) { f.value = v; f.focus(); } return; }
  socView = null; socErr = '';
  changeSocialList((l) => l.push({ url: field.value.trim() }), 'Social link added');
}
blockPanel.addEventListener('click', (e) => {
  if (!sel) return;
  const set = e.target.closest('[data-soc-set]');
  // On a phone a row keeps its own value (T11.json, phone); None is kept as an empty value there.
  if (set) { const { socSet: k, v } = set.dataset; setSocial((b) => { if (bp === 'mobile') (b.socialMobile ||= {})[k] = v; else if (v) b[k] = v; else delete b[k]; }, `${k} ${v}`); return; }
  const z = e.target.closest('[data-map-zoom]');
  if (z) { const d = Number(z.dataset.mapZoom); setMap((b) => { b.mapZoom = Math.max(0, Math.min(MAP_ZOOMS.length - 1, mapOf(b).zoom + d)); }, 'Map zoom'); return; }
  const a = e.target.closest('[data-social]');
  if (!a || e.target.closest('.bp-soc-grip')) return;
  const [act, arg] = a.dataset.social.split(':');
  if (act === 'open') { socView = `soc-row:${arg}`; socErr = ''; renderBlockPanel(); }
  else if (act === 'back') { socView = null; socErr = ''; renderBlockPanel(); }
  else if (act === 'add') { socView = 'soc-add'; socErr = ''; renderBlockPanel(); blockPanel.querySelector('[data-soc-add]')?.focus(); }
  else if (act === 'delete') showSocialConfirm(Number(arg));
});
blockPanel.addEventListener('keydown', (e) => {
  const f = e.target.closest?.('[data-soc-add]');
  if (!f) return;
  if (e.key === 'Enter') { e.preventDefault(); addSocialLink(f); }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); socView = null; socErr = ''; renderBlockPanel(); }
});
// Map Zoom takes each key at once (88, CAP-T11ZOOMKEYS.json, 7 of 7 predicted): the text is cut to a whole ladder step,
// with no clamp, and the field shows that step again with the caret at the end; no number keeps the old step.
const zoomShown = () => { const z = mapOf(B(sel.sid, sel.bid)).zoom; return String(MAP_ZOOMS[z] ?? z); };
function commitZoomText(text) {
  const v = parseFloat(text);
  if (Number.isFinite(v) && Math.trunc(v) !== mapOf(B(sel.sid, sel.bid)).zoom) setMap((b) => { b.mapZoom = Math.trunc(v); }, 'Map zoom');
  const f = blockPanel.querySelector('[data-map-zoomfield]');
  if (!f) return;
  f.value = zoomShown();
  if (document.activeElement !== f) f.focus();
  f.setSelectionRange(f.value.length, f.value.length);
}
blockPanel.addEventListener('input', (e) => {
  const zf = e.target.closest('[data-map-zoomfield]');
  if (zf && sel) { commitZoomText(zf.value); return; }
  const t = e.target.closest('[data-soc-thick]');
  if (t) { const v = blockPanel.querySelector('[data-soc-thickfield]'); if (v) v.value = `${t.value}px`; blockEl(sel.bid)?.querySelector('.sqs-svg-icon--outer')?.style.setProperty('--si-thick', `${t.value}px`); }
});
blockPanel.addEventListener('change', (e) => {
  if (!sel) return;
  const t = e.target.closest('[data-soc-thick]');
  const tf = e.target.closest('[data-soc-thickfield]');
  if (t || tf) {
    // The field keeps the slider's range and a fraction, as the stroke field does (CAP-T6RANGE.json).
    const n = parseFloat((t || tf).value), v = Math.max(1, Math.min(5, n));
    if (Number.isFinite(n)) setSocial((b) => { if (bp === 'mobile') (b.socialMobile ||= {}).iconThick = v; else b.iconThick = v; }, `Thickness ${v}`); else renderBlockPanel();
    return;
  }
  const show = e.target.closest('[data-soc-show]');
  if (show) { const n = Number(show.dataset.socShow), on = show.checked; changeSocialList((l) => { if (on) delete l[n].hidden; else l[n].hidden = true; delete l[n].aria; }, 'Social icon shown or hidden'); return; }
  const url = e.target.closest('[data-soc-url]');
  if (url) {
    const n = Number(url.dataset.socUrl), v = url.value.trim();
    if (!socialKind(v)) { socErr = 'URL not found'; renderBlockPanel(); return; }
    socErr = ''; changeSocialList((l) => { l[n].url = v; delete l[n].aria; }, 'Social link changed');
    return;
  }
  const m = e.target.closest('[data-map-set]');
  if (m) { const k = m.dataset.mapSet, on = m.checked; setMap((b) => { b[k] = on; }, `${k} ${on}`); return; }
  const zf = e.target.closest('[data-map-zoomfield]');
  if (zf) { if (zf.value !== zoomShown()) commitZoomText(zf.value); return; }
  const c = e.target.closest('input[data-content^="map"], input[data-content="formName"], input[data-content="button"]');
  if (c) { const k = c.dataset.content, v = c.value; c.blur(); setMap((b) => { if (v) b[k] = v; else delete b[k]; }, `${k} changed`); }
});
function closeSocialConfirm() { styleConfirm.hidden = true; styleConfirm.classList.remove('is-social'); socConfirmRow = null; }
let socConfirmRow = null;
function showSocialConfirm(n) {
  socConfirmRow = n;
  $('ss-confirm-title').textContent = 'Remove social link?';
  $('ss-confirm-body').textContent = 'Removing a social link will remove it from all social link areas.';
  $('ss-confirm-reset').textContent = 'Delete';
  styleConfirm.classList.add('is-social');
  styleConfirm.hidden = false;
}

// A shape's Shape style, corners, Color and Stroke Color (parity/findings/SHAPESTYLES.json). Each
// change is one undo step; a drag on the map or the bars is one step when it ends.
const shapePop = document.createElement('div');
shapePop.id = 'shape-pop';
shapePop.hidden = true;
document.body.append(shapePop);
function closeShapePop() { shapeUi = null; shapePop.hidden = true; blockPanel.querySelector('.bp-anchor')?.removeAttribute('aria-expanded'); blockPanel.querySelector('.st-color.is-open')?.classList.remove('is-open'); }
const MAP_ORDER = [1, 2, 3, 5, 4, 6]; // Original, Grayscale, Satellite, Dark, Light, Blue
// An Appear pick plays the effect once on the Quote, in the editor (CAP-T12QUOTEAPPEAR3.json, CAP-T12QUOTEAPPEAR4.json, two
// reads each): the quote stays put about 290 ms after the press, takes the effect's start pose, holds to about 545 ms, then
// eases to rest in 0.8s on cubic-bezier(0.4, 0, 0.2, 1), opacity from 0. None and Site Default do not move it.
const APPEAR_FROM = { 'Fade In': 'none', 'Slide Up': 'translateY(20px)', 'Focus In': 'scale(0.92)', Reveal: 'translateX(20px)' };
function playAppear(bid, v) {
  const fig = blockEl(bid)?.querySelector('.sqs-quote-block-contents'), from = APPEAR_FROM[v];
  if (!fig || !from) return;
  const T = 290 + 255 + 800, at = 290 / T, go = 545 / T;
  fig.animate([
    { offset: 0, opacity: 1, transform: 'none' }, { offset: at, opacity: 1, transform: 'none' },
    { offset: at, opacity: 0, transform: from }, { offset: go, opacity: 0, transform: from, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    { offset: 1, opacity: 1, transform: 'none' },
  ], { duration: T });
}
function setShape(change, label) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model);
  change(b);
  renderSectionDom(sel.sid);
  commit(before, label);
  renderBlockPanel();
}
const COLOR_RE = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/;
function colorParts(css) {
  const m = COLOR_RE.exec(css || '');
  if (m) return { rgb: [+m[1], +m[2], +m[3]], a: m[4] == null ? 1 : +m[4] };
  const hex = /^#[0-9a-f]{6}$/i.test(css || '') ? css : '#ffffff';
  return { rgb: [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)), a: 1 };
}
const colorCss = ({ rgb, a }) => (a < 1 ? `rgba(${rgb.join(', ')}, ${a})` : `rgb(${rgb.join(', ')})`);
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const rgbOf = (hex) => [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16));
function hslOf([r0, g0, b0]) {
  const r = r0 / 255, g = g0 / 255, bl = b0 / 255, max = Math.max(r, g, bl), min = Math.min(r, g, bl), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l * 100];
  const h = max === r ? ((g - bl) / d + 6) % 6 : max === g ? (bl - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, (d / (1 - Math.abs(2 * l - 1))) * 100, l * 100];
}
const rgbFromHsl = (h, s, l) => { const a = (s / 100) * Math.min(l / 100, 1 - l / 100), f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; };
// A shape's own section's theme color, as the page draws it (CAP-T6THEME.json).
function themeInk(b, which) {
  const probe = doc.createElement('i');
  probe.style.color = `var(--shape-theme-${which})`;
  blockEl(b.id).append(probe);
  const c = win.getComputedStyle(probe).color;
  probe.remove();
  return c;
}
const shapeColorOf = (b, key) => (key === 'overlay' ? b.overlayColor || 'rgba(0, 0, 0, 0.5)' : key === 'color' ? shapeFill(b, bp) || themeInk(b, 'fill') : key === 'lightboxBg' ? formView(b, bp).lightboxBg : b.type === 'video' && designFor(b, bp)[key] === '' ? 'rgb(0, 0, 0)' : key === 'bgColor' ? designFor(b, bp).bgColor || 'rgb(255, 255, 255)' : designFor(b, bp).strokeColor || (b.type === 'video' ? 'rgb(255, 255, 255)' : b.type === 'shape' ? themeInk(b, 'stroke') : 'rgb(0, 0, 0)'));
// On a phone a color set means its own: one that flows down from desktop shows no Reset and no Opacity (CAP-T6RESET.json).
// A value that flows down shows Reset and Opacity on the phone too, until Reset says to follow (CAP-L6ROWS.json).
const phoneSet = (b, k, desk) => (bp !== 'mobile' ? !!desk : phoneOwn(b, k) || (!(b.designMobile && k in b.designMobile) && !!desk));
const strokeColorSet = (b) => phoneSet(b, 'strokeColor', b.design?.strokeColor);
function writeShapeColor(b, key, css) {
  if (key === 'color' && bp !== 'mobile') { if (css) b.color = css; else delete b.color; return; }
  if (key === 'overlay') { if (css) b.overlayColor = css; else delete b.overlayColor; return; }
  if (key === 'lightboxBg') { setFormView(b, bp, key, css); return; }
  const bag = designBag(bp), d = { ...(b[bag] || {}) };
  if (css) d[key] = css; else if (bag === 'designMobile' || b.type === 'video') d[key] = b.type === 'shape' ? FOLLOW_DESKTOP : ''; else delete d[key];
  if (css && key === 'bgColor') delete d.bgClear;
  if (!css && b.type === 'video' && bag !== 'designMobile') videoReset = b;
  if (Object.keys(d).length) b[bag] = d; else delete b[bag];
}
// Reset on a video's colour: the block keeps its paint and the swatch goes black, until the block is selected again, when
// the colour is as on a new fill or stroke, and a block with no fill still has none (CAP-T7COLOR6.json, CAP-T7COLOR9.json, CAP-T7COLOR10.json). A phone's stays (CAP-T7COLOR8.json).
let videoReset = null;
function settleVideoColors() {
  if (!videoReset || (sel && designOpen === sel.bid && sel.bid === videoReset.id)) return;
  const d = videoReset.design;
  videoReset = null;
  if (!d) return;
  for (const k of ['bgColor', 'strokeColor']) if (d[k] === '') delete d[k];
}
// The section panel's color rows: the divider stroke, or an Art color. Null writes the default back.
const secColorOf = (u) => { const s = S(u.sid); if (u.section === 'divider') return s.dividerColor || 'rgb(0, 0, 0)'; return s.bgArt?.colors[Number(u.section.slice(4))] || '#000000'; };
function writeSecColor(u, css) {
  const s = S(u.sid);
  if (u.section === 'divider') { if (css) s.dividerColor = css; else delete s.dividerColor; return; }
  const k = Number(u.section.slice(4)), colors = [...s.bgArt.colors];
  colors[k] = css || artDefaults(s.bgArt.name)[k] || '#000000';
  s.bgArt = { ...s.bgArt, colors };
}
const secColorSet = (u) => { const s = S(u.sid); if (u.section === 'divider') return !!s.dividerColor; const k = Number(u.section.slice(4)); return s.bgArt?.colors[k] !== artDefaults(s.bgArt?.name)[k]; };
function setSecColor(css) {
  const u = shapeUi, before = JSON.stringify(model);
  writeSecColor(u, css);
  renderSectionDom(u.sid);
  commit(before, `Section ${u.section} color ${css ? 'changed' : 'reset'}`);
  if (editSid) renderSectionPanel();
}
function renderSectionPop() {
  const u = shapeUi, P = sectionPanel.getBoundingClientRect(), c = colorParts(secColorOf(u));
  const custom = u.custom && (u.custom.hex === toHex(c.rgb) ? u.custom : { ...u.custom, ...hexToHsv(toHex(c.rgb)), hex: toHex(c.rgb) });
  if (custom) u.custom = custom;
  shapePop.className = 'is-color';
  shapePop.innerHTML = shapeColorHtml({ swatches: fmt.TEXT_COLORS.map(([, , rgb]) => toHex(colorParts(rgb).rgb).toUpperCase()), rgb: c.rgb, a: c.a, hsl: hslOf(c.rgb), custom, set: secColorSet(u), opacity: secColorSet(u) });
  shapePop.hidden = false;
  const a = sectionPanel.querySelector(`[data-sp-color="${u.section}"]`)?.getBoundingClientRect(), h = shapePop.offsetHeight;
  shapePop.style.cssText = `left:${P.left - 311}px;top:${Math.max(60, Math.min((a ? a.top + a.height / 2 : P.top) - h / 2 - 12, innerHeight - h - 8))}px`;
}
// Drawn over in place: the focus stays where it is.
function paintAnchorPop(ox, oy) {
  for (const [k, v] of [['ox', ox], ['oy', oy]]) shapePop.querySelector(`[data-anchor="${k}"]`).value = anchorText(v);
  for (const r of shapePop.querySelectorAll('[data-anchor-at]')) { const on = r.dataset.anchorAt === `${ox},${oy}`; r.classList.toggle('is-on', on); r.setAttribute('aria-checked', String(on)); }
}
function renderShapePop() {
  if (shapeUi.section) { renderSectionPop(); return; }
  const b = B(sel.sid, sel.bid), P = blockPanel.getBoundingClientRect(), { kind } = shapeUi;
  blockPanel.querySelector('.bp-anchor')?.setAttribute('aria-expanded', String(kind === 'anchor'));
  shapePop.className = kind === 'editmenu' ? 'is-editmenu' : kind === 'fxmenu' ? 'is-fxmenu' : kind === 'appear' ? 'is-appear' : kind === 'accmenu' ? 'is-accmenu' : kind === 'ffmenu' ? 'is-ffmenu' : kind === 'animopts' || kind === 'imagesel' ? 'is-animopts' : kind === 'style' ? 'is-style' : kind === 'more' ? 'is-more' : kind === 'mapstyle' ? 'is-mapstyle' : 'is-color';
  if (kind === 'anchor') {
    const { ox, oy } = designFor(b, bp), btn = blockPanel.querySelector('[data-shape-act="anchor"]')?.getBoundingClientRect();
    shapePop.className = 'is-anchor';
    if (shapePop.querySelector('.an-anchor-head')) paintAnchorPop(ox, oy); else shapePop.innerHTML = anchorPopHtml(ox, oy);
    shapePop.hidden = false;
    // Its bottom on the button's bottom, 11 right of the panel, 311 left of it unless 11 stay free at the screen's edge (CAP-L6ANCHOR.json).
    shapePop.style.cssText = `left:${P.right + 311 > innerWidth - 11 ? P.left - 311 : P.right + 11}px;top:${Math.max(60, (btn?.bottom ?? P.bottom) - shapePop.offsetHeight)}px`;
    return;
  }
  if (kind === 'animopts') {
    const u = shapeUi, one = u.mode === 'row' ? ' animation' : ' animations', a = animRows()[anim.i];
    if (u.mode === 'sel') { shapePop.innerHTML = animOptionsHtml(u.key, a?.[u.key]); shapePop.style.cssText = `left:${u.rect.left - 9}px;top:${u.rect.top}px`; }
    else { shapePop.innerHTML = `<button type="button" role="option" data-an-clip="copy">Copy${one}</button><button type="button" role="option" data-an-clip="paste"${animClip ? '' : ' disabled'}>Paste${one}</button>`; shapePop.style.cssText = `left:${u.rect.left - 54}px;top:${u.rect.top - 6}px`; }
  } else if (kind === 'editmenu') {
    // Edit (IMAGEEDITOR.json). The two AI rows need an AI service behind them: not built.
    const icon = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true">${d}</svg>`, ai = '<em>AI</em>';
    shapePop.innerHTML = `<button type="button" role="menuitem" disabled data-unbuilt title="Needs an AI service">${icon('<path d="M4 20l1-4L16 5l3 3L8 19z"/>')}Edit with AI ${ai}</button><button type="button" role="menuitem" disabled data-unbuilt title="Needs an AI service">${icon('<path d="M4 8h4l2-3h4l2 3h4v11H4z"/><circle cx="12" cy="13" r="3"/>')}Reshoot ${ai}</button><button type="button" role="menuitem" data-image-edit>${icon('<rect x="4" y="5" width="16" height="14"/><path d="M4 16l5-5 4 4 3-3 4 4"/>')}Edit image</button>`;
    shapePop.style.cssText = `left:${shapeUi.rect.left - 315.5}px;top:${shapeUi.rect.top + 40}px`;
  } else if (kind === 'fxmenu') {
    // Interaction (IMAGEEFFECT.json): a list over its row, the current one on the row with a check.
    shapePop.innerHTML = EFFECTS[b.effect.kind].groups.flatMap(([, rows]) => rows).find((r) => r[2] === shapeUi.key)[3].map((o) => `<button type="button" role="option" class="${o === b.effect[shapeUi.key] ? 'is-cur' : ''}" data-fx-opt="${o}">${o}${o === b.effect[shapeUi.key] ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 12l4 4 8-9"/></svg>' : ''}</button>`).join('');
    shapePop.style.cssText = `left:${P.left + 11}px;top:${shapeUi.rect.top - 5}px`;
  } else if (kind === 'appear') {
    // What a pick does on the page is not read: it is kept on the block.
    const cur = b.appear || APPEAR[0];
    shapePop.innerHTML = APPEAR.map((o) => `<button type="button" role="option" class="${o === cur ? 'is-cur' : ''}" aria-selected="${o === cur}" data-appear-opt="${o}">${o}</button>`).join('');
    // Low in the window, the list moves up and its foot sits 11 above the window's (CAP-T12APPEARLOW.json: 700 tall, row at 623).
    const top = Math.max(8, Math.min(shapeUi.rect.top - 25, innerHeight - 11 - (APPEAR.length * 45 + 11))); // rows 45, padding 5 and 6
    shapePop.style.cssText = `left:${shapeUi.rect.left}px;top:${top}px;max-height:${innerHeight - top - 8}px;overflow:auto`; // a list taller than the window scrolls (not read)
  } else if (kind === 'imagesel') {
    // Blend Mode and Lightbox Theme (IMAGEDESIGN.json): a list over the button, 9px to its left.
    const video = shapeUi.key === 'vblend', blend = video || shapeUi.key === 'blend', list = blend ? BLEND_MODES : ['Light Overlay', 'Dark Overlay'];
    const on = video ? blockPanel.querySelector('[data-image-sel="vblend"]')?.dataset.cur || 'normal' : b.overlayBlend || 'normal';
    const cur = blend ? BLEND_MODES.find((m) => blendValue(m) === on) : b.lightboxTheme === 'light' ? 'Light Overlay' : 'Dark Overlay';
    shapePop.innerHTML = list.map((o) => `<button type="button" role="option" class="${o === cur ? 'is-cur' : ''}" data-image-opt="${o}">${o}</button>`).join('');
    shapePop.style.cssText = `left:${shapeUi.rect.left - 9}px;top:${shapeUi.rect.top}px;max-height:${video ? Math.min(220, innerHeight - shapeUi.rect.top - 8) : innerHeight - shapeUi.rect.top - 8}px;overflow:auto`;
  } else if (kind === 'ffmenu') {
    // An option's menu (followUp.menu): its right edge 4 left of the button, 40 below the button's top.
    shapePop.innerHTML = `${ffView.startsWith('ff-fu:') ? '' : '<button type="button" data-ff-pop="follow">Add follow-up question</button>'}<button type="button" class="is-red" data-ff-pop="delete">Delete Option</button>`;
    shapePop.style.cssText = `right:${innerWidth - shapeUi.rect.left + 4}px;top:${shapeUi.rect.top + 40}px`;
  } else if (kind === 'accmenu') {
    const key = shapeUi.key, list = key === 'icon' ? [['plus', 'Plus'], ['arrow', 'Arrow']] : Object.entries(ACCORDION_STYLES).filter(([k]) => key === 'titleStyle' || k[0] === 'p');
    const cur = key === 'icon' ? b.icon || 'plus' : b[key] || (key === 'titleStyle' ? 'h4' : 'p2'), at = list.findIndex(([k]) => k === cur);
    const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${d}</svg>`;
    const glyph = { plus: '<path d="M4 12h16M12 4v16"/>', arrow: '<path d="M6 9l6 6 6-6"/>' };
    shapePop.innerHTML = list.map(([k, l]) => `<button type="button" role="option" class="${k === cur ? 'is-cur' : ''}" data-acc-opt="${k}" aria-selected="${k === cur}">${key === 'icon' ? `<i>${icon(glyph[k])}</i>` : ''}<span>${l}</span>${k === cur ? icon('<path d="M5 12l5 5 9-10"/>') : ''}</button>`).join('');
    shapePop.style.cssText = `left:${shapeUi.rect.left}px;top:${Math.max(60, shapeUi.rect.top - at * 45)}px`;
  } else if (kind === 'more') {
    shapePop.innerHTML = '<button type="button" role="option" data-more="copy">Copy transforms</button><button type="button" role="option" data-more="paste">Paste transforms</button>';
    const r = blockPanel.querySelector('.bp-more').getBoundingClientRect();
    shapePop.style.cssText = `left:${r.left - 54}px;top:${r.top - 6}px`;
  } else if (kind === 'mapstyle') {
    // The chosen row sits over the picker (T11.json): rows of 88 and 6px above the first.
    const cur = mapOf(b).style, at = [...MAP_ORDER].indexOf(cur), r = blockPanel.querySelector('.bp-map-style').getBoundingClientRect();
    shapePop.innerHTML = mapStylesHtml(cur);
    shapePop.style.cssText = `left:${r.left}px;top:${Math.max(60, r.top - at * 88 - 6)}px`;
  } else if (kind === 'style') {
    shapePop.innerHTML = shapePickerHtml(b.shape);
    const top = Math.max(60, P.top - 85);
    shapePop.style.cssText = `left:${P.left + 22}px;top:${top}px;max-height:${innerHeight - top - 8}px`;
  } else {
    const c = colorParts(shapeColorOf(b, kind));
    const custom = shapeUi.custom && (shapeUi.custom.hex === toHex(c.rgb) ? shapeUi.custom : { ...shapeUi.custom, ...hexToHsv(toHex(c.rgb)), hex: toHex(c.rgb) });
    if (custom) shapeUi.custom = custom;
    const video = b.type === 'video' && (kind === 'bgColor' || kind === 'strokeColor'), unset = video && designFor(b, bp)[kind] === '';
    shapePop.innerHTML = shapeColorHtml({ swatches: fmt.TEXT_COLORS.map(([, , rgb]) => toHex(colorParts(rgb).rgb).toUpperCase()), rgb: c.rgb, a: c.a, hsl: hslOf(c.rgb), custom, unset, tabs: video && kind === 'bgColor', set: video ? !unset : kind === 'overlay' ? !!b.overlayColor : kind === 'color' ? phoneSet(b, 'color', b.color) : kind === 'lightboxBg' ? !!b.lightboxBg : kind === 'bgColor' ? !!designFor(b, bp).bgColor : b.type === 'shape' ? strokeColorSet(b) : true, opacity: video ? kind === 'bgColor' : !(kind === 'strokeColor' && b.type === 'shape') || strokeColorSet(b) });
    const anchor = blockPanel.querySelector(`[data-shape-act="${kind}"]`)?.getBoundingClientRect();
    if (video) blockPanel.querySelector(`[data-shape-act="${kind}"]`)?.closest('.st-color')?.classList.add('is-open'); // framed while they're open (CAP-T7COLOR.json)
    shapePop.hidden = false;
    const h = shapePop.offsetHeight;
    // 11 right of the panel, 311 left of it unless 11 stay free at the screen's edge (CAP-T6PLACE.json, CAP-L6ROWS.json). It opens with its bottom 5.5 under the swatch's, and then grows around its middle (CAP-T6RANGE.json, CAP-L6ROWS.json).
    // A video's opens level with the swatch's bottom, and Reset holds its bottom, 39 lower out of the Custom view (CAP-T7COLOR.json, CAP-T7COLOR3.json, CAP-T7COLOR6.json).
    if (shapeUi.holdBottom != null) { shapeUi.mid = shapeUi.holdBottom - h / 2; shapeUi.holdBottom = null; }
    shapeUi.mid ??= (anchor?.bottom ?? P.top + h) + (video ? 0 : 5.5) - h / 2;
    shapePop.style.cssText = `left:${P.right + 311 > innerWidth - 11 ? P.left - 311 : P.right + 11}px;top:${Math.max(60, Math.min(shapeUi.mid - h / 2, innerHeight - h - 8))}px`;
  }
  shapePop.hidden = false;
}
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-shape-act]');
  if (!a || !sel) return;
  const act = a.dataset.shapeAct;
  // Individual writes nothing until a field does; Uniform back does, and on a phone that is the phone's own (CAP-L6CORNER.json).
  if (act === 'uniform') { const shown = shownCorners(B(sel.sid, sel.bid)); cornerFour = null; if (shown) setShape((b) => writeCorner(b, null, shown[0]), 'Uniform corners'); return; }
  if (act === 'individual') { cornerFour = `${sel.bid}:${bp}`; renderBlockPanel(); return; }
  if (shapeUi?.kind === act) { closeShapePop(); return; }
  shapeUi = { kind: act, bid: sel.bid, custom: null };
  renderShapePop();
  if (act === 'anchor') shapePop.querySelector('[data-anchor="ox"]').focus();
});
blockPanel.addEventListener('click', (e) => {
  const m = e.target.closest('[data-ff-menu]');
  if (!m || !sel) return;
  if (shapeUi?.kind === 'ffmenu' && shapeUi.key === m.dataset.ffMenu) { closeShapePop(); return; }
  shapeUi = { kind: 'ffmenu', key: m.dataset.ffMenu, bid: sel.bid, custom: null, rect: m.getBoundingClientRect() };
  renderShapePop();
});
shapePop.addEventListener('click', (e) => {
  const fp = e.target.closest('[data-ff-pop]');
  if (fp) {
    const i = Number(shapeUi.key.split(':')[1]), [, n] = ffView.split(':');
    closeShapePop();
    if (fp.dataset.ffPop === 'follow') { ffReturn = ffView; showFf(`ff-fuadd:${n}:${i}`); }
    else setForm((b) => deleteOption(ffField(b), i), 'Option deleted', true);
    return;
  }
  if (shapeUi?.section) {
    if (e.target.closest('[data-color-custom]')) { const hex = toHex(colorParts(secColorOf(shapeUi)).rgb); shapeUi.custom = { ...hexToHsv(hex), hex, format: 'rgb' }; renderShapePop(); return; }
    if (e.target.closest('[data-color-reset]')) { setSecColor(null); renderShapePop(); }
    return;
  }
  if (!sel || !shapeUi) return;
  if (e.target.closest('[data-image-edit]')) {
    const { sid, bid } = sel, b = B(sid, bid);
    closeShapePop();
    openImageEditor({ src: b.src, onFail: () => note('The picture could not be opened'), onSave: ({ src, aspect }) => { if (sel?.bid === bid) setShape((x) => { x.src = src; x.aspect = aspect; }, `image edit on ${bid}`); } });
    return;
  }
  const fxo = e.target.closest('[data-fx-opt]');
  if (fxo) {
    const { key } = shapeUi, v = fxo.dataset.fxOpt;
    closeShapePop();
    if (B(sel.sid, sel.bid).effect[key] !== v) setEffect((b) => { b.effect[key] = v; }, `image effect ${key} ${v}`);
    return;
  }
  const apo = e.target.closest('[data-appear-opt]');
  if (apo) {
    const v = apo.dataset.appearOpt;
    closeShapePop();
    // Site Default picked is shown as a value, and the row keeps the focus (CAP-T12FILL-A.json, -B).
    if ((B(sel.sid, sel.bid).appear || APPEAR[0]) !== v) { setShape((b) => { b.appear = v; }, `appear ${v}`); playAppear(sel.bid, v); }
    blockPanel.querySelector('[data-appear]')?.focus();
    return;
  }
  const io = e.target.closest('[data-image-opt]');
  if (io) {
    const { key } = shapeUi, v = io.dataset.imageOpt;
    closeShapePop();
    if (key === 'vblend') { setDesign('blend', v === 'Normal' ? null : blendValue(v)); blockPanel.querySelector('[data-image-sel="vblend"]')?.focus(); return; }
    setShape((b) => {
      if (key === 'blend') { if (v === 'Normal') delete b.overlayBlend; else b.overlayBlend = blendValue(v); }
      else if (v === 'Light Overlay') b.lightboxTheme = 'light'; else delete b.lightboxTheme;
    }, `${key} ${v}`);
    return;
  }
  const accOpt = e.target.closest('[data-acc-opt]');
  if (accOpt) {
    const { key } = shapeUi, v = accOpt.dataset.accOpt;
    closeShapePop();
    setAccordion((b) => { const def = { icon: 'plus', titleStyle: 'h4', descStyle: 'p2' }[key]; if (v === def) delete b[key]; else b[key] = v; }, `${key} ${v}`);
    return;
  }
  const ao = e.target.closest('[data-an-opt]');
  if (ao) { const k = shapeUi.key; closeShapePop(); animSet(k, ao.dataset.anOpt); return; }
  const ac = e.target.closest('[data-an-clip]');
  if (ac) {
    const u = shapeUi;
    closeShapePop();
    if (ac.dataset.anClip === 'copy') { const rows = animRows(); animClip = JSON.parse(JSON.stringify(u.mode === 'row' ? [rows[u.i]] : rows)); transformClip = null; renderBlockPanel(); return; }
    // Paste on the list adds the copied rows; on a row it takes that row's place.
    const clip = JSON.parse(JSON.stringify(animClip));
    animEdit('Paste animation', (l) => { if (u.mode === 'row') l.splice(u.i, 1, ...clip); else l.push(...clip); });
    return;
  }
  const mp = e.target.closest('[data-map-pick]');
  if (mp) { const v = Number(mp.dataset.mapPick); closeShapePop(); setMap((b) => { b.mapStyle = v; }, `Map style ${v}`); return; }
  const more = e.target.closest('[data-more]');
  if (more) { closeShapePop(); if (more.dataset.more === 'copy') copyTransforms(); else if (transformClip) setShape(() => pasteTransforms(sel.sid, [sel.bid]), 'Paste transforms'); return; }
  const pick = e.target.closest('[data-shape-pick]');
  if (pick) { const id = pick.dataset.shapePick; closeShapePop(); setShape((b) => { if (id === 'rectangle') delete b.shape; else b.shape = id; }, `Shape ${id}`); return; }
  const key = shapeUi.kind;
  if (e.target.closest('[data-color-custom]')) { const b = B(sel.sid, sel.bid), c = colorParts(shapeColorOf(b, key)), hex = toHex(c.rgb); shapeUi.custom = { ...hexToHsv(hex), hex, format: b.type === 'video' && designFor(b, bp)[key] === '' ? 'hex' : 'rgb' }; renderShapePop(); return; }
  if (e.target.closest('[data-color-reset]')) { if (B(sel.sid, sel.bid).type === 'video') { shapeUi.holdBottom = shapePop.getBoundingClientRect().bottom + (shapeUi.custom ? 39 : 0); shapeUi.custom = null; } setShape((b) => writeShapeColor(b, key, null), `${key} reset`); renderShapePop(); }
});
// Anchor (CAP-L6ANCHOR.json): a place writes both, a field its own; a phone keeps what it sets, a default on desktop is no value at all.
function setAnchor(values, label) {
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), bag = designBag(bp);
  designChange(b, Object.keys(values), () => {
    const d = { ...(b[bag] || {}) };
    if (bag === 'designMobile') { const { ox, oy } = designFor(b, bp); Object.assign(d, { ox, oy }); } // one axis set on a phone holds the other too
    for (const [k, v] of Object.entries(values)) { if (bag === 'design' && v === DESIGN_DEFAULTS[k]) delete d[k]; else d[k] = v; }
    if (Object.keys(d).length) b[bag] = d; else delete b[bag];
  });
  commit(before, label);
  renderBlockPanel();
}
shapePop.addEventListener('click', (e) => {
  const at = e.target.closest('[data-anchor-at]');
  if (!at) return;
  const [ox, oy] = at.dataset.anchorAt.split(',').map(Number);
  setAnchor({ ox, oy }, `Anchor ${at.textContent}`);
});
shapePop.addEventListener('change', (e) => {
  const f = e.target.closest('[data-anchor]');
  if (!f) return;
  e.stopImmediatePropagation();
  const k = f.dataset.anchor, v = parseFloat(f.value.replace(/,/g, ''));
  if (!Number.isFinite(v)) { f.value = anchorText(designFor(B(sel.sid, sel.bid), bp)[k]); return; } // words or nothing: the field goes back
  setAnchor({ [k]: v }, `Anchor ${k}`);
});
// A drag on the field's edge, 0.4 per pixel, one undo step when let go (CAP-L6ROWS.json).
shapePop.addEventListener('pointerdown', (e) => {
  const hit = e.target.closest('.sc-hit');
  if (!hit || shapeUi?.kind !== 'anchor') return;
  e.preventDefault();
  const input = hit.closest('.sc-box').querySelector('input'), k = input.dataset.anchor, x0 = e.clientX, start = parseFloat(input.value.replace(/,/g, '')), before = JSON.stringify(model), b = B(sel.sid, sel.bid), bag = designBag(bp);
  let moved = false;
  const move = (ev) => {
    const dx = ev.clientX - x0;
    if (!moved && !dx) return;
    moved = true;
    const v = Math.round((start + dx * 0.4) * 10) / 10;
    input.value = anchorText(v);
    const { ox, oy } = designFor(b, bp);
    b[bag] = { ...(b[bag] || {}), ...(bag === 'designMobile' ? { ox, oy } : {}), [k]: v };
    renderSectionDom(sel.sid);
  };
  const up = () => {
    removeEventListener('pointermove', move);
    removeEventListener('pointerup', up);
    if (!moved) return;
    if (bag === 'design' && b.design[k] === DESIGN_DEFAULTS[k]) { delete b.design[k]; if (!Object.keys(b.design).length) delete b.design; }
    commit(before, `Anchor ${k}`);
    renderBlockPanel();
    caretAtEnd(input.isConnected ? input : shapePop.querySelector(`input[data-anchor="${k}"]`));
  };
  addEventListener('pointermove', move);
  addEventListener('pointerup', up);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shapeUi?.kind === 'anchor') { e.preventDefault(); e.stopPropagation(); closeShapePop(); } }, true); // the focus may be nowhere after a press or a drag: the block stays selected
shapePop.addEventListener('keydown', (e) => { if (e.key !== 'Enter' || !e.target.matches('[data-anchor]')) return; e.target.blur(); e.target.focus(); });
shapePop.addEventListener('change', (e) => {
  if (!shapeUi || (!sel && !shapeUi.section)) return;
  const key = shapeUi.kind, t = e.target, c = colorParts(shapeUi.section ? secColorOf(shapeUi) : shapeColorOf(B(sel.sid, sel.bid), key));
  const write = (next) => { if (shapeUi.section) setSecColor(colorCss(next)); else setShape((b) => writeShapeColor(b, key, colorCss(next)), `${key} changed`); renderShapePop(); };
  if (t.matches('[data-color-pick]')) { const v = t.dataset.colorPick; write(v.startsWith('#') ? { rgb: rgbOf(v), a: key === 'overlay' ? c.a : 1 } : colorParts(v)); return; }
  if (t.matches('[data-color-alpha]')) { write({ rgb: c.rgb, a: Number(t.value) / 100 }); return; }
  if (t.matches('[data-color-format]')) { shapeUi.custom.format = t.value; renderShapePop(); return; }
  if (t.matches('[data-color-field]')) {
    const f = t.dataset.colorField, n = parseFloat(t.value);
    if (f === 'Alpha') { if (Number.isFinite(n)) write({ rgb: c.rgb, a: Math.max(0, Math.min(100, n)) / 100 }); return; }
    if (f === 'Hex') { if (/^#?[0-9a-f]{6}$/i.test(t.value)) write({ rgb: rgbOf(`#${t.value.replace('#', '')}`), a: c.a }); return; }
    if (!Number.isFinite(n)) return;
    if (['Red', 'Green', 'Blue'].includes(f)) { const rgb = [...c.rgb]; rgb[['Red', 'Green', 'Blue'].indexOf(f)] = Math.max(0, Math.min(255, Math.round(n))); write({ rgb, a: c.a }); return; }
    const hsl = hslOf(c.rgb); hsl[['Hue', 'Saturation', 'Lightness'].indexOf(f)] = n;
    write({ rgb: rgbFromHsl(hsl[0], hsl[1], hsl[2]), a: c.a });
  }
});
// The format menu's list, below it and over the popup's edge (CAP-T6CUSTOM.json). The select stays as its value.
const closeFormatList = () => { shapePop.querySelector('.sh-fmtlist')?.remove(); shapePop.querySelector('[data-color-format].is-open')?.classList.remove('is-open'); };
shapePop.addEventListener('mousedown', (e) => {
  const opt = e.target.closest('[data-fmt-opt]');
  if (opt) {
    e.preventDefault();
    const s = shapePop.querySelector('[data-color-format]');
    s.value = opt.dataset.fmtOpt;
    closeFormatList();
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const s = e.target.closest('[data-color-format]');
  const was = !!shapePop.querySelector('.sh-fmtlist');
  closeFormatList();
  if (!s) return;
  e.preventDefault();
  if (was) return;
  const r = s.getBoundingClientRect();
  s.classList.add('is-open');
  shapePop.insertAdjacentHTML('beforeend', `<div class="sh-fmtlist" role="listbox" style="left:${r.left - 3}px;top:${r.bottom + 6}px">${[...s.options].map((o) => `<button type="button" role="option" data-fmt-opt="${o.value}" aria-selected="${o.selected}"${o.selected ? ' class="is-cur"' : ''}>${o.textContent}</button>`).join('')}</div>`);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shapePop.querySelector('.sh-fmtlist')) { e.stopPropagation(); closeFormatList(); } }, true);
shapePop.addEventListener('pointerdown', (e) => {
  if (shapeUi?.section && shapeUi.custom) {
    const map = e.target.closest('.sh-map'), hue = e.target.closest('.sh-hue'), area = map || hue;
    if (!area) return;
    e.preventDefault();
    const u = shapeUi, before = JSON.stringify(model), r = area.getBoundingClientRect();
    const step = (ev) => {
      const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)), k = u.custom;
      if (map) { k.s = x; k.v = 1 - y; } else k.h = Math.max(0, Math.min(1, (ev.clientX - r.left - 11) / (r.width - 22))) * 360;
      k.hex = hsvToHex(k);
      writeSecColor(u, colorCss({ rgb: rgbOf(k.hex), a: colorParts(secColorOf(u)).a }));
      renderSectionDom(u.sid);
      renderShapePop();
    };
    const up = () => { removeEventListener('pointermove', step); removeEventListener('pointerup', up); commit(before, 'Section color changed'); if (editSid) renderSectionPanel(); };
    addEventListener('pointermove', step); addEventListener('pointerup', up); step(e);
    return;
  }
  if (!sel || !shapeUi?.custom) return;
  const map = e.target.closest('.sh-map'), hue = e.target.closest('.sh-hue'), area = map || hue;
  if (!area) return;
  e.preventDefault();
  const key = shapeUi.kind, before = JSON.stringify(model), r = area.getBoundingClientRect();
  const step = (ev) => {
    const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)), u = shapeUi.custom;
    if (map) { u.s = x; u.v = 1 - y; } else u.h = Math.max(0, Math.min(1, (ev.clientX - r.left - 11) / (r.width - 22))) * 360;
    const hex = hsvToHex(u), b = B(sel.sid, sel.bid);
    u.hex = hex;
    writeShapeColor(b, key, colorCss({ rgb: rgbOf(hex), a: colorParts(shapeColorOf(b, key)).a }));
    renderSectionDom(sel.sid);
    renderShapePop();
  };
  const up = () => { removeEventListener('pointermove', step); removeEventListener('pointerup', up); commit(before, `${key} changed`); renderBlockPanel(); };
  addEventListener('pointermove', step);
  addEventListener('pointerup', up);
  step(e);
});
for (const t of ['mousedown']) shapePop.addEventListener(t, (e) => e.stopPropagation());
shapePop.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeShapePop(); });
document.addEventListener('mousedown', (e) => { if (shapeUi && !shapePop.contains(e.target) && !e.target.closest('[data-shape-act], [data-acc-menu], [data-ff-menu], [data-sp-color], [data-image-sel], [data-appear]')) closeShapePop(); }, true);
// Button and image Content tabs: the text and the link (parity/findings/BUTTONEDIT.json). The
// text is one undo step when the field is left; each link change is one step.
function setButton(change, label) {
  if (!sel) return;
  const b = B(sel.sid, sel.bid);
  if (!b || (b.type !== 'button' && b.type !== 'image' && b.type !== 'stack')) return; // a Stack keeps its link too (CAP-E7BOX2.json)
  const before = JSON.stringify(model);
  change(b);
  renderSectionDom(sel.sid);
  commit(before, label);
}
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-content="label"]');
  if (!f) return;
  e.stopImmediatePropagation();
  const v = f.value;
  f.blur();
  setButton((b) => { b.label = v; }, 'Button text changed');
}, true);
// Code and embed (parity/findings/CODEEMBED.json, CODEMODAL.json). The canvas follows the typing; a
// text is one undo step when the field is left.
let codeBefore = null, codeIdle = 0;
// Rows follow the height of what is in the block, in whole pixels (CAP-T10ROWS.json, CAP-T10DOWN.json,
// CAP-T10PULL.json, CAP-T10EMBED.json, CAP-T10VIEW.json, CAP-T10FRESH.json). An embed's height is that of
// what is in it, margins included, and an empty one's is its 95 tall placeholder.
function codeHeight(b) {
  if (b.type === 'video') return blockEl(b.id)?.querySelector('.intrinsic')?.getBoundingClientRect().height ?? 0;
  if (b.type === 'embed' && !b.html) return 95;
  if (b.type === 'markdown') return blockEl(b.id)?.querySelector('.sqs-block-content')?.offsetHeight ?? 0; // its placeholder too (CAP-T10MD6.json)
  const c = blockEl(b.id)?.querySelector(b.type === 'code' ? '.sqs-code-container' : '.sqs-embed-container');
  if (!c) return 0;
  // Its elements' boxes, or a range for bare text: a range counts the text's own 23px runs, 1px over ten
  // paragraphs. A script's status box doesn't count (CAP-T10MD2.json).
  const status = c.querySelector(':scope > .sqs-blockStatus');
  if (b.type === 'code' && !status) return c.offsetHeight;
  const kids = [...c.children].filter((e) => e !== status).map((e) => e.getBoundingClientRect());
  const range = doc.createRange();
  range.selectNodeContents(c);
  const inner = kids.length ? Math.max(...kids.map((r) => r.bottom)) - Math.min(...kids.map((r) => r.top)) : range.getBoundingClientRect().height;
  if (b.type === 'code') return Math.round(inner);
  const margin = (e, side) => (e ? parseFloat(getComputedStyle(e)[side]) || 0 : 0);
  return Math.round(inner + margin(c.firstElementChild, 'marginTop') + margin(c.lastElementChild, 'marginBottom'));
}
// Inferred from those readings. A height takes ceil((height + gap - 1) / pitch) rows, and a fall gives
// up the same sum of the fall. A rise takes what it needs. A fall from a block that doesn't have more
// rows than it needs leaves it alone, so a block can stay well below what its content needs.
const codeRowsFor = (h, m) => Math.ceil((h + m.rg - 1) / m.pitch);
const rowsNow = (b) => codeHeight(b);
// A row's own height: content taller than its section stretches every row, and rows follow the content
// only by the height a row has with none of that (CAP-T10EMBED2.json).
function rowFloor(fe) {
  const probe = doc.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:calc(var(--container-width, 0px) * var(--row-height-scaling-factor, 0))';
  fe.append(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h || 24; // the phone's rows are 24 tall at the least (render.js)
}
function fitRows(b, was) {
  if (b.type === 'code' && !String(b.html || '').trim()) return;
  const h = codeHeight(b);
  if (h === was) return;
  const fe = feEl(sel.sid), found = measure(fe), m = { ...found, pitch: rowFloor(fe) + found.rg }, L = lay(b), rows = L.area[2] - L.area[0], need = Math.max(1, codeRowsFor(h, m));
  const next = h > was ? Math.max(rows, need) : need >= rows ? rows : Math.max(1, rows - codeRowsFor(was - h, m));
  if (next === rows) return;
  const s = S(sel.sid), lowest = () => Math.max(...s.blocks.map((o) => o.layout?.[bp]?.area?.[2] ?? 1)), wasLowest = lowest();
  fitOthers(s, b, L.area, next - rows);
  L.area = [L.area[0], L.area[1], L.area[0] + next, L.area[3]];
  // The section's rows move by how far the lowest end moved, keeping any spare (CAP-T10ROWS3.json to CAP-T10ROWS6.json).
  s.rows[bp] = Math.max(s.rows[bp] + lowest() - wasLowest, lowest() - 1);
  renderSectionDom(sel.sid);
}
// What a block's rise or fall by n does to the others, by where they stand against its old end (CAP-T10ROWS4.json to
// CAP-T10ROWS6.json). At or below that end, in any column: moved by n. Across it, sharing columns: moved by n if it starts
// lower than the block, stopping at the block's new end on a fall; else its end moves, on a rise only. Inside it: stays.
function fitOthers(s, b, area, n) {
  const [top, left, end, right] = area, newEnd = end + n;
  for (const o of s.blocks) {
    const A = o !== b && o.layout?.[bp]?.area;
    if (!A) continue;
    const shares = A[1] < right && A[3] > left;
    if (A[0] >= end || (shares && A[0] > top && A[2] >= end)) {
      const to = n > 0 ? A[0] + n : Math.max(A[0] + n, Math.min(A[0], newEnd));
      A[2] += to - A[0];
      A[0] = to;
    } else if (shares && A[2] >= end && n > 0) A[2] += n;
  }
}
// The Markdown block's toolbar and keys, in the panel and in the Code Editor view (markdown-edit.js).
const mdLines = (f) => { const box = f.closest('.bp-code'); if (box.classList.contains('is-look')) paintCode(f); else box.querySelector('.bp-code-lines').innerHTML = Array.from({ length: f.value.split('\n').length }, (_, n) => n + 1).join('<br>'); };
const headOf = (f) => (f.selectionDirection === 'backward' ? f.selectionStart : f.selectionEnd);
// The look of an editor (CAP-T10LOOK.json): colours over the clear text, a number per line however it wraps, and
// the band on the line of the selection's moving end.
function paintCode(f) {
  const box = f?.closest('.bp-code.is-look');
  if (!box) return;
  const hl = box.querySelector('.bp-code-hl'), nums = box.querySelector('.bp-code-lines'), band = box.querySelector('.bp-code-band');
  const full = fullOf(f), lang = box.dataset.lang, head = realOf(f, headOf(f));
  const colour = codeLines(full, lang, f.selectionStart === f.selectionEnd ? head : null), shown = foldRows(f, colour);
  hl.innerHTML = shown.map((r) => `<div class="bp-code-l">${r.html || '<br>'}</div>`).join('');
  // The band and the number's mark are on the caret's line: none when a fold hides that line (CAP-T10FOLD5.json).
  const headLine = lineOf(full, head), on = shown.findIndex((r) => r.line === headLine), rows = [...hl.children], can = foldRanges(full, lang);
  nums.style.flexBasis = `${gutterWidth(colour.length)}px`;
  nums.innerHTML = rows.map((r, n) => {
    const line = shown[n].line, folded = foldedLine(f, line), fold = !folded && can.get(line);
    const chev = folded ? `<span class="bp-code-chev" title="Unfold line" data-fold-open="${folded.from}">›</span>` : fold ? `<span class="bp-code-chev" title="Fold line" data-fold="${fold[0]},${fold[1]}">⌄</span>` : '';
    return `<div class="bp-code-n${n === on ? ' is-on' : ''}" style="height:${r.offsetHeight}px">${line + 1}${chev}</div>`;
  }).join('');
  band.hidden = on < 0;
  if (on >= 0) { band.style.top = `${rows[on].offsetTop}px`; band.style.height = `${rows[on].offsetHeight}px`; }
  paintCodeSelection(f, hl, box.querySelector('.bp-code-sel'));
  scrollCode(f);
}
// A selection is drawn behind the colours: 16 tall on its first and last row, and as wide as the editor but for
// the last row, which stops at its end (CAP-T10LOOK.json).
function paintCodeSelection(f, hl, layer) {
  layer.textContent = '';
  if (f.selectionStart === f.selectionEnd) return;
  const base = hl.getBoundingClientRect(), range = document.createRange();
  const at = (i) => {
    const before = f.value.slice(0, i).split('\n'), row = hl.children[before.length - 1];
    let left = before.at(-1).length;
    // A row with a placeholder is that much taller to select (CAP-T10FOLD5.json).
    const ph = row.querySelector('.bp-code-ph'), rowTop = row.getBoundingClientRect().top - base.top;
    const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let t = walk.nextNode(); t; t = walk.nextNode()) {
      if (left <= t.length) { range.setStart(t, left); range.collapse(true); const q = range.getBoundingClientRect(); return { x: q.left - base.left, top: ph ? rowTop + 2 : q.top + (q.height - 16) / 2 - base.top, h: ph ? 18 : 16 }; }
      left -= t.length;
    }
    const q = row.getBoundingClientRect(); // an empty line
    return { x: q.left - base.left, top: q.top + 3 - base.top, h: 16 };
  };
  const a = at(f.selectionStart), b = at(f.selectionEnd), L = 6, R = f.clientWidth - 2;
  const rect = (x, top, w, h) => { const e = document.createElement('div'); e.style.cssText = `left:${x}px;top:${top}px;width:${w}px;height:${h}px`; layer.append(e); };
  if (a.top === b.top) { rect(a.x, a.top, b.x - a.x, a.h); cutForFolds(hl, layer, base); return; }
  // Two rows side by side meet halfway across the gap between their letters.
  const near = b.top - a.top < 2 * 22, mid = (a.top + a.h + b.top) / 2;
  rect(a.x, a.top, R - a.x, near ? mid - a.top : a.h);
  if (!near) rect(L, a.top + a.h, R - L, b.top - a.top - a.h);
  rect(L, near ? mid : b.top, b.x - L, near ? b.top + b.h - mid : b.h);
  cutForFolds(hl, layer, base);
}
// A selection leaves a gap for a placeholder (CAP-T10FOLD5.json): to 1px before it, and on from its right edge.
function cutForFolds(hl, layer, base) {
  for (const ph of hl.querySelectorAll('.bp-code-ph')) {
    const q = ph.getBoundingClientRect(), left = q.left - base.left - 1, right = q.right - base.left, y = q.top - base.top + 9;
    for (const e of [...layer.children]) {
      const x = parseFloat(e.style.left), w = parseFloat(e.style.width), top = parseFloat(e.style.top), h = parseFloat(e.style.height);
      if (y < top || y > top + h || x >= right || x + w <= left) continue;
      if (x + w > right) { const rest = e.cloneNode(); rest.style.left = `${right}px`; rest.style.width = `${x + w - right}px`; layer.append(rest); }
      if (x < left) e.style.width = `${left - x}px`; else e.remove();
    }
  }
}
function scrollCode(f) {
  const box = f.closest('.bp-code.is-look');
  if (!box) return;
  box.querySelector('.bp-code-hl').style.transform = box.querySelector('.bp-code-sel').style.transform = `translate(${-f.scrollLeft}px, ${-f.scrollTop}px)`;
  box.querySelector('.bp-code-band').style.transform = `translateY(${-f.scrollTop}px)`;
  box.querySelector('.bp-code-lines').scrollTop = f.scrollTop;
}
function paintMdBar(f) {
  const bar = f?.closest('#block-panel, #code-modal')?.querySelector('.bp-md-bar');
  if (!bar) return;
  const st = mdState(fullOf(f), realOf(f, f.selectionStart), realOf(f, f.selectionEnd), realOf(f, headOf(f)));
  bar.querySelector('.bp-md-heading span').textContent = st.heading;
  for (const k of ['bold', 'italic']) bar.querySelector(`[data-md="${k}"]`).classList.toggle('is-dim', st.dim);
  for (const k of ['bold', 'italic', 'bullet', 'number', 'quote']) { const q = bar.querySelector(`[data-md="${k}"]`); q.classList.toggle('is-on', st[k]); q.setAttribute('aria-checked', String(st[k])); }
  // Link stays lit while its popover is open.
  const lk = bar.querySelector('[data-md="link"]');
  lk.classList.toggle('is-on', st.link || (!linkPop.hidden && !!linkTarget?.markdown));
}
// A toolbar press is one undo step, and typing before it another (CAP-T10MD7.json).
function flushMdStep() { if (codeBefore != null) { commit(codeBefore, 'Markdown changed'); codeBefore = null; } }
// Through the field's own edit, so its undo keeps working. The input event carries it to the block.
function writeMd(f, r) {
  f.focus();
  if (foldsOf(f)) { foldReplace(f, r); f.dispatchEvent(new Event('input', { bubbles: true })); paintMdBar(f); return; }
  f.setSelectionRange(0, f.value.length);
  if (r.value) document.execCommand('insertText', false, r.value); else document.execCommand('delete');
  f.setSelectionRange(r.start, r.end);
  paintMdBar(f);
}
const mdRootField = (root) => root.querySelector('textarea[data-content="markdown"]');
function pressMdBar(root, btn) {
  const f = mdRootField(root), v = fullOf(f), s = realOf(f, f.selectionStart), e = realOf(f, f.selectionEnd), k = btn.dataset.md;
  const list = root.querySelector('.bp-md-list');
  if (k === 'heading') { list.hidden = !list.hidden; btn.setAttribute('aria-expanded', String(!list.hidden)); btn.classList.toggle('is-on', !list.hidden); return; }
  if (k === 'link') { openMdLink(root, btn, s, e); return; }
  if (btn.classList.contains('is-dim')) return;
  flushMdStep();
  writeMd(f, k === 'bold' ? mdWrap(v, s, e, '**') : k === 'italic' ? mdWrap(v, s, e, '*') : mdLinesEdit(v, s, e, k));
  flushMdStep();
}
function pickMdHeading(root, level) {
  const f = mdRootField(root);
  closeMdList(root);
  flushMdStep();
  writeMd(f, mdHeading(fullOf(f), realOf(f, f.selectionStart), realOf(f, f.selectionEnd), level));
  flushMdStep();
}
function closeMdList(root) {
  const list = root.querySelector('.bp-md-list'), head = root.querySelector('.bp-md-heading');
  if (!list || list.hidden) return;
  list.hidden = true; head.classList.remove('is-on'); head.setAttribute('aria-expanded', 'false');
}
// Link (CAP-T10MD4.json, CAP-T10MD5.json, CAP-T10MD7.json): the popover under the button, 6px below it. A caret in a
// link shows that link with Edit, Copy and Remove Link. A page fills the field, and Enter or a press away writes it.
function openMdLink(root, btn, s, e) {
  // A link with no url, a bracket with no definition, lights Link but opens the form (CAP-T10SCORE2.json, CAP-T10FIX5.json).
  const urlIn = (t) => { const at = mdLinkIn(t, s, e); return at?.href == null ? null : at; };
  const f = mdRootField(root), link = urlIn(fullOf(f)), b = B(sel.sid, sel.bid), r = btn.getBoundingClientRect();
  flushMdStep();
  const target = { markdown: true, summary: !!link, href: link?.href || '', newTab: false, setNewTab() {},
    apply: (v) => {
      const q = mdRootField(root), at = urlIn(fullOf(q));
      if (!v && !at) return;
      flushMdStep();
      // A caret in a reference or bare bracket with no definition, or all of it selected, gets a definition (CAP-T10FIX3.json).
      const t = fullOf(q), ref = !at && mdLinkIn(t, s, e);
      writeMd(q, at ? (v ? mdChangeLink(t, at, v) : mdRemoveLink(t, at)) : ref?.label != null && (s === e || (s === ref.start && e === ref.end)) ? mdAddDefinition(t, ref, v, s, e) : mdSetLink(t, s, e, v));
      flushMdStep();
    },
    remove: () => { const q = mdRootField(root), at = urlIn(fullOf(q)); if (at) { flushMdStep(); writeMd(q, mdRemoveLink(fullOf(q), at)); flushMdStep(); } },
    done: () => { const q = mdRootField(root); if (q) { if (document.activeElement === document.body) q.focus(); paintMdBar(q); } },
  };
  openLinkPopover(b, (st) => ({ left: r.left + r.width / 2 - 164 - st.left, top: r.bottom + 6 - st.top }), target);
  btn.classList.add('is-on');
  if (link) { linkPop.innerHTML = mdLinkSummaryHtml(link.href); linkPop.classList.add('is-summary'); }
}
// The code editor's full-screen view: its own copy of the code, which reaches the block on closing.
const codeModal = document.createElement('div');
codeModal.id = 'code-modal';
codeModal.hidden = true;
document.body.append(codeModal);
let codeDraft = null;
function openCodeModal(b) {
  if (b.type === 'markdown') flushMdStep();
  codeDraft = b.type === 'markdown' ? { html: b.text || '' } : { html: b.html, mode: b.codeMode || 'html', showSource: !!b.showSource };
  codeModal.innerHTML = b.type === 'markdown' ? mdModalHtml(codeDraft.html) : codeModalHtml(codeDraft);
  codeModal.hidden = false;
  codeModal.querySelector('textarea').focus();
  paintCode(codeModal.querySelector('textarea'));
  if (b.type === 'markdown') paintMdBar(codeModal.querySelector('textarea'));
}
function closeCodeModal() {
  const d = codeDraft, b = sel && B(sel.sid, sel.bid);
  codeModal.hidden = true;
  codeDraft = null;
  if (b?.type === 'markdown') {
    const textWas = b.text || '';
    if (d.html !== textWas) {
      const before = JSON.stringify(model), was = rowsNow(b);
      b.text = d.html;
      renderSectionDom(sel.sid);
      fitRows(b, was);
      commit(before, 'Markdown changed');
    }
    const f = blockPanel.querySelector('textarea[data-content="markdown"]');
    if (f) { if (d.html !== textWas) f.setSelectionRange(d.html.length, d.html.length); else if (fullOf(f) !== (b.text || '')) { dropFolds(f); f.value = b.text || ''; } mdLines(f); f.focus(); paintMdBar(f); } // new text from the view: the caret ends it (CAP-T10FOLD5.json)
    return;
  }
  if (!b || b.type !== 'code') return;
  if (d.html !== b.html || d.mode !== (b.codeMode || 'html') || d.showSource !== !!b.showSource) {
    const before = JSON.stringify(model), was = rowsNow(b);
    b.html = d.html;
    if (d.mode === 'html') delete b.codeMode; else b.codeMode = d.mode;
    if (d.showSource) b.showSource = true; else delete b.showSource;
    renderSectionDom(sel.sid);
    fitRows(b, was);
    commit(before, 'Code changed');
  }
  renderBlockPanel();
}
for (const t of ['pointerdown', 'mousedown']) codeModal.addEventListener(t, (e) => e.stopPropagation());
codeModal.addEventListener('click', (e) => { e.stopPropagation(); if (e.target.closest('[data-code-modal="close"]')) closeCodeModal(); });
codeModal.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); closeCodeModal(); } });
codeModal.addEventListener('input', (e) => {
  if (!e.target.matches('textarea')) return;
  codeDraft.html = fullOf(e.target);
  mdLines(e.target);
  if (e.target.dataset.content === 'markdown') paintMdBar(e.target);
});
codeModal.addEventListener('change', (e) => {
  const c = e.target.dataset.content;
  if (c === 'codeMode') { codeDraft.mode = e.target.value; if (!['html', 'markdown'].includes(e.target.value)) codeDraft.showSource = true; }
  if (c === 'showSource') codeDraft.showSource = e.target.checked;
  if (c === 'codeMode') { const folds = foldsOf(codeModal.querySelector('textarea')); codeModal.innerHTML = codeModalHtml(codeDraft); adoptFolds(codeModal.querySelector('textarea'), folds); paintCode(codeModal.querySelector('textarea')); }
});
for (const root of [blockPanel, codeModal]) {
  // The selection stays, and leaving the field doesn't redraw the panel under the press.
  root.addEventListener('mousedown', (e) => { if (e.target.closest('.bp-md-bar button, .bp-code-expand')) e.preventDefault(); });
  root.addEventListener('click', (e) => {
    const level = e.target.closest('[data-md-level]');
    if (level) { pickMdHeading(root, Number(level.dataset.mdLevel)); return; }
    const btn = e.target.closest('[data-md]');
    if (btn && sel) pressMdBar(root, btn);
  });
  root.addEventListener('keydown', (e) => {
    if (!e.target.matches('textarea[data-content="markdown"]') || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const f = e.target, v = fullOf(f), s = realOf(f, f.selectionStart), en = realOf(f, f.selectionEnd), r = e.key === 'Enter' ? mdEnter(v, s, en) : e.key === 'Backspace' ? mdBackspace(v, s, en) : null;
    if (r) { e.preventDefault(); writeMd(f, r); }
  });
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest?.('.bp-md-head')) { closeMdList(blockPanel); closeMdList(codeModal); } }, true);
document.addEventListener('selectionchange', () => { const f = document.activeElement; if (!f?.matches?.('.bp-code.is-look textarea')) return; paintCode(f); if (f.dataset.content === 'markdown') paintMdBar(f); });
// Folding (code-fold.js). A press on the column leaves the field, as a press on the page does; a press on a placeholder stays
// in it, and puts the caret at the fold's far end (CAP-T10FOLD7.json).
const lookField = (e) => e.target.matches?.('.bp-code.is-look textarea') ? e.target : null;
const foldChanged = (f) => { f.dispatchEvent(new Event('input', { bubbles: true })); paintCode(f); };
for (const root of [blockPanel, codeModal]) {
  root.addEventListener('mousedown', (e) => { if (e.target.closest('.bp-code-ph')) e.preventDefault(); });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[data-fold], [data-fold-open]');
    if (!t) return;
    const box = t.closest('.bp-code'), f = box.querySelector('textarea'), onText = t.classList.contains('bp-code-ph');
    if (t.dataset.fold) { const [from, to] = t.dataset.fold.split(',').map(Number); toggleFold(f, from, to); } else {
      openFold(f, Number(t.dataset.foldOpen), onText);
      if (onText) f.focus();
    }
    if (!onText) { box.tabIndex = -1; box.focus(); }
    paintCode(f);
    if (f.dataset.content === 'markdown') paintMdBar(f);
  });
  root.addEventListener('beforeinput', (e) => {
    const f = lookField(e);
    if (!f || !foldsOf(f)) return;
    noteSelection(f);
    const way = /^delete\w*(Forward|Backward)$/.exec(e.inputType)?.[1];
    if (way && foldDelete(f, way === 'Forward')) { e.preventDefault(); foldChanged(f); }
  });
  root.addEventListener('input', (e) => { const f = lookField(e); if (f) syncFolds(f); }, true);
  root.addEventListener('keydown', (e) => {
    const f = lookField(e);
    if (!f || !foldsOf(f)) return;
    if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopPropagation(); foldUndo(f, e.shiftKey); foldChanged(f); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.metaKey && !e.ctrlKey && !e.altKey && foldArrow(f, e.key === 'ArrowRight', e.shiftKey)) { e.preventDefault(); paintCode(f); }
  }, true);
  // Copying takes the hidden lines too.
  root.addEventListener('copy', (e) => { const f = lookField(e), text = f && foldCopy(f); if (text != null) { e.preventDefault(); e.clipboardData.setData('text/plain', text); } });
  root.addEventListener('cut', (e) => { const f = lookField(e), text = f && foldCopy(f); if (text != null) { e.preventDefault(); e.clipboardData.setData('text/plain', text); foldCut(f); foldChanged(f); } });
  // The field's own change never fires for an edit written from here.
  root.addEventListener('focusout', (e) => { const f = lookField(e); if (f && foldsOf(f) && codeBefore != null && root === blockPanel) f.dispatchEvent(new Event('change', { bubbles: true })); });
}
for (const root of [blockPanel, codeModal]) root.addEventListener('scroll', (e) => { if (e.target.matches?.('.bp-code.is-look textarea')) scrollCode(e.target); }, true);
blockPanel.addEventListener('click', (e) => { if (sel && e.target.closest('[data-code-expand]')) openCodeModal(B(sel.sid, sel.bid)); });
blockPanel.addEventListener('input', (e) => {
  const f = e.target.closest('textarea[data-content="code"], textarea[data-content="embedHtml"], textarea[data-content="markdown"]');
  if (!f || !sel) return;
  const b = B(sel.sid, sel.bid);
  codeBefore ??= JSON.stringify(model);
  const was = rowsNow(b);
  if (f.dataset.content === 'code') b.html = fullOf(f);
  else if (f.dataset.content === 'markdown') b.text = fullOf(f);
  else if (f.value) { b.html = f.value; delete b.embedInvalid; } else delete b.html;
  renderSectionDom(sel.sid);
  fitRows(b, was);
  // A pause in the typing ends a step of the page's undo (CAP-T10STEPS.json, CAP-T10STEPS2.json; 400 ms lies inside what those show).
  clearTimeout(codeIdle);
  if (f.dataset.content !== 'embedHtml') codeIdle = setTimeout(() => { if (codeBefore == null) return; codeCommit = true; commit(codeBefore, f.dataset.content === 'code' ? 'Code changed' : 'Markdown changed'); codeCommit = false; codeBefore = null; }, 400);
  mdLines(f);
  if (f.dataset.content === 'markdown') paintMdBar(f);
  placeBlockPanel();
});
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('[data-content="code"], [data-content="embedHtml"], [data-content="markdown"]');
  if (f) { codeCommit = true; if (codeBefore != null) commit(codeBefore, f.dataset.content === 'code' ? 'Code changed' : f.dataset.content === 'markdown' ? 'Markdown changed' : 'Embed data changed'); codeCommit = false; codeBefore = null; return; }
  const c = e.target.closest('[data-content="codeMode"], [data-content="showSource"], [data-content="embedUrl"], [data-content="description"]');
  if (!c || !sel) return;
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), was = rowsNow(b);
  if (c.dataset.content === 'codeMode') {
    // CSS, JavaScript and Plain Text turn Display Source Code on, and it stays on (CODEEMBED.json).
    if (c.value === 'html') delete b.codeMode; else b.codeMode = c.value;
    if (!['html', 'markdown'].includes(c.value)) b.showSource = true;
  }
  if (c.dataset.content === 'showSource') { if (c.checked) b.showSource = true; else delete b.showSource; }
  if (c.dataset.content === 'embedUrl') { c.blur(); if (c.value) { b.embedUrl = c.value; b.embedInvalid = true; } else { delete b.embedUrl; delete b.embedInvalid; } }
  if (c.dataset.content === 'description') { if (c.value) b.description = c.value; else delete b.description; }
  renderSectionDom(sel.sid);
  if (b.type === 'code') fitRows(b, was); // read in the Code Editor view, inferred for the panel's own controls
  commit(before, `${c.dataset.content} changed on ${b.id}`);
  renderBlockPanel();
  if (c.dataset.content === 'codeMode') { // the Mode list keeps the focus, so the panel doesn't redraw round it
    const box = blockPanel.querySelector('.bp-code.is-look'), open = ['html', 'markdown'].includes(c.value), src = blockPanel.querySelector('.bp-code-source');
    box.dataset.lang = c.value;
    box.classList.toggle('is-wrap', open);
    paintCode(box.querySelector('textarea'));
    src.classList.toggle('is-locked', !open);
    src.querySelector('input').checked = !!b.showSource;
    src.querySelector('input').disabled = !open;
  }
});
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-embed]');
  if (!a || !sel) return;
  const b = B(sel.sid, sel.bid), v = a.dataset.embed;
  if (v === 'data' || v === 'back') { embedData = v === 'data'; renderBlockPanel(); return; }
  const before = JSON.stringify(model);
  if (v === 'code') b.embedAs = 'code'; else delete b.embedAs;
  commit(before, `Embed as ${v}`);
  renderBlockPanel();
});

// Accordion (parity/findings/ACCORDION.json). Each change is one undo step, and the block takes the
// rows its list needs, in both directions.
function showAccordionItem(b) {
  const lis = blockEl(b.id)?.querySelectorAll('.accordion-item');
  const n = accView?.startsWith('acc-item:') ? Number(accView.slice(9)) : -1;
  lis?.forEach((li, k) => { const on = k === n || (k === 0 && !!b.expandFirst); if (on) li.setAttribute('data-is-open', 'true'); else li.removeAttribute('data-is-open'); li.querySelector('button').setAttribute('aria-expanded', String(on)); });
}
// It follows its content and what's below moves with it. Growing moves every block that starts lower, in any column, even
// one that overlaps it. Shrinking moves only those at or past its old end (CAP-ACCBELOW.json to CAP-ACCBELOW4.json, CAP-ACCPHONE6.json).
function fitAccordion(b, s, need) {
  const L = lay(b), rows = L.area[2] - L.area[0], start = L.area[0], end = L.area[2], low = () => Math.max(...s.blocks.map((o) => o.layout[bp].area[2])), lowest = low();
  L.area = [start, L.area[1], start + need, L.area[3]];
  for (const o of s.blocks) { const a = o.layout[bp].area; if (o !== b && (need > rows ? a[0] > start : a[0] >= end)) o.layout[bp].area = [a[0] + need - rows, a[1], a[2] + need - rows, a[3]]; }
  if (need < rows) s.rows[bp] -= lowest - low(); else growRows(s);
  renderSectionDom(sel.sid); showAccordionItem(b);
}
// Escape from an item view whose edit made it grow gives the open item's rows back, to the nearest row, so the rows can
// stretch. Back doesn't, and neither does Escape with no edit (CAP-ACCPHONE7.json to CAP-ACCPHONE10.json). Read at one length of description.
// It joins the edit's undo step: one undo takes back the edit and the close together (CAP-T12READS-H.json).
function accordionEscape() {
  if (!accGrew || !sel || !accView?.startsWith('acc-item:')) return;
  const b = B(sel.sid, sel.bid), before = JSON.stringify(model), m = measure(feEl(sel.sid));
  accView = null; accGrew = false;
  showAccordionItem(b);
  const need = Math.max(1, Math.round((blockEl(b.id).querySelector('.accordion-items-container').offsetHeight + m.rg) / m.pitch));
  fitAccordion(b, S(sel.sid), need);
  if (JSON.stringify(model) !== before) { followPhoneRows(before); note('Item closed'); updateUi(); }
}
function setAccordion(change, label, before = JSON.stringify(model)) {
  const b = B(sel.sid, sel.bid), s = S(sel.sid), was = contentRows(b, measure(feEl(sel.sid)));
  change(b);
  renderSectionDom(sel.sid);
  showAccordionItem(b);
  const L = lay(b), rows = L.area[2] - L.area[0], need = contentRows(b, measure(feEl(sel.sid)));
  // Content that shrinks doesn't grow a block that was already short of it: a new one's 5 phone rows stay at 2 items (CAP-ACCPHONE.json to CAP-ACCPHONE6.json).
  if (rows !== need && !(need < was && need > rows)) {
    if (need > rows && accView?.startsWith('acc-item:')) accGrew = true;
    fitAccordion(b, s, need);
  }
  commit(before, label);
  renderBlockPanel();
}
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-acc]');
  const s = e.target.closest('button[data-acc-set]');
  const st = e.target.closest('button[data-acc-step]');
  // A step stays within the limits; at a limit the button stays on and the value stays (CAP-T12READS-D.json).
  if (st && sel) { const k = st.dataset.accStep; setAccordion((b) => { b[k] = Math.max(Number(st.dataset.min), Math.min(Number(st.dataset.max), accCustomFrom(b, k) + Number(st.dataset.v))); }, `${k} ${st.dataset.v > 0 ? 'up' : 'down'}`); return; }
  if ((!a && !s) || !sel) return;
  if (s) {
    const k = s.dataset.accSet, v = s.dataset.v;
    setAccordion((b) => {
      if (k === 'iconLeft') { if (v === 'left') b.iconLeft = true; else delete b.iconLeft; }
      else if (v === 'custom') b[k] = accCustomFrom(b, k);
      else if (v === 'left') delete b[k];
      else b[k] = v;
    }, `${k} ${v}`);
    return;
  }
  const [act, arg] = a.dataset.acc.split(':'), n = Number(arg);
  if (act === 'open') { accView = `acc-item:${n}`; accGrew = false; renderBlockPanel(); return; }
  if (act === 'back') { accView = null; accGrew = false; renderBlockPanel(); return; }
  if (act === 'dividers') { accView = 'acc-dividers'; renderBlockPanel(); return; }
  if (act === 'title' || act === 'desc') { accView = `acc-${act}`; renderBlockPanel(); return; }
  if (act === 'design') { accView = null; renderBlockPanel(); return; }
  accView = null;
  if (act === 'add') setAccordion((b) => { b.items.push({ title: 'New Item', description: ACCORDION_DESCRIPTION }); }, 'Item added');
  if (act === 'del') setAccordion((b) => { b.items.splice(n, 1); }, 'Item deleted');
  if (act === 'dup') setAccordion((b) => { b.items.splice(n + 1, 0, { ...b.items[n] }); }, 'Item duplicated');
});
blockPanel.addEventListener('change', (e) => {
  const t = e.target.closest('[data-content="accTitle"], [data-content="accDescription"]');
  if (t && sel) { const n = Number(t.dataset.n), key = t.dataset.content === 'accTitle' ? 'title' : 'description', v = t.value; t.blur(); setAccordion((b) => { b.items[n][key] = v; }, `Item ${key} changed`); return; }
  const c = e.target.closest('input[data-acc-set]');
  if (!c || !sel) return;
  const k = c.dataset.accSet, keepOn = ['dividers', 'showFirst', 'showLast'].includes(k), on = c.checked;
  setAccordion((b) => { if (keepOn) { if (on) delete b[k]; else b[k] = false; } else if (on) b[k] = true; else delete b[k]; }, `${k} ${on ? 'on' : 'off'}`);
});

// A more button takes the value the choice stood for (parity/findings/ACCORDIONSTYLES.json), then
// its range writes the block and the row count follows; one undo step when the range is let go.
function accCustomFrom(b, k) {
  const pad = (v, t) => (Array.isArray(v) ? v : t(ACCORDION_PAD[v || 'M']));
  if (k === 'iconSize') return typeof b.iconSize === 'number' ? b.iconSize : ACCORDION_ICON[b.iconSize || 'S'];
  // From S (300px) the more range starts at its floor, 25 (CAP-T12READS-H.json).
  if (k === 'descWidth') return typeof b.descWidth === 'number' ? b.descWidth : b.descWidth === 'S' ? 25 : ACCORDION_WIDTH[b.descWidth || 'M'];
  if (k === 'dividerSize') return typeof b.dividerSize === 'number' ? b.dividerSize : ACCORDION_LINE[b.dividerSize || 'S'];
  if (k === 'iconThickness') return typeof b.iconThickness === 'number' ? b.iconThickness : ACCORDION_LINE[b.iconThickness || 'S'];
  if (k === 'descPad') return pad(b.descPad, (n) => [0, 0, n, 0]);
  return pad(b.rowPadding, (n) => [n, 0, n, 0]);
}
function writeAccValue(b, key, v) {
  const [k, i] = key.split(':');
  if (i == null) b[k] = v; else { b[k] = [...b[k]]; b[k][Number(i)] = v; }
}
let accRangeBefore = null;
blockPanel.addEventListener('input', (e) => {
  const r = e.target.closest('[data-acc-range]');
  if (!r || !sel) return;
  e.stopImmediatePropagation();
  accRangeBefore ??= JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  writeAccValue(b, r.dataset.accRange, Number(r.value));
  renderSectionDom(sel.sid);
  showAccordionItem(b);
  const f = blockPanel.querySelector(`[data-acc-field="${r.dataset.accRange}"]`);
  if (f) f.value = `${r.value}${r.dataset.unit}`;
}, true);
blockPanel.addEventListener('change', (e) => {
  const r = e.target.closest('[data-acc-range]'), f = e.target.closest('[data-acc-field]');
  if ((!r && !f) || !sel) return;
  e.stopImmediatePropagation();
  const before = accRangeBefore ?? JSON.stringify(model);
  accRangeBefore = null;
  const key = (r || f).dataset.accRange || f.dataset.accField;
  const v = r ? Number(r.value) : Math.max(Number(f.dataset.min), Math.min(Number(f.dataset.max), parseFloat(f.value) || 0));
  setAccordion((b) => writeAccValue(b, key, v), `${key} ${v}`, before);
}, true);
// The reorder grip (CAP-ACCORDION2.json): a drag moves the item, the canvas follows, one undo step.
blockPanel.addEventListener('pointerdown', (e) => {
  const g = e.target.closest('.bp-acc-grip');
  if (!g || !sel || e.button) return;
  e.preventDefault();
  // A social row's grip moves a row of the site-wide list: same drag, not read on the oracle (T11.json).
  const social = g.classList.contains('bp-soc-grip'), ffRow = g.classList.contains('bp-ff-grip'), ffOpt = g.classList.contains('bp-ffo-grip'), kind = social ? '.bp-soc-row' : ffRow ? '.bp-ff-row' : ffOpt ? '.bp-ffo-row' : '.bp-acc-row';
  const row = g.closest(kind), rows = [...blockPanel.querySelectorAll(kind)], from = rows.indexOf(row), h = row.offsetHeight, y0 = e.clientY;
  let to = from;
  // Held (CAP-T12READS-H.json): the row waits in its new place at 0.4, the rows between make room, and a plain copy
  // follows the pointer; the canvas moves on release.
  const ghost = row.cloneNode(true), list = row.parentElement;
  ghost.classList.add('bp-row-ghost');
  if (getComputedStyle(list).position === 'static') list.style.position = 'relative';
  Object.assign(ghost.style, { top: `${row.offsetTop}px`, left: `${row.offsetLeft}px`, width: `${row.offsetWidth}px` });
  list.append(ghost);
  row.classList.add('is-moving');
  g.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const dy = ev.clientY - y0;
    to = Math.max(0, Math.min(rows.length - 1, from + Math.round(dy / h)));
    ghost.style.transform = `translateY(${dy}px)`;
    rows.forEach((r, n) => { r.style.transform = n === from ? `translateY(${(to - from) * h}px)` : n > from && n <= to ? `translateY(${-h}px)` : n < from && n >= to ? `translateY(${h}px)` : ''; });
  };
  const up = () => {
    ghost.remove();
    g.removeEventListener('pointermove', move); g.removeEventListener('pointerup', up); g.removeEventListener('pointercancel', up);
    if (to === from) { renderBlockPanel(); return; }
    if (social) changeSocialList((l) => { const [it] = l.splice(from, 1); l.splice(to, 0, it); }, `Social link moved to ${to + 1}`);
    else if (ffRow || ffOpt) setForm((b) => { if (ffOpt) { moveOption(ffField(b), from, to); return; } const [it] = b.fields.splice(from, 1); b.fields.splice(to, 0, it); }, `Field moved to ${to + 1}`);
    else setAccordion((b) => { const [it] = b.items.splice(from, 1); b.items.splice(to, 0, it); }, `Item moved to ${to + 1}`);
  };
  g.addEventListener('pointermove', move); g.addEventListener('pointerup', up); g.addEventListener('pointercancel', up);
});
// Icon, Title style and Description style (ACCORDIONSTYLES.json): the chosen row lies over the button.
blockPanel.addEventListener('click', (e) => {
  const m = e.target.closest('[data-acc-menu]');
  if (!m || !sel) return;
  if (shapeUi?.kind === 'accmenu' && shapeUi.key === m.dataset.accMenu) { closeShapePop(); return; }
  shapeUi = { kind: 'accmenu', key: m.dataset.accMenu, bid: sel.bid, custom: null, rect: m.getBoundingClientRect() };
  renderShapePop();
});

// Image Alternate Filename and alt text, one undo step when the field is left; empty removes it.
blockPanel.addEventListener('change', (e) => {
  const f = e.target.closest('input[data-content="alt"], input[data-content="filename"]');
  if (!f) return;
  e.stopImmediatePropagation();
  const key = f.dataset.content, v = f.value;
  f.blur();
  setButton((b) => { if (v) b[key] = v; else delete b[key]; }, key === 'alt' ? 'Image alt text changed' : 'Alternate Filename changed');
  renderBlockPanel();
}, true);
// A video's settings (VIDEOPLAYER.json): one undo step each. The file stays in this tab only: the
// browser's storage holds a few MB, so after a reload the block keeps its name but not its picture.
function setVideo(change, label, fit = false) {
  const b = sel && B(sel.sid, sel.bid);
  if (!b || b.type !== 'video') return;
  const before = JSON.stringify(model), was = codeHeight(b);
  b.video = { ...(b.video || {}) };
  change(b.video);
  if (!Object.keys(b.video).length) delete b.video;
  renderSectionDom(sel.sid);
  if (fit) fitRows(b, was); // an Aspect ratio takes whole rows by a Code block's rule (CAP-T7ORDER.json)
  commit(before, label);
  renderBlockPanel();
}
blockPanel.addEventListener('click', (e) => {
  if (!sel) return;
  const t = e.target.closest('[data-video-toggle]');
  if (t) { const k = t.dataset.videoToggle; setVideo((v) => { if (v[k] === false) delete v[k]; else v[k] = false; }, `Video ${k}`); return; }
  const a = e.target.closest('[data-video-act]');
  if (!a) return;
  if (a.dataset.videoAct === 'add') blockPanel.querySelector('[data-video-file]').click();
  else if (a.dataset.videoAct === 'thumb') blockPanel.querySelector('[data-video-thumb-file]').click();
  else setVideo((v) => { for (const k of ['src', 'name', 'length', 'natural', 'aspect', 'autoPlay', 'loop', 'muted', 'controls']) delete v[k]; }, 'Video removed');
});
blockPanel.addEventListener('change', async (e) => {
  if (!sel) return;
  const s = e.target.closest('[data-video]');
  if (s) {
    e.stopImmediatePropagation();
    const k = s.dataset.video;
    setVideo((v) => { if (k === 'thumb') { if (s.checked) v.thumb = true; else { delete v.thumb; delete v.thumbSrc; } } else v[k] = s.value; }, `Video ${k}`, k === 'aspect');
    return;
  }
  const tf = e.target.closest('input[data-video-thumb-file]');
  if (tf) {
    e.stopImmediatePropagation();
    const pic = tf.files[0] && await readPicture(tf.files[0]).catch(() => null);
    if (pic) setVideo((v) => { v.thumbSrc = pic.src; }, 'Video thumbnail');
    return;
  }
  const f = e.target.closest('input[data-video-file]');
  if (!f) return;
  e.stopImmediatePropagation();
  const file = f.files[0];
  if (!file) return;
  if (!file.type.startsWith('video/')) { note('That file is not a video'); updateUi(); return; }
  const src = URL.createObjectURL(file);
  const probe = document.createElement('video');
  probe.src = src;
  const meta = await new Promise((res) => { probe.onloadedmetadata = () => res(true); probe.onerror = () => res(false); });
  if (!meta) { URL.revokeObjectURL(src); note('That video cannot be played here'); updateUi(); return; }
  const secs = Math.round(Number.isFinite(probe.duration) ? probe.duration : 0);
  setVideo((v) => { v.src = src; v.name = file.name; v.length = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`; v.natural = probe.videoWidth / probe.videoHeight || undefined; if (!v.natural) delete v.natural; }, 'Video added');
}, true);
// Image Replace and Remove: one undo step each.
blockPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-image-act]');
  if (!a || !sel) return;
  if (a.dataset.imageAct === 'replace') { blockPanel.querySelector('[data-image-file]').click(); return; }
  if (a.dataset.imageAct === 'edit') {
    if (shapeUi?.kind === 'editmenu') { closeShapePop(); return; }
    shapeUi = { kind: 'editmenu', key: 'edit', bid: sel.bid, custom: null, rect: a.getBoundingClientRect() };
    renderShapePop();
    return;
  }
  setButton((b) => { delete b.src; delete b.aspect; b.empty = true; }, 'Image removed');
  renderBlockPanel();
});
blockPanel.addEventListener('change', async (e) => {
  const f = e.target.closest('input[data-image-file]');
  if (!f || !sel) return;
  e.stopImmediatePropagation();
  const file = f.files[0];
  if (!file) return;
  const pic = await readPicture(file).catch(() => null);
  if (!pic) { note('That file is not a picture'); updateUi(); return; }
  setButton((b) => { b.src = pic.src; b.aspect = pic.aspect; b.filename = file.name; delete b.empty; }, 'Image replaced');
  renderBlockPanel();
}, true);
// The editor saves to the browser, which holds only a few MB: a picture is kept at most 1600px wide or tall.
async function readPicture(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return { src: c.toDataURL('image/webp', 0.85), aspect: bmp.width / bmp.height };
}
// Keys typed in a panel field stay in the field: a Backspace there must not remove the block.
// Cmd+Z in a transform field with nothing typed in it is the page's: the last step goes and the focus stays (CAP-T15CHEAP.json).
// Not read: with typing not yet taken, so the field keeps it.
// Cmd+Z in an Animation field is the page's undo even with typing not yet taken: the typing goes, the last change is undone,
// and the field keeps the focus (CAP-T15FIELDS3.json, read twice). Design's fields: only with nothing typed (not read).
const pageUndoIn = (e) => (e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && (e.target.matches('input[data-afield]') || (e.target.matches('input[type="text"][data-design]') && e.target.value === e.target.defaultValue));
blockPanel.addEventListener('keydown', (e) => {
  if (pageUndoIn(e) && e.target.matches('input[data-afield]')) e.target.value = e.target.defaultValue;
  if (e.key !== 'Escape' && e.target.matches('input, textarea, select, [contenteditable]') && !pageUndoIn(e)) e.stopPropagation();
});
blockPanel.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input[data-content]')) e.target.dispatchEvent(new Event('change', { bubbles: true })); });

const linkPop = $('link-popover');
// A run of typing in an Email or Phone field on a button is one undo step, up to CC, BCC or the
// close (parity/findings/LINKMENU.json).
let linkStep = null;
function flushLinkStep() {
  if (linkStep === null) return;
  const was = linkStep;
  linkStep = null;
  commit(was, 'Link set');
}
// A form's Message box and its bar (form-message.js). Link opens under its button, 6 below (FORMFIELDS.json).
const formMessage = messageBox({ panel: blockPanel, bar: $('msg-bar'), stage, linkPop, openLink: (btn, target) => openLinkPopover(B(sel.sid, sel.bid), (st) => { const r = btn.getBoundingClientRect(); return { left: r.left + r.width / 2 - 164 - st.left, top: r.bottom + 6 - st.top }; }, target) });
function closeLinkPopover() {
  if (linkPop.hidden) return;
  linkPop.hidden = true;
  markLinkBar();
  // The box, an Email and a Phone reach a text link only now (parity/findings/CAP-LINK.json, LINKBOX.json, LINKMENU.json).
  const t = linkTarget;
  linkTarget = null;
  flushLinkStep();
  if (t?.markdown) t.done();
  if (t?.summary) return;
  if (!t) {
    // What is typed counts without Enter too (LINKMENU.json).
    const v = linkPop.dataset.kind === 'url' ? linkValue(linkPop.querySelector('.lk-input').value) : '';
    const was = sel?.bid === linkPop.dataset.bid ? B(sel.sid, sel.bid) : null;
    if (v && was && v !== was.href) setLinkOnButton(v, linkPop.querySelector('.lk-box').checked);
    // Clear takes the link at the close, by Escape or a press away, and the box is on when it opens again (CAP-E7REOPEN2.json, CAP-E7REOPEN3.json).
    else if (!v && linkPop.dataset.cleared) {
      const x = B(linkSid, linkPop.dataset.bid);
      if (x?.href) { const before = JSON.stringify(model); delete x.href; x.newTab = true; renderSectionDom(linkSid); commit(before, 'Link removed'); }
    }
    return;
  }
  if (linkPop.dataset.kind !== 'url') t.apply(linkFormHref());
  else {
    const v = linkValue(linkPop.querySelector('.lk-input').value);
    if (v ? v !== t.href : t.switched) t.apply(v);
    t.setNewTab(linkPop.querySelector('.lk-box').checked);
  }
  t.after?.();
}
const SITE_PAGES = ['Services', 'About', 'Contact', 'Home'];
function siteLinkGroups() {
  // The oracle lists each page as name and path, e.g. Services/services. Our header stores no
  // path for most pages, so the path comes from the name when none is stored.
  const path = (n) => (n.href && n.href !== '#' ? n.href : `/${n.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
  const nav = (model.header?.nav || []).map((n) => ({ label: n.label, href: path(n) }));
  // Pages that exist but are not in the navigation; the oracle lists them last, Home among them.
  const hidden = SITE_PAGES.map((label) => ({ label, href: path({ label }) })).filter((p) => !nav.some((n) => n.href === p.href));
  return [{ name: 'Main Navigation', pages: nav }, { name: 'Hidden Navigation', pages: hidden }];
}
function onLinkAction(act, el) {
  const b = B(sel.sid, sel.bid);
  // A form's redirect (FORMFIELDS.json, postSubmit), and Newsletter's: the same link menu, read as far as its list.
  if (b.type === 'form' || b.standin === 'newsletter') {
    const href = postOf(b).href;
    if (act === 'copy') { navigator.clipboard?.writeText(href).catch(() => {}); note('Link copied'); updateUi(); return; }
    if (act === 'remove') { closeLinkPopover(); setPost('href', '', 'Link removed'); return; }
    const panelBox = blockPanel.getBoundingClientRect(), box = el.getBoundingClientRect();
    openLinkPopover(b, (st, height) => linkPopoverPosition(panelBox, box, st, height), { href, newTab: !!postOf(b).newTab, apply: (v) => setPost('href', v, v ? 'Link set' : 'Link removed'), setNewTab: (on) => { if (on !== !!postOf(B(sel.sid, sel.bid)).newTab) setPost('newTab', on, 'Link new tab'); } });
    return;
  }
  // In the toolbar's box, Copy reads Link Copied for a while and the focus stays on the row; Remove Link turns the box
  // into the empty editor, its field focused and the pages listed (CAP-E7BOX.json, CAP-E7BOX2.json: Link Copied at 0.8 s,
  // Copy again by 3 s; 2 s is inferred between them).
  if (act === 'copy') {
    navigator.clipboard?.writeText(b.href || '').catch(() => {}); note('Link copied');
    if (el?.dataset.linkBox === 'copy') { el.textContent = 'Link Copied'; setTimeout(() => { if (el.isConnected) el.textContent = 'Copy'; }, 2000); return; }
    updateUi(); return;
  }
  if (act === 'remove' && el?.dataset.linkBox === 'remove') {
    setButton((x) => { delete x.href; delete x.newTab; }, 'Link removed');
    linkPop.hidden = false; linkPop.classList.remove('is-box', 'tip-held');
    drawLinkPop('url', '', false); showLinkList(true); linkPop.querySelector('.lk-input')?.focus(); markLinkBar();
    return;
  }
  if (act === 'remove') { closeLinkPopover(); setButton((x) => { delete x.href; delete x.newTab; }, 'Link removed'); return; }
  // open or edit: the panel is redrawn while the editor is open, so the place is read once.
  const panelBox = blockPanel.getBoundingClientRect(), box = el.getBoundingClientRect();
  openLinkPopover(b, (st, height) => linkPopoverPosition(panelBox, box, st, height));
}
// What Enter or a page applies to: the selected button (default) or a saved text range.
let linkTarget = null;
let linkPlace = null;
let linkFromBar = false;
let linkSid = null;
let linkBarClosed = false;
function placeLinkPop() {
  const p = linkPlace(stage.getBoundingClientRect(), linkPop.offsetHeight);
  linkPop.style.left = `${p.left}px`; linkPop.style.top = `${p.top}px`;
}
// The field holds the focus on URL, the pill on Email and Phone (LINKMENU.json).
function drawLinkPop(kind, href, newTab) {
  delete linkPop.dataset.cleared;
  linkPop.dataset.kind = kind;
  linkPop.innerHTML = linkPopoverHtml(href, siteLinkGroups(), newTab, kind);
  placeLinkPop();
  if (kind === 'url') { showLinkList(true); linkPop.querySelector('.lk-input').focus(); }
  else linkPop.querySelector('.lk-pill').focus();
}
// The box: a page opens with Edit in focus and its tip showing until the mouse moves, anything else with the row in focus
// and, on a typed link cut short, a tip only under the mouse (CAP-E7REOPEN2.json to CAP-E7REOPEN4.json).
function drawLinkBox(b) {
  delete linkPop.dataset.cleared;
  linkPop.dataset.kind = 'box';
  linkPop.classList.add('is-box');
  linkPop.innerHTML = linkBoxHtml(b.href, siteLinkGroups(), location.origin);
  placeLinkPop();
  const name = linkPop.querySelector('.lk-box-name');
  if (!linkPop.querySelector('.lk-tip[data-page]') && name.scrollWidth <= name.clientWidth) linkPop.querySelector('.lk-tip')?.remove();
  if (linkPop.querySelector('.lk-tip[data-page]')) {
    linkPop.querySelector('[data-link-box="edit"]').focus();
    linkPop.classList.add('tip-held');
    document.addEventListener('pointermove', () => linkPop.classList.remove('tip-held'), { once: true });
  } else linkPop.querySelector('.lk-box-row').focus();
}
// Closing by a key hands the focus back to the toolbar's button, the block still selected (CAP-E7REOPEN2.json).
// The toolbar's button stays lit while its editor is open, with no tip (CAP-E7REOPEN2.json).
function markLinkBar() { toolbar.querySelector('[data-tb="link"]')?.classList.toggle('tb-open', !linkPop.hidden && linkFromBar); }
function closeLinkToBar() {
  const back = linkFromBar;
  closeLinkPopover();
  if (back) document.querySelector('#block-toolbar [data-tb="link"]')?.focus();
}
function openLinkPopover(b, place, target = null, fromBar = false) {
  closeLinkPopover();
  linkTarget = target;
  linkPlace = place;
  linkFromBar = fromBar;
  linkSid = sel?.sid;
  linkPop.classList.toggle('is-md', !!target?.markdown || !!target?.atClose);
  linkPop.classList.remove('is-summary', 'is-box', 'tip-held');
  linkPop.dataset.bid = b.id;
  linkPop.hidden = false;
  if (fromBar) { markLinkBar(); setTbTip(null); }
  if (fromBar && (b.type === 'button' || b.type === 'stack') && b.href) { drawLinkBox(b); return; } // a linked Stack opens the same box (CAP-E7BOX2.json)
  const href = target ? target.href : b.href;
  drawLinkPop(linkKind(href), href, target ? target.newTab : !!b.newTab);
}
// The list follows the field: the pages whose name or path holds what is typed. One read, for
// /about; that a name matches too is inferred from the field's "search".
function showLinkList(on) {
  if (!linkPop.querySelector('.lk-input')) return;
  const v = linkPop.querySelector('.lk-input').value.trim().toLowerCase();
  for (const pg of linkPop.querySelectorAll('.lk-page')) pg.hidden = !!v && !pg.getAttribute('aria-label').toLowerCase().includes(v);
  for (const set of linkPop.querySelectorAll('.lk-set')) set.hidden = !set.querySelector('.lk-page:not([hidden])');
  linkPop.querySelector('.lk-pages').hidden = !on || !linkPop.querySelector('.lk-set:not([hidden])');
}
// Enter or a page sets the link; the editor stays open, field focused, list gone (LINKBOX.json).
function setLinkOnButton(v, newTab) {
  setButton((b) => { if (v) { b.href = v; if (newTab) b.newTab = true; } else { delete b.href; delete b.newTab; } }, v ? 'Link set' : 'Link removed');
}
function applyLink(href) {
  const v = linkValue(href);
  const input = linkPop.querySelector('.lk-input');
  input.value = v;
  showLinkList(false);
  if (linkTarget?.markdown || linkTarget?.atClose) { input.focus(); return; } // written on Enter or a press away (CAP-T10MD5.json); a form's message on a press away
  if (linkTarget) { linkTarget.apply(v); linkTarget.href = v; }
  else setLinkOnButton(v, linkPop.querySelector('.lk-box').checked);
  input.focus();
}
// The form's link, as the oracle writes it on every key (LINKMENU.json).
function linkFormHref() {
  const v = (f) => linkPop.querySelector(`[data-f="${f}"]`).value;
  if (linkPop.dataset.kind === 'email') return mailHref({ to: v('to'), cc: v('cc'), bcc: v('bcc'), subject: v('subject'), body: v('body') });
  return phoneHref(v('phone'), linkPop.querySelector('.lk-radio[aria-checked="true"]').dataset.mode);
}
// On a button the link follows the form; on text it waits for the close.
function liveLink(change) {
  if (linkTarget || !sel) return;
  const b = B(sel.sid, sel.bid);
  if (!b) return;
  if (linkStep === null) linkStep = JSON.stringify(model);
  change(b);
  renderSectionDom(sel.sid);
  renderBlockPanel();
}
function writeLinkForm() {
  const v = linkFormHref();
  liveLink((b) => { if (v) b.href = v; else delete b.href; delete b.newTab; });
}
// Another kind starts empty. Back on URL the box is on, and a link that was there leaves target
// behind it (LINKMENU.json).
function switchLinkKind(kind) {
  linkPop.querySelector('.lk-menu').hidden = true;
  if (kind === linkPop.dataset.kind) return;
  const hadLink = !linkTarget && !!B(sel.sid, sel.bid)?.href;
  drawLinkPop(kind, '', kind === 'url');
  if (linkTarget) linkTarget.switched = true;
  liveLink((b) => { delete b.href; if (kind === 'url' && hadLink) b.newTab = true; else delete b.newTab; });
}
linkPop.addEventListener('input', (e) => {
  if (e.target.matches('.lk-input')) { delete linkPop.dataset.cleared; showLinkList(true); }
  const f = e.target.closest('[data-f]');
  if (!f) return;
  if (f.dataset.f === 'phone') f.value = phoneDigits(f.value);
  else { const x = f.parentElement.querySelector('.lk-clear'); if (x) x.hidden = !f.value; }
  writeLinkForm();
});
// Tab goes round the box: Edit, Copy, Remove Link, the row (CAP-E7REOPEN2.json). Its keys stay out of the page's.
function onLinkBoxKey(e) {
  if (e.key === 'Tab') {
    const all = [...linkPop.querySelectorAll('button')], at = all.indexOf(document.activeElement);
    if (e.shiftKey ? at === 0 : at === all.length - 1) { e.preventDefault(); all[e.shiftKey ? all.length - 1 : 0].focus(); }
  }
  if (e.key !== 'Escape' && !e.metaKey && !e.ctrlKey) e.stopPropagation();
}
linkPop.addEventListener('keydown', (e) => {
  if (linkPop.classList.contains('is-box')) onLinkBoxKey(e);
  if (e.key === 'Enter' && e.target.matches('.lk-input')) {
    e.preventDefault();
    if (linkTarget?.markdown) { e.target.value = linkValue(e.target.value); closeLinkPopover(); }
    else {
      applyLink(e.target.value);
      // An address that is no page closes the editor on a button (CAP-E7REOPEN2.json); a page leaves it open (LINKBOX.json).
      const v = e.target.value;
      if (!linkTarget && v && !siteLinkGroups().some((g) => g.pages.some((p) => p.href === v))) closeLinkToBar();
    }
  }
  // Enter stays in the form on Email, closes on a number, and an empty Phone goes back to URL.
  if (e.key === 'Enter' && e.target.matches('input[data-f]')) {
    e.preventDefault();
    if (e.target.dataset.f === 'phone') { if (e.target.value) closeLinkToBar(); else switchLinkKind('url'); }
  }
  // With the list showing, Escape takes the list; the next one closes the editor (LINKMENU.json).
  if (e.key === 'Escape') {
    e.stopPropagation();
    // On a Markdown block Escape drops what is in the field, closes the panel and lets the block go (CAP-T10MD4.json).
    if (linkTarget?.markdown) { const t = linkTarget; linkTarget = null; linkPop.hidden = true; t.done(); if (codeModal.hidden) { designOpen = null; select(null); } return; }
    if (!linkPop.dataset.cleared && linkPop.querySelector('.lk-pages:not([hidden])')) showLinkList(false);
    else closeLinkToBar();
  }
});
linkPop.addEventListener('mousedown', (e) => {
  if (e.target.closest('button')) e.preventDefault();
  if (e.target.matches('.lk-input')) showLinkList(true);
});
linkPop.addEventListener('click', (e) => {
  const boxAct = e.target.closest('[data-link-box]');
  if (boxAct) {
    const act = boxAct.dataset.linkBox;
    if (act === 'edit') {
      const b = B(sel.sid, sel.bid);
      linkPop.classList.remove('is-box', 'tip-held');
      drawLinkPop(linkKind(b.href), b.href, !!b.newTab);
      showLinkList(false);
    } else onLinkAction(act, boxAct);
    return;
  }
  // A press on the box's row opens the link in a new tab (CAP-E7BOX2.json, read from the browser's tabs). Inferred for an email or a number.
  if (e.target.closest('.lk-box-row')) { const b = B(sel.sid, sel.bid); if (b?.href) window.open(b.href, '_blank', 'noopener'); return; }
  const mdAct = e.target.closest('[data-md-link]');
  if (mdAct) {
    const t = linkTarget, act = mdAct.dataset.mdLink;
    if (act === 'copy') { navigator.clipboard?.writeText(t.href).catch(() => {}); note('Link copied'); updateUi(); return; }
    if (act === 'remove') { t.remove(); closeLinkPopover(); return; }
    t.summary = false;
    linkPop.classList.remove('is-summary');
    drawLinkPop(linkKind(t.href), t.href, false);
    return;
  }
  const menu = linkPop.querySelector('.lk-menu');
  const pill = e.target.closest('.lk-pill');
  menu.hidden = pill ? !menu.hidden : true;
  linkPop.querySelector('.lk-pill').setAttribute('aria-expanded', String(!menu.hidden));
  if (pill) { if (!menu.hidden) showLinkList(false); return; }
  // Learn more opens the oracle's help article in a new tab, and the editor closes. Ours has no such page.
  if (e.target.closest('.lk-learn')) { closeLinkPopover(); return; }
  const kind = e.target.closest('.lk-kind');
  if (kind) { if (!kind.disabled) switchLinkKind(kind.dataset.kind); return; }
  const pg = e.target.closest('.lk-page');
  if (pg) { applyLink(pg.dataset.href); return; }
  const add = e.target.closest('[data-add]');
  if (add) {
    flushLinkStep();
    linkPop.querySelector(`[data-g="${add.dataset.add}"]`).hidden = false;
    const row = add.parentElement;
    add.remove();
    row.hidden = !row.childElementCount;
    linkPop.querySelector(`[data-f="${add.dataset.add}"]`).focus();
    placeLinkPop();
    return;
  }
  const radio = e.target.closest('.lk-radio');
  if (radio) { for (const r of linkPop.querySelectorAll('.lk-radio')) r.setAttribute('aria-checked', String(r === radio)); writeLinkForm(); return; }
  const clear = e.target.closest('.lk-clear');
  if (!clear) return;
  const f = clear.parentElement.querySelector('[data-f]');
  if (!f) { const i = linkPop.querySelector('.lk-input'); i.value = ''; showLinkList(true); i.focus(); if (!linkTarget) linkPop.dataset.cleared = '1'; return; }
  f.value = '';
  if (f.dataset.f !== 'phone') clear.hidden = true;
  writeLinkForm();
  f.focus();
});
linkPop.addEventListener('change', (e) => {
  if (!e.target.matches('.lk-box') || linkTarget) return;
  setButton((b) => { if (e.target.checked) b.newTab = true; else delete b.newTab; }, 'Link changed');
});
// A click anywhere else closes the editor (read for the panel's tabs).
const closeLinkOutside = (e) => {
  if (linkPop.contains(e.target)) return;
  linkBarClosed = !linkPop.hidden && linkFromBar && !!e.target.closest?.('#block-toolbar [data-tb="link"]');
  closeLinkPopover();
};
document.addEventListener('pointerdown', closeLinkOutside, true);
// The values with a range of their own (BLOCKDESIGN.json); the others are a field of DESIGN_FIELDS.
const RANGE_LIMITS = { strokePx: 50, padY: 20, padX: 20, padT: 20, padR: 20, padB: 20, padL: 20, blurPx: 100 };
let rangeDrag = null; // a range being dragged: its block moves with it, one undo step when let go
blockPanel.addEventListener('input', (e) => {
  const r = e.target.closest('input[type="range"][data-design]');
  if (!r || !sel) return;
  const b = B(sel.sid, sel.bid), bag = designBag(bp), k = r.dataset.design;
  rangeDrag ??= { before: JSON.stringify(model), fit: b.type === 'text' && FIT_KEYS.has(k) ? contentRows(b, measure(feEl(sel.sid))) : null };
  b[bag] = { ...(b[bag] || {}), [k]: Number(r.value) };
  renderSectionDom(sel.sid);
  const t = r.parentElement.querySelector('input[type="text"]');
  if (t) t.value = t.value.replace(/^[\d.]+/, r.value);
});
// The <> on a Thickness field, and the same pull with nothing to show for it at the right of Corner's and Padding's
// (CAP-T7SCRUB3.json): 0.4 a pixel, down to 0, with the block following; letting go is the same as typing it, so one undo
// step and the same rows (CAP-T7THICK3.json, CAP-T7THICK4.json).
const SCRUB_PER_PX = 0.4;
blockPanel.addEventListener('pointerdown', (e) => {
  const grip = e.target.closest('[data-scrub]');
  if (!grip || !sel) return;
  e.preventDefault();
  grip.setPointerCapture(e.pointerId); // or a pull off the panel, over a video's frame, never hears the rest
  const input = grip.parentElement.querySelector('input[data-design], input[data-stack-field]'), b = B(sel.sid, sel.bid), bag = designBag(bp), k = grip.dataset.scrub;
  const unit = input.value.endsWith('%') ? '%' : 'px', start = parseFloat(input.value) || 0, x0 = e.clientX, had = b[bag]?.[k], valueAt = (x) => Math.min(RANGE_LIMITS[k] ?? 1000, Math.max(0, start + Math.round((x - x0) * SCRUB_PER_PX)));
  const show = (v) => { b[bag] = { ...(b[bag] || {}), [k]: v }; renderSectionDom(sel.sid); input.value = `${v}${unit}`; };
  const move = (m) => show(valueAt(m.clientX));
  const up = (m) => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    const v = valueAt(m.clientX);
    b[bag] = { ...(b[bag] || {}) };
    if (had === undefined) delete b[bag][k]; else b[bag][k] = had;
    renderSectionDom(sel.sid);
    if (v === start) { input.value = `${start}${unit}`; return; }
    input.value = String(v);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
});
// The four Corner fields take the same pull from anywhere on them, and a press with no pull goes on into the field (CAP-T7CORNERS.json, CAP-T7CORNERS2.json).
blockPanel.addEventListener('pointerdown', (e) => {
  const input = e.target.closest?.('.st-corners input[data-stack-field]');
  if (!input || !sel || e.button) return;
  const b = B(sel.sid, sel.bid), bag = designBag(bp), n = Number(input.dataset.stackField[1]), had = b[bag]?.corners, x0 = e.clientX, start = parseFloat(input.value) || 0;
  const valueAt = (x) => Math.min(1000, Math.max(0, start + Math.round((x - x0) * SCRUB_PER_PX)));
  let pulled = false;
  const paint = (v) => { const now = [...designFor(b, bp).corners]; now[n] = v; b[bag] = { ...(b[bag] || {}), corners: now }; renderSectionDom(sel.sid); input.value = String(v); input.setSelectionRange(0, 0); };
  const move = (m) => { if (!pulled && Math.abs(m.clientX - x0) < 3) return; if (!pulled) { pulled = true; input.setPointerCapture(e.pointerId); } m.preventDefault(); paint(valueAt(m.clientX)); };
  const up = (m) => {
    removeEventListener('pointermove', move); removeEventListener('pointerup', up);
    if (!pulled) return;
    const v = valueAt(m.clientX), k = input.dataset.stackField;
    b[bag] = { ...(b[bag] || {}) };
    if (had === undefined) delete b[bag].corners; else b[bag].corners = had;
    renderSectionDom(sel.sid);
    if (v === start) { input.value = String(start); return; }
    input.value = String(v);
    input.dispatchEvent(new Event('change', { bubbles: true }));
    blockPanel.querySelector(`.st-corners input[data-stack-field="${k}"]`)?.focus();
  };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
});
function onDesignChange(e) {
  const input = e.target.closest('input[data-design]');
  if (!input || !sel) return;
  e.stopImmediatePropagation();
  const before = rangeDrag?.before ?? JSON.stringify(model), fit = rangeDrag?.fit ?? null;
  rangeDrag = null;
  const b = B(sel.sid, sel.bid);
  const k = input.dataset.design;
  const bag = designBag(bp);
  designChange(b, [k], () => {
    const d = { ...(b[bag] || {}) };
    // A number typed after the shown unit joins it, as on Animation's fields: 0px then 5 is 5px.
    const val = parseFloat(input.value.replace(/,/g, '').replace(/^(-?[\d.]*)(?:%|px|°|s)(?=[\d.])/, '$1'));
    if (k in RANGE_LIMITS) { if (!Number.isFinite(val)) return; d[k] = Math.max(0, Math.min(RANGE_LIMITS[k], val)); }
    // A value set on the phone stays the phone's, even at the default (PERLAYOUT.json).
    else if (bag === 'designMobile') {
      const f = DESIGN_FIELDS.find((x) => x[0] === k);
      if (input.type === 'checkbox') d[k] = input.checked;
      else if (!Number.isFinite(val)) return;
      else d[k] = f ? Math.min(f[4], Math.max(f[3], val)) : val;
    } else if (input.type === 'checkbox') { if (input.checked) d[k] = true; else delete d[k]; }
    else {
      const f = DESIGN_FIELDS.find((x) => x[0] === k) || [k, k, 'px', 0, 500];
      if (!Number.isFinite(val)) return;
      const c = Math.min(f[4], Math.max(f[3], val));
      if (c === (DESIGN_DEFAULTS[k] ?? 0)) delete d[k]; else d[k] = c;
    }
    if (Object.keys(d).length) b[bag] = d; else delete b[bag];
  }, fit);
  const typing = document.activeElement === input; // Enter keeps the focus, and with it Reset (CAP-L6RESET.json)
  commit(before, `${k} set on ${b.id}`);
  renderBlockPanel();
  if (typing) caretAtEnd(blockPanel.querySelector(`input[data-design="${k}"]`));
}
panel.addEventListener('change', onDesignChange, true);
// The ? by Video Storage: a tip over a dark overlay; Escape or a press on the overlay closes it, and the block doesn't change (CAP-T7TIP.json, CAP-T7TIP2.json). The words are ours.
function openVideoTip(btn) {
  const P = blockPanel.getBoundingClientRect(), q = btn.getBoundingClientRect();
  const over = document.createElement('div'), box = document.createElement('div');
  over.className = 'video-tip-over';
  box.className = 'video-tip-box';
  box.setAttribute('role', 'dialog');
  box.textContent = 'A video you add stays in this tab. Nothing is uploaded.';
  box.style.cssText = `left:${P.left + 10}px;top:${q.top - 64}px`;
  const close = () => { over.remove(); box.remove(); document.removeEventListener('keydown', onKey, true); btn.focus(); };
  const onKey = (e) => { if (e.key !== 'Escape') return; e.preventDefault(); e.stopImmediatePropagation(); close(); };
  over.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  document.body.append(over, box);
}
blockPanel.addEventListener('click', (e) => { const t = e.target.closest('[data-video-tip]'); if (t) { e.preventDefault(); e.stopPropagation(); openVideoTip(t); } });
blockPanel.addEventListener('change', onDesignChange, true);

// The text toolbar (E4, parity/findings/TEXTOPS.json), in the oracle's order: Text Style,
// Bold, Italic, Quote, Bullet List, Numbered List, Strike, Outdent, Indent, Text Alignment,
// Clear Formatting. Not built: Squarespace AI, Text Color, Scaled Text, Text Highlight, Link.
const TEXT_ACTIONS = [['bold', 'Bold'], ['italic', 'Italic'], ['quote', 'Quote'], ['bullet', 'Bullet List'], ['numbered', 'Numbered List'], ['strike', 'Strike'],
  ['outdent', 'Outdent'], ['indent', 'Indent'], ['align:left', 'Align left'], ['align:center', 'Align center'], ['align:right', 'Align right'], ['align:justify', 'Align justify'], ['clear', 'Clear Formatting']];
const textBar = $('text-bar');
let textMenu = null; // 'style' | 'align' | null
// The checked swatch: the color span around the selection, else the palette color equal to
// the text's computed color (the oracle checks Darkest on plain black text, TEXTCOLOR.json).
function currentColorKey() {
  const sel = win.getSelection();
  const k = fmt.currentTextColor(editing.ce, sel);
  if (k || !sel.rangeCount) return k;
  const n = sel.getRangeAt(0).startContainer;
  const el = n.nodeType === 1 ? n : n.parentElement;
  const rgb = win.getComputedStyle(el).color;
  return (fmt.TEXT_COLORS.find(([, , c]) => c === rgb) || [])[1] || null;
}
function renderTextBar() {
  if (!editing || editing.soft || editing.barGone || document.body.classList.contains('is-preview')) { textBar.hidden = true; textMenu = null; return; }
  textBar.innerHTML = textBarHtml(fmt.currentStyle(editing.ce, win.getSelection()), textMenu, textMenu === 'color' ? currentColorKey() : null, textMenu === 'color' ? customColor : null);
  paintCustomColor();
  // The color popover is centred under its button, 6px below it (TEXTCOLOR.json).
  const cp = textBar.querySelector('.tx-colors'), cb = textBar.querySelector('[data-fmt="color-menu"]');
  if (cp && cb) { cp.style.left = `${cb.offsetLeft + cb.offsetWidth / 2 - 127}px`; cp.style.top = `${cb.offsetTop + cb.offsetHeight + 6}px`; }
  const p = textBarPosition(blockEl(editing.bid).getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect());
  textBar.style.left = `${p.left}px`;
  textBar.style.top = `${p.top}px`;
  textBar.hidden = false;
}
function applyFormat(act, value) {
  const ed = editing;
  if (!ed) return;
  const sel = win.getSelection();
  const [kind, arg] = act.split(':');
  const was = ed.ce.innerHTML;
  if (kind === 'style') fmt.setStyle(doc, ed.ce, sel, value);
  if (kind === 'strike' && sel.isCollapsed) { ed.strikeNext = ed.strikeNext ? null : { on: !fmt.caretInMark(ed.ce, sel, 'strike'), at: String(fmt.caretPlace(ed.ce, sel)) }; ed.ce.focus(); return; }
  if (kind === 'bold' || kind === 'italic') { ed.strikeNext = null; fmt.toggleMark(ed.ce, sel, kind); }
  if (kind === 'strike') fmt.toggleMark(ed.ce, sel, kind);
  if (kind === 'quote' || kind === 'bullet' || kind === 'numbered') fmt.toggleWrap(doc, ed.ce, sel, kind);
  if (kind === 'indent') fmt.indent(ed.ce, sel, 1);
  if (kind === 'outdent') fmt.indent(ed.ce, sel, -1);
  if (kind === 'align') fmt.align(ed.ce, sel, arg);
  if (kind === 'clear') fmt.clearFormatting(ed.ce, sel);
  // Highlight takes the keys from the text: arrows and letters do nothing, a color does nothing, and
  // Bold still acts on the word (CAP-E4FRESH3.json).
  if (kind === 'color' && !ed.keysOff) fmt.setTextColor(ed.ce, sel, value);
  if (kind === 'highlight' && fmt.addHighlight(doc, ed.ce, sel)) { ed.ce.blur(); ed.keysOff = true; }
  if (kind === 'scaled') fmt.toggleScaled(doc, ed.ce, sel);
  if (!ed.keysOff) ed.ce.focus();
  if (ed.ce.innerHTML !== was) { ed.strikeNext = null; joinOrStep(ed); onTextInput(); }
}
// The Custom tab of Text Color (parity/findings/TEXTCOLOR.json, custom). A color map, a hue bar and a
// Hex field. Each pick is written at once and the popover stays open. null is the Palette tab.
let customColor = null;
const hsvToHex = ({ h, s, v }) => {
  const f = (n) => { const k = (n + h / 60) % 6; return Math.round(255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)))).toString(16).padStart(2, '0'); };
  return `#${f(5)}${f(3)}${f(1)}`.toUpperCase();
};
const hexToHsv = (hex) => {
  const [r, g, b] = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255);
  const v = Math.max(r, g, b), d = v - Math.min(r, g, b);
  const h = !d ? 0 : v === r ? ((g - b) / d + 6) % 6 : v === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: v ? d / v : 0, v };
};
const fullHex = (t) => (/^#[0-9a-f]{6}$/i.test(t) ? t : /^#[0-9a-f]{3}$/i.test(t) ? t.replace(/[0-9a-f]/gi, '$&$&') : null)?.toUpperCase();
// What the selection has now: its color as hex, and whether it is a custom one.
function selectionColor() {
  const s0 = win.getSelection();
  const n = s0.rangeCount ? s0.getRangeAt(0).startContainer : editing.ce;
  const [r, g, b] = win.getComputedStyle(n.nodeType === 1 ? n : n.parentElement).color.match(/\d+/g).map(Number);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
function openCustomColor() {
  const hex = selectionColor();
  customColor = { ...hexToHsv(hex), hex };
}
function paintCustomColor() {
  const c = customColor, map = textBar.querySelector('.tx-cmap');
  if (!c || !map) return;
  const thumb = map.firstChild;
  thumb.style.left = `${c.s * 254 - 8}px`;
  thumb.style.top = `${(1 - c.v) * 240 - 8}px`;
  thumb.style.background = c.hex;
  map.style.backgroundColor = `hsl(${c.h}, 100%, 50%)`;
  textBar.querySelector('.tx-chue').firstChild.style.left = `${3 + (c.h / 360) * 234}px`;
  const input = textBar.querySelector('input[aria-label="Hex"]');
  if (input !== document.activeElement) input.value = c.hex;
}
function pickCustomColor() {
  if (!editing) return;
  const was = editing.ce.innerHTML;
  fmt.setCustomColor(editing.ce, win.getSelection(), customColor.hex);
  if (editing.ce.innerHTML !== was) joinOrStep(editing);
  onTextInput();
  paintCustomColor();
}
function dragCustomColor(e, el, read) {
  const move = (ev) => {
    const r = el.getBoundingClientRect();
    read(Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height)));
    customColor.hex = hsvToHex(customColor);
    pickCustomColor();
  };
  const up = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  move(e);
}
textBar.addEventListener('pointerdown', (e) => {
  const map = e.target.closest('.tx-cmap'), hue = e.target.closest('.tx-chue');
  if (map) dragCustomColor(e, map, (x, y) => { customColor.s = x; customColor.v = 1 - y; });
  if (hue) dragCustomColor(e, hue, (x) => { customColor.h = x * 360; });
});
textBar.addEventListener('input', (e) => {
  if (e.target.matches('input[aria-label="Alpha"]')) { e.target.value = `${e.target.value.replace(/\D/g, '')}%`; return; }
  if (!e.target.matches('input[aria-label="Hex"]')) return;
  const hex = fullHex(e.target.value.trim());
  if (hex) { customColor = { ...hexToHsv(hex), hex }; pickCustomColor(); }
});
textBar.addEventListener('focusout', (e) => { if (e.target.matches('input[aria-label="Hex"]') && customColor) e.target.value = customColor.hex; });
// Buttons keep the text selection: no focus change on mousedown.
textBar.addEventListener('mousedown', (e) => { if (e.target.closest('button, .tx-swatch, .tx-cmap, .tx-chue')) e.preventDefault(); });
textBar.addEventListener('click', (e) => {
  const ctab = e.target.closest('[data-ctab]');
  if (ctab && editing) { if (ctab.dataset.ctab === 'Custom') openCustomColor(); else customColor = null; renderTextBar(); return; }
  const sw = e.target.closest('input[data-fmt="color"]');
  if (sw && editing) { textMenu = null; applyFormat('color', sw.dataset.v); renderTextBar(); return; }
  const b = e.target.closest('button[data-fmt]');
  if (!b || !editing || b.disabled) return;
  const act = b.dataset.fmt;
  if (act === 'link') { openTextLink(b); return; }
  if (act === 'color-menu') { customColor = null; if (textMenu !== 'color' && fmt.currentTextColor(editing.ce, win.getSelection()) === 'custom') openCustomColor(); }
  if (act === 'style-menu' || act === 'align-menu' || act === 'color-menu') { const m = act.replace('-menu', ''); textMenu = textMenu === m ? null : m; renderTextBar(); return; }
  textMenu = null;
  if (act === 'style') applyFormat('style', b.dataset.v); else applyFormat(act);
  renderTextBar();
});

// Text Link (E7, parity/findings/TEXTLINK.json): the popover opens centred under the Link
// button, 10px below it, for the selected text; Enter or a page wraps it in <a href>.
function openTextLink(btnEl) {
  const ed = editing;
  const s0 = win.getSelection();
  if (!ed || !s0.rangeCount) return;
  const range = s0.getRangeAt(0).cloneRange();
  const a = fmt.linkAt(ed.ce, range);
  openLinkPopover(B(ed.sid, ed.bid), (st) => { const r = btnEl.getBoundingClientRect(); return { left: Math.max(8, r.left + r.width / 2 - 160 - st.left), top: r.bottom + 10 - st.top }; }, {
    href: a ? a.getAttribute('href') : '',
    newTab: !!a && a.getAttribute('target') === '_blank',
    apply: (href) => {
      if (editing !== ed) return;
      ed.ce.focus();
      const sel2 = win.getSelection(); sel2.removeAllRanges(); sel2.addRange(range);
      textStep(ed, ed.ce.innerHTML, ed.area);
      if (fmt.setLink(doc, ed.ce, sel2, range, href)) onTextInput();
      textStep(ed, ed.ce.innerHTML, ed.area);
      renderTextBar();
    },
    setNewTab: (on) => {
      if (editing !== ed || !ed.ce.isConnected) return;
      textStep(ed, ed.ce.innerHTML, ed.area);
      if (fmt.setLinkTarget(ed.ce, range, on)) onTextInput();
      textStep(ed, ed.ce.innerHTML, ed.area);
    },
  });
}

// When an edit makes the text taller, move the block's end row instead of
// letting the row stretch.
// Undo steps inside one edit (parity/findings/TEXTUNDO.json, CAP-E4BURST.json): a change joins the one
// before it unless about a second has passed, whether typed or pressed on the toolbar.
const TYPING_PAUSE = 1000;
function joinOrStep(ed) {
  const now = performance.now(), split = ed.stepNext || (ed.lastInput && now - ed.lastInput >= TYPING_PAUSE);
  if (split) textStep(ed, ed.prevHtml, ed.prevArea);
  ed.stepNext = false;
  ed.lastInput = now;
}
function textSnap(ed, html, area) {
  const b = B(ed.sid, ed.bid), keep = [b.html, lay(b).area];
  b.html = html;
  lay(b).area = [...area];
  growRows(S(ed.sid));
  const snap = JSON.stringify(model);
  [b.html, lay(b).area] = keep;
  return snap;
}
function textStep(ed, html, area) {
  const snap = textSnap(ed, html, area);
  if (snap !== ed.marks.at(-1)) {
    ed.marks.push(snap);
    (ed.stepHeights ??= new Map()).set(snap, ed.prevHeight);
  }
}
// A word that reads as a domain or a mail address links when a space or Enter follows it
// (TEXTUNDO.json, links), with the http scheme. No path and no end mark.
const endsReal = (w) => LINK_ENDINGS.has(w.slice(w.lastIndexOf('.') + 1).toLowerCase());
const linkFor = (w) => (/^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(w) && endsReal(w) ? `mailto:${w}` : /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(w) && endsReal(w) ? `http://${w}` : null);
function autoLink(ed, inputType, data) {
  const s = win.getSelection();
  if (!s.isCollapsed || !s.focusNode) return;
  let node = s.focusNode, end = s.focusOffset;
  if (inputType === 'insertText' && data === ' ') end -= 1;
  else if (inputType === 'insertParagraph') {
    const p = (node.nodeType === 1 ? node : node.parentElement).closest('p, h1, h2, h3, h4, li, pre, blockquote')?.previousElementSibling;
    node = p;
    while (node?.lastChild) node = node.lastChild;
    end = node?.length ?? 0;
  } else return;
  if (node?.nodeType !== 3 || node.parentElement.closest('a')) return;
  const raw = node.data.slice(0, end).match(/\S+$/)?.[0];
  // Brackets or quotes around it stay outside the link.
  const word = raw?.match(/^\((.+)\)$/)?.[1] ?? raw?.match(/^"(.+)"$/)?.[1] ?? raw;
  const href = word && linkFor(word);
  if (!href) return;
  const stop = end - (raw.length - word.length) / 2;
  const r = doc.createRange();
  r.setStart(node, stop - word.length);
  r.setEnd(node, stop);
  const a = doc.createElement('a');
  a.setAttribute('href', href);
  r.surroundContents(a);
  if (inputType === 'insertText') { const c = doc.createRange(); c.setStart(a.nextSibling, end - stop + 1); c.collapse(true); s.removeAllRanges(); s.addRange(c); }
}
// The browser's own undo, from its Edit menu, walks the same steps.
function onTextBeforeInput(e) {
  if (!editing || !e.inputType.startsWith('history')) return;
  e.preventDefault();
  if (e.inputType === 'historyUndo') textUndo(editing); else textRedo(editing);
}
// One of the edit's steps back on the page: its text, its rows, the blocks it pushed. The caret goes to the end (CAP-Y2KEYS.json).
function showTextStep(ed, snap) {
  const s = S(ed.sid), was = JSON.parse(snap).sections.find((o) => o.id === ed.sid), wasB = was.blocks.find((o) => o.id === ed.bid), b = B(ed.sid, ed.bid);
  ed.ce.innerHTML = wasB.html;
  for (const o of s.blocks) {
    const w = was.blocks.find((x) => x.id === o.id);
    if (!w) continue;
    o.layout = w.layout;
    if (o !== b) setArea(blockEl(o.id), lay(o).area);
  }
  Object.assign(s, was, { blocks: s.blocks });
  ed.area = [...wasB.layout[bp].area];
  setArea(blockEl(ed.bid), ed.area);
  const ind = feEl(ed.sid).querySelector('.fe-indicator');
  if (ind) setArea(ind, ed.area);
  const r = doc.createRange(), caret = win.getSelection();
  r.selectNodeContents([...ed.ce.querySelectorAll('h1, h2, h3, h4, p, pre')].at(-1) ?? ed.ce);
  r.collapse(false);
  caret.removeAllRanges();
  caret.addRange(r);
  ed.need = contentRows(b, ed.m);
  ed.prevHtml = ed.ce.innerHTML;
  ed.prevArea = [...ed.area];
  ed.prevHeight = textHeight(b);
  ed.lastInput = 0;
  ed.stepNext = true;
  ed.strikeNext = null;
  renderTextBar();
}
const hasText = (ed, snap) => JSON.parse(snap).sections.find((o) => o.id === ed.sid)?.blocks.some((o) => o.id === ed.bid);
// A step that changes something else, another block's text say: the page is drawn again with the text still open.
function textOnOtherStep(ed, to) {
  editing = null;
  doc.removeEventListener('selectionchange', onTextSelection);
  feEl(ed.sid).style.gridAutoRows = '';
  model = JSON.parse(to);
  selectionLeft.delete(ed.bid);
  previewed.delete(ed.bid);
  renderAll();
  syncLayouts();
  startTextEdit(ed.sid, ed.bid);
  if (ed.soft) { editing.soft = true; blockEl(ed.bid).classList.remove('is-text-editing'); renderTextBar(); placeToolbar(); placeBlockPanel(); }
  updateUi();
}
// Whether going to this step changes only this text, its rows and the blocks it pushed.
function textOnly(ed, snap) {
  const bare = (j) => {
    const m = JSON.parse(j), s = m.sections.find((o) => o.id === ed.sid), b = s?.blocks.find((o) => o.id === ed.bid);
    if (!b) return null;
    b.html = '';
    s.rows = 0;
    for (const o of s.blocks) for (const k of Object.keys(o.layout)) o.layout[k].area = 0;
    return JSON.stringify(m);
  };
  const a = bare(snap);
  return a !== null && a === bare(textSnap(ed, ed.ce.innerHTML, ed.area));
}
// Cmd+Z in an edit is the page's undo: one step, and the same list carries on under the edit's own steps. The edit stays
// open until a step takes the block itself away (CAP-Y2EDIT.json, CAP-ESC2.json, CAP-Y2KEYS.json, CAP-Y2KEYS2.json).
function textUndo(ed) {
  let to = ed.marks.at(-1), fromPage = false;
  if (ed.atMark) {
    if (ed.marks.length > 1) { ed.marks.pop(); to = ed.marks.at(-1); }
    else {
      to = undoStack.at(-1);
      if (!to) return;
      if (!hasText(ed, to)) { finishTextEdit(); undo(); return; }
      undoStack.pop();
      if (!textOnly(ed, to)) { redoStack.push(textSnap(ed, ed.ce.innerHTML, ed.area)); textOnOtherStep(ed, to); return; }
      fromPage = true;
      ed.marks = [to];
    }
  }
  const b = B(ed.sid, ed.bid), now = textSnap(ed, ed.ce.innerHTML, ed.area), height = textHeight(b);
  redoStack.push(textRises.get(now) ?? now);
  showTextStep(ed, to);
  // The text got shorter, so the rows fall (textFall). A step off the page's list has its rows already.
  const lost = height - textHeight(b);
  if (lost > 0 && !fromPage) {
    const was = to;
    to = textFall(ed, now, was, lost, textHeight(b));
    showTextStep(ed, to);
    noteTextRise(ed, to, was, textHeight(b));
  }
  ed.marks[ed.marks.length - 1] = to;
  if (ed.marks.length === 1) { ed.before = to; ed.height0 = textHeight(b); }
  ed.atMark = true;
  updateUi();
}
// A step that leaves the page too short for the frame's scroll pulls it up, and the text bar and the caret go, the edit staying
// open; a Cmd+Shift+Z then brings the caret back, not the bar (CAP-Y2BAR.json, Heading 1, read twice: scroll 523 to 360). The
// same step with the frame at its top keeps both (CAP-Y2BAR2.json, read twice). Then the block takes presses as a block, with a
// grab cursor, and scrolling back brings nothing; a press on it closes the edit and leaves it selected (CAP-Y2BAR3.json, twice).
function textStepScrolled(ed, y0) {
  if (editing !== ed || ed.soft || y0 <= doc.scrollingElement.scrollHeight - win.innerHeight + 1) return;
  ed.barGone = true;
  blockEl(ed.bid).classList.remove('is-text-editing');
  // Chrome puts a caret back at the text's start on any key while none is set, so it goes again on each key let go until Cmd is.
  ed.caretGone = true;
  win.getSelection().removeAllRanges();
  renderTextBar();
}
function textRedo(ed) {
  const to = redoStack.at(-1);
  if (!to) return;
  const here = new Set(S(ed.sid).blocks.map((o) => o.id));
  // A block that comes back takes the selection, and the edit closes (CAP-Y2KEYS3.json).
  if (!hasText(ed, to) || JSON.parse(to).sections.find((o) => o.id === ed.sid).blocks.some((o) => !here.has(o.id))) { finishTextEdit(); redo(); return; }
  redoStack.pop();
  if (!textOnly(ed, to)) {
    undoStack.push(...ed.marks);
    if (!ed.atMark) undoStack.push(textSnap(ed, ed.ce.innerHTML, ed.area));
    textOnOtherStep(ed, to);
    return;
  }
  if (!ed.atMark) ed.marks.push(textSnap(ed, ed.ce.innerHTML, ed.area));
  showTextStep(ed, to);
  ed.atMark = false;
  updateUi();
}
function onTextInput(e) {
  const ed = editing;
  const b = B(ed.sid, ed.bid);
  // Anything typed or changed: the steps undone are gone (CAP-Y2KEYS.json). Undo lights up.
  if (ed.atMark || redoStack.length) { ed.atMark = false; redoStack.length = 0; updateUi(); }
  if (e?.inputType) {
    joinOrStep(ed);
    if (e.inputType === 'insertParagraph') fmt.enterInHeading(doc, ed.ce, win.getSelection());
    if (e.inputType.startsWith('delete')) fmt.dropEndBreak(ed.ce, win.getSelection());
    autoLink(ed, e.inputType, e.data);
    // Enter carries a pending Strike to the next line, anything else ends it (CAP-E4FRESH.json).
    if (ed.strikeNext) {
      if (e.inputType === 'insertParagraph') ed.strikeNext.at = String(fmt.caretPlace(ed.ce, win.getSelection()));
      else {
        if (e.inputType === 'insertText' && e.data) fmt.markTyped(ed.ce, win.getSelection(), e.data.length, 'strike', ed.strikeNext.on);
        ed.strikeNext = null;
      }
    }
  }
  // Rows the text needs going up take up any spare rows first. Going down, the block gives up as many
  // rows as the text did, so spare rows stay spare: a new block's second row, or rows added by hand
  // (CAP-TEXTPUSH.json, CAP-TEXTPUSH2.json q1 and q2, CAP-TEXTPUSH3.json r6 and r11).
  const need = contentRows(b, ed.m), rows = ed.area[2] - ed.area[0];
  let next = need > ed.need ? Math.max(rows, need) : rows - (ed.need - need);
  // A delete that empties the text takes the undo's rows instead: less the height lost, rounded up, so an emptied Heading 1
  // can sit a row short (CAP-Y2REDOPULL.json, CAP-Y2REDOPULL2.json: 30 rows to 2, 4 reads; 3 rows by the rule above).
  if (e?.inputType?.startsWith('delete') && !ed.ce.textContent && need < ed.need) next = Math.min(next, Math.max(1, rows - Math.ceil((ed.prevHeight - textHeight(b) + ed.m.rg) / ed.m.pitch - 0.02)));
  ed.need = need;
  if (next !== rows) {
    if (S(ed.sid).blocks.includes(b)) for (const o of moveWithText(S(ed.sid), b, ed.area, next - rows)) setArea(blockEl(o.id), lay(o).area);
    ed.area[2] = ed.area[0] + next;
    setArea(blockEl(ed.bid), ed.area);
    const ind = feEl(ed.sid).querySelector('.fe-indicator');
    if (ind) setArea(ind, ed.area);
  }
  ed.prevHtml = ed.ce.innerHTML;
  ed.prevArea = [...ed.area];
  ed.prevHeight = textHeight(b);
}

// Text that grows or shrinks moves other blocks, in this view only (CAP-TEXTPUSH.json to CAP-TEXTPUSH7.json).
// Growing: blocks in shared columns whose bottom reaches the old end, and any block whose top is past
// it, all by the growth, no chains.
// Shrinking, from the old end to the new, among blocks starting at the new end or lower: those starting
// above the old end rise to the new end, stacking only on blocks in shared columns. Those at the old
// end or lower rise by one amount: the rows from the new end to the old end, both counted, with no such
// block in them, at most the fall.
// The section takes the change of its lowest block.
function moveWithText(s, b, a, d) {
  const others = s.blocks.filter((o) => o.id !== b.id), lows = others.map((o) => o.layout[bp].area);
  const lowest = (own) => Math.max(own, ...lows.map((q) => q[2]));
  const low = lowest(a[2]);
  const was = others.map((o) => [...o.layout[bp].area]);
  if (d > 0) {
    // A Text in shared columns from the text's top or above to its old end exactly keeps its top and stretches (CAP-79ONTOP.json:
    // two Texts in the same place). A Button or Social Links there moves by the growth, its size kept, from the text's top and
    // from a row above it (CAP-R2ONTOP.json b, s, u); other types are inferred to move too. One going past the old end moves
    // (CAP-TEXTPUSH4.json s3, CAP-TEXTPUSH5.json t1).
    lows.forEach((q, k) => { if (q[0] > a[2] || (q[1] < a[3] && q[3] > a[1] && q[2] >= a[2])) { if (q[0] > a[0] || q[2] > a[2] || others[k].type !== 'text') q[0] += d; q[2] += d; } });
  } else {
    const end = a[2], top = end + d, under = lows.filter((q) => q[0] >= top);
    let free = 0;
    for (let row = top; row <= end; row++) if (!under.some((q) => q[0] <= row && row < q[2])) free++;
    const by = Math.min(-d, free), placed = [];
    for (const q of [...under].sort((p, r) => p[0] - r[0])) {
      const at = q[0] >= end ? q[0] - by : Math.max(top, ...placed.filter((o) => o[1] < q[3] && o[3] > q[1]).map((o) => o[2]));
      q[2] += at - q[0];
      q[0] = at;
      if (at < end) placed.push(q);
    }
  }
  s.rows[bp] += lowest(a[2] + d) - low;
  return others.filter((o, k) => !same(o.layout[bp].area, was[k]));
}

function onTextSelection() {
  if (editing?.strikeNext && String(fmt.caretPlace(editing.ce, win.getSelection())) !== editing.strikeNext.at) editing.strikeNext = null;
  if (editing && !textMenu) renderTextBar();
}
function finishTextEdit() {
  const ed = editing;
  if (!ed) return;
  closeLinkPopover();
  editing = null;
  doc.removeEventListener('selectionchange', onTextSelection);
  renderTextBar();
  const b = B(ed.sid, ed.bid);
  const height = textHeight(b);
  b.html = ed.ce.innerHTML;
  const left = win.getSelection();
  if (ed.ce.contains(left.anchorNode) && ed.ce.contains(left.focusNode)) selectionLeft.set(b.id, { html: b.html, anchor: pathFrom(ed.ce, left.anchorNode), anchorOffset: left.anchorOffset, focus: pathFrom(ed.ce, left.focusNode), focusOffset: left.focusOffset });
  lay(b).area = ed.area;
  growRows(S(ed.sid));
  feEl(ed.sid).style.gridAutoRows = '';
  renderSectionDom(ed.sid);
  commitTextSteps(ed, height);
}
function commitTextSteps(ed, height) {
  const now = JSON.stringify(model);
  // A step can look like where the edit ended (Bold, then Clear Formatting): it's still a step (CAP-E4SCORE.json).
  const steps = ed.marks.at(-1) === now ? ed.marks.slice(0, -1) : ed.marks;
  const heights = steps.map((m, k) => (k ? ed.stepHeights?.get(m) : ed.height0));
  for (let k = steps.length - 1; k >= 0; k--) {
    const lost = (heights[k + 1] ?? height) - heights[k];
    if (lost > 0) { const full = steps[k]; steps[k] = textFall(ed, steps[k + 1] ?? now, full, lost, heights[k]); noteTextRise(ed, steps[k], full, heights[k]); }
  }
  for (const m of steps.slice(0, -1)) undoStack.push(m);
  // What Cmd+Z took stays for Redo after the edit closes (CAP-Y2KEYS.json).
  const undone = [...redoStack];
  commit(steps.at(-1) ?? ed.before, `Edited text in ${ed.bid}`);
  redoStack.push(...undone.slice(redoStack.length));
  updateUi();
  return now;
}
// The text stays open and holds the keys, with no bar and the block's toolbar back. What was typed is in the model now.
function softenTextEdit() {
  const ed = editing, b = B(ed.sid, ed.bid), height = textHeight(b);
  closeLinkPopover();
  b.html = ed.ce.innerHTML;
  lay(b).area = [...ed.area];
  growRows(S(ed.sid));
  editing = null; // The phone order follows now: this is the edit's close
  softening = true;
  commitTextSteps(ed, height);
  softening = false;
  // From after the commit's phone order turn: else the close takes the turn alone as one more undo step, which the oracle
  // doesn't have (CAP-R2ONTOP.json: its first Cmd+Z after a let go is ours' second).
  let now = JSON.stringify(model);
  // The commit can give rows back (A2, CAP-A2SHRINKB1): the open text takes them, and the edit goes on from
  // there, or the close puts them back and turns the phone order once more.
  if (!same(lay(b).area, ed.area)) { ed.area = [...lay(b).area]; setArea(blockEl(ed.bid), ed.area); now = JSON.stringify(model); }
  editing = ed;
  Object.assign(ed, { soft: true, before: now, marks: [now], atMark: true, lastInput: 0, prevHtml: b.html, prevArea: [...ed.area], height0: height, prevHeight: height });
  blockEl(ed.bid).classList.remove('is-text-editing');
  renderTextBar();
  placeToolbar();
  placeBlockPanel();
}

// Redo of a step that fell gives back the rows it had only if the text needs them (CAP-Y2KEYS3.json, CAP-Y2KEYS4.json).
const textRises = new Map();
const noteTextRise = (ed, short, full, height) => {
  const rows = (j) => { const a = JSON.parse(j).sections.find((o) => o.id === ed.sid).blocks.find((o) => o.id === ed.bid)?.layout[bp].area; return a ? a[2] - a[0] : Infinity; };
  if (rows(short) < Math.ceil((height + ed.m.rg) / ed.m.pitch - 0.02)) textRises.set(short, full);
};
// Going back over a step that made the text taller: the old text comes back, and the rows are the larger of what the
// block has now and what the step had, less the height lost and a gap, rounded up, so the text can come back a row
// short. One row at least. Spare rows are not given back (CAP-TEXTPUSH2.json q8, CAP-TEXTPUSH5.json t13 and t14,
// CAP-TEXTPUSH6.json v7 and v8, CAP-Y2KEYS3.json, CAP-Y2KEYS4.json). A wrapped line lost, under a row with the same
// paragraphs, keeps the rows the text needs (CAP-Y2KEYS6.json, CAP-Y2KEYS8.json, CAP-Y2KEYS9.json).
const textBlocksIn = (html) => (html.match(/<\/(p|h[1-4]|pre|li)>/g) ?? []).length;
function textFall(ed, live, target, lost, height) {
  const m = JSON.parse(live), s = m.sections.find((o) => o.id === ed.sid), b = s.blocks.find((o) => o.id === ed.bid);
  const t = JSON.parse(target).sections.find((o) => o.id === ed.sid)?.blocks.find((o) => o.id === ed.bid);
  if (!b || !t) return target;
  const a = b.layout[bp].area, rows = a[2] - a[0], then = t.layout[bp].area;
  const most = Math.max(rows, then[2] - then[0]);
  let next = Math.max(1, most - Math.ceil((lost + ed.m.rg) / ed.m.pitch - 0.02));
  if (lost < ed.m.pitch && textBlocksIn(b.html) === textBlocksIn(t.html)) next = Math.max(next, Math.min(most, Math.ceil((height + ed.m.rg) / ed.m.pitch - 0.02)));
  moveWithText(s, b, a, next - rows);
  a[2] = a[0] + next;
  b.html = t.html;
  return JSON.stringify(m);
}

// ---------- panel ----------
function updateUi() {
  if (!layersPanel.hidden && S(layersPanel.dataset.sid)) renderLayersPanel(); // it follows a Remove or an undo
  $('undo').disabled = !undoStack.length && !(editing && (!editing.atMark || editing.marks.length > 1));
  $('redo').disabled = !redoStack.length;
  const dirty = JSON.stringify(model) !== savedJson;
  $('save').disabled = !dirty;
  // The oracle's status line stays "Page · Published" with unsaved changes; only Save
  // turns on (parity/findings/EXIT.json).
  $('page-state').textContent = document.body.classList.contains('is-preview') ? 'Previewing' : 'Page · Published';
  renderPanel();
  if (editSid) renderSectionPanel();
  renderBlockPanel();
  placeToolbar();
  placeChrome();
  placePhoneLines();
}

function renderPanel() {
  if (!doc) return;
  const parts = [];
  if (sel) {
    const s = S(sel.sid);
    const b = B(sel.sid, sel.bid);
    const L = lay(b);
    const [r0, c0, r1, c1] = L.area;
    parts.push(`<div class="group"><h3 data-dev>Block</h3><dl data-dev>
      <dt>Id</dt><dd>${b.id}</dd>
      <dt>Type</dt><dd>${b.type}</dd>
      <dt>Layout</dt><dd>${bp}</dd>
      <dt>grid-area</dt><dd>${L.area.join(' / ')}</dd>
      <dt>Size</dt><dd>${c1 - c0} cols, ${r1 - r0} rows</dd>
      <dt>z-index</dt><dd>${L.z}</dd>
    </dl>
    </div>`);
    // Move Forward and Backward, Move Up and Down, Align Vertically, Add Block and the group
    // actions live where the oracle has them: the block and group toolbars and the section chrome.

  } else {
    parts.push(`<div class="group" data-dev><h3>Page</h3><p class="hint">Click a block to select it. Drag to move. Pull a handle to resize. Double-click text to edit. Arrow keys move one cell. Esc cancels, Cmd+Z undoes.</p></div>`);
  }
  // data-dev marks readouts for developers; the inventory (scripts/inventory.mjs) skips them.
  parts.push(`<div class="group" data-dev><h3>Activity</h3><pre class="log">${notes.join('\n') || 'Nothing yet'}</pre></div>`);
  panel.innerHTML = parts.join('');
}

// Add Block (U5, T13): each type lands at the top left of the section with the size
// the oracle gives it (parity/findings/T13.json). On phones it is full content width, and its
// place in the stack goes by size (CAP-NEWORDER*.json).
const pageTitle = () => document.querySelector('.page-name')?.textContent.trim() || 'Page';
const STANDIN_TYPES = ['Quote', 'Newsletter', 'Chart', 'SoundCloud', 'Flickr', 'Instagram']; // their content follows the width (STANDINS.json)
// The stand-ins with a phone height of their own: PHONE_HEIGHTS in render.js.
const PHONE_ROW = 24; // a phone row's least height, as render.js draws the grid
// The height the oracle's content draws on desktop at each width in columns, [least columns, height], widest first: measurements
// only (CAP-X6DESKROWS.json). Summary's moves between sessions (CAP-X6STEPS.json read 14 rows at 17 columns, this 11), and its
// height past 18 columns is unread, so 18's stands.
const DESK_HEIGHT = {
  'Pricing Plan': [[17, 380.1], [10, 405.1], [7, 430.1], [0, 455.1]],
  Newsletter: [[11, 253.5], [8, 276], [0, 371.9]],
  Bandsintown: [[15, 423], [13, 535], [11, 731], [8, 815], [7, 927], [6, 1151], [0, 1319]],
  Summary: [[18, 427], [17, 407], [16, 431], [15, 411], [14, 391], [13, 735], [12, 699], [11, 680], [10, 659], [9, 1624], [0, 1332]],
  Scheduling: [[0, 680]],
};
const deskHeight = (label, cols) => DESK_HEIGHT[label]?.find(([c]) => cols >= c)?.[1];
// A Pricing Plan with Elements off: less its parts (CAP-T12PRESS-E.json: 6 columns take 12 rows with all on, 8 with no Description).
const deskNeed = (b, cols) => (b.label === 'Pricing Plan' && standinPanelOf(b) ? planHeight(b, deskHeight(b.label, cols)) : deskHeight(b.label, cols));
const ADD_TYPES = [
  ['Text', 8, 2, () => ({ type: 'text', html: '<p style="white-space:pre-wrap;" data-rte-preserve-empty="true"></p>' })],
  ['Image', 6, 6, () => ({ type: 'image', alt: '', empty: true, mode: 'fit' })],
  ['Button', 6, 2, () => ({ type: 'button', label: 'Learn more' })],
  ['Video', 8, 8, () => ({ type: 'video' })],
  // A new form's fields (FORMADD.json).
  ['Form', 9, 16, () => ({ type: 'form', button: 'Submit', formName: `${pageTitle()} Form`, fields: [{ kind: 'name', label: 'Name', parts: ['First Name(required)', 'Last Name(required)'] }, { kind: 'email', label: 'Email(required)', signup: 'Sign up for news and updates' }, { kind: 'text', label: 'Subject(required)' }, { kind: 'textarea', label: 'Message(required)' }] })],
  ['Accordion', 8, 8, () => ({ type: 'accordion', items: [1, 2, 3].map((n) => ({ title: `Accordion Item ${n}`, description: ACCORDION_DESCRIPTION })) })],
  ['Shape', 6, 6, () => ({ type: 'shape', radius: '0' })],
  ['Scrolling', 24, 2, () => ({ type: 'scrolling', text: 'Dream it 〰️', size: 1.5, wave: 0 })],
  ['Line', 4, 1, () => ({ type: 'line' })],
  ['Map', 8, 12, () => ({ type: 'map' })],
  ['Social Links', 4, 2, () => ({ type: 'social', align: 'center' })],
  // From the menu search (parity/findings/T10.json): Code 4 by 6, Embed 8 by 8.
  ['Code', 4, 6, () => ({ type: 'code', html: '<p>Hello, World!</p>' })],
  ['Embed', 8, 8, () => ({ type: 'embed' })],
  ['Markdown', 4, 6, () => ({ type: 'markdown', text: '' })], // CAP-T10PRE.json
  // Not built yet (T11, T12): a stand-in of the size the oracle gives (parity/findings/U5.json sizes).
  ...Object.entries({ Product: [6, 10], 'Pricing Plan': [8, 11], Donation: [6, 15], Scheduling: [8, 17], Summary: [18, 11], Newsletter: [10, 8], Quote: [6, 6], Audio: [6, 3], Calendar: [12, 18], Menu: [12, 28], Chart: [8, 8], 'Search Field': [8, 8], 'Page Link': [8, 5], 'Tag Cloud': [8, 5], RSS: [8, 5], Archive: [8, 21], Instagram: [8, 12], Tock: [18, 2], SoundCloud: [8, 8], Flickr: [8, 9], OpenTable: [8, 8], Zola: [8, 16], Bandsintown: [8, 5] })
    .map(([name, [w, h]]) => [name, w, h, () => ({ type: 'shape', fill: '#d9d4ca', radius: '0', label: name, ...(STANDIN_TYPES.includes(name) ? { standin: name.toLowerCase() } : {}), ...(PHONE_HEIGHTS[name] ? { phoneHeight: phoneHeightAt(name, 8) } : {}) })]),
];
// A new block whose phone height isn't its desktop height (CAP-TURNTEST.json p6, CAP-X6FLOORSPHONE.json, CAP-T14CONTROL.json, CAP-T14LAND.json, CAP-T14HEIGHTS2.json).
// Calendar and Pricing Plan too, a rule and not late content: the same rows from 1 s to 111 s (CAP-68CAL.json, CAP-68PRICE.json, CAP-68PULL.json).
const PHONE_ROWS = { Accordion: 5, Scheduling: 5, Flickr: 5, SoundCloud: 5, Archive: 8, Calendar: 15, 'Pricing Plan': 10 };
// A new block lands by how far its section's top sits above the frame; past the section's last row it lands on
// row 1, and the frame goes so the block's middle is at its middle, or as near as the page allows (CAP-T14FRAME.json,
// CAP-T14FRAME2.json, CAP-T14PLACE.json, CAP-T14BACK.json: inferred, on predictions). Read on desktop only, so the
// phone view stays on row 1.
let landedPast = false;
function landingRow(s) {
  const el = sectionEl(s.id), fe = feEl(s.id);
  if (bp !== 'desktop' || !el || !fe) return 1;
  const above = -el.getBoundingClientRect().top, row = 1 + Math.max(0, Math.floor(above / measure(fe).pitch));
  if (row <= s.rows.desktop) return row;
  landedPast = true;
  return 1;
}
// After the new block is drawn.
function frameToLanded(bid) {
  if (!landedPast) return;
  landedPast = false;
  const c = blockEl(bid)?.getBoundingClientRect();
  if (c) win.scrollBy({ top: c.top + c.height / 2 - win.innerHeight / 2, behavior: 'instant' });
}
// A new Line sits in the middle of its block, in each view (CAP-U4LINE.json).
const NEW_ALIGN = { Line: 'center', Shape: 'center', Image: 'center' }; // CAP-S3ALIGN.json start, CAP-75IMAGE3.json
function addBlock(sid, name) {
  const [, w, h, make] = ADD_TYPES.find((t) => t[0] === name);
  const s = S(sid);
  const id = `${name.toLowerCase().replace(/ /g, '-')}-${Date.now().toString(36)}`;
  // Phone (L3.json, CAP-NEWORDER*.json): the new block takes its place in the phone stack by
  // size, and the blocks after it move down by its height.
  const stack = [...s.blocks].sort((p, q) => p.layout.mobile.area[0] - q.layout.mobile.area[0] || p.layout.mobile.area[1] - q.layout.mobile.area[1]);
  const row = landingRow(s);
  const slot = s.phoneFollows ? 0 : s.phoneFollows === false && s.phoneStop === 'overlap' && phoneOverlaps(s) ? stoppedSlot(stack, w, h, [row, 2]) : newBlockSlot(stack, w, h, [row, 2]);
  const mobileEnd = slot ? Math.max(...stack.slice(0, slot).map((b) => b.layout.mobile.area[2])) : 1;
  const phoneH = PHONE_ROWS[name] ?? h;
  const at = NEW_ALIGN[name] ?? 'flex-start';
  const zTop = (bpName) => Math.max(0, ...s.blocks.map((b) => b.layout[bpName].z)) + 1;
  const block = { id, ...make(), layout: {
    desktop: { area: [row, 2, row + h, 2 + w], z: zTop('desktop'), justify: at, align: at },
    mobile: { area: [mobileEnd, 2, mobileEnd + phoneH, 10], z: zTop('mobile'), justify: at, align: at },
  } };
  if (s.phoneFollows) followNewBlock(s, block);
  else for (const b of stack.slice(slot)) {
    const a = b.layout.mobile.area;
    b.layout.mobile.area = [a[0] + phoneH, a[1], a[2] + phoneH, a[3]];
  }
  s.blocks.push(block);
  // The blocks that moved down can grow the phone section too (CAP-PHONE.json: 10 to 11 rows).
  for (const bpName of ['desktop', 'mobile']) s.rows[bpName] = Math.max(s.rows[bpName], ...s.blocks.map((b) => b.layout[bpName].area[2] - 1));
  sel = { sid, bid: id };
}

// Cmd+D (KEYS2): the copy is one row down and one column right on desktop, the same
// size, on top; on phones it goes right below the original and later blocks move down.
// A child goes from its stack; the stack keeps its area and goes with its last child (S3.json children).
function removeOne(sid, bid) {
  const s = S(sid), stack = parentStack(sid, bid);
  if (!stack) { s.blocks = s.blocks.filter((o) => o.id !== bid); return; }
  stack.children = stack.children.filter((c) => c.id !== bid);
  if (!stack.children.length) s.blocks = s.blocks.filter((o) => o !== stack);
}
function duplicateBlock(sid, bid) {
  const s = S(sid);
  const orig = B(sid, bid);
  const copy = JSON.parse(JSON.stringify(orig));
  copy.id = `${orig.type}-${Date.now().toString(36)}`;
  // A child's copy lands right after it, selected (S3.json children).
  const stack = parentStack(sid, bid);
  if (stack) {
    stack.children.splice(stack.children.indexOf(orig) + 1, 0, copy);
    sel = { sid, bid: copy.id };
    return;
  }
  const d = copy.layout.desktop.area;
  const w = d[3] - d[1];
  const c0 = Math.min(d[1] + 1, LAST_LINE.desktop - w);
  copy.layout.desktop.area = [d[0] + 1, c0, d[2] + 1, c0 + w];
  copy.layout.desktop.z = Math.max(...s.blocks.map((b) => b.layout.desktop.z)) + 1;
  // A section built here, on desktop: the copy goes last on the phone with its source's z + 1, even if
  // another block has that z (CAP-A2EDITS n, CAP-A2ROUND1 e).
  if (s.phoneFollows != null && bp !== 'mobile') {
    const end = Math.max(...s.blocks.map((b) => b.layout.mobile.area[2]));
    copy.layout.desktop.z = orig.layout.desktop.z + 1;
    copy.layout.mobile.z = orig.layout.mobile.z + 1;
    copy.layout.mobile.area = [end, copy.layout.mobile.area[1], end + copy.layout.mobile.area[2] - copy.layout.mobile.area[0], copy.layout.mobile.area[3]];
    s.blocks.push(copy);
    for (const bpName of ['desktop', 'mobile']) s.rows[bpName] = Math.max(s.rows[bpName], copy.layout[bpName].area[2] - 1);
    sel = { sid, bid: copy.id };
    return;
  }
  const m = orig.layout.mobile.area;
  const h = m[2] - m[0];
  for (const b of s.blocks) {
    const a = b.layout.mobile.area;
    if (b !== orig && a[0] >= m[2]) b.layout.mobile.area = [a[0] + h, a[1], a[2] + h, a[3]];
  }
  copy.layout.mobile.area = [m[2], m[1], m[2] + h, m[3]];
  copy.layout.mobile.z = Math.max(...s.blocks.map((b) => b.layout.mobile.z)) + 1;
  s.blocks.splice(s.blocks.indexOf(orig) + 1, 0, copy);
  for (const bpName of ['desktop', 'mobile']) s.rows[bpName] = Math.max(s.rows[bpName], copy.layout[bpName].area[2] - 1);
  sel = { sid, bid: copy.id };
}

// Copy and Paste of blocks (U11). The oracle's clipboard did not reach the page in the probe, so
// the place is ours: the same grid area in any section, one row and one column on while that
// area is taken, at the bottom of the phone layout.
// The clip outlasts leaving the page and coming back, as on the oracle (CAP-U11RELOAD.json): ours keeps it in the browser.
// The oracle's read held its clip in the capture tool, not the real clipboard: that a real clipboard keeps it is inferred.
const CLIP_KEY = 'fe-block-clip';
let blockClip = (() => { try { return JSON.parse(localStorage.getItem(CLIP_KEY)); } catch { return null; } })();
let transformClip = null;
function copyBlocks() {
  blockClip = [sel.bid, ...(sel.more || [])].map((id) => JSON.parse(JSON.stringify(B(sel.sid, id))));
  try { localStorage.setItem(CLIP_KEY, JSON.stringify(blockClip)); } catch {}
}
function pasteBlocks(sid) {
  const s = S(sid);
  const ids = blockClip.map((src, n) => {
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = `${src.type}-${Date.now().toString(36)}-${n}`;
    const d = copy.layout.desktop.area;
    const w = d[3] - d[1];
    const taken = (a) => s.blocks.some((b) => b.layout.desktop.area.join() === a.join());
    for (let k = 0; k < 50 && taken(copy.layout.desktop.area); k++) {
      const [r0, c0, r1] = copy.layout.desktop.area;
      const c = Math.min(c0 + 1, LAST_LINE.desktop - w);
      copy.layout.desktop.area = [r0 + 1, c, r1 + 1, c + w];
    }
    const m = copy.layout.mobile.area;
    const top = Math.max(1, ...s.blocks.map((b) => b.layout.mobile.area[2]));
    copy.layout.mobile.area = [top, m[1], top + m[2] - m[0], m[3]];
    for (const bpName of ['desktop', 'mobile']) {
      // A section built here, on desktop: its source's z + 1, as a copy does (CAP-A2ROUND2 c, 3 reads).
      copy.layout[bpName].z = s.phoneFollows != null && bp !== 'mobile' ? src.layout[bpName].z + 1 : Math.max(0, ...s.blocks.map((b) => b.layout[bpName].z)) + 1;
      s.rows[bpName] = Math.max(s.rows[bpName], copy.layout[bpName].area[2] - 1);
    }
    s.blocks.push(copy);
    return copy.id;
  });
  sel = { sid, bid: ids[0], ...(ids.length > 1 ? { more: ids.slice(1) } : {}) };
}
const TRANSFORM_KEYS = [...DESIGN_FIELDS.map(([k]) => k), 'ox', 'oy']; // Anchor goes with them (CAP-L6ROWS.json)
// Copy Properties, Transforms: the values of the Design tab's Transforms group. The oracle has one
// clip: copying transforms drops copied animations and the other way round (CAP-COPYANIM.json).
function copyTransforms() {
  animClip = null;
  const d = B(sel.sid, sel.bid).design || {};
  transformClip = Object.fromEntries(TRANSFORM_KEYS.filter((k) => k in d).map((k) => [k, d[k]]));
}
function pasteTransforms(sid, ids) {
  for (const id of ids) {
    const b = B(sid, id);
    const d = { ...(b.design || {}) };
    for (const k of TRANSFORM_KEYS) delete d[k];
    Object.assign(d, transformClip);
    if (Object.keys(d).length) b.design = d; else delete b.design;
  }
}

// Align Group, as on the oracle (traces T0018, T0019): blocks line up on the group's
// bounding box; centers round to the nearest line.
function zSwap(sid, b, up) {
  // The toolbar's one step: just past the next block it overlaps on that side, over any that it doesn't,
  // and the section is numbered again. With a pin every block counts (CAP-U4ZPRESS.json, CAP-U4ZSTACK.json,
  // CAP-U4ZPIN.json). The right-click Arrange goes past all it overlaps.
  const s = S(sid), all = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z), mine = all.indexOf(b);
  const pinned = s.blocks.some((o) => o.layout[bp]?.sticky);
  const side = up ? all.slice(mine + 1) : all.slice(0, mine).reverse();
  const hit = side.find((o) => pinned || overlaps(lay(o).area, lay(b).area));
  if (!hit) return;
  const order = all.filter((x) => x !== b);
  order.splice(order.indexOf(hit) + (up ? 1 : 0), 0, b);
  order.forEach((x, n) => { lay(x).z = n + 1; });
}

// Phone Move Up and Move Down (traces T0020, T0021): the phone toolbar has these instead of
// Move Forward, Move Backward and Duplicate. The block trades places with the previous or
// next block in the phone stack (by start row): the lower one takes the upper one's start
// row, the upper one follows it. Heights, columns and z-index stay.
function phoneStack(sid) {
  return S(sid).blocks.filter((o) => o.layout.mobile).sort((x, y) => x.layout.mobile.area[0] - y.layout.mobile.area[0] || x.layout.mobile.area[1] - y.layout.mobile.area[1]);
}
function moveInStack(sid, b, up) {
  const stack = phoneStack(sid);
  const k = stack.indexOf(b);
  const other = stack[up ? k - 1 : k + 1];
  if (!other) return;
  const [upper, lower] = up ? [other, b] : [b, other];
  const U = upper.layout.mobile.area, Lw = lower.layout.mobile.area;
  const gap = Lw[0] - U[2];
  const uh = U[2] - U[0], lh = Lw[2] - Lw[0];
  lower.layout.mobile.area = [U[0], Lw[1], U[0] + lh, Lw[3]];
  upper.layout.mobile.area = [U[0] + lh + gap, U[1], U[0] + lh + gap + uh, U[3]];
}

function alignGroup(kind) {
  const ids = [sel.bid, ...(sel.more || [])];
  const L = ids.map((id) => lay(B(sel.sid, id)));
  const r0 = Math.min(...L.map((l) => l.area[0])), r1 = Math.max(...L.map((l) => l.area[2]));
  const c0 = Math.min(...L.map((l) => l.area[1])), c1 = Math.max(...L.map((l) => l.area[3]));
  for (const l of L) {
    const [a0, b0, a1, b1] = l.area;
    const h = a1 - a0, w = b1 - b0;
    let r = a0, c = b0;
    if (kind === 'left') c = c0;
    if (kind === 'right') c = c1 - w;
    if (kind === 'hcenter') c = Math.round((c0 + c1) / 2 - w / 2);
    if (kind === 'top') r = r0;
    if (kind === 'bottom') r = r1 - h;
    if (kind === 'vcenter') r = Math.round((r0 + r1) / 2 - h / 2);
    l.area = [r, c, r + h, c + w];
  }
}

// A child's handles (S3.json children): a drag fixes W, H or both, one undo step.
function startKidResize(e, dir) {
  const { sid, bid } = sel, b = B(sid, bid), el = blockEl(bid);
  const q = el.getBoundingClientRect(), before = JSON.stringify(model);
  const x0 = e.clientX, y0 = e.clientY, axisW = /[ew]/.test(dir), axisH = /[ns]/.test(dir);
  const size = (ev) => ({ w: Math.max(20, q.width + (dir.includes('w') ? x0 - ev.clientX : ev.clientX - x0)), h: Math.max(20, q.height + (dir.includes('n') ? y0 - ev.clientY : ev.clientY - y0)) });
  const apply = (ev) => {
    const z = size(ev);
    const m = bp === 'mobile' ? 'm' : '';
    if (axisW) { el.dataset[`${m}w`] = 'fixed'; el.style.setProperty(`--kid-${m}w`, `${z.w}px`); }
    if (axisH) { el.dataset[`${m}h`] = 'fixed'; el.style.setProperty(`--kid-${m}h`, `${z.h}px`); }
  };
  const up = (ev) => {
    win.removeEventListener('pointermove', apply); win.removeEventListener('pointerup', up);
    const z = size(ev);
    if (ev.clientX === x0 && ev.clientY === y0) return;
    b[kidSizeKey(bp)] = { ...b[kidSizeKey(bp)], ...(axisW ? { w: `${Math.round(z.w)}px` } : {}), ...(axisH ? { h: `${Math.round(z.h)}px` } : {}) };
    renderSectionDom(sid);
    commit(before, `Resized ${bid} in its stack`);
  };
  win.addEventListener('pointermove', apply); win.addEventListener('pointerup', up);
}

// Stack Blocks (S3, parity/findings/S3.json). A row when the blocks' centres spread wider than
// tall, else a column. From the top-left of the group the stack spans, in a row, the sum of the
// children's columns and the tallest; in a column the widest and the sum of their rows. Phones are
// always a column. It takes the group's top z, and the blocks keep their layouts for Unstack.
const spanOf = (a) => [a[2] - a[0], a[3] - a[1]];
function stackBlocks() {
  normalize(sel.sid); // the oracle works on normalized rows here too
  const s = S(sel.sid);
  const ids = [sel.bid, ...(sel.more || [])];
  const parts = ids.map((id) => B(sel.sid, id));
  const boxes = parts.map((b) => blockEl(b.id).getBoundingClientRect());
  const spread = (k) => { const c = boxes.map((q) => q[k] + (k === 'left' ? q.width : q.height) / 2); return Math.max(...c) - Math.min(...c); };
  const direction = spread('left') > spread('top') ? 'row' : 'column';
  const areaOf = (name, dir) => {
    const A = parts.map((b) => b.layout[name].area), S2 = A.map(spanOf);
    const r = Math.min(...A.map((a) => a[0])), c = Math.min(...A.map((a) => a[1]));
    const h = S2.map((x) => x[0]), w = S2.map((x) => x[1]), sum = (v) => v.reduce((m, x) => m + x, 0);
    return [r, c, r + (dir === 'row' ? Math.max(...h) : sum(h)), Math.min(c + (dir === 'row' ? sum(w) : Math.max(...w)), COLS[name] + 2)];
  };
  const key = direction === 'row' ? [1, 0] : [0, 1];
  const order = [...parts].sort((p, q) => { const a = p.layout.desktop.area, c = q.layout.desktop.area; return a[key[0]] - c[key[0]] || a[key[1]] - c[key[1]]; });
  const id = `stack-${Date.now().toString(36)}`;
  const layout = {};
  for (const name of ['desktop', 'mobile']) layout[name] = { area: areaOf(name, name === 'desktop' ? direction : 'column'), z: Math.max(...parts.map((b) => b.layout[name].z)), justify: 'flex-start', align: 'flex-start' };
  const stack = { id, type: 'stack', direction, gap: 20, children: order.map((c) => (c.type === 'button' ? { ...c, fit: true } : c)), layout };
  const at = Math.min(...parts.map((b) => s.blocks.indexOf(b)));
  s.blocks = s.blocks.filter((b) => !ids.includes(b.id));
  s.blocks.splice(at, 0, stack);
  for (const name of ['desktop', 'mobile']) s.rows[name] = Math.max(s.rows[name], layout[name].area[2] - 1);
  sel = { sid: sel.sid, bid: id };
}
// Unstack (S3.json unstack): the first child takes the stack's corner, each next one follows with
// its own spans: below in a column, one column clear to the right in a row. New z values on top;
// the last child ends up selected. Phones are a column.
function unstack(sid, b) {
  const s = S(sid);
  for (const name of ['desktop', 'mobile']) {
    let [r, c] = b.layout[name].area;
    let z = Math.max(...s.blocks.map((o) => o.layout[name].z));
    const row = name === 'desktop' && stackAxes(b, 'desktop').direction === 'row';
    for (const kid of b.children) {
      const L = kid.layout[name], [h, w] = spanOf(L.area);
      const left = Math.min(c, COLS[name] + 2 - w);
      L.area = [r, left, r + h, left + w];
      L.z = ++z;
      if (row) c = left + w + 1; else r += h;
    }
  }
  const at = s.blocks.indexOf(b);
  s.blocks.splice(at, 1, ...b.children);
  for (const name of ['desktop', 'mobile']) s.rows[name] = Math.max(s.rows[name], ...s.blocks.map((o) => o.layout[name].area[2] - 1));
  sel = { sid, bid: b.children[b.children.length - 1].id };
}

// Layers, as on the oracle: the section's blocks front to back by z-index; text blocks
// show their first words, others their type. Click selects, drag reorders.
// Edit Section (P3, P4, P5, S1, S2), the oracle's three tabs (parity/findings/PANEL.json,
// SETTINGS.json): Design has Row Count, Gap (Zero 0px, Medium 11px, Custom column and row
// gaps 0 to 50px), Fill Screen, Height S/M/L/Custom and vertical Alignment; Background has
// Background Width; Colors has ten themes. Divider adds the default wave with Shape, Stroke, Color and Thickness (parity/findings/CAP-DIVSHAPES.json). Unchecking Fill Screen makes the section fit its
// content and hides Height and Alignment, as on the oracle.
const THEMES = [['Lightest 1', 'white'], ['Lightest 2', 'white-bold'], ['Light 1', 'light'], ['Light 2', 'light-bold'], ['Bright 1', 'bright-inverse'],
  ['Bright 2', 'bright'], ['Dark 1', 'dark'], ['Dark 2', 'dark-bold'], ['Darkest 1', 'black'], ['Darkest 2', 'black-bold']];
const MEDIUM_GAP = 11;
let sectionTab = 'Design';
let customGap = false;
let secView = null; // 'shape' or 'art': the panel behind Edit Settings
let secMore = {}; // which size rows show their slider
let filterOpen = false, tipOpen = false;
// The Design tab's Shuffle walks the seven shapes in one order, kept for the session, and never picks No Shape.
let shapeDeck = null, shapeAt = 0;
const nextShape = (cur) => {
  if (!shapeDeck) { shapeDeck = ['rounded', 'soft', 'slanted', 'scalloped', 'wavy', 'jagged', 'pointed'].sort(() => Math.random() - 0.5); shapeAt = Math.floor(Math.random() * 7); }
  do shapeAt = (shapeAt + 1) % 7; while (shapeDeck[shapeAt] === cur);
  return shapeDeck[shapeAt];
};
const fillScreen = (s) => !(s.height === 'custom' && s.customHeight == null);
const gapKind = (s) => (customGap ? 'custom' : s.gap === 0 && (s.rowGap ?? 0) === 0 ? 'zero' : s.gap === MEDIUM_GAP && (s.rowGap ?? MEDIUM_GAP) === MEDIUM_GAP ? 'medium' : 'custom');
function onSectionClick(e) {
  const btn = e.target.closest('button[data-sact]');
  if (!btn || !secSid()) return;
  e.stopImmediatePropagation();
  const s = S(secSid());
  const { sact: act, v } = btn.dataset;
  if (act === 'tab') { sectionTab = v; customGap = false; secView = null; secMore = {}; filterOpen = tipOpen = false; renderPanel(); if (editSid) renderSectionPanel(); return; }
  const redraw = () => { renderPanel(); if (editSid) renderSectionPanel(); };
  if (act === 'view') { secView = v || null; secMore = {}; const n = sectionPanel; n.scrollTop = 0; redraw(); n.scrollTop = 0; return; }
  if (act === 'filterOpen') { filterOpen = !filterOpen; redraw(); return; }
  // Art's rows (parity/findings/CAP-ARTROWS.json): folds and tabs are not page changes, each value is one undo step.
  if (act === 'artFold') { const k = `artFold:${v}`; secMore = { ...secMore, [k]: !secMore[k] }; redraw(); return; }
  if (act === 'artTab') { secMore = { ...secMore, artCustom: v === 'custom' }; redraw(); return; }
  if (act === 'artFilterOpen') { secMore = { ...secMore, artFilterOpen: !secMore.artFilterOpen }; redraw(); return; }
  if (act === 'artAddImage') { sectionPanel.querySelector('[data-art-image]').click(); return; }
  if (act === 'storageTip') { tipOpen = !tipOpen; redraw(); return; }
  if (v === 'more' && act !== 'artSeg') { secMore = { ...secMore, [act]: !secMore[act] }; redraw(); return; }
  // A row's more button shows its sliders and takes no undo step, as read (CAP-ARTSHUFFLE.json).
  if (act === 'artSeg' && v === 'more') { if (s.bgArt) s.bgArt = { ...s.bgArt, set: artSeg(s.bgArt.name, s.bgArt.set || {}, btn.dataset.k, v) }; redraw(); return; }
  if (act === 'gap' && v === 'custom') { customGap = true; renderPanel(); if (editSid) renderSectionPanel(); return; }
  segShown = null;
  const before = JSON.stringify(model);
  if (act === 'gap') { customGap = false; s.gap = v === 'zero' ? 0 : MEDIUM_GAP; s.rowGap = s.gap; }
  // Custom height after a flattening Vertical press starts again at 1 (difference 104, CAP-P3ALIGN2.json, CAP-P3ALIGN4.json).
  // S, M or L keeps the flat mark: top and bottom then keep no padding (CAP-P3VERT-VB, CAP-P3ALIGN3, read twice); Custom ends it.
  if (act === 'height') { s.customHeight = v === 'custom' ? (s.flat ? 1 : s.customHeight ?? 1) : undefined; s.height = v; if (v === 'custom') delete s.flat; panelFlat = null; }
  // A Vertical press on a Custom height section drops its min-height and padding to 0 until the next Custom or field change
  // (difference 102; CAP-P3ALIGN2 to 4, frozen rule 12 of 12). Only when the size was set in the panel.
  // A top or bottom press on S, M or L that isn't flat leaves a 4vw gutter on Custom's near edge from then on (CAP-P3VERT-VA, VC, read twice).
  if (act === 'valign') { if (v !== s.valign && s.height === 'custom' && s.customHeight != null) s.flat = true; if (v !== 'middle' && s.height !== 'custom' && !s.flat) s.gutter = true; s.valign = v; }
  if (act === 'bgWidth') s.bgWidth = v;
  if (act === 'theme') s.theme = v;
  if (act === 'dividerStroke') { if (v === 'solid') delete s.dividerStroke; else s.dividerStroke = v; }
  if (act === 'dividerThickness') { secMore = { ...secMore, dividerThickness: false }; if (v === 'M') delete s.dividerThickness; else s.dividerThickness = v; }
  if (act === 'dividerShape') { if (v === 'wavy') delete s.dividerShape; else s.dividerShape = v; }
  if (act === 'dividerWidth') { secMore = { ...secMore, dividerWidth: false }; s.dividerWidth = DIVIDER_WIDTHS[v]; if (s.dividerWidth === 100) delete s.dividerWidth; }
  if (act === 'dividerHeight') { secMore = { ...secMore, dividerHeight: false }; s.dividerHeight = DIVIDER_HEIGHTS[v]; if (s.dividerHeight === 6) delete s.dividerHeight; }
  if (act === 'dividerFlip' || act === 'dividerFlipY') { if (s[act]) delete s[act]; else s[act] = true; }
  // Shuffle Settings picks another pair from the S, M, L sizes and the flips. On the Design tab it also goes to the next shape (CAP-DIVSHAPES.json, shuffle).
  if (act === 'shapeShuffle') { const next = nextShape(s.dividerShape || 'wavy'); if (next === 'wavy') delete s.dividerShape; else s.dividerShape = next; }
  if (act === 'shuffle' || act === 'shapeShuffle') {
    const now = `${s.dividerWidth ?? 100}/${s.dividerHeight ?? 6}`, W = Object.values(DIVIDER_WIDTHS), H = Object.values(DIVIDER_HEIGHTS);
    let w, h;
    do { w = W[Math.floor(Math.random() * 3)]; h = H[Math.floor(Math.random() * 3)]; } while (`${w}/${h}` === now);
    s.dividerWidth = w; s.dividerHeight = h;
    if (w === 100) delete s.dividerWidth;
    if (h === 6) delete s.dividerHeight;
    for (const flip of ['dividerFlip', 'dividerFlipY']) { if (Math.random() < 0.5) s[flip] = true; else delete s[flip]; }
  }
  if (act === 'bgKind') { filterOpen = tipOpen = false; if (v === 'Image') delete s.bgKind; else s.bgKind = v; if (JSON.stringify(model) === before) { redraw(); return; } }
  if (act === 'art') {
    if (v === 'none') delete s.bgArt; else if (s.bgArt?.name !== v) s.bgArt = { name: v, colors: artDefaults(v) };
  }
  if (act === 'artShuffle' && s.bgArt) s.bgArt = { ...s.bgArt, set: artShuffled(s.bgArt.name, s.bgArt.set || {}) };
  if (act === 'artSeg' && s.bgArt) s.bgArt = { ...s.bgArt, set: artSeg(s.bgArt.name, s.bgArt.set || {}, btn.dataset.k, v) };
  if (act === 'artPreset' && s.bgArt) s.bgArt = { ...s.bgArt, set: { ...s.bgArt.set, preset: v } };
  if (act === 'artFilter' && s.bgArt) { secMore = { ...secMore, artFilterOpen: false }; s.bgArt = { ...s.bgArt, set: { ...s.bgArt.set, filter: v } }; if (JSON.stringify(model) === before) { redraw(); return; } }
  if (act === 'artInvert' && s.bgArt) s.bgArt = { ...s.bgArt, colors: [...s.bgArt.colors].reverse() };
  if (act === 'bgFilter') { filterOpen = false; if (v === 'None') { delete s.bgFilter; delete s.bgFilterStrength; } else s.bgFilter = v; if (JSON.stringify(model) === before) { redraw(); return; } }
  if (act === 'bgSpeed') { const n = Math.min(2, Math.max(0.5, (s.bgSpeed ?? 1) + Number(v))); if (n === 1) delete s.bgSpeed; else s.bgSpeed = n; }
  if (JSON.stringify(model) === before) { redraw(); return; }
  renderSectionDom(s.id);
  commit(before, `Section ${s.id} ${act} set to ${v}`);
}

panel.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-act]');
  if (!btn || !sel) return;
  const before = JSON.stringify(model);
  const b = B(sel.sid, sel.bid);
  const L = lay(b);
  if (btn.dataset.act === 'z+' || btn.dataset.act === 'z-') zSwap(sel.sid, b, btn.dataset.act === 'z+');
  if (btn.dataset.act === 'up' || btn.dataset.act === 'down') moveInStack(sel.sid, b, btn.dataset.act === 'up');
  if (btn.dataset.act === 'justify') L.justify = btn.dataset.v;
  if (btn.dataset.act === 'align') alignGroup(btn.dataset.v);
  if (btn.dataset.act === 'stack') stackBlocks();
  if (btn.dataset.act === 'add') addBlock(sel.sid, btn.dataset.v);
  renderSectionDom(sel.sid);
  frameToLanded(sel.bid);
  commit(before, `${btn.textContent} on ${b.id}`);
});

// The custom height reads a whole number each time its slider or field changes, and the section follows at
// once (parity/findings/CAP-P3FIELD.json). The field's undo step comes on Enter; the slider's on each move
// while held (difference 100, CAP-P3UNDO2.json). No number shows NaN with the slider at its middle, and the
// height stays. The slider stops at 1 to 100, the field keeps what it read.
let heightBefore = null;
// After NaN, the panel opened again shows an empty field with the slider at its middle (difference 101,
// CAP-P3UNDO.json, one reading): by section, the height that NaN kept.
const heightNaN = new Map();
// A flat section's panel, opened again, shows S checked and no slider; the open panel keeps Custom (104, CAP-P3ALIGN2 to 4).
let panelFlat = null;
// The Height and Alignment buttons the open panel showed before an Undo (99): [sid, { height, valign }].
let segShown = null;
// What the open panel shows instead of the model, until its field or slider changes or it opens again: [sid, slider, field].
let heightShown = null;
function showHeight(n) {
  const [range, field] = sectionPanel.querySelectorAll('.sp-custom-height input');
  if (field.value !== String(n)) field.value = String(n);
  range.value = String(n);
}
function followHeight(input) {
  const s = S(secSid()), n = parseInt(input.value, 10);
  showHeight(n);
  heightShown = segShown = null;
  if (Number.isNaN(n)) heightNaN.set(s.id, s.customHeight); else heightNaN.delete(s.id);
  if (Number.isNaN(n) || n === s.customHeight) return;
  const before = JSON.stringify(model);
  s.customHeight = n;
  delete s.flat;
  renderSectionDom(s.id);
  if (input.type !== 'range') { heightBefore ??= before; return; }
  // A step of its own, with no redraw of the panel under the held slider: it redraws on let go.
  undoStack.push(before);
  redoStack.length = 0;
  note(`Section ${s.id} customHeight set to ${n}`);
  $('undo').disabled = false;
  $('redo').disabled = true;
}
function settleHeight(shown) {
  const before = heightBefore, sid = secSid();
  heightBefore = null;
  if (before && before !== JSON.stringify(model)) commit(before, `Section ${sid} customHeight set to ${shown}`);
  if (Number.isNaN(parseInt(shown, 10)) && sectionPanel.querySelector('.sp-custom-height')) showHeight(NaN);
}

function onSectionChange(e) {
  const input = e.target.closest('input[data-act]');
  if (!input || !secSid()) return;
  const before = JSON.stringify(model);
  const s = S(secSid());
  const act = input.dataset.act;
  if (act === 'artRange' || act === 'artCheck') {
    if (!s.bgArt) return;
    s.bgArt = { ...s.bgArt, set: { ...s.bgArt.set, [input.dataset.k]: act === 'artCheck' ? input.checked : clampArt(input) } };
    if (JSON.stringify(model) === before) return;
    commit(before, `Art ${input.getAttribute('aria-label')} changed`);
    renderPanel(); if (editSid) renderSectionPanel();
    return;
  }
  if (act === 'anchor') {
    const v = input.value.trim().replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    if (v) s.anchor = v; else delete s.anchor;
  } else if (act === 'divider') {
    if (input.checked) s.divider = true; else { delete s.divider; for (const k of ['dividerStroke', 'dividerThickness', 'dividerShape', 'dividerWidth', 'dividerHeight', 'dividerFlip', 'dividerFlipY', 'dividerAlign', 'dividerColor']) delete s[k]; }
  } else if (act === 'fill') {
    if (input.checked) { s.height = 'medium'; delete s.customHeight; } else { s.height = 'custom'; delete s.customHeight; }
    delete s.flat;
  } else if (act === 'customHeight') {
    followHeight(input);
    settleHeight(input.value);
    if (input.type === 'range') updateUi(); // the slider's let go: its steps are in, the panel and Save follow
    return;
  } else {
    const v = Math.round(input.type === 'text' ? parseFloat(input.value) : Number(input.value));
    if (!Number.isFinite(v)) return;
    if (act === 'dividerWidth') { s.dividerWidth = Math.min(150, Math.max(1, v)); if (s.dividerWidth === 100) delete s.dividerWidth; }
    if (act === 'dividerHeight') { s.dividerHeight = Math.min(150, Math.max(1, v)); if (s.dividerHeight === 6) delete s.dividerHeight; }
    if (act === 'dividerThickness') s.dividerThickness = Math.min(50, Math.max(1, v));
    if (act === 'dividerAlign') { s.dividerAlign = Math.min(1000, Math.max(-1000, v)); if (!s.dividerAlign) delete s.dividerAlign; }
    if (act === 'bgFilterStrength') s.bgFilterStrength = Math.min(100, Math.max(0, v));
    if (act === 'rows') s.rows[bp] = Math.min(10000, Math.max(Number(input.min), v));
    if (act === 'gap') { s.rowGap = s.rowGap ?? s.gap; s.gap = Math.min(50, Math.max(0, v)); }
    if (act === 'rowGap') s.rowGap = Math.min(50, Math.max(0, v));
  }
  if (JSON.stringify(model) === before) return;
  renderSectionDom(s.id);
  commit(before, `Section ${s.id} ${act} set to ${input.type === 'checkbox' ? input.checked : input.value}`);
}

// ---------- section chrome (U9, U10) ----------
// Hovering a section shows its toolbar; Edit Section opens the settings in a floating panel
// for that section, with or without a selected block.
const chrome = $('section-chrome');
// A wheel turn over the section's own buttons scrolls the page, and the chrome stays on its section (CAP-U9REST.json).
chrome.addEventListener('wheel', (e) => { e.preventDefault(); frame.contentWindow.scrollBy({ top: e.deltaY, left: e.deltaX }); }, { passive: false });
const sectionPanel = $('section-panel');
const addMenu = $('add-block-menu');
let hoverSid = null;
let editSid = null;
let panelPlace = null;
const secSid = () => editSid || sel?.sid || null;
panel.addEventListener('click', onSectionClick, true);
panel.addEventListener('change', onSectionChange);
sectionPanel.addEventListener('click', onSectionClick, true);
sectionPanel.addEventListener('change', onSectionChange);
sectionPanel.addEventListener('change', async (e) => {
  const input = e.target.closest('input[data-art-image]');
  if (!input?.files[0] || !S(secSid())?.bgArt) return;
  const s = S(secSid()), before = JSON.stringify(model);
  const src = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(input.files[0]); });
  if (!src) return;
  s.bgArt = { ...s.bgArt, set: { ...s.bgArt.set, custom: src } };
  commit(before, 'Art image set');
  renderPanel(); if (editSid) renderSectionPanel();
});
// A slider's number follows the drag; the section changes on release, but for the custom height.
sectionPanel.addEventListener('input', (e) => {
  if (e.target.matches('.sp-custom-height input')) followHeight(e.target);
  if (e.target.matches('.sp-slide input[type="range"]')) e.target.nextElementSibling.value = e.target.value + (e.target.dataset.unit || '');
  if (e.target.matches('.ar-range input[type="range"], .ar-inline input[type="range"]')) e.target.style.setProperty('--p', `${((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100}%`);
  if (e.target.matches('.ar-range input[type="range"]')) e.target.parentElement.querySelector('input[type="text"]').value = String(+(+e.target.value).toFixed(2));
  if (e.target.matches('.ar-inline input[type="range"]')) e.target.nextElementSibling.value = String(+(+e.target.value).toFixed(2));
  if (e.target.matches('.sp-align-slide')) sectionPanel.querySelector('.sp-align-row input').value = `${e.target.value}px`;
});
// Color rows of the section panel use the same picker as blocks (Reset to theme, five swatches, Custom color).
sectionPanel.addEventListener('click', (e) => {
  const a = e.target.closest('[data-sp-color]');
  if (!a || !secSid()) return;
  if (shapeUi?.section === a.dataset.spColor) { closeShapePop(); return; }
  shapeUi = { kind: 'section', section: a.dataset.spColor, sid: secSid(), custom: null };
  renderShapePop();
});
// Background tab: Add an Image and Remove (P5), one undo step each; Colors tab: Color Theme Editor.
for (const host of [panel, sectionPanel]) {
  host.addEventListener('click', (e) => {
    const a = e.target.closest('[data-sbg]');
    if (!a || !secSid()) return;
    e.preventDefault();
    const act = a.dataset.sbg;
    if (act === 'themes') { setSiteStyles(true); ssView = 'ColorTheme'; renderSsPanel(); return; }
    if (act === 'add') { host.querySelector('[data-sbg-file]').click(); return; }
    if (act === 'addVideo') { host.querySelector('[data-sbg-video]').click(); return; }
    if (act === 'addFallback') { host.querySelector('[data-sbg-fallback]').click(); return; }
    const before = JSON.stringify(model);
    const s = S(secSid());
    if (act === 'removeVideo') delete s.bgVideo;
    else if (act === 'removeFallback') delete s.bgFallback;
    else delete s.bgImage;
    renderSectionDom(s.id);
    commit(before, 'Section background image removed');
  });
  host.addEventListener('change', async (e) => {
    const fv = e.target.closest('input[data-sbg-video]');
    const fb = e.target.closest('input[data-sbg-fallback]');
    if (fv && fv.files[0] && secSid()) {
      const src = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(fv.files[0]); });
      const secs = src && await new Promise((ok) => { const v = document.createElement('video'); v.onloadedmetadata = () => ok(v.duration); v.onerror = () => ok(null); v.src = src; });
      if (!secs) { note('That file is not a video'); updateUi(); return; }
      if (secs > 60) { note('That video is over 1 minute'); updateUi(); return; }
      const before = JSON.stringify(model), s = S(secSid());
      s.bgVideo = src; renderSectionDom(s.id); commit(before, 'Section background video set');
      return;
    }
    if (fb && fb.files[0] && secSid()) {
      const pic = await readPicture(fb.files[0]).catch(() => null);
      if (!pic) { note('That file is not a picture'); updateUi(); return; }
      const before = JSON.stringify(model), s = S(secSid());
      s.bgFallback = pic.src; renderSectionDom(s.id); commit(before, 'Section mobile fallback image set');
      return;
    }
    const f = e.target.closest('input[data-sbg-file]');
    if (!f || !secSid()) return;
    const file = f.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { note('That picture is over 20 MB'); updateUi(); return; }
    const pic = await readPicture(file).catch(() => null);
    if (!pic) { note('That file is not a picture'); updateUi(); return; }
    const before = JSON.stringify(model);
    const s = S(secSid());
    s.bgImage = pic.src;
    renderSectionDom(s.id);
    commit(before, 'Section background image added');
  });
}
function chromeSid() { return editSid || sel?.sid || hoverSid; }
// The chrome fades out over 0.15s when the mouse leaves, and the outline over 0.2s; a gesture takes it away at once
// (SECTIONBAR.json, fade; CAP-U9FADE.json). Add Section takes 0.2s too, on its opacity (CAP-U9ADDFADE.json). Those two fade
// there too, moving to another section and in a gesture, and Add Section on selecting a block: each as a copy left behind
// (CAP-U9CLOSE.json, CAP-U9ADDFADE2.json, CAP-U9ADDFADE3.json). A copy moves with the page. A fade broken off runs back over
// 0.2 s times the way it has come: from 0.5, 100 ms (CAP-U9FADE4B.json, CAP-U9FADE4C.json).
let chromeOut = 0;
let copies = [];
const litNow = (o) => { const c = getComputedStyle(o); return o.classList.contains('sc-outline') ? Number(c.borderTopColor.match(/rgba\(.*, ([\d.]+)\)/)?.[1] ?? 1) : Number(c.opacity); };
function leaveCopy(o, cls, frames, sid = chrome.dataset.key?.split('|')[0]) {
  const gone = o.cloneNode(true);
  const entry = { gone, sid, part: o.dataset.scPart, y: win.scrollY };
  gone.classList.add(cls);
  for (const n of ['data-sc-part', 'data-sc']) gone.removeAttribute(n);
  const lit = litNow(o);
  chrome.after(gone);
  copies.push(entry);
  gone.animate(frames, { duration: 200 * lit, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => { gone.remove(); copies = copies.filter((c) => c !== entry); };
}
function followCopies() { for (const c of copies) c.gone.style.translate = `0 ${c.y - win.scrollY}px`; }
const isOutline = (o) => o.classList.contains('sc-outline');
const litFrame = (o) => (isOutline(o) ? { borderColor: getComputedStyle(o).borderTopColor, offset: 0 } : { opacity: getComputedStyle(o).opacity, offset: 0 });
function runUp(o, frame, lit) { o.style.animation = 'none'; o.animate([frame], { duration: 200 * (1 - lit), easing: 'ease-in-out' }); }
// Back on a section whose pair is still falling: it runs back from there (CAP-U9FADE4.json).
function runCopiesBack(sid) {
  for (const c of copies.filter((x) => x.sid === sid)) {
    const o = chrome.querySelector(`[data-sc-part="${c.part}"]`);
    if (!o) continue;
    runUp(o, litFrame(c.gone), litNow(c.gone));
    c.gone.remove(); copies = copies.filter((x) => x !== c);
  }
}
function addSectionAway() {
  if (chrome.hidden) return;
  for (const o of chrome.querySelectorAll('.sc-add-section')) leaveCopy(o, 'sc-add-gone', [{ opacity: getComputedStyle(o).opacity }, { opacity: 0 }]);
}
function outlineAway() {
  const o = chrome.hidden ? null : chrome.querySelector('.sc-outline');
  if (!o) return;
  leaveCopy(o, 'sc-outline-gone', [{ borderColor: getComputedStyle(o).borderTopColor }, { borderColor: 'transparent' }]);
  addSectionAway();
}
function hideChrome(fade) {
  if (chrome.hidden || (fade && chromeOut)) return;
  clearTimeout(chromeOut); chromeOut = 0;
  if (!fade) { outlineAway(); chrome.classList.remove('is-out'); chrome.hidden = true; return; }
  // Still rising: it falls from there, over 0.2 s times the way it has come (CAP-U9FADE4C.json).
  for (const o of chrome.querySelectorAll('.sc-outline, .sc-add-section')) { const lit = litNow(o); if (lit > 0 && lit < 1) o.animate([litFrame(o), isOutline(o) ? { borderColor: 'transparent' } : { opacity: 0 }], { duration: 200 * lit, easing: 'ease-in-out' }); }
  chrome.classList.remove('is-outline-in', 'is-add-in'); chrome.classList.add('is-out');
  chromeOut = setTimeout(() => { chromeOut = 0; chrome.classList.remove('is-out'); chrome.hidden = true; }, 200);
}
function placeChrome() {
  followCopies();
  const sid = chromeSid();
  const el = sid && doc && sectionEl(sid);
  if (!el || gesture?.type === 'move' || gesture?.type === 'resize') { hideChrome(!el); return; }
  const k = model.sections.findIndex((x) => x.id === sid);
  const phone = bp === 'mobile';
  // A group leaves the section's chrome on screen (GROUPRESIZE.json); one selected block does not.
  // A press past 10 px counts as the block selected, though it is selected only on let go (CAP-U9FADE4.json, CAP-SELECTLETGO.json).
  const armed = gesture?.type === 'pending' && gesture.armed && gesture.pick?.sid === sid && !gesture.pick.more?.length;
  const blockSelected = !editSid && !marquee && ((sel?.sid === sid && !sel.more?.length && !(pressFresh && (!gesture || gesture.type === 'pending'))) || armed);
  const hasLayouts = !phone && !!sectionMix(S(sid));
  const key = `${sid}|${k}|${model.sections.length}|${phone}|${blockSelected}|${hasLayouts}`;
  const newSection = chrome.hidden || chrome.dataset.key?.split('|')[0] !== sid;
  const appears = newSection || !!chromeOut;
  // With one block selected the outline goes to the section under the pointer, on the same 0.2 s cross, and Layers
  // stays with the block; a press there changes nothing until the let go, which leaves the outline lit (CAP-U9REST2.json,
  // CAP-U9REST3.json). Read on the desktop.
  const oSid = !phone && blockSelected && hoverSid && hoverSid !== sid && sectionEl(hoverSid) ? hoverSid : sid;
  const prevO = chrome.hidden ? null : chrome.dataset.outline;
  const outlineStays = newSection && prevO === sid;
  const outlineMoves = !newSection && !!prevO && prevO !== oSid;
  if (newSection && !outlineStays) outlineAway();
  if (outlineMoves) { const o = chrome.querySelector('.sc-outline'); if (o) leaveCopy(o, 'sc-outline-gone', [{ borderColor: getComputedStyle(o).borderTopColor }, { borderColor: 'transparent' }], prevO); }
  if (chromeOut) { clearTimeout(chromeOut); chromeOut = 0; chrome.classList.remove('is-out'); for (const o of chrome.querySelectorAll('.sc-outline, .sc-add-section')) { const own = o.getAnimations().filter((a) => !(a instanceof CSSTransition || a instanceof CSSAnimation)); if (own.length) { const lit = litNow(o), frame = litFrame(o); own.forEach((a) => a.cancel()); runUp(o, frame, lit); } } }
  // A rebuild in place keeps the outline lit. Coming back during its fade, it runs back from where it is.
  // Selecting a block takes Add Section away, and letting the block go brings it back: both over 0.2 s (CAP-U9ADDFADE3.json).
  if (chrome.dataset.key !== key && !newSection) { if (blockSelected) addSectionAway(); chrome.classList.toggle('is-add-in', chrome.dataset.key?.split('|')[4] === 'true' && !blockSelected); }
  if (chrome.dataset.key !== key) { if (!newSection) chrome.classList.remove('is-outline-in'); chrome.innerHTML = sectionChromeHtml({ first: k === 0, last: k === model.sections.length - 1, phone, blockSelected, layouts: hasLayouts }); chrome.dataset.key = key; }
  if (appears) { chrome.classList.remove('is-in'); void chrome.offsetWidth; chrome.classList.add('is-in'); }
  if (newSection) { chrome.classList.remove('is-outline-in', 'is-add-in'); void chrome.offsetWidth; chrome.classList.add('is-add-in'); if (!outlineStays) chrome.classList.add('is-outline-in'); runCopiesBack(sid); }
  if (outlineMoves) { chrome.classList.remove('is-outline-in'); void chrome.offsetWidth; chrome.classList.add('is-outline-in'); runCopiesBack(oSid); }
  const header = k === 0 ? doc.getElementById('header') : null;
  const grid = el.querySelector('.fluid-engine')?.getBoundingClientRect() || null;
  // The Add Section buttons sit on the sum of the rounded heights above, not on the section's edge
  // (parity/findings/ADDSECTIONTOP.json), so they drift off it a little further down a long page.
  const secs = [...el.parentElement.querySelectorAll(':scope > .page-section')];
  const drift = (n) => secs.slice(0, n).reduce((sum, x) => { const h = x.getBoundingClientRect().height; return sum + Math.round(h) - h; }, 0);
  const L = sectionChromeLayout(el.getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect(), header ? header.getBoundingClientRect().bottom : 0, phone, grid, [drift(secs.indexOf(el)), drift(secs.indexOf(el) + 1)]);
  if (oSid !== sid) {
    const hEl = sectionEl(oSid), hHeader = model.sections[0]?.id === oSid ? doc.getElementById('header') : null;
    L.outline = sectionChromeLayout(hEl.getBoundingClientRect(), frame.getBoundingClientRect(), stage.getBoundingClientRect(), hHeader ? hHeader.getBoundingClientRect().bottom : 0, phone, hEl.querySelector('.fluid-engine')?.getBoundingClientRect() || null, [drift(secs.indexOf(hEl)), drift(secs.indexOf(hEl) + 1)]).outline;
  }
  chrome.dataset.outline = oSid;
  for (const [part, box] of Object.entries(L)) {
    const node = chrome.querySelector(`[data-sc-part="${part}"]`);
    if (!node) continue;
    for (const [prop, v] of Object.entries(box)) node.style[prop] = `${v}px`;
  }
  chrome.hidden = false;
  if (editSid) {
    // 342px from the window's right edge; on phones 195px right of the canvas (SECTIONBAR.json).
    const st = stage.getBoundingClientRect(), fr = frame.getBoundingClientRect(), q = el.getBoundingClientRect();
    // On phones the panel keeps the top it opened at, and closes once its section's bottom is above the canvas's top
    // (CAP-U9REST.json, CAP-U9REST2.json).
    // On the desktop, while it stays open, it keeps to the band of its section's content box (sectionPanelScrolled).
    const cw = el.querySelector(':scope > .content-wrapper')?.getBoundingClientRect() || q;
    const low = fr.top + cw.top + 1, high = fr.top + cw.bottom + 1 - 476;
    if (phone ? q.bottom < 0 : high < PANEL_BAND_CLOSES_AT) { closeSectionPanel(); return; }
    sectionPanel.style.left = `${phone ? fr.right - st.left + 195 : st.width - 342}px`;
    const held = panelPlace?.sid === editSid ? panelPlace.top : null;
    // Opening at edit + 49 on the desktop, it starts inside that band: seen on all 9 opens of the scroll walks, not predicted;
    // the openings lower down stay as read (SECTIONBAR.json), above the band.
    const edit = st.top + L.card.top + 7, opened = held === null && sectionPanelTop({ edit, H: window.innerHeight, secTop: fr.top + q.top, secBottom: fr.top + q.bottom });
    const inBand = !phone && edit + 49 + 476 <= window.innerHeight - 170;
    const place = held === null ? (inBand ? Math.round(Math.min(Math.max(opened, low), high)) : opened)
      : phone ? held : sectionPanelScrolled({ prev: held, H: window.innerHeight, low, high });
    panelPlace = { sid: editSid, top: place };
    sectionPanel.style.top = `${place - st.top}px`;
  }
}
// Theme colors for the Colors tab tiles, read once from the canvas (site.css lives there).
let themeColors = null;
function readThemeColors() {
  const host = doc.createElement('section');
  host.className = 'page-section';
  host.style.cssText = 'position:absolute;left:-9999px;top:0;width:10px;height:10px;';
  host.innerHTML = '<div class="section-background"></div><h2>x</h2>';
  doc.body.append(host);
  const out = {};
  for (const [, v] of THEMES) {
    host.dataset.sectionTheme = v;
    out[v] = { bg: win.getComputedStyle(host.querySelector('.section-background')).backgroundColor, ink: win.getComputedStyle(host.querySelector('h2')).color };
  }
  host.remove();
  return out;
}
// Phone view (gap review screenshot): faint lines run across the white area at each section
// edge, outside the 428px canvas.
function placePhoneLines() {
  const host = $('phone-lines');
  if (bp !== 'mobile' || !doc) { host.replaceChildren(); return; }
  const fr = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
  host.replaceChildren(...[doc.getElementById('header'), ...doc.querySelectorAll('main#page .page-section')].filter(Boolean).map((sec) => {
    const y = fr.top - st.top + sec.getBoundingClientRect().bottom;
    const line = document.createElement('div');
    line.className = 'phone-line';
    line.style.top = `${Math.round(y)}px`;
    return line;
  }).filter((l) => parseFloat(l.style.top) > fr.top - st.top && parseFloat(l.style.top) < st.height));
}
function renderSectionPanel() {
  if (!editSid || !S(editSid)) { editSid = null; sectionPanel.hidden = true; return; }
  const s = S(editSid);
  themeColors = themeColors || readThemeColors();
  const top = sectionPanel.scrollTop;
  const shownAs = panelFlat === s.id && s.flat && s.height === 'custom' ? { ...s, height: 'small', customHeight: undefined } : s;
  sectionPanel.innerHTML = sectionPanelHtml(shownAs, { tab: sectionTab, bp, gapKind: gapKind(s), fill: fillScreen(s), minRows: Math.max(1, ...s.blocks.map((b) => b.layout[bp].area[2] - 1)), themes: THEMES, themeColors, view: secView, more: secMore, filterOpen, tipOpen });
  sectionPanel.hidden = false;
  sectionPanel.scrollTop = top;
  const [range, field] = sectionPanel.querySelectorAll('.sp-custom-height input');
  if (range && heightShown?.[0] === s.id) { range.value = heightShown[1]; field.value = heightShown[2]; }
  if (segShown?.[0] === s.id) for (const [a, v] of Object.entries(segShown[1])) for (const b of sectionPanel.querySelectorAll(`[data-sact="${a}"]`)) { b.classList.toggle('is-on', b.dataset.v === v); b.setAttribute('aria-pressed', String(b.dataset.v === v)); }
}
function closeSectionPanel() { if (!editSid) return; settleHeight(''); editSid = null; panelPlace = null; renderSectionPanel(); placeChrome(); }
// View Layouts (parity/findings/CAP-VIEWLAYOUTS.json): stays open through picks, each one undo step.
const layoutsPanel = $('layouts-panel');
let layoutsPlace = null;
let layoutsSid = null, layoutsMix = null, layoutsPicked = null, layoutsLast = null, layoutsOrder = [], layoutsBase = null, layoutsLook = null, layoutsPress = false;
// Roles stay with the blocks as they were on opening: a pick puts them in phone order.
const openedMix = () => sectionMix({ blocks: [...S(layoutsSid).blocks].sort((a, b) => layoutsOrder.indexOf(a.id) - layoutsOrder.indexOf(b.id)) });
// A tile's colors: the section's own, as on opening, or those of the theme a layout turns it to.
function readLayoutsLook() {
  const el = sectionEl(layoutsSid), css = (e) => doc.defaultView.getComputedStyle(e);
  let bg = el; // the tile's background: the nearest painted one
  while (bg.parentElement && css(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
  layoutsLook = { bg: css(bg).backgroundColor, ink: css(el).color };
}
function renderLayouts() {
  const css = (e) => doc.defaultView.getComputedStyle(e);
  const look = (turn) => {
    if (!turn) return layoutsLook;
    const t = doc.createElement('section'); t.className = 'page-section'; t.dataset.sectionTheme = layoutTheme(layoutsBase.theme); doc.body.append(t);
    const c = css(t), out = { bg: c.getPropertyValue('--section-bg').trim() || layoutsLook.bg, ink: c.getPropertyValue('--heading-color').trim() || layoutsLook.ink };
    t.remove();
    return out;
  };
  layoutsPanel.innerHTML = layoutsPanelHtml(layoutsMix, layoutsPicked, look);
}
// Undo and Redo leave the panel open, even with every block gone: it then lists nothing (CAP-U10UNDOPAST.json).
// The mark goes unless the section shows the last pick (CAP-U10WALK2.json). A section that shows no layout starts over.
function syncLayouts() {
  if (!layoutsSid) return;
  const s = S(layoutsSid);
  if (!s) { closeLayouts(); return; }
  if (!s.blocks.length) { layoutsMix = { list: [], by: {} }; layoutsPicked = null; renderLayouts(); return; }
  const mix = openedMix();
  if (!mix) { closeLayouts(); return; }
  const top = layoutsPanel.querySelector('.lo-list').scrollTop;
  layoutsMix = mix;
  const shown = layoutShown(s, mix, layoutsLast);
  layoutsPicked = shown === layoutsLast ? shown : null;
  if (shown == null) { layoutsBase = sectionLook(s); readLayoutsLook(); }
  renderLayouts();
  layoutsPanel.querySelector('.lo-list').scrollTop = top;
}
function openLayouts(sid) {
  closeFloating();
  layoutsSid = sid; layoutsOrder = S(sid).blocks.map((b) => b.id); layoutsBase = sectionLook(S(sid)); layoutsMix = openedMix();
  // Opening on a layout marks it, but not one that turns the theme: a pick would turn it again (CAP-U10READ4.json, CAP-U10READ6.json).
  const shown = layoutShown(S(sid), layoutsMix, null);
  layoutsPicked = layoutsLast = shown != null && !layoutsMix.list[shown].style?.theme ? shown : null;
  layoutsPanel.hidden = false;
  // The same place as Edit Section's panel (CAP-VIEWLAYOUTS.json, panelTop).
  const fr = frame.getBoundingClientRect(), q = sectionEl(sid).getBoundingClientRect();
  // From the card's set place: it may still be sliding in.
  const editAt = stage.getBoundingClientRect().top + parseFloat(chrome.querySelector('[data-sc-part="card"]').style.top) + 7;
  // A divider's own height doesn't count: the panel goes by the section above it (CAP-U10READ6.json, 248 at 763.6 with one).
  // Below the first section, then no lower than its band's high edge (rule O, CAP-U10OPEN.json): V opens at 341, not
  // U9's 380. A short first section hangs out below that edge (CAP-VIEWLAYOUTS.json, 562 and 603.1 at H 1000): why is not read.
  const cw = sectionEl(sid).querySelector(':scope > .content-wrapper')?.getBoundingClientRect() || q;
  const opened = sectionPanelTop({ edit: editAt, H: window.innerHeight, secTop: fr.top + q.top, secBottom: fr.top + q.bottom - dividerPx(S(sid)) });
  const top = model.sections[0]?.id === sid ? Math.round(opened) : layoutsOpenTop({ opened, high: fr.top + cw.bottom + 1 - 476 });
  layoutsPlace = { top, edit: editAt, secTop: fr.top + q.top };
  layoutsPanel.style.top = `${layoutsPlace.top}px`;
  readLayoutsLook();
  renderLayouts();
}
function closeLayouts() { layoutsSid = null; layoutsPanel.hidden = true; }
const dividerPx = (s) => (s.divider ? ((s.dividerHeight ?? 6) / 100) * frame.getBoundingClientRect().width : 0);
// After each pick: up to where it would open on the section as it now is, never down, and not above the section's
// top + 140 (CAP-VIEWLAYOUTS.json afterPick, CAP-U10READ4.json, CAP-U10READ6.json).
function pickMovesLayouts() {
  const fr = frame.getBoundingClientRect(), q = sectionEl(layoutsSid).getBoundingClientRect(), secTop = fr.top + q.top;
  const fresh = sectionPanelTop({ edit: layoutsPlace.edit + secTop - layoutsPlace.secTop, H: window.innerHeight, secTop, secBottom: fr.top + q.bottom - dividerPx(S(layoutsSid)) });
  layoutsPlace.top = layoutsPickTop({ top: layoutsPlace.top, secTop, fresh });
  layoutsPanel.style.top = `${layoutsPlace.top}px`;
}
// While the page scrolls it keeps to the band of its section's content box, by Edit Section's rule (sectionPanelScrolled),
// and closes on it: U9's frozen band rule, checked on View Layouts with predictions pushed first, 300 of 300 steps
// (CAP-U10BAND-PREDICT.json, CAP-U10BAND2.json).
function placeLayouts() {
  const el = layoutsSid && sectionEl(layoutsSid);
  if (!el) return;
  const fr = frame.getBoundingClientRect(), q = el.getBoundingClientRect();
  const cw = el.querySelector(':scope > .content-wrapper')?.getBoundingClientRect() || q;
  const low = fr.top + cw.top + 1, high = fr.top + cw.bottom + 1 - 476;
  if (high < PANEL_BAND_CLOSES_AT) { closeLayouts(); return; }
  layoutsPlace.top = sectionPanelScrolled({ prev: layoutsPlace.top, H: window.innerHeight, low, high });
  layoutsPanel.style.top = `${layoutsPlace.top}px`;
}
layoutsPanel.addEventListener('click', (e) => {
  const t = e.target.closest('[data-layout]');
  const mix = t && S(layoutsSid) && openedMix();
  if (!mix) return;
  const before = JSON.stringify(model), top = layoutsPanel.querySelector('.lo-list').scrollTop;
  layoutsPicked = layoutsLast = Number(t.dataset.layout);
  applyLayout(S(layoutsSid), mix, layoutsPicked, layoutsBase);
  // A fitted pick: draw it at its new place, then fit its end line to the content (fitLayout), in the same step.
  if (mix.list[layoutsPicked].fit || mix.grows) {
    renderSectionDom(layoutsSid);
    const fe = feEl(layoutsSid), m = measure(fe);
    fitLayout(S(layoutsSid), mix, layoutsPicked, (b) => blockEl(b.id)?.querySelector('.sqs-block-content')?.getBoundingClientRect().height ?? 0, { rg: m.rg, pitch: rowFloor(fe) + m.rg });
  }
  if (sel?.sid === layoutsSid) select(null);
  commit(before, `Layout ${layoutsPicked + 1}`);
  renderAll();
  pickMovesLayouts();
  layoutsMix = openedMix();
  renderLayouts();
  layoutsPanel.querySelector('.lo-list').scrollTop = top;
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && layoutsSid) { e.preventDefault(); closeLayouts(); } });
// A press outside closes it, Undo and Redo don't, and the section's own buttons only close it: they take no press while it is open.
document.addEventListener('mousedown', (e) => {
  if (!layoutsSid || layoutsPanel.contains(e.target) || e.target.closest('#undo, #redo')) return;
  if (e.target.closest('#section-chrome')) layoutsPress = true;
  closeLayouts();
});
const newId = () => Math.random().toString(16).slice(2, 14).padEnd(12, '0') + Date.now().toString(16).slice(-12);
chrome.addEventListener('mousedown', (e) => e.preventDefault());
chrome.addEventListener('click', (e) => {
  if (layoutsPress) { layoutsPress = false; return; }
  const btn = e.target.closest('button[data-sc]');
  const sid = chromeSid();
  if (!btn || !sid || btn.classList.contains('is-off')) return;
  const act = btn.dataset.sc;
  const k = model.sections.findIndex((x) => x.id === sid);
  if (act === 'edit') { editSid = sid; segShown = null; panelFlat = S(sid).flat ? sid : null; heightShown = heightNaN.has(sid) && heightNaN.get(sid) === S(sid).customHeight ? [sid, '', ''] : null; panelPlace = null; sectionTab = 'Design'; customGap = false; secView = null; secMore = {}; filterOpen = tipOpen = false; addMenu.hidden = true; renderSectionPanel(); placeChrome(); return; }
  // Add Block and Layers open over the section's top left (oracle screenshots: the Add Block
  // panel at the Layers box plus 5px, the Layers panel under the Layers button).
  const pill = chrome.querySelector('[data-sc-part="layers"]').getBoundingClientRect(), st = stage.getBoundingClientRect();
  if (act === 'add-block') {
    closeFloating();
    addMenu.innerHTML = addBlockMenuHtml(ADD_TYPES);
    addMenu.style.left = `${pill.left - st.left + 5}px`; addMenu.style.top = `${pill.top - st.top + 1}px`;
    addMenu.dataset.sid = sid; addMenu.hidden = false;
    addMenu.querySelector('input')?.focus();
    return;
  }
  if (act === 'layers') {
    closeFloating();
    layersPanel.dataset.sid = sid;
    renderLayersPanel();
    layersPanel.style.left = `${pill.left - st.left}px`; layersPanel.style.top = `${pill.bottom - st.top + 11}px`;
    layersPanel.hidden = false;
    return;
  }
  if (act === 'add-section-above' || act === 'add-section-below') { openAddSection(sid, act.endsWith('below')); return; }
  if (act === 'save') { saveSection(sid); return; }
  if (act === 'layouts') { if (!btn.hasAttribute('data-unbuilt')) openLayouts(sid); else { note('View Layouts: not built for these blocks'); updateUi(); } return; }
  if (act.startsWith('add-section')) { note(`${btn.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  const before = JSON.stringify(model);
  if (act === 'up' && k > 0) [model.sections[k - 1], model.sections[k]] = [model.sections[k], model.sections[k - 1]];
  if (act === 'down' && k < model.sections.length - 1) [model.sections[k + 1], model.sections[k]] = [model.sections[k], model.sections[k + 1]];
  if (act === 'duplicate') {
    const copy = JSON.parse(JSON.stringify(model.sections[k]));
    copy.id = newId();
    for (const b of copy.blocks) b.id = `yui_copy_${newId()}`;
    model.sections.splice(k + 1, 0, copy);
  }
  if (act === 'remove') {
    model.sections.splice(k, 1);
    if (sel?.sid === sid) sel = null;
    if (editSid === sid) editSid = null;
    hoverSid = null;
  }
  if (JSON.stringify(model) === before) return;
  renderAll();
  renderSectionPanel();
  commit(before, `${btn.getAttribute('aria-label')} ${sid}`);
});
addMenu.addEventListener('click', (e) => {
  if (e.target.closest('[data-am="clear"]')) {
    e.preventDefault();
    addMenu.innerHTML = addBlockMenuHtml(ADD_TYPES);
    addMenu.querySelector('input').focus();
    return;
  }
  const b = e.target.closest('button[data-add]');
  if (!b) return;
  const before = JSON.stringify(model);
  const sid = addMenu.dataset.sid;
  addBlock(sid, b.dataset.add);
  addMenu.hidden = true;
  renderSectionDom(sid);
  frameToLanded(sel.bid);
  commit(before, `Added ${b.dataset.add} to ${sid}`);
});
// ---------- floating menus: Add Block, Layers, the block context menu ----------
const layersPanel = $('layers-panel');
const contextMenu = $('context-menu');
// Site Styles (U12): the top bar button opens the panel and insets the editor; Close and the
// button again close it.
const siteStyles = $('site-styles');
let ssView = null;
let ssSelect = null, ssHelp = false, ssTheme = null, ssThemeList = false, ssTier = 'primary', ssFormKind = 'check', ssFormFont = 'Title', ssFormTheme = null, ssAssign = 0, ssPackTab = 'Sans-serif', ssTierFont = false;
const pal = { swatch: 'accent', tab: 'Presets', format: 'Hex', list: false }; // Edit Palette's own view state
let fontPop = null; // the open font list: { key, query, watch }
let dot = null; // the open color popover: { row, custom, format, list }, and form: the theme when it is a Forms > Colors row
function themeRows() {
  themeColors = themeColors || readThemeColors();
  const used = new Set(model.sections.map((s) => s.theme || 'light'));
  return THEMES.map(([name, v]) => ({ name, ...themeColors[v], used: used.has(v) }));
}
function pageButtonTiers() {
  const out = new Set();
  const walk = (b) => { if (b.type === 'button') out.add(b.buttonStyle || 'primary'); (b.children || []).forEach(walk); };
  for (const s of model.sections) (s.blocks || []).forEach(walk);
  return out;
}
function renderSsPanel() {
  let rows = [];
  if (ssView === 'Colors') rows = themeRows();
  let opts = { select: ssSelect, help: ssHelp, pal, fontRow: fontPop?.key };
  if (ssView === 'ButtonTier') opts = { ...opts, tier: ssTier, pageTiers: pageButtonTiers() };
  if (ssView === 'ThemeRows') {
    themeColors = themeColors || readThemeColors();
    const hit = THEMES.find(([name]) => name === ssTheme);
    opts = { ...opts, theme: { name: ssTheme, ...(hit ? themeColors[hit[1]] : {}) }, themeList: ssThemeList, themeRows: ssThemeList ? themeRows() : [] };
  }
  if (ssView === 'FormOption') opts = { ...opts, formKind: ssFormKind };
  if (ssView === 'FormFont') opts = { ...opts, formFont: ssFormFont };
  if (ssView === 'AssignRow') opts = { ...opts, assignRow: ssAssign };
  if (ssView === 'FontPacks') { opts = { ...opts, packTab: ssPackTab }; loadPackFonts(ssPackTab); }
  if (ssView === 'ButtonTier') opts = { ...opts, tierFont: ssTierFont };
  if (ssView === 'FormColors') { const list = themeRows(); opts = { ...opts, themeRows: list, formTheme: ssFormTheme || list.find((t) => t.used)?.name || 'Light 1', colorRow: dot?.form ? dot.row : null }; }
  const top = siteStyles.scrollTop;
  siteStyles.innerHTML = siteStylesHtml(model.siteStyles, ssView, rows, opts);
  siteStyles.scrollTop = top;
  placeTierFont();
  placeThemeChips();
  const tip = siteStyles.querySelector('.ss-tip');
  if (tip) tip.style.top = `${siteStyles.querySelector('.ss-help').getBoundingClientRect().top - 16}px`;
  if (stylePopKind) siteStyles.querySelector(`[data-ss-pop="${stylePopKind}"]`)?.setAttribute('aria-expanded', 'true');
}
// The Aa chips Edit Color Theme shows on each section (parity/findings/CAP-ARTROWS.json): a press opens that
// theme's rows. They sit over the frame, so the site's own DOM stays as it is.
function placeThemeChips() {
  const host = $('theme-chips'), on = ssView === 'ColorTheme' || ssView === 'ThemeRows';
  host.hidden = !on;
  if (!on) { host.innerHTML = ''; return; }
  const f = frame.getBoundingClientRect(), css = (e) => doc.defaultView.getComputedStyle(e);
  const head = doc.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
  host.innerHTML = [...doc.querySelectorAll('.page-section')].map((el) => {
    const r = el.getBoundingClientRect(), v = (el.dataset.sectionTheme || 'light').replace(/^theme-/, '');
    const name = THEMES.find(([, t]) => t === v)?.[0] || 'Light 1', top = Math.max(r.top, head) + 11;
    if (top + 44 < 0 || top > r.bottom || top > f.height) return '';
    let bg = el; while (bg.parentElement && css(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
    return `<button type="button" class="theme-chip" data-chip-theme="${name}" aria-label="Edit ${name}" style="top:${f.top + top}px;right:${innerWidth - f.right + 6}px;--chip-bg:${css(bg).backgroundColor};color:${css(el).color}"><span class="theme-chip-aa">Aa</span><span class="theme-chip-n">${name}</span></button>`;
  }).join('');
}
$('theme-chips').addEventListener('click', (e) => {
  const c = e.target.closest('[data-chip-theme]');
  if (!c) return;
  closeStylePopover(); ssTheme = c.dataset.chipTheme; ssView = 'ThemeRows'; ssSelect = null; renderSsPanel(); siteStyles.scrollTop = 0;
});
function setSiteStyles(on) {
  if (on) {
    closeFloating(); closeSectionPanel(); ssView = null;
    if (!packFontsLoaded) { document.head.insertAdjacentHTML('beforeend', packFontLinks()); packFontsLoaded = true; }
    renderSsPanel();
  }
  closeStylePopover();
  closeDotPop();
  closeFontList();
  hideStyleConfirm();
  if (!on) ssView = null;
  placeThemeChips();
  siteStyles.hidden = !on;
  document.body.classList.toggle('styles-open', on);
  $('site-styles-toggle').setAttribute('aria-pressed', String(on));
  requestAnimationFrame(() => { placeChrome(); placeToolbar?.(); });
}
$('site-styles-toggle').addEventListener('click', () => setSiteStyles(siteStyles.hidden));
siteStyles.addEventListener('click', (e) => {
  if (e.target.closest('[data-ss="close"]')) { setSiteStyles(false); return; }
  const card = e.target.closest('[data-ss-pop]');
  if (card) { openStylePopover(card.dataset.ssPop); return; }
  const tierBtn = e.target.closest('[data-ss-tier]');
  if (tierBtn) {
    ssTier = tierBtn.dataset.ssTier; ssTierFont = false;
    if (tierBtn.getAttribute('role') === 'tab') { ssSelect = null; renderSsPanel(); return; }
  }
  const packTab = e.target.closest('[data-ss-packtab]');
  if (packTab) { ssPackTab = packTab.dataset.ssPacktab; renderSsPanel(); siteStyles.scrollTop = 0; return; }
  if (e.target.closest('[data-ss-tierfont]')) { ssTierFont = !ssTierFont; ssSelect = null; closeFontList(); renderSsPanel(); return; }
  if (tierPress(e) || formPress(e)) return;
  const open = e.target.closest('[data-ss-view]');
  if (open || e.target.closest('[data-ss-back]')) { ssThemeList = false; ssTierFont = false; closeDotPop(); closeFontList(); pal.list = false; }
  // Edit Color Theme's back goes to Site Styles' Colors, not to the section panel it was opened from (CAP-DIVSHAPES.json).
  if (ssView === 'ColorTheme' && e.target.closest('[data-ss-back]')) { ssView = 'Colors'; ssSelect = null; renderSsPanel(); siteStyles.scrollTop = 0; return; }
  if (e.target.closest('[data-ss-help]')) { ssHelp = !ssHelp; renderSsPanel(); return; }
  if (e.target.closest('[data-ss-theme-list]')) { ssThemeList = !ssThemeList; renderSsPanel(); return; }
  const row = e.target.closest('[data-ss-theme]');
  if (row) { closeStylePopover(); ssTheme = row.dataset.ssTheme; ssView = 'ThemeRows'; ssSelect = null; ssThemeList = false; renderSsPanel(); siteStyles.scrollTop = 0; return; }
  const rowBtn = e.target.closest('[data-ss-row]');
  if (rowBtn) { openDotPop(Number(rowBtn.dataset.ssRow), rowBtn); return; }
  if (e.target.closest('[data-ss-theme-reset]')) { showStyleConfirm('theme'); return; }
  const sw = e.target.closest('[data-pal-swatch]');
  if (sw) { pal.swatch = sw.dataset.palSwatch; renderSsPanel(); return; }
  const tab = e.target.closest('[data-pal-tab]');
  if (tab) { pal.tab = tab.dataset.palTab; renderSsPanel(); return; }
  const preset = e.target.closest('[data-pal-preset]');
  if (preset) { const p = PALETTE_PRESETS[Number(preset.dataset.palPreset)]; setPalette(Object.fromEntries(['white', 'lightAccent', 'accent', 'darkAccent', 'black'].map((k, i) => [k, rgbToHsl(hexToRgb(p[i]))])), preset.getAttribute('aria-label')); return; }
  const from = e.target.closest('[data-pal-from]');
  if (from) { setPalette(fromColor(palette().accent, Number(from.dataset.palFrom)), from.getAttribute('aria-label')); return; }
  if (colorFormatPress(e, pal)) { renderSsPanel(); return; }
  const fontBtn = e.target.closest('[data-ss-fontrow]');
  if (fontBtn) { const same = fontPop?.key === fontBtn.dataset.ssFontrow; closeFontList(); if (!same) openFontList(fontBtn); return; }
  const sel0 = e.target.closest('[data-ss-select]');
  if (sel0?.dataset.ssFcTheme) {
    const name = sel0.getAttribute('aria-label'), same = dot?.form && dot.row === name;
    closeDotPop();
    if (!same) { openDotPop(name, sel0, sel0.dataset.ssFcTheme); sel0.setAttribute('aria-expanded', 'true'); }
    return;
  }
  if (sel0) { ssSelect = ssSelect === sel0.dataset.ssSelect ? null : sel0.dataset.ssSelect; renderSsPanel(); return; }
  const set0 = e.target.closest('button[data-ss-set]');
  if (set0) { ssSelect = null; setSsValue(set0.dataset.ssSet, set0.dataset.v); return; }
  const pick0 = e.target.closest('button[data-ss-pick]');
  if (pick0 && !pick0.hasAttribute('data-unbuilt')) { applyStylePick(pick0); renderSsPanel(); return; }
  if (open || e.target.closest('[data-ss-back]')) {
    closeStylePopover();
    ssSelect = null; ssHelp = false;
    ssView = open ? open.dataset.ssView : SS_SUB[ssView]?.[0] ?? null;
    renderSsPanel();
    siteStyles.scrollTop = 0;
    return;
  }
  const step = e.target.closest('[data-ss-base]');
  if (step) { setBaseSize(baseSize(model.siteStyles) + Number(step.dataset.ssBase)); return; }
  const r = e.target.closest('[data-ss-reset]');
  if (r) showStyleConfirm(r.dataset.ssReset);
});
// Edit Palette (parity/findings/CAP-THEMEROWS.json): the selected swatch's color. Each change is one undo
// step and a press on the map or hue moves it; a drag stays one step.
function palette() {
  const v = resolveSiteStyles(model.siteStyles).vars || BASE_VARS;
  return Object.fromEntries(PALETTE_VARS.map((k, i) => [k, v[i]]));
}
function withColors(colors) { model.siteStyles = { ...(model.siteStyles || {}), colors: { ...(model.siteStyles?.colors || {}), ...colors } }; }
function setPalette(colors, label) {
  const before = JSON.stringify(model);
  withColors(colors);
  commit(before, `Site Styles: ${label}`);
  renderAll();
  fitHeader();
}
// The format list and its choice, shared by the palette and the popover's custom view.
function colorFormatPress(e, state) {
  if (e.target.closest('[data-cformat-open]')) { state.list = !state.list; return true; }
  const f = e.target.closest('[data-cformat-pick]');
  if (f) { state.format = f.dataset.cformatPick; state.list = false; return true; }
  return false;
}
// Read the number or hex boxes of a format. A wrong entry changes nothing, as on the oracle.
function typedColor(input) {
  const boxes = [...input.closest('.ss-hex').querySelectorAll('input[data-cformat]')].map((b) => b.value);
  const fmt = input.dataset.cformat;
  if (fmt === 'Hex') return hexToRgb(boxes[0]);
  if (boxes.some((b) => !Number.isFinite(Number(b)))) return null;
  if (fmt === 'RGB') return boxes.map(clampByte);
  return hueToRgb(Number(boxes[0]), Math.min(100, Math.max(0, Number(boxes[1]))), Math.min(100, Math.max(0, Number(boxes[2]))));
}
// A press and drag on a map or track: changes apply as it moves and undo as one step.
function colorDrag(e, apply) {
  e.preventDefault();
  const before = JSON.stringify(model), r = e.target.closest('[data-cmap],[data-chue],[data-calpha]').getBoundingClientRect();
  const run = (ev) => { apply(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)), ev.clientX - r.left, r); applySiteStyles(); };
  const up = () => { window.removeEventListener('pointermove', run); window.removeEventListener('pointerup', up); commit(before, 'Site Styles: color'); renderAll(); fitHeader(); };
  window.addEventListener('pointermove', run);
  window.addEventListener('pointerup', up);
  run(e);
}
function mapOrHue(kind, x, y, rgb, set) {
  if (kind === 'map') { const [h] = rgbToHsv(rgb); set(hsvToRgb(h, x, 1 - y)); return; }
  const [, s, l] = rgbToHslParts(rgb); set(hueToRgb(x * 360, s, l));
}
siteStyles.addEventListener('pointerdown', (e) => {
  const kind = e.target.closest('[data-cmap]') ? 'map' : e.target.closest('[data-chue]') ? 'hue' : null;
  if (!kind || ssView !== 'EditPalette') return;
  const key = pal.swatch;
  colorDrag(e, (x, y) => mapOrHue(kind, x, y, hslToRgb(palette()[key]), (rgb) => withColors({ [key]: rgbToHsl(rgb) })));
});
// The font list (U12, CAP-U12FONTLIST.json). It lives outside the panel, so a pick's redraw keeps its place.
const fontList = $('ss-font-list');
function closeFontList() {
  if (!fontPop) return;
  fontPop.watch?.disconnect();
  siteStyles.querySelector(`[data-ss-fontrow="${fontPop.key}"]`)?.setAttribute('aria-expanded', 'false');
  fontPop = null; fontList.hidden = true; fontList.innerHTML = '';
}
function fontRowsNow() {
  const host = fontList.querySelector('.ss-fl-scroll'), top = host.scrollTop;
  fontPop.watch?.disconnect();
  host.innerHTML = fontRowsHtml(model.siteStyles, fontPop.key, fontPop.query);
  host.scrollTop = top;
  fontPop.watch = watchFontRows(host);
}
// The tiles of a Font Packs tab draw in their own fonts: those load when the tab first opens, a name at a time, so the panel still works offline.
const packFontsDone = new Set();
function loadPackFonts(tab) {
  if (packFontsDone.has(tab)) return;
  packFontsDone.add(tab);
  const seen = new Map(ALL_FONT_PACKS[tab].flatMap((f) => [[`${f.h}|${f.hw}`, [f.h, f.hw]], [`${f.p}|${f.pw}`, [f.p, f.pw]]]));
  document.head.insertAdjacentHTML('beforeend', [...seen.values()].map(([n, w]) => fontLink(n, w)).join(''));
}
function placeTierFont() {
  const pop = siteStyles.querySelector('.ss-tf-pop');
  if (pop) pop.style.top = `${siteStyles.querySelector('.ss-tier-font').getBoundingClientRect().bottom}px`;
}
function closeTierFont() { if (!ssTierFont) return; ssTierFont = false; ssSelect = null; renderSsPanel(); }
// Escape closes it, with any list open in it (read). A press elsewhere closing it is inferred.
document.addEventListener('keydown', (e) => { if (ssTierFont && !fontPop && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeTierFont(); } }, true);
document.addEventListener('pointerdown', (e) => { if (ssTierFont && !e.target.closest?.('.ss-tf-pop,[data-ss-tierfont],#ss-font-list')) closeTierFont(); }, true);
function openFontList(btn) {
  fontPop = { key: btn.dataset.ssFontrow, query: '' };
  btn.setAttribute('aria-expanded', 'true');
  fontList.innerHTML = fontListHtml(model.siteStyles, fontPop.key);
  fontList.style.top = `${fontListTop(btn.getBoundingClientRect().bottom, innerHeight)}px`;
  fontList.hidden = false;
  fontPop.watch = watchFontRows(fontList.querySelector('.ss-fl-scroll'));
}
fontList.addEventListener('click', (e) => {
  const pick = e.target.closest('[data-ss-font]');
  if (!pick) return;
  const key = fontPop.key, f = pick.dataset.ssFont;
  setSiteStyleKeys(`${key} font ${f}`, (st) => { st.type = { ...(st.type || {}), [key]: { ...(st.type?.[key] || {}), family: f } }; return st; });
  fontRowsNow();
});
fontList.addEventListener('input', (e) => { if (e.target.matches('input')) { fontPop.query = e.target.value; fontRowsNow(); fontList.querySelector('.ss-fl-scroll').scrollTop = 0; } });
document.addEventListener('pointerdown', (e) => { if (fontPop && !fontList.contains(e.target) && !e.target.closest?.('[data-ss-fontrow]')) closeFontList(); }, true);
document.addEventListener('keydown', (e) => { if (fontPop && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFontList(); } }, true);
// A row's color popover (U12): five palette circles, Custom color, the opacity track. Centered on its row.
const dotPop = $('ss-dot-pop');
function closeDotPop() {
  if (dot?.form) siteStyles.querySelector(`[data-ss-select="form-color-${dot.row}"]`)?.setAttribute('aria-expanded', 'false');
  dot = null; dotPop.hidden = true; dotPop.innerHTML = '';
}
function rowNow(i) {
  const st = model.siteStyles;
  return dot?.form ? formColor(st, dot.form, i) : rowValue(st, resolveSiteStyles(st).picked, ssTheme, i);
}
function setRow(i, value) {
  const st = model.siteStyles || {};
  if (dot?.form) {
    const colors = st.forms?.colors || {};
    model.siteStyles = { ...st, forms: { ...(st.forms || {}), colors: { ...colors, [dot.form]: { ...(colors[dot.form] || {}), [i]: value } } } };
    return;
  }
  model.siteStyles = { ...st, themeRows: { ...(st.themeRows || {}), [ssTheme]: { ...(st.themeRows?.[ssTheme] || {}), [i]: value } } };
}
function renderDotPop() {
  if (!dot) return;
  dotPop.innerHTML = dotPopHtml(rowNow(dot.row), dot, palette());
  dotPop.classList.toggle('is-custom', dot.custom);
  const h = dot.custom ? DOT_POP_HEIGHT.custom : DOT_POP_HEIGHT.small;
  dotPop.style.height = `${h}px`;
  dotPop.style.top = `${dotPopTop(dot.center, dot.custom, innerHeight)}px`;
  dotPop.hidden = false;
}
function openDotPop(i, rowEl, form = null) {
  const r = rowEl.getBoundingClientRect();
  dot = { row: i, form, custom: false, format: 'RGB', list: false, center: r.top + r.height / 2 };
  renderDotPop();
}
function changeRow(label, change) {
  const before = JSON.stringify(model);
  change();
  commit(before, `Site Styles: ${label}`);
  renderAll();
}
dotPop.addEventListener('click', (e) => {
  const role = e.target.closest('input[data-dot-role]');
  if (role) { const v = rowNow(dot.row); changeRow('row color', () => setRow(dot.row, { role: role.dataset.dotRole, a: v.a ?? 1 })); return; }
  if (e.target.closest('[data-dot-custom]')) {
    if (!dot.custom) { const v = rowNow(dot.row); dot.custom = true; changeRow('row color', () => setRow(dot.row, { rgb: v.rgb || hslToRgb(palette()[v.role]), a: v.a ?? 1 })); renderDotPop(); }
    return;
  }
  if (colorFormatPress(e, dot)) renderDotPop();
});
dotPop.addEventListener('pointerdown', (e) => {
  const kind = e.target.closest('[data-cmap]') ? 'map' : e.target.closest('[data-chue]') ? 'hue' : e.target.closest('[data-calpha]') ? 'alpha' : null;
  if (!kind) return;
  const i = dot.row;
  colorDrag(e, (x, y, px, r) => {
    const v = rowNow(i), rgb = v.rgb || hslToRgb(palette()[v.role]);
    if (kind === 'alpha') { setRow(i, { ...v, a: Math.round(100 * Math.min(1, Math.max(0, (px - 11) / (r.width - 22)))) / 100 }); return; }
    mapOrHue(kind, x, y, rgb, (out) => setRow(i, { rgb: out, a: v.a ?? 1 }));
  });
});
dotPop.addEventListener('change', (e) => {
  const v = rowNow(dot.row);
  if (e.target.matches('[data-calpha-in]')) { const a = parseFloat(e.target.value); if (Number.isFinite(a)) changeRow('row opacity', () => setRow(dot.row, { ...v, a: Math.min(100, Math.max(0, a)) / 100 })); else renderDotPop(); return; }
  if (!e.target.matches('[data-cformat]')) return;
  const rgb = typedColor(e.target);
  if (rgb) changeRow('row color', () => setRow(dot.row, { rgb, a: v.a ?? 1 }));
});
document.addEventListener('pointerdown', (e) => { if (dot && !dotPop.contains(e.target) && !e.target.closest?.('[data-ss-row],[data-ss-fc-theme]')) closeDotPop(); }, true);
document.addEventListener('keydown', (e) => { if (dot && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeDotPop(); } }, true);
document.addEventListener('keydown', (e) => { if ((ssSelect === 'tier-shape' || ssSelect?.startsWith('form-')) && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); ssSelect = null; renderSsPanel(); } }, true);
siteStyles.addEventListener('input', (e) => {
  if (!e.target.matches('.ss-slide input[type="range"]')) return;
  const r = e.target;
  r.parentElement.querySelector('input[type="text"]').value = r.value + (r.dataset.unit || '');
  r.style.setProperty('--p', `${(100 * (r.value - r.min)) / (r.max - r.min)}%`);
});
// A button type's Shape list (parity/findings/CAP-BUTTONROWS.json): it stays open, and each press is one undo step.
function setTier(label, change) {
  setSiteStyleKeys(`${TIER_NAMES[ssTier]} button ${label}`, (st) => { st.buttons = { ...(st.buttons || {}), [ssTier]: { ...(st.buttons?.[ssTier] || {}), ...change } }; return st; });
}
function setForms(label, change) {
  setSiteStyleKeys(`Forms ${label}`, (st) => { st.forms = { ...(st.forms || {}), ...change }; return st; });
}
// The Forms view's rows (parity/findings/CAP-FORMROWS.json). Field Shape's list stays open, as Shape's does.
function setFormKind(label, change) {
  setSiteStyleKeys(`${FORM_KINDS[ssFormKind]} ${label}`, (st) => { st.forms = { ...(st.forms || {}), [ssFormKind]: { ...(st.forms?.[ssFormKind] || {}), ...change } }; return st; });
}
// Selection Options (parity/findings/CAP-FORMSUBS.json): the same shape list and steps, one set per kind.
function formOptionPress(e) {
  const o = formOption(model.siteStyles, ssFormKind);
  const shape = e.target.closest('[data-ss-oshape]');
  if (shape) { const n = shape.dataset.ssOshape; setFormKind(n, n === 'Custom' ? { shape: n, multi: false, radii: Array(4).fill(OPTION_RADIUS) } : { shape: n }); return true; }
  const radii = e.target.closest('[data-ss-oradii]');
  if (radii) { setFormKind('corners', { multi: radii.dataset.ssOradii === 'multi' }); return true; }
  if (e.target.closest('[data-ss-ofill]')) { setFormKind('fill', { fill: !o.fill }); return true; }
  const thick = e.target.closest('[data-ss-othick]');
  if (thick) {
    const n = Math.max(1, o.thick + Number(thick.dataset.ssOthick));
    if (n !== o.thick) setFormKind('border thickness', { thick: n }); else renderSsPanel();
    return true;
  }
  return false;
}
// Colors: the theme picker changes only which theme the rows show. A row opens the color popover (openDotPop).
function formColorPress(e) {
  const pick = e.target.closest('[data-ss-ftheme]');
  if (pick) { ssFormTheme = pick.dataset.ssFtheme; ssSelect = null; renderSsPanel(); return true; }
  return false;
}
function formPress(e) {
  if (formOptionPress(e) || formColorPress(e)) return true;
  const kind = e.target.closest('[data-ss-fkind]');
  if (kind) ssFormKind = kind.dataset.ssFkind;
  const font = e.target.closest('[data-ss-ffont]');
  if (font) ssFormFont = font.dataset.ssFfont;
  const assign = e.target.closest('[data-ss-assign]');
  if (assign) ssAssign = Number(assign.dataset.ssAssign);
  const f = formValues(model.siteStyles);
  const shape = e.target.closest('[data-ss-fshape]');
  if (shape) { const n = shape.dataset.ssFshape; const r = FORM_CUSTOM_RADIUS; setForms(n, n === 'Custom' ? { shape: n, multi: false, radii: [r, r, r, r] } : { shape: n }); return true; }
  const radii = e.target.closest('[data-ss-fradii]');
  if (radii) { setForms('corners', { multi: radii.dataset.ssFradii === 'multi' }); return true; }
  if (e.target.closest('[data-ss-ffill]')) { setForms('fill', { fill: !f.fill }); return true; }
  const border = e.target.closest('[data-ss-fborder]');
  if (border) { setForms('border', { border: border.dataset.ssFborder === '1' }); return true; }
  const thick = e.target.closest('[data-ss-fthick]');
  if (thick) {
    const n = Math.max(1, f.thick + Number(thick.dataset.ssFthick));
    if (n !== f.thick) setForms('border thickness', { thick: n }); else renderSsPanel();
    return true;
  }
  return false;
}
function tierPress(e) {
  const fill = e.target.closest('[data-ss-fill]');
  if (fill) { setTier('fill', { fill: fill.dataset.ssFill === '1' }); return true; }
  const shape = e.target.closest('[data-ss-shape]');
  if (shape) {
    const n = shape.dataset.ssShape;
    setTier(n, n === 'Custom' ? { shape: n, multi: false, radii: [CUSTOM_RADIUS, CUSTOM_RADIUS, CUSTOM_RADIUS, CUSTOM_RADIUS] } : { shape: n });
    return true;
  }
  const radii = e.target.closest('[data-ss-radii]');
  if (radii) { setTier('corners', { multi: radii.dataset.ssRadii === 'multi' }); return true; }
  return false;
}
// A row of Headings, Paragraphs, Spacing or Animations: one value in the site's styles, one undo step.
function setSsValue(path, raw) {
  const [a, b, c] = path.split('.');
  setSiteStyleKeys(`${path} ${raw}`, (st) => {
    const num = (v) => (typeof v === 'string' && /^-?[0-9.]/.test(v) ? parseFloat(v) : v);
    if (c) { st[a] = { ...(st[a] || {}), [b]: { ...(st[a]?.[b] || {}), [c]: num(raw) } }; return st; }
    st[a] = { ...(st[a] || {}), [b]: a === 'anim' ? raw : num(raw) };
    return st;
  });
}
siteStyles.addEventListener('change', (e) => {
  if (e.target.matches('[data-cformat]')) { const rgb = typedColor(e.target); if (rgb) setPalette({ [pal.swatch]: rgbToHsl(rgb) }, 'palette color'); return; }
  if (e.target.matches('[data-ss-othickin]')) {
    const n = parseInt(e.target.value, 10);
    if (Number.isFinite(n) && n >= 1) setFormKind('border thickness', { thick: n }); else renderSsPanel();
    return;
  }
  if (e.target.matches('[data-ss-oradius]')) {
    const n = Number(e.target.value), o = formOption(model.siteStyles, ssFormKind), i = Number(e.target.dataset.ssOradius);
    if (!Number.isFinite(n) || n < 0) { renderSsPanel(); return; }
    setFormKind('corner', { radii: o.multi ? o.radii.map((r, k) => (k === i ? n : r)) : o.radii.map(() => n) });
    return;
  }
  if (e.target.matches('[data-ss-fthickin]')) {
    const n = parseInt(e.target.value, 10);
    if (Number.isFinite(n) && n >= 1) setForms('border thickness', { thick: n }); else renderSsPanel();
    return;
  }
  if (e.target.matches('[data-ss-fradius]')) {
    const n = Number(e.target.value), f = formValues(model.siteStyles), i = Number(e.target.dataset.ssFradius);
    if (!Number.isFinite(n) || n < 0) { renderSsPanel(); return; }
    setForms('corner', { radii: f.multi ? f.radii.map((r, k) => (k === i ? n : r)) : f.radii.map(() => n) });
    return;
  }
  if (e.target.matches('[data-ss-radius]')) {
    const n = Number(e.target.value), v = tierValues(model.siteStyles, resolveSiteStyles(model.siteStyles).button, ssTier), i = Number(e.target.dataset.ssRadius);
    if (!Number.isFinite(n) || n < 0) { renderSsPanel(); return; }
    setTier('corner', { radii: v.multi ? v.radii.map((r, k) => (k === i ? n : r)) : v.radii.map(() => n) });
    return;
  }
  const set1 = e.target.closest('input[data-ss-set]');
  if (set1) {
    let raw = set1.type === 'radio' ? set1.dataset.v : set1.type === 'text' ? parseFloat(set1.value) : Number(set1.value);
    if (typeof raw === 'number' && !Number.isFinite(raw)) { renderSsPanel(); return; }
    if (set1.type === 'text') { const r = set1.parentElement.querySelector('input[type="range"]'); raw = Math.min(Number(r.max), Math.max(Number(r.min), raw)); }
    setSsValue(set1.dataset.ssSet, raw);
    return;
  }
  if (!e.target.matches('.ss-base-in')) return;
  const n = parseInt(e.target.value, 10);
  if (Number.isFinite(n)) setBaseSize(n); else renderSsPanel();
});
// Base Size: one undo step per press. The limits are the oracle's (parity/findings/CAP-BASESIZE.json).
function setSiteStyleKeys(label, change) {
  const before = JSON.stringify(model);
  model.siteStyles = change({ ...(model.siteStyles || {}) });
  commit(before, `Site Styles: ${label}`);
  renderAll();
  fitHeader();
}
function setBaseSize(px) {
  const n = Math.min(24, Math.max(12, px));
  if (n === baseSize(model.siteStyles)) { renderSsPanel(); return; }
  setSiteStyleKeys('Base Size', (st) => ({ ...st, base: n }));
}
// Reset asks first, as on the oracle. Reset clears the pack picked in that view; the theme stays.
const styleConfirm = $('ss-confirm');
let styleConfirmKind = null;
function hideStyleConfirm() { styleConfirm.hidden = true; styleConfirmKind = null; }
function showStyleConfirm(kind) {
  styleConfirmKind = kind;
  const word = kind === 'font' ? 'font' : kind === 'form' ? 'form' : 'button', box = styleConfirm.querySelector('.ss-confirm-box');
  box.classList.toggle('is-tall', kind === 'match');
  $('ss-confirm-reset').classList.toggle('is-plain', kind === 'match' || kind === 'apply');
  $('ss-confirm-reset').textContent = kind === 'match' ? 'Continue' : kind === 'apply' ? 'Apply to all' : 'Reset';
  if (kind === 'match' || kind === 'apply' || kind === 'tier') {
    // The first two are the oracle's words. Reset of one type is ours: the oracle's was not pressed (decision 0005).
    $('ss-confirm-title').textContent = kind === 'match' ? 'Match style of primary button?' : kind === 'apply' ? 'Apply to all buttons?' : `Reset ${TIER_NAMES[ssTier]} Button`;
    $('ss-confirm-body').textContent = kind === 'match' ? `Your ${ssTier} button settings will be replaced to match the primary button style.` : kind === 'apply' ? 'Secondary and tertiary buttons will match new primary button styles.' : 'Are you sure you want to reset this button to its default settings?';
    styleConfirm.hidden = false;
    return;
  }
  // Reset Color Theme is ours: the oracle's was not pressed (decision 0005), so these words are our own.
  $('ss-confirm-title').textContent = kind === 'theme' ? 'Reset Color Theme' : `Reset ${word === 'font' ? 'Font' : word === 'form' ? 'Form' : 'Button'} Pack`;
  $('ss-confirm-body').textContent = kind === 'theme' ? 'Are you sure you want to reset this color theme to its default settings?' : `Are you sure you want to reset this ${word} pack to its default settings?`;
  styleConfirm.hidden = false;
}
styleConfirm.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (socConfirmRow != null) { const n = socConfirmRow, yes = b.id === 'ss-confirm-reset'; closeSocialConfirm(); if (yes) { socView = null; changeSocialList((l) => l.splice(n, 1), 'Social link deleted'); } return; }
  const kind = styleConfirmKind;
  hideStyleConfirm();
  if (b.id !== 'ss-confirm-reset') return;
  if (kind === 'theme') {
    // From a section's Colors tab no one theme is open, so all of them go back.
    setSiteStyleKeys('Reset Color Theme', (st) => { const rows = { ...(st.themeRows || {}) }; if (ssView === 'ThemeRows') delete rows[ssTheme]; st.themeRows = ssView === 'ThemeRows' && Object.keys(rows).length ? rows : undefined; if (!st.themeRows) delete st.themeRows; return st; });
    return;
  }
  if (kind === 'match' || kind === 'apply' || kind === 'tier') {
    const pack = resolveSiteStyles(model.siteStyles).button, first = tierValues(model.siteStyles, pack, 'primary');
    setSiteStyleKeys(kind === 'tier' ? `Reset ${ssTier} button` : kind === 'apply' ? 'Apply to all button types' : `Match ${ssTier} button`, (st) => {
      const all = { ...(st.buttons || {}) };
      if (kind === 'tier') delete all[ssTier];
      else if (kind === 'match') all[ssTier] = { ...first };
      else for (const t of TIERS) all[t] = { ...first };
      st.buttons = all;
      if (!Object.keys(all).length) delete st.buttons;
      return st;
    });
    return;
  }
  setSiteStyleKeys(`Reset ${kind} pack`, (st) => { delete st[kind]; if (kind === 'button') delete st.buttons; if (kind === 'form') delete st.forms; if (kind === 'font') { delete st.base; delete st.type; delete st.fontAssign; } return st; });
});
// A style pack popover (parity/findings/SITESTYLES2.json). A tile sets that part of the site's
// styles in one undo step and the popover stays open, as on the oracle.
const stylePop = $('ss-popover');
let stylePopKind = null;
let packFontsLoaded = false;
function closeStylePopover() {
  stylePop.hidden = true; stylePopKind = null;
  for (const c of siteStyles.querySelectorAll('[data-ss-pop]')) c.setAttribute('aria-expanded', 'false');
}
function renderStylePopover() {
  stylePop.innerHTML = stylePopoverHtml(stylePopKind, model.siteStyles);
}
function openStylePopover(kind) {
  const again = stylePopKind === kind;
  closeStylePopover();
  if (again) return;
  stylePopKind = kind;
  renderStylePopover();
  const card = siteStyles.querySelector(`[data-ss-pop="${kind}"]`);
  card.setAttribute('aria-expanded', 'true');
  const p = stylePopoverPosition(kind, card.getBoundingClientRect().top, frame.getBoundingClientRect().right, innerHeight);
  stylePop.style.left = `${p.left}px`; stylePop.style.top = `${p.top}px`; stylePop.style.height = `${p.height}px`;
  stylePop.hidden = false;
}
function applyStylePick(t) {
  const before = JSON.stringify(model);
  const kind = t.dataset.ssPick;
  const st = { ...(model.siteStyles || {}) };
  // A popover's palette replaces the palette's own edits.
  if (kind === 'palette') delete st.colors;
  if (kind === 'button') delete st.buttons;
  if (kind === 'form') delete st.forms;
  model.siteStyles = kind === 'theme' ? { theme: t.dataset.v } : { ...st, [kind]: t.dataset.v };
  // A font pack sets the fonts, so the rows' own picks go (inferred: no pick is read).
  if (kind === 'font' && st.type) model.siteStyles.type = Object.fromEntries(Object.entries(st.type).map(([k, { family, ...rest }]) => [k, rest]));
  commit(before, `Site Styles: ${t.getAttribute('aria-label')}`);
  renderAll();
  fitHeader();
}
stylePop.addEventListener('click', (e) => {
  const customize = e.target.closest('[data-ss-customize]');
  if (customize) { closeStylePopover(); ssView = customize.dataset.ssCustomize; ssSelect = null; renderSsPanel(); siteStyles.scrollTop = 0; return; }
  const t = e.target.closest('button[data-ss-pick]');
  if (!t || t.hasAttribute('data-unbuilt')) return;
  const top = stylePop.scrollTop;
  applyStylePick(t);
  stylePop.scrollTop = top;
});
// A change to the styles, undo included, redraws the panel and an open popover.
onStylesApplied = () => {
  if (siteStyles.hidden) return;
  renderSsPanel();
  renderDotPop();
  if (stylePopKind) renderStylePopover();
};

// The row handle (S4, parity/findings/S4.json): dragging it changes the section's row count by
// the drag distance over one row step (row plus gap), rounded, never below the lowest row the
// blocks need; one undo step per drag.
chrome.addEventListener('pointerdown', (e) => {
  const h = e.target.closest('.sc-rows');
  if (!h || e.button !== 0) return;
  e.preventDefault(); e.stopPropagation();
  const sid = chromeSid();
  const s = S(sid);
  const fe = feEl(sid);
  if (!s || !fe) return;
  const before = JSON.stringify(model);
  const step = measure(fe).pitch;
  const start = s.rows[bp];
  const need = Math.max(1, ...s.blocks.map((b) => lay(b).area[2] - 1));
  const y0 = e.clientY;
  // Over the canvas the pointer would otherwise go to the frame.
  chrome.setPointerCapture(e.pointerId);
  const move = (ev) => {
    const n = Math.max(need, start + Math.round((ev.clientY - y0) / step));
    if (n !== s.rows[bp]) { s.rows[bp] = n; renderSectionDom(sid); placeChrome(); }
  };
  const up = () => {
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
    commit(before, `Rows of ${sid}: ${s.rows[bp]}`);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

const styleMenu = $('button-style-menu');
styleMenu.addEventListener('mousedown', (e) => e.preventDefault());
styleMenu.addEventListener('click', (e) => {
  const o = e.target.closest('[data-bstyle]');
  if (!o) return;
  styleMenu.hidden = true;
  setButtonStyle(styleMenu.dataset.sid, styleMenu.dataset.bid, o.dataset.bstyle);
});

const pinPop = $('pin-popover');
// Each option keeps its own Offset with its unit, and one never set starts at 0px (97, CAP-U4PINTO.json, CAP-U4PINTO2.json:
// 5vh on Top, Center 0px, 3vh on Center, Bottom 0px, Center 3vh again, Top 5vh again). The others wait in kept.
function pinTo(st, k) {
  const kept = { ...(st?.kept || {}) };
  if (st) kept[st.anchor] = { offset: st.offset, ...(st.unit ? { unit: st.unit } : {}) };
  const got = kept[k] || { offset: 0 };
  delete kept[k];
  return { anchor: k, ...got, ...(Object.keys(kept).length ? { kept } : {}) };
}
function openPin(sid, bid) {
  const b = B(sid, bid);
  pinPop.dataset.sid = sid; pinPop.dataset.bid = bid;
  pinPop.innerHTML = pinPopoverHtml(lay(b).sticky);
  const btn = document.querySelector('#block-toolbar [data-tb="pin"]');
  const st = stage.getBoundingClientRect();
  if (btn) { const r = btn.getBoundingClientRect(); pinPop.style.left = `${Math.max(8, r.left + r.width / 2 - 124 - st.left)}px`; pinPop.style.top = `${r.bottom + 7 - st.top}px`; }
  pinPop.hidden = false;
}
function setPin(change, label) {
  const b = B(pinPop.dataset.sid, pinPop.dataset.bid);
  if (!b) return;
  const before = JSON.stringify(model);
  change(lay(b));
  renderSectionDom(pinPop.dataset.sid);
  commit(before, label);
  if (lay(b).sticky) openPin(pinPop.dataset.sid, pinPop.dataset.bid);
  else pinPop.hidden = true; // Remove Pin closes the popover (CAP-U4PINTO.json, CAP-U4UNPIN.json: no Offset field, both reads).
}
pinPop.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });
pinPop.addEventListener('click', (e) => {
  const o = e.target.closest('[data-pin]');
  if (!o) return;
  const k = o.dataset.pin;
  setPin((L) => { if (k === 'remove') { L.unpinned = L.sticky; delete L.sticky; } else L.sticky = pinTo(L.sticky, k); }, k === 'remove' ? 'Removed the pin' : `Pinned to ${k}`);
});
// The field wants a number and a unit, exactly so: anything else stays as typed until the field is
// left, then goes back. No limit on the number; the slider only shows what fits its range.
const PIN_VALUE = /^(-?\d*\.?\d+)(px|em|rem|vh|vw|%)$/;
function applyPinField(f, revert) {
  const L = lay(B(pinPop.dataset.sid, pinPop.dataset.bid));
  const m = f.value.match(PIN_VALUE);
  if (!L?.sticky) return;
  if (!m) { if (revert) f.value = `${L.sticky.offset}${L.sticky.unit || 'px'}`; return; }
  const offset = parseFloat(m[1]), unit = m[2];
  if (offset === L.sticky.offset && unit === (L.sticky.unit || 'px')) return;
  const before = JSON.stringify(model);
  L.sticky = { ...L.sticky, offset, unit };
  if (unit === 'px') delete L.sticky.unit;
  renderSectionDom(pinPop.dataset.sid);
  commit(before, `Pin offset ${f.value}`);
  pinPop.querySelector('[data-pin-range]').value = pinRangeValue(offset);
}
// The slider moves the block as it goes, and each new value is its own undo step (r42 on the
// oracle: five values in one drag took five undos).
pinPop.addEventListener('input', (e) => {
  if (!e.target.matches('[data-pin-range]')) return;
  const L = lay(B(pinPop.dataset.sid, pinPop.dataset.bid));
  if (!L?.sticky) return;
  const before = JSON.stringify(model);
  const offset = Number(e.target.value), unit = L.sticky.unit;
  L.sticky = { ...L.sticky, offset }; // It keeps the unit (CAP-U4PINUNIT.json, CAP-U4PINDRAG.json).
  renderSectionDom(pinPop.dataset.sid);
  commit(before, `Pin offset ${offset}${unit || 'px'}`);
  pinPop.querySelector('[data-pin-offset]').value = `${offset}${unit || 'px'}`;
});
pinPop.addEventListener('focusout', (e) => { if (e.target.matches('[data-pin-offset]')) applyPinField(e.target, true); });
// Keys typed here stay here: an arrow on the slider must not nudge the block.
pinPop.addEventListener('keydown', (e) => {
  if (!e.metaKey && !e.ctrlKey) e.stopPropagation();
  if (e.key === 'Enter' && e.target.matches('[data-pin-offset]')) applyPinField(e.target, false);
  if (e.key === 'Escape') pinPop.hidden = true;
});


// Add a Section (U10): the panel remembers where the new section goes.
const addSectionPanel = $('add-section-panel');
let addSectionAt = null;
let addSectionCat = 'Intro';
let addSectionSize = 'medium';
// Save Section keeps a copy of the section in this browser; Saved in Add a Section lists them
// (U10). What the oracle's Save Section stores was not measured: it writes outside the page.
const SAVED_KEY = 'fe-saved-sections';
function savedSections() { try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; } catch { return []; } }
function writeSaved(list) { try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); return true; } catch { return false; } }
function saveSection(sid) {
  const s = S(sid);
  const text = s.blocks.map((b) => b.html || '').join(' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const name = text ? text.split(' ').slice(0, 5).join(' ') : 'Blank section';
  note(writeSaved([...savedSections(), { id: newId(), name, section: JSON.parse(JSON.stringify(s)) }]) ? `Saved section: ${name}` : 'This browser has no room to save the section');
  updateUi();
}
function renderAddSection() {
  const nav = addSectionPanel.querySelector('.as-nav');
  const top = nav ? nav.scrollTop : 0;
  addSectionPanel.innerHTML = addSectionPanelHtml(addSectionCat, savedSections(), addSectionSize);
  addSectionPanel.querySelector('.as-nav').scrollTop = top;
}
function openAddSection(sid, below) {
  closeFloating(); closeSectionPanel();
  addSectionAt = { sid, below };
  addSectionCat = 'Intro';
  addSectionSize = 'medium';
  addSectionPanel.innerHTML = '';
  renderAddSection();
  addSectionPanel.hidden = false;
  addSectionPanel.querySelector('.as-close').focus();
}
function closeAddSection() { addSectionPanel.hidden = true; addSectionAt = null; }
addSectionPanel.addEventListener('click', (e) => {
  if (e.target === addSectionPanel) { closeAddSection(); return; }
  const a = e.target.closest('[data-as], [data-as-cat], [data-as-view], [data-as-saved], [data-as-unsave], .as-item, .as-classic');
  if (!a) return;
  e.preventDefault();
  if (a.dataset.as === 'close') { closeAddSection(); return; }
  if (a.dataset.asView) { addSectionSize = a.dataset.asView; renderAddSection(); return; }
  if (a.dataset.asCat) { addSectionCat = a.dataset.asCat; renderAddSection(); return; }
  if (a.dataset.asUnsave) { writeSaved(savedSections().filter((x) => x.id !== a.dataset.asUnsave)); renderAddSection(); return; }
  const insert = (s, label) => {
    const before = JSON.stringify(model);
    const i = model.sections.findIndex((x) => x.id === addSectionAt.sid);
    model.sections.splice(i < 0 ? model.sections.length : i + (addSectionAt.below ? 1 : 0), 0, s);
    closeAddSection();
    commit(before, label);
    renderAll();
    feEl(s.id)?.closest('section')?.scrollIntoView({ block: 'center' });
  };
  if (a.dataset.as === 'blank' && addSectionAt) insert(blankSection(newId()), 'Added a blank section');
  const saved = a.dataset.asSaved && savedSections().find((x) => x.id === a.dataset.asSaved);
  if (saved && addSectionAt) {
    const s = JSON.parse(JSON.stringify(saved.section));
    s.id = newId();
    for (const b of s.blocks) b.id = `yui_copy_${newId()}`;
    insert(s, 'Added a saved section');
  }
});
addSectionPanel.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeAddSection(); } });

function closeFloating() { if (vAlignOpen) { vAlignOpen = null; placeToolbar(); } $('button-style-menu').hidden = true; $('pin-popover').hidden = true; addMenu.hidden = true; layersPanel.hidden = true; contextMenu.hidden = true; $('arrange-menu').hidden = true; if (linkPop.dataset.cleared) closeLinkPopover(); linkPop.hidden = true; markLinkBar(); closeLayouts(); }
addMenu.addEventListener('input', (e) => {
  if (!e.target.matches('[data-am="search"]')) return;
  const q = e.target.value;
  addMenu.innerHTML = addBlockMenuHtml(ADD_TYPES, q);
  const input = addMenu.querySelector('input'); input.focus(); input.setSelectionRange(q.length, q.length);
});
// A text block is named by its text, cut by CSS (the oracle row label holds at least the
// first 48 characters, gap review 2026-11-04).
// A block's tile name, as the add menu and Layers name it: a stand-in's label, else its type.
const tileName = (b) => { const n = b.label && b.type === 'shape' ? b.label : b.type; return n[0].toUpperCase() + n.slice(1); };
function layerRows(s) {
  const named = tileName;
  const row = (b, kidOf) => ({ id: b.id, kidOf, type: named(b), on: sel?.bid === b.id, hidden: !!lay(b).hidden,
    label: b.type === 'text' ? (b.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'Text' : named(b) });
  // A stack's children follow it, one step in (S3.json children).
  return [...s.blocks].sort((a, b) => lay(b).z - lay(a).z).flatMap((b) => [row(b), ...(b.children || []).map((c) => row(c, b.id))]);
}
function renderLayersPanel() {
  const s = S(layersPanel.dataset.sid);
  if (!s) { layersPanel.hidden = true; return; }
  layersPanel.innerHTML = layersPanelHtml(layerRows(s));
}
layersPanel.addEventListener('click', (e) => {
  if (rowDragged) return;
  const eye = e.target.closest('[data-unhide]');
  if (eye) { e.stopPropagation(); unhideBlock(layersPanel.dataset.sid, eye.dataset.unhide); return; }
  const hide = e.target.closest('[data-hide]');
  if (hide) {
    e.stopPropagation();
    const before = JSON.stringify(model), sid = layersPanel.dataset.sid;
    hideBlocks(sid, [hide.dataset.hide], bp);
    renderSectionDom(sid);
    commit(before, `Hid ${hide.dataset.hide} on ${bp}`);
    renderLayersPanel();
    return;
  }
  const li = e.target.closest('li[data-layer]');
  if (li && B(layersPanel.dataset.sid, li.dataset.layer) && lay(B(layersPanel.dataset.sid, li.dataset.layer)).hidden) return;
  if (li) { select({ sid: layersPanel.dataset.sid, bid: li.dataset.layer }); renderLayersPanel(); }
});
// Dragging a row (Z3, parity/findings/LAYERS.json): it follows the pointer over a blue slot, the other
// rows make way when its edge crosses their center, and the drop numbers the blocks 1 to n, the front
// row highest. One undo step.
let rowDragged = false; // the click that ends a drag selects nothing
layersPanel.addEventListener('pointerdown', (e) => {
  rowDragged = false;
  const li = e.target.closest('li[data-layer]');
  if (!li || e.button !== 0 || e.target.closest('[data-unhide]')) return;
  const sid = layersPanel.dataset.sid;
  const list = li.parentElement;
  // A row moves among its own: the section's blocks, or one stack's children.
  const rows = [...list.children].filter((r) => r.dataset.kidOf === li.dataset.kidOf);
  const from = rows.indexOf(li);
  const box = li.getBoundingClientRect();
  const pitch = rows.length > 1 ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top : box.height;
  const x0 = e.clientX, y0 = e.clientY;
  let ghost = null;
  // A row leaving its own place jumps. Any other move slides, the slot's too (CAP-Z3PATH.json, CAP-Z3PATH2.json).
  let places = [...rows];
  const placeRow = (to) => {
    const others = rows.filter((r) => r !== li);
    const next = others[to] || (li.dataset.kidOf ? others[others.length - 1].nextSibling : null);
    if (li.nextSibling === next || li === next) return;
    const tops = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    const was = places;
    list.insertBefore(li, next);
    places = [...list.children].filter((r) => r.dataset.kidOf === li.dataset.kidOf);
    for (const r of rows) {
      if (was.indexOf(r) === places.indexOf(r)) continue;
      r.getAnimations().forEach((a) => a.cancel());
      if (was.indexOf(r) !== rows.indexOf(r)) r.animate([{ transform: `translateY(${tops.get(r) - r.getBoundingClientRect().top}px)` }, { transform: 'none' }], { duration: 200, easing: 'ease' });
    }
  };
  const move = (ev) => {
    const d = ev.clientY - y0;
    // It starts past 8px on the slant. The move that starts it does nothing else (CAP-Z3PATH.json).
    if (!ghost) {
      if (Math.hypot(ev.clientX - x0, d) <= 8) return;
      ghost = li.cloneNode(true);
      ghost.classList.add('lp-ghost');
      Object.assign(ghost.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, fontFamily: getComputedStyle(li).fontFamily });
      document.body.append(ghost);
      li.classList.add('is-slot');
      return;
    }
    ghost.style.transform = `translateY(${d}px)`;
    const passed = Math.floor((Math.abs(d) + box.height / 2 + 1) / pitch);
    placeRow(Math.max(0, Math.min(rows.length - 1, from + Math.sign(d) * passed)));
  };
  const stop = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    doc.removeEventListener('pointerup', giveUp);
    document.removeEventListener('keydown', onEscape, true);
    doc.removeEventListener('keydown', onEscape, true);
    li.classList.remove('is-slot');
    rows.forEach((r) => r.getAnimations().forEach((a) => a.cancel()));
  };
  // The page's frame keeps its own moves and release. Let go over it, or press Escape: nothing moves and the
  // panel closes (CAP-Z3PATH.json, CAP-Z3PATH2.json).
  const giveUp = () => {
    stop();
    if (!ghost) return;
    ghost.remove();
    renderLayersPanel();
    closeFloating();
  };
  const onEscape = (ev) => { if (ev.key === 'Escape') giveUp(); };
  const up = () => {
    stop();
    if (!ghost) return;
    rowDragged = true;
    const before = JSON.stringify(model);
    const order = [...list.children].filter((r) => r.dataset.kidOf === li.dataset.kidOf).map((r) => r.dataset.layer);
    if (li.dataset.kidOf) { const st = B(sid, li.dataset.kidOf); st.children.sort((p, q) => order.indexOf(p.id) - order.indexOf(q.id)); }
    else order.forEach((id, k) => { lay(B(sid, id)).z = order.length - k; });
    const moved = order[from] !== li.dataset.layer;
    if (moved) { renderSectionDom(sid); commit(before, 'Reordered layers'); }
    else model = JSON.parse(before);
    renderLayersPanel();
    // The ghost flies to where the row now is, over the row (CAP-Z3PATH2.json).
    const home = layersPanel.querySelector(`li[data-layer="${li.dataset.layer}"]`);
    const end = home ? home.getBoundingClientRect().top - box.top : 0;
    ghost.animate([{ transform: getComputedStyle(ghost).transform }, { transform: `translateY(${end}px)` }], { duration: 250, easing: 'ease' }).finished.then(() => ghost.remove(), () => ghost.remove());
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
  doc.addEventListener('pointerup', giveUp);
  document.addEventListener('keydown', onEscape, true);
  doc.addEventListener('keydown', onEscape, true);
});
function onContextMenu(e) {
  if (document.body.classList.contains('is-preview')) return;
  const blk = e.target.closest('.fe-block');
  if (!blk || gesture) return;
  e.preventDefault();
  const sid = blk.closest('section').dataset.sectionId;
  // A right press on a group leaves that one block selected (CAP-COPYANIM.json).
  if (sel?.bid !== blk.dataset.blockId || sel.more?.length) select({ sid, bid: blk.dataset.blockId });
  closeFloating();
  contextMenu.innerHTML = contextMenuHtml({ canPaste: !!blockClip, phone: bp === 'mobile', tile: tileName(B(sid, blk.dataset.blockId)), alone: S(sid).blocks.length < 2 });
  const fr = frame.getBoundingClientRect(), st = stage.getBoundingClientRect();
  contextMenu.style.left = `${Math.min(fr.left - st.left + e.clientX, st.width - 180)}px`;
  contextMenu.style.top = `${Math.min(fr.top - st.top + e.clientY, st.height - 400)}px`;
  contextMenu.hidden = false;
}
contextMenu.addEventListener('mousedown', (e) => e.preventDefault());
contextMenu.addEventListener('click', (e) => {
  const it = e.target.closest('button[data-cm]');
  if (!it || it.disabled || !sel) return;
  const act = it.dataset.cm;
  if (openSubmenu(it)) return;
  contextMenu.hidden = true; arrangeMenu.hidden = true;
  if (it.hasAttribute('data-unbuilt')) { note(`${it.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  if (act === 'copy') { copyBlocks(); return; }
  const before = JSON.stringify(model);
  const sid = sel.sid;
  if (act === 'paste') pasteBlocks(sid);
  if (act === 'duplicate') duplicateBlock(sid, sel.bid);
  if (act === 'delete') { const ids = [sel.bid, ...(sel.more || [])]; S(sid).blocks = S(sid).blocks.filter((b) => !ids.includes(b.id)); sel = null; }
  if (act === 'stack') stackBlocks();
  if (act.startsWith('z-')) arrange(sid, sel.bid, act.slice(2));
  if (act === 'hide-desktop' || act === 'hide-mobile') hideBlocks(sid, [sel.bid, ...(sel.more || [])], act === 'hide-desktop' ? 'desktop' : 'mobile');
  renderSectionDom(sid);
  commit(before, `${it.getAttribute('aria-label')} from the block menu`);
});

// Hide on a layout (L5, UNBUILT.json): the block leaves that layout and the selection. Hiding on
// mobile shrinks the phone rows to what the visible blocks need (the oracle went from 10 to 4 on
// demo section 2); desktop rows stay (11 stayed 11).
function hideBlocks(sid, ids, which) {
  const s = S(sid);
  for (const b of s.blocks.flatMap((o) => [o, ...(o.children || [])])) if (ids.includes(b.id)) b.layout[which].hidden = true;
  if (which === 'mobile') s.rows.mobile = Math.max(1, ...s.blocks.filter((b) => !b.layout.mobile.hidden).map((b) => b.layout.mobile.area[2] - 1));
  sel = null;
}
function unhideBlock(sid, id) {
  const b = B(sid, id);
  if (!b || !lay(b).hidden) return;
  const before = JSON.stringify(model);
  delete lay(b).hidden;
  growRows(S(sid));
  renderSectionDom(sid);
  commit(before, `Showed ${id} on ${bp}`);
  renderLayersPanel();
}

// Arrange (ARRANGE.json): to front or back, or forward or backward past every block it
// overlaps on that side; then the section's blocks are numbered 1 to n in that order (the oracle renumbered
// 1, 2, 3 after each move).
function overlaps(a, b) { return a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]; }
function arrange(sid, bid, how) {
  const s = S(sid), b = B(sid, bid);
  const order = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z).filter((x) => x !== b);
  let at;
  const mine = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z).indexOf(b);
  if (how === 'front') at = order.length;
  else if (how === 'back') at = 0;
  else {
    const all = [...s.blocks].sort((x, y) => lay(x).z - lay(y).z);
    // Past every block it overlaps in that direction: the heading overlapping the paragraph (2)
    // and the shape (3) went to 3 on the oracle.
    const range = how === 'forward' ? all.slice(mine + 1).reverse() : all.slice(0, mine);
    const hit = range.find((o) => overlaps(lay(o).area, lay(b).area));
    if (!hit) return;
    const k = order.indexOf(hit);
    at = how === 'forward' ? k + 1 : k;
  }
  order.splice(at, 0, b);
  order.forEach((x, n) => { lay(x).z = n + 1; });
}
const arrangeMenu = $('arrange-menu');
function openSubmenu(it) {
  const act = it.dataset.cm;
  const zs = act === 'arrange' && S(sel.sid).blocks.map((o) => lay(o).z), z = lay(B(sel.sid, sel.bid)).z;
  const html = act === 'arrange' ? arrangeMenuHtml({ top: z >= Math.max(...zs), bottom: z <= Math.min(...zs) })
    : act === 'copy-props' ? copyPropsMenuHtml({ hasAnimations: animRows().length > 0 })
      : act === 'paste-props' ? pastePropsMenuHtml({ canTransforms: !!transformClip, canAnimations: !!animClip }) : null;
  if (!html) return false;
  arrangeMenu.classList.toggle('cm-props', act !== 'arrange');
  arrangeMenu.innerHTML = html;
  arrangeMenu.setAttribute('aria-label', it.getAttribute('aria-label'));
  const r = it.getBoundingClientRect(), st = stage.getBoundingClientRect();
  arrangeMenu.style.left = `${r.right - st.left + 4}px`;
  arrangeMenu.style.top = `${r.top - st.top}px`;
  arrangeMenu.hidden = false;
  // The row whose submenu is open stays lit while the pointer is on the submenu (CAP-U11LIT.json).
  contextMenu.querySelectorAll('.is-sub').forEach((x) => x.classList.remove('is-sub'));
  it.classList.add('is-sub');
  return true;
}
// A hover opens a row's submenu, as on the oracle.
contextMenu.addEventListener('mouseover', (e) => {
  const it = e.target.closest('button[data-cm]');
  if (!it || !sel || (!it.disabled && openSubmenu(it))) return;
  arrangeMenu.hidden = true;
  contextMenu.querySelectorAll('.is-sub').forEach((x) => x.classList.remove('is-sub'));
});
arrangeMenu.addEventListener('mousedown', (e) => e.preventDefault());
arrangeMenu.addEventListener('click', (e) => {
  const it = e.target.closest('button[data-cm]');
  if (!it || it.disabled || !sel) return;
  arrangeMenu.hidden = true; contextMenu.hidden = true;
  const act = it.dataset.cm;
  if (it.hasAttribute('data-unbuilt')) { note(`${it.getAttribute('aria-label')}: not built yet`); updateUi(); return; }
  if (act === 'pcopy-transforms') { copyTransforms(); return; }
  if (act === 'pcopy-animations') { animClip = JSON.parse(JSON.stringify(animRows())); transformClip = null; return; }
  // Paste goes to the block the menu opened on, not to the rest of a group.
  if (act === 'ppaste-animations' || act === 'preplace-animations') {
    const clip = JSON.parse(JSON.stringify(animClip));
    animEdit(`${it.getAttribute('aria-label')} from the block menu`, (l) => { if (act === 'preplace-animations') l.length = 0; l.push(...clip); });
    return;
  }
  const before = JSON.stringify(model);
  if (act === 'ppaste-transforms') pasteTransforms(sel.sid, [sel.bid]);
  else arrange(sel.sid, sel.bid, act.slice(2));
  renderSectionDom(sel.sid);
  commit(before, `${it.getAttribute('aria-label')} from the block menu`);
});

function onHover(e) {
  if (document.body.classList.contains('is-preview')) return;
  if (gesture && gesture.type !== 'pending') return;
  setHover(e.target.closest?.('.fluid-engine.is-editing > .fe-block')?.dataset.blockId || null);
  onHoverSection(e);
}
// A scroll with the pointer still sends no pointermove, but a new section under it takes the chrome (CAP-U9FADE4.json): the browser's pointerover says so.
function onHoverSection(e) {
  if (document.body.classList.contains('is-preview') || (gesture && gesture.type !== 'pending')) return;
  const secEl = e.target.closest?.('section.page-section[data-section-id]');
  const sid = secEl && model.sections.some((x) => x.id === secEl.dataset.sectionId) ? secEl.dataset.sectionId : null;
  if (sid && sid !== hoverSid) { hoverSid = sid; placeChrome(); }
}

// ---------- top bar ----------
// The mouse on the bar has left every section; on the canvas's white sides it has not (SECTIONBAR.json, fade).
document.querySelector('.bar').addEventListener('pointerenter', () => { if (hoverSid) { hoverSid = null; placeChrome(); } });
// A press on the editor's own controls ends the keys' way into the text, Write and Undo aside.
document.addEventListener('click', (e) => {
  if (!editing?.soft || e.target.closest?.('#undo, [data-tb="write"]')) return;
  finishTextEdit();
  if (e.target.closest?.('#bp-desktop, #bp-mobile')) select(null); // The other view lets the block go (CAP-ESC2.json)
}, true);
$('undo').addEventListener('click', () => undo(true));
$('redo').addEventListener('click', redo);
$('save').addEventListener('click', () => {
  if (persist()) {
    savedJson = JSON.stringify(model);
    note('Saved to this browser');
  } else {
    note('Save failed: storage is blocked');
  }
  updateUi();
});
// Exit (Y3, parity/findings/EXIT.json): with unsaved changes the oracle asks "Exit Without
// Saving?" with Save and Exit and no Cancel; Escape closes the question and keeps editing.
// Exit discards the changes. Ours then opens the published page with the saved model.
const leave = () => { location.href = 'page.html?saved'; };
function showExitDialog(on) {
  $('exit-dialog').hidden = !on;
  $('exit-overlay').hidden = !on;
}
$('exit').addEventListener('click', () => {
  if (editing) finishTextEdit();
  if (JSON.stringify(model) === savedJson) return leave();
  showExitDialog(true);
});
$('exit-overlay').addEventListener('click', () => showExitDialog(false));
$('exit-save').addEventListener('click', () => { showExitDialog(false); $('save').click(); if (JSON.stringify(model) === savedJson) leave(); });
$('exit-discard').addEventListener('click', () => { model = JSON.parse(savedJson); leave(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('exit-dialog').hidden) { e.preventDefault(); showExitDialog(false); } }, true);

// The bar's tooltips (parity/findings/TOPBAR.json, tips): centered under the control, kept 11px from
// the left and 22px from the right, with no delay and no fade. Icon buttons sit 11.5px above theirs.
const barTip = $('bar-tip');
function showBarTip(btn) {
  if (btn.disabled) return;
  const preview = document.body.classList.contains('is-preview');
  const closing = preview && btn.id === 'preview';
  const keys = closing ? '' : btn.dataset.tipKeys;
  barTip.replaceChildren(closing ? 'Close' : btn.dataset.tip);
  barTip.classList.toggle('is-above', btn.hasAttribute('data-tip-above'));
  for (const k of keys ? keys.split(' ') : []) { const el = document.createElement('kbd'); el.textContent = k; barTip.append(el); }
  barTip.hidden = false;
  const q = btn.getBoundingClientRect();
  const w = barTip.getBoundingClientRect().width;
  barTip.style.left = `${Math.max(11, Math.min(q.left + q.width / 2 - w / 2, window.innerWidth - 22 - w))}px`;
  barTip.style.top = `${q.bottom + (btn.closest('#block-toolbar, #block-panel') ? 11 : btn.classList.contains('tb-icon') ? 11.5 : 6.5)}px`;
  // Newsletter's Form Name tip wraps at 288px and sits 11px above its ? (CAP-T12NLPOST.json, tip).
  if (btn.hasAttribute('data-tip-above')) barTip.style.top = `${q.top - 11 - barTip.getBoundingClientRect().height}px`;
}
// The block toolbar's tips (parity/findings/TOOLBARS.json tips): not on an unavailable button. They
// appear about 517 ms after the pointer gets on the button, by the page's own clock, at full opacity with no fade (CAP-U4TIPS.json).
let tbTipBtn = null, tbTipTimer = 0;
function setTbTip(btn) {
  clearTimeout(tbTipTimer);
  barTip.hidden = true;
  tbTipBtn = btn;
  if (btn && !btn.classList.contains('is-off')) tbTipTimer = setTimeout(() => showBarTip(btn), 500);
}
// No tip on the button whose menu is open (parity/findings/S3.json).
// An option's menu button has its tip too (FORMFIELDS.json, followUp.menu).
blockPanel.addEventListener('pointerover', (e) => { const btn = e.target.closest('[data-tip]'); if (btn) showBarTip(btn); });
blockPanel.addEventListener('pointerout', (e) => { if (e.target.closest('[data-tip]')) barTip.hidden = true; });
blockPanel.addEventListener('pointerdown', (e) => { if (e.target.closest('[data-tip]:not([data-tip-above])')) barTip.hidden = true; }); // the Form Name tip stays on a press
toolbar.addEventListener('pointerover', (e) => { let btn = e.target.closest('button[data-tip]'); if (btn?.classList.contains('tb-open') && !btn.closest('.tb-vmenu')) btn = null; if (btn !== tbTipBtn) setTbTip(btn); });
toolbar.addEventListener('pointerleave', () => setTbTip(null));
// A pick redraws the toolbar and keeps the tip; a block that goes takes the tip with it.
new MutationObserver(() => {
  if (!tbTipBtn) return;
  const same = toolbar.hidden ? null : toolbar.querySelector(`[data-tb="${tbTipBtn.dataset.tb}"]`);
  if (same) tbTipBtn = same; else setTbTip(null);
}).observe(toolbar, { childList: true, attributes: true, attributeFilter: ['hidden'] });
for (const btn of document.querySelectorAll('.bar [data-tip]')) {
  btn.addEventListener('pointerenter', () => showBarTip(btn));
  btn.addEventListener('pointerleave', () => { barTip.hidden = true; });
}
document.addEventListener('keydown', onBarKey);
frameBarKeys();
function onBarKey(e) {
  if (!(e.metaKey || e.ctrlKey)) return;
  if (e.code === 'KeyS' && !e.shiftKey && !e.altKey) { e.preventDefault(); if (!$('save').disabled) $('save').click(); }
  if (e.code === 'KeyP' && e.shiftKey && !e.altKey) { e.preventDefault(); $('preview').click(); }
}
function frameBarKeys() {
  frame.addEventListener('load', () => frame.contentDocument.addEventListener('keydown', onBarKey));
  frame.contentDocument?.addEventListener('keydown', onBarKey);
}
$('reset').addEventListener('click', () => {
  const before = JSON.stringify(model);
  model = demoModel();
  ruleForget();
  sel = null;
  renderAll();
  commit(before, 'Reset to the demo page');
});
$('export').addEventListener('click', async () => {
  const css = await (await fetch('src/site.css')).text();
  const blob = new Blob([exportHtml(model, css)], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fluid-demo.html';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  note('Exported fluid-demo.html');
  updateUi();
});

function setBp(next) {
  if (next === bp) return;
  cornerFour = null;
  if (shapeUi?.kind === 'anchor') closeShapePop();
  if (editing) finishTextEdit();
  if (gesture) cancelGesture();
  bp = next;
  setLiveView(bp);
  for (const s of model.sections) if (s.blocks.some((b) => b.designMobile)) renderSectionDom(s.id);
  $('bp-desktop').classList.toggle('is-on', bp === 'desktop');
  $('bp-mobile').classList.toggle('is-on', bp === 'mobile');
  $('bp-desktop').setAttribute('aria-checked', String(bp === 'desktop'));
  $('bp-mobile').setAttribute('aria-checked', String(bp === 'mobile'));
  stage.classList.toggle('is-mobile', bp === 'mobile');
  // Phones use overlay scrollbars, so the preview must not lose width to one.
  doc.documentElement.style.scrollbarWidth = bp === 'mobile' ? 'none' : '';
  for (const sec of model.sections) drawLabels(sec.id);
  // The panel shows this view's own values (FORMFIELDS.json, phone; CAP-L6GOTO.json).
  if (sel && designOpen === sel.bid) { const top = blockPanel.scrollTop; renderBlockPanel(); blockPanel.scrollTop = top; }
  requestAnimationFrame(() => {
    drawSelection();
    updateUi();
  });
}
// Preview (oracle "Toggle preview mode"): the page without editor chrome; Escape or the
// button again leaves it. Our developer tools sit behind the menu next to it.
// Reload page preview (TOPBAR.json): ours draws the canvas again from the model.
document.getElementById('reload-preview').addEventListener('click', () => { renderAll(); if (document.body.classList.contains('is-preview')) startPageMotion(doc, rowsOfBlock); });
// Ctrl+Shift+D shows our developer menu, which stays out of the bar otherwise.
document.addEventListener('keydown', (e) => { if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') { e.preventDefault(); document.body.classList.toggle('dev-tools'); } });

const rowsOfBlock = (id) => { for (const sec of model.sections) { const b = sec.blocks.find((x) => x.id === id); if (b) return b.animations && animRowsOf(b); } return null; };
function setPreview(on) {
  if (on) { selectionLeft.clear(); for (const o of model.sections.flatMap((x) => x.blocks)) previewed.set(o.id, o.html); } else stopPageMotion();
  document.body.classList.toggle('is-preview', on);
  doc?.body.classList.toggle('is-preview', on);
  if (!on) doc?.querySelectorAll('.cdk-image-lightbox, body > .form-lightbox').forEach((x) => x.remove());
  if (!on) doc?.querySelectorAll('.followup-question-container').forEach((x) => { x.hidden = true; });
  if (!on) { doc?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); doc?.querySelectorAll('.native-video-player video').forEach((v) => v.pause()); } // no controls while editing
  $('preview').setAttribute('aria-pressed', String(on));
  $('page-state').textContent = on ? 'Previewing' : 'Page · Published';
  if (on) { closeFloating(); closeSectionPanel(); designOpen = null; animStopPreview(); if (editing) finishTextEdit(); select(null); syncAnimView(null); startPageMotion(doc, rowsOfBlock); }
}
$('preview').addEventListener('click', () => setPreview(!document.body.classList.contains('is-preview')));
$('dev-toggle').addEventListener('click', () => { $('dev-pop').hidden = !$('dev-pop').hidden; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('is-preview')) setPreview(false); });
$('bp-desktop').addEventListener('click', () => setBp('desktop'));
$('bp-mobile').addEventListener('click', () => setBp('mobile'));
document.addEventListener('keydown', onKey);

// ---------- boot ----------
// An empty Text shows its hint in the editor: added, left, selected, in an edit, on the phone, and it goes on
// the first letter (CAP-TEXTEMPTY.json). The hint sits on the first line, and only while it is a paragraph. With more
// empty lines, only while the caret is or last was on that first one (CAP-T3EMPTY.json, CAP-T3EMPTY2.json).
// A mark on the content box, outside the block's HTML, so the model stays clean.
const caretOnFirstLine = new Set();
function markEmptyText(doc) {
  const at = doc.getSelection()?.anchorNode;
  for (const ce of doc.querySelectorAll('.sqs-block-html .sqs-html-content')) {
    const first = ce.firstElementChild, id = ce.closest('.fe-block')?.dataset.blockId;
    if (at && ce.contains(at)) { if (first?.contains(at)) caretOnFirstLine.add(id); else caretOnFirstLine.delete(id); }
    const empty = first?.tagName === 'P' && !ce.textContent && first.querySelectorAll('br').length < 2;
    ce.classList.toggle('is-text-empty', !!empty && (ce.children.length === 1 || caretOnFirstLine.has(id)));
  }
}
function watchEmptyText() {
  const doc = frame.contentDocument;
  markEmptyText(doc);
  new MutationObserver(() => markEmptyText(doc)).observe(doc.body, { childList: true, characterData: true, subtree: true });
  doc.addEventListener('selectionchange', () => markEmptyText(doc));
}

function boot() {
  watchEmptyText();
  frame.contentDocument.addEventListener('keyup', (e) => { if (!editing?.caretGone) return; win.getSelection().removeAllRanges(); if (!e.metaKey && !e.ctrlKey) editing.caretGone = false; });
  frame.contentWindow.addEventListener('scroll', () => { letGoOutOfView(); placeToolbar(); placeChrome(); placeLayouts(); placeBlockPanel(); placePhoneLines(); placeThemeChips(); if (editing) renderTextBar(); }, { passive: true });
  // The canvas changes width when the layout switches; place the overlays again once it has.
  // Watch the canvas page itself: it reflows after the canvas element changes width.
  new frame.contentWindow.ResizeObserver(() => { placeToolbar(); placeChrome(); placeBlockPanel(); placePhoneLines(); }).observe(frame.contentDocument.body);
  window.addEventListener('resize', () => { placeToolbar(); placeChrome(); });
  frame.contentDocument.addEventListener('pointermove', onHover);
  frame.contentDocument.addEventListener('pointerover', onHoverSection);
  frame.contentDocument.documentElement.addEventListener('pointerleave', () => setHover(null));
  frame.contentDocument.addEventListener('pointerdown', () => { closeFloating(); closeSectionPanel(); }, true);
  frame.contentDocument.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeFloating(); closeSectionPanel(); if (designOpen) { designOpen = null; updateUi(); } } });
  frame.contentDocument.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !vAlignOpen && pinPop.hidden) { closeFloating(); closeSectionPanel(); } }); // An open toolbar menu is onKey's, and the block stays selected
  doc = frame.contentDocument;
  win = frame.contentWindow;
  doc.addEventListener('pointerdown', dialogPress, true);
  win.addEventListener('keydown', holdDialogEscape, true);
  doc.addEventListener('pointerdown', closeLinkOutside, true);
  bindLightbox(doc);
  bindPhonePrefix(doc);
  bindVideoPlayer(doc, () => doc.body.classList.contains('is-preview'));
  new win.Function(IMAGE_EFFECT_SCRIPT)();
  watchShapeRects(doc, rectPath);
  bindTriggers(doc, rowsOfBlock);
  doc.addEventListener('pointerdown', onDown);
  doc.addEventListener('pointermove', onMove);
  doc.addEventListener('pointerup', onUp);
  doc.addEventListener('pointercancel', onCancel);
  doc.addEventListener('touchmove', onTouchMove, { passive: false });
  // A touch holds its pointer on the block it landed on, and taking that over fires this event on
  // the block too. Only losing our own capture on the root ends a gesture (X11).
  doc.addEventListener('lostpointercapture', (e) => {
    if (e.target === doc.documentElement && gesture && gesture.type !== 'pending' && e.pointerId === gesture.pointerId) onUp(e);
  });
  doc.addEventListener('dblclick', onDblClick);
  doc.addEventListener('keydown', onKey);
  doc.addEventListener('click', (e) => {
    if (e.target.closest('a')) e.preventDefault();
  });
  renderAll();
  // Expose state for automated checks (cmux / Playwright).
  // Replay mode (?replay) always hides the inspector so the canvas width matches the oracle frame.
  if (new URLSearchParams(location.search).has('replay')) document.body.classList.add('is-replay');
  // The inspector side panel: off by default, remembered per browser (developer menu).
  const insp = $('inspector-toggle');
  const setInspector = (on) => { document.body.classList.toggle('show-inspector', on); insp.setAttribute('aria-pressed', String(on)); insp.textContent = on ? 'Hide inspector' : 'Show inspector'; try { localStorage.setItem('fe-inspector', on ? '1' : ''); } catch {} placeChrome?.(); };
  let inspOn = false; try { inspOn = localStorage.getItem('fe-inspector') === '1'; } catch {}
  setInspector(inspOn);
  insp.addEventListener('click', () => setInspector(!document.body.classList.contains('show-inspector')));
  window.fe = {
    get model() { return model; },
    get bp() { return bp; },
    get gesture() { return gesture; },
    get canUndo() { return undoStack.length > 0; },
    load(next) {
      model = JSON.parse(JSON.stringify(next));
      ruleForget(); // a loaded page's rules hold its values (render.js ruleValues)
      tabOfType.clear(); // as a fresh browser: no tab remembered
      undoStack.length = 0;
      redoStack.length = 0;
      sel = null;
      stored = null;
      scrolledMove = null;
      leftRings = null;
      renderAll();
      return true;
    },
    setBp,
    undo,
    normalize,
    measure: (sid) => measure(feEl(sid)),
    select: (sid, bid) => { select(sid ? { sid, bid } : null); return true; },
    edit: (sid, bid) => { startTextEdit(sid, bid); return !!editing; },
    finishEdit: () => { finishTextEdit(); return true; },
    addBlock: (sid, name, onList) => { const before = JSON.stringify(model); addBlock(sid, name); renderSectionDom(sid); frameToLanded(sel.bid); if (onList) commit(before, `Added ${name} to ${sid}`); return true; },
  };
}

if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.getElementById('page')) boot();
else frame.addEventListener('load', boot, { once: true });
