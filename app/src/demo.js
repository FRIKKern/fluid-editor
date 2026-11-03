// The demo page: 8 sections that each show one Fluid Engine rule.
// Areas are CSS grid lines in Squarespace order: [rowStart, colStart, rowEnd, colEnd].
// Desktop columns run from line 1 to 27, phone columns from line 1 to 11.
// Lines 1 and 27 (11 on phones) are the outer edges of the gutter tracks.

const L = (area, z = 1, justify = 'flex-start', align = 'flex-start') => ({ area, z, justify, align });

function b(id, type, props, desktop, mobile) {
  return { id, type, ...props, layout: { desktop, mobile } };
}

function section(id, theme, blocks, gap = 11) {
  const rows = {};
  for (const bp of ['desktop', 'mobile']) {
    rows[bp] = Math.max(1, ...blocks.map((x) => x.layout[bp].area[2] - 1));
  }
  return { id, theme, gap, rows, blocks };
}

const text = (html) => ({ html });
const shape = (fill, radius, label, ink) => ({ fill, radius, label, ink });

function tiles() {
  const out = [];
  for (let n = 1; n <= 24; n++) {
    const c = n + 1;
    const k = Math.floor((n - 1) / 8);
    const i = (n - 1) % 8;
    out.push(
      b(`s2-t${n}`, 'shape', shape('var(--line)', '6px', String(n)),
        L([8, c, 10, c + 1]),
        L([13 + 2 * k, 2 + i, 15 + 2 * k, 3 + i])),
    );
  }
  return out;
}

