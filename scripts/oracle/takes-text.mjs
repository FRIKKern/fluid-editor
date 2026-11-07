// Is there a place with focus that takes typed text: a text editor in the frame, or a field or code editor
// outside it? Typed keys with none go to a selected block, where a key can delete or duplicate it.
export const takesText = (frameId) => `(() => {
  const takes = (e) => !!e && (e.isContentEditable || e.tagName === 'INPUT' || e.tagName === 'TEXTAREA');
  return takes(document.activeElement) || takes(document.getElementById(${JSON.stringify(frameId)})?.contentDocument?.activeElement);
})()`;
