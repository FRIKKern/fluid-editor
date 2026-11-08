// T15: steps for oracle-capture that read an On Scroll row frame by frame (CAP-T15EASE-*.json, CAP-T15EASE2-*.json).
// A new Shape on a blank section, On Scroll from Start blank (Block, Scrolls), Start Offset X -200px so the Offset X
// gives the progress past 0 and 1 too, the ease and the Start and End percents picked, then preview mode in a window
// 300 high (a view of 245) and the frame stepped 16 px at a time, the block's style read at each step.
//   node scripts/oracle/scroll-ease-steps.mjs <ease> [start end]
//   ORACLE_SURFACE=cdp:<port> node scripts/oracle-capture.mjs --name CAP-T15EASE-OutBack --page "Gestures Probe" \
//     --question '...' --steps "$(node scripts/oracle/scroll-ease-steps.mjs 'Out Back')"
// The window is set back to 1600 by 1000 first: a narrowed window carries into the next run, and there a new block
// can't be added.
const [ease = 'Linear', start = '0%', end = '100%'] = process.argv.slice(2);
const steps = [['toPage', 'Gestures Probe'], ['window', 1600, 1000], ['enter'], ['blank'], ['add', 0, 'Shape'], ['press', 'Escape'], ['select', 0, 'new'],
  ['clickIf', 'Edit'], ['clickIf', 'Animation'], ['clickIf', 'Add a new animation'], ['clickIf', 'On Hover'], ['clickIf', 'On Scroll'], ['clickIf', 'Start blank'],
  ['fillValue', '0px', '-200px'], ['clickIf', 'Timing']];
// Start blank on On Scroll holds Start 0% and End 50%, and Ease Out.
if (start !== '0%') steps.push(['fillValue', '0%', start]);
if (end !== '50%') steps.push(['fillValue', '50%', end]);
if (ease !== 'Out') steps.push(['clickIf', 'Out'], ['clickIf', ease]);
steps.push(['read', 'timing set', { controls: true }], ['window', 1600, 300], ['clickIf', 'Toggle preview mode'], ['pause', 1000], ['read', 'geom', { section: 0, block: [0, 'new'], style: [0, 'new'] }]);
for (let y = 0; y <= 736; y += 16) steps.push(['frameTo', y], ['read', `y${y}`, { style: [0, 'new'] }]);
console.log(JSON.stringify(steps));