export function demoModel() {
  return {
    version: 1,
    title: 'How Fluid Engine works',
    sections: [
      section('s1', 'theme-accent', [
        b('s1-title', 'text', text('<h1>How Fluid Engine works</h1>'),
          L([3, 2, 7, 16]), L([1, 2, 5, 10])),
        b('s1-lead', 'text', text('<p class="lead">Each section on this page is a CSS grid with 24 columns on desktop and 8 on phones. Each block stores where it starts and where it ends. Drag a block, pull a handle, or double-click text to edit it.</p>'),
          L([7, 2, 11, 14]), L([5, 2, 11, 10])),
        b('s1-btn', 'button', { label: 'Start with the grid', href: '#' },
          L([12, 2, 14, 7]), L([12, 2, 14, 7])),
        b('s1-sun', 'shape', shape('var(--accent-2)', '50%'),
          L([2, 18, 12, 25], 1), L([15, 3, 22, 9], 1)),
        b('s1-card', 'shape', shape('#ffffff', '24px', 'Blocks can overlap and run to the edge'),
          L([8, 21, 15, 27], 2), L([19, 6, 24, 11], 2)),
      ]),

      section('s2', '', [
        b('s2-title', 'text', text('<h2>24 columns and two gutter tracks</h2>'),
          L([1, 2, 3, 20]), L([1, 2, 4, 10])),
        b('s2-body', 'text', text('<p>The grid has 26 tracks. The outer two are gutters, so a block can start at line 1 or end at line 27 and reach the edge of the window. The 24 tracks between them are capped at the site max width, so content stays centered on wide screens.</p>'),
          L([3, 2, 7, 15]), L([4, 2, 12, 10])),
        ...tiles(),
        b('s2-bleed', 'shape', shape('var(--accent)', '0', 'This block runs from line 1 to line 27'),
          L([11, 1, 13, 27]), L([20, 1, 22, 11])),
      ]),

      section('s3', 'theme-light', [
        b('s3-title', 'text', text('<h2>Rows scale with the width</h2>'),
          L([1, 2, 3, 16]), L([1, 2, 4, 10])),
        b('s3-body', 'text', text('<p>On desktop the smallest a row can be is the container width times 0.0215. A 1400px container gives rows of 30.1px. On phones rows start at a fixed 24px.</p><p>Row height follows the width, so a layout keeps its proportions when the window changes.</p><p class="small"><code>min(1400px, 100vw - 8vw) * 0.0215</code></p>'),
          L([3, 2, 9, 13]), L([4, 2, 13, 10])),
        b('s3-box', 'shape', shape('var(--accent)', '0', '10 columns by 10 rows. Resize the window and both sides scale together.'),
          L([2, 15, 12, 25]), L([14, 2, 21, 10])),
      ]),

      section('s4', '', [
        b('s4-title', 'text', text('<h2>Text pushes rows down</h2>'),
          L([1, 2, 3, 18]), L([1, 2, 4, 10])),
        b('s4-long', 'text', text('<p>This paragraph has a grid area of two rows, which is less than it needs. The browser stretches those rows to fit the text, and everything below moves down. Start a drag anywhere in this section and the editor first converts the stretched rows back into uniform rows, so every snap moves the same distance.</p>'),
          L([4, 2, 6, 12]), L([4, 2, 6, 10])),
        b('s4-btn', 'button', { label: 'I moved down', href: '#' },
          L([6, 2, 8, 7]), L([6, 2, 8, 7])),
        b('s4-note', 'text', text('<p class="small">On the published page the stretch stays. That is how text wraps on narrow screens without any JavaScript.</p>'),
          L([4, 15, 8, 25]), L([9, 2, 13, 10])),
      ]),

      section('s5', 'theme-dark', [
        b('s5-a', 'shape', shape('var(--accent)', '0'),
          L([2, 3, 10, 12], 1), L([5, 2, 12, 8], 1)),
        b('s5-b', 'shape', shape('var(--accent-2)', '50%'),
          L([5, 8, 13, 15], 2), L([9, 5, 15, 10], 2)),
        b('s5-c', 'text', text('<h2>Overlap on purpose</h2>'),
          L([7, 10, 9, 20], 3), L([12, 2, 14, 10], 3)),
        b('s5-body', 'text', text('<p>Blocks may share cells. The z-index decides which one is in front. Select a block and use Bring forward or Send backward in the panel.</p>'),
          L([3, 17, 7, 26], 1), L([1, 2, 5, 10], 1)),
      ]),

      section('s6', '', [
        b('s6-title', 'text', text('<h2>Move and resize</h2>'),
          L([1, 2, 3, 14]), L([1, 2, 4, 10])),
        b('s6-body', 'text', text('<ul><li>Drag a block to move it. The blue area shows where it will land.</li><li>Pull one of the 8 handles to resize. A text block cannot get shorter than its text.</li><li>Arrow keys move the selected block one cell.</li><li>Esc cancels a drag. Cmd+Z undoes it.</li></ul>'),
          L([3, 2, 10, 12]), L([4, 2, 14, 10])),
        b('s6-drag', 'shape', shape('var(--accent)', '16px', 'Drag me'),
          L([3, 15, 7, 20]), L([15, 2, 19, 6])),
        b('s6-size', 'shape', shape('var(--accent-2)', '0', 'Resize me'),
          L([3, 21, 9, 26]), L([15, 6, 21, 10])),
        b('s6-edit', 'text', text('<p>Double-click this text and add a few lines. The block grows by whole rows instead of stretching them.</p>'),
          L([8, 14, 11, 21]), L([22, 2, 26, 10])),
      ]),

      section('s7', 'theme-light', [
        b('s7-title', 'text', text('<h2>A separate phone layout</h2>'),
          L([1, 2, 3, 18]), L([1, 2, 4, 10])),
        b('s7-body', 'text', text('<p>Content is shared. Placement is not. Each block has one area for desktop and one for phones, and each section has a row count for each. Switch to the phone view at the top and move these tiles. The desktop layout stays as it is.</p>'),
          L([3, 2, 7, 15]), L([4, 2, 12, 10])),
        b('s7-a', 'shape', shape('var(--accent)', '12px', 'A'),
          L([8, 2, 12, 9], 1), L([13, 2, 17, 7], 1)),
        b('s7-b', 'shape', shape('var(--accent-2)', '12px', 'B'),
          L([8, 10, 12, 17], 1), L([16, 5, 20, 10], 2)),
        b('s7-c', 'shape', shape('#151515', '12px', 'C', '#fff'),
          L([8, 18, 12, 25], 1), L([19, 2, 23, 7], 3)),
      ]),

      section('s8', 'theme-dark', [
        b('s8-title', 'text', text('<h2>What gets published</h2>'),
          L([1, 2, 3, 18]), L([1, 2, 4, 10])),
        b('s8-body', 'text', text('<p>The published page is HTML and CSS. Each section ships a style tag like the one below, generated from the model. This is the grid CSS for the "Text pushes rows down" section. No JavaScript moves blocks on the live site.</p>'),
          L([3, 2, 7, 14]), L([4, 2, 10, 10])),
        b('s8-code', 'code', { codeOf: 's4' },
          L([7, 2, 25, 26]), L([11, 2, 32, 10])),
      ]),
    ],
  };
}
