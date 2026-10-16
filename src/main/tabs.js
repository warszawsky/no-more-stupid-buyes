// Best guess at where the active tab's little × sits, in screen DIPs, so the
// duck has something to peck. Browsers don't expose it, so it is estimated
// from the window rectangle and, when the extension tells us, the tab's
// position in the strip (Chromium-style layout: tabs shrink to fit, max 240).
export function tabCloseTarget({ bounds, index = 0, count = 1, maximized = false, platform = process.platform }) {
  if (!bounds || !(bounds.width > 0)) return null;
  const left = platform === 'darwin' ? 80 : 44;   // traffic lights / tab search button
  const right = platform === 'darwin' ? 40 : 190; // new-tab button + window controls
  const n = Math.max(1, count | 0);
  const i = Math.min(Math.max(0, index | 0), n - 1);
  const tabWidth = Math.min(240, Math.max(40, Math.max(60, bounds.width - left - right) / n));
  return {
    x: Math.round(bounds.x + left + (i + 1) * tabWidth - 18),
    y: Math.round(bounds.y + (maximized ? 16 : 24)),
  };
}
