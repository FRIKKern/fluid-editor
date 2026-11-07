// What the row walker may press: only what has a name. An unnamed icon could write anything, and a panel with no named
// way out means a reload, not another press.
export const BACK_NAME = /^(back|go back|return)\b/i;
export const isBack = (label) => BACK_NAME.test(String(label || '').trim());
// A row's own name, or its place in a row that has a heading ("Block Alignment", option 2).
export const hasName = (c) => !!c.name && !(/^option \d+$/.test(c.name) && !c.row);
