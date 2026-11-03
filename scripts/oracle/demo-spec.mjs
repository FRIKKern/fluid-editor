// O1: the 8 demo sections to build on the oracle page "How Fluid Engine works".
// Desktop areas [rowStart, colStart, rowEnd, colEnd] in grid lines, same intent
// as app/src/demo.js. Text blocks grow their end row to fit (the oracle's
// guardrail), so a text block's end row is a minimum, not a promise.
const T = (html, area) => ({ type: 'Text', html, area });
const S = (area) => ({ type: 'Shape', area });
const B = (area) => ({ type: 'Button', area });

const tiles = [];
for (let c = 2; c <= 25; c++) tiles.push(S([8, c, 10, c + 1]));

export const SECTIONS = [
  {
    name: 'How Fluid Engine works',
    blocks: [
      T('<h1>How Fluid Engine works</h1>', [3, 2, 7, 16]),
      T('<p>Each section on this page is a CSS grid with 24 columns on desktop and 8 on phones. Each block stores where it starts and where it ends. Drag a block, pull a handle, or double-click text to edit it.</p>', [7, 2, 11, 14]),
      B([12, 2, 14, 7]),
      S([2, 18, 12, 25]),
      S([8, 21, 15, 27]),
    ],
  },
  {
    name: '24 columns and two gutter tracks',
    blocks: [
      T('<h2>24 columns and two gutter tracks</h2>', [1, 2, 3, 20]),
      T('<p>The grid has 26 tracks. The outer two are gutters, so a block can start at line 1 or end at line 27 and reach the edge of the window. The 24 tracks between them are capped at the site max width, so content stays centered on wide screens.</p>', [3, 2, 7, 15]),
      ...tiles,
      S([11, 1, 13, 27]),
    ],
  },
  {
    name: 'Rows scale with the width',
    blocks: [
      T('<h2>Rows scale with the width</h2>', [1, 2, 3, 16]),
      T('<p>On desktop the smallest a row can be is the container width times 0.0215. A 1400px container gives rows of 30.1px. On phones rows start at a fixed 24px.</p><p>Row height follows the width, so a layout keeps its proportions when the window changes.</p>', [3, 2, 9, 13]),
      S([2, 15, 12, 25]),
    ],
  },
  {
    name: 'Text pushes rows down',
    blocks: [
      T('<h2>Text pushes rows down</h2>', [1, 2, 3, 18]),
      T('<p>When the window gets narrower this paragraph wraps onto more lines than its rows hold. The browser stretches those rows to fit the text, and everything below moves down. Start a drag anywhere in this section and the editor first converts the stretched rows back into uniform rows, so every snap moves the same distance.</p>', [4, 2, 6, 12]),
      B([9, 2, 11, 7]),
      T('<p>On the published page the stretch stays. That is how text wraps on narrow screens without any JavaScript.</p>', [4, 15, 8, 25]),
    ],
  },
  {
    name: 'Overlap on purpose',
    blocks: [
      S([2, 3, 10, 12]),
      S([5, 8, 13, 15]),
      T('<h2>Overlap on purpose</h2>', [7, 10, 9, 20]),
      T('<p>Blocks may share cells. The z-index decides which one is in front. Select a block and use Bring forward or Send backward.</p>', [3, 17, 7, 26]),
    ],
  },
  {
    name: 'Move and resize',
    blocks: [
      T('<h2>Move and resize</h2>', [1, 2, 3, 14]),
      T('<p>Drag a block to move it. The blue area shows where it will land. Pull one of the 8 handles to resize. A text block cannot get shorter than its text. Arrow keys move the selected block one cell. Esc cancels a drag. Cmd+Z undoes it.</p>', [3, 2, 10, 12]),
      S([3, 15, 7, 20]),
      S([3, 21, 9, 26]),
      T('<p>Double-click this text and add a few lines. The block grows by whole rows instead of stretching them.</p>', [10, 14, 13, 21]),
    ],
  },
  {
    name: 'A separate phone layout',
    blocks: [
      T('<h2>A separate phone layout</h2>', [1, 2, 3, 18]),
      T('<p>Content is shared. Placement is not. Each block has one area for desktop and one for phones, and each section has a row count for each. Switch to the phone view and move these tiles. The desktop layout stays as it is.</p>', [3, 2, 7, 15]),
      S([8, 2, 12, 9]),
      S([8, 10, 12, 17]),
      S([8, 18, 12, 25]),
    ],
  },
  {
    name: 'What gets published',
    blocks: [
      T('<h2>What gets published</h2>', [1, 2, 3, 18]),
      T('<p>The published page is HTML and CSS. Each section ships a style tag generated from the layout. No JavaScript moves blocks on the live site.</p>', [3, 2, 7, 14]),
      T('<p>.fe-section { display: grid; grid-template-columns: minmax(var(--grid-gutter), 1fr) repeat(24, minmax(0, var(--cell-max-width))) minmax(var(--grid-gutter), 1fr); }</p>', [8, 2, 12, 26]),
    ],
  },
];
