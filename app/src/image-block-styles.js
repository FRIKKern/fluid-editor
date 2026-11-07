// Miscellaneous > Image Blocks: every head, row and value as read, opened with no pick (parity/findings/CAP-U12FADED.json). A list's row is name, value;
// a slider's is name, value, min, max, step. Stack's sliders read 7, 4 and 4 in their boxes but end at 4, 3 and 3: kept as read. What a value draws isn't read, since
// Site Styles is read only, and ours has no such block layouts, so these store only. Lists are read on Poster's Text Alignment and Card's Content Position; the others are inferred.
export const IMAGE_BLOCKS = [["Poster",[["Text Alignment","Left"],["Content Width",70,10,90,1],["Title Separation",5,0,10,1],["Button Separation",6,0,10,1]]],["Card",[["Content Position","Center"],["Text Alignment","Left"],["Image Width",50,10,75,1],["Image Separation",10,0,10,1],["Title Separation",6,0,10,1],["Button Separation",6,0,10,1]]],["Overlap",[["Content Position","Center"],["Text Alignment","Left"],["Image Width",75,25,75,1],["Title Overlap",35,0,80,1],["Title Separation",3,0,10,1],["Button Separation",5,0,10,1]]],["Collage",[["Content Position","Center"],["Text Alignment","Left"],["Image Width",60,25,75,1],["Content Width",50,25,75,1],["Content Offset",5,0,25,1],["Content Padding",10,10,100,1],["Title Separation",4,0,10,1],["Button Separation",5,0,10,1]]],["Stack",[["Text Alignment","Left"],["Image Separation",7,0,4,0.1],["Title Separation",4,0,3,0.1],["Button Separation",4,0,3,0.1]]]];
const LISTS = { 'Text Alignment': ['Left', 'Center', 'Right'], 'Content Position': ['Top', 'Center', 'Bottom'] };

export function imageBlocksHtml(styles, { slide, select }) {
  return IMAGE_BLOCKS.map(([head, rows]) => {
    const at = head.toLowerCase();
    return `<h2 class="ss-ib-h">Image Block: ${head}</h2>${rows.map(([name, value, min, max, step]) => {
      const key = `imageBlocks.${at}.${name.replace(/\s/g, '')}`, now = styles?.imageBlocks?.[at]?.[name.replace(/\s/g, '')] ?? value;
      return LISTS[name] ? select(key, name, now, LISTS[name]) : slide(key, name, now, min, max, step, '%', 44);
    }).join('')}`;
  }).join('');
}
