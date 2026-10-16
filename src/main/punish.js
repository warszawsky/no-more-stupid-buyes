// What happens when the countdown runs out: close the offending tab.
import { execFile } from 'node:child_process';

function run(cmd, args) {
  return new Promise(resolve => {
    execFile(cmd, args, { windowsHide: true, timeout: 5000 }, err => {
      if (err) console.warn(`[punish] ${cmd} failed: ${err.message}`);
      resolve(!err);
    });
  });
}

// Ctrl+W / Cmd+W to whatever window has focus. Our overlay never takes focus,
// so that is the browser the duck just yelled at.
export function sendCloseTabKeys(platform = process.platform) {
  if (platform === 'win32') {
    return run('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command',
      "(New-Object -ComObject WScript.Shell).SendKeys('^w')",
    ]);
  }
  if (platform === 'darwin') {
    // Needs Accessibility permission for the app (System Settings > Privacy).
    return run('osascript', ['-e', 'tell application "System Events" to keystroke "w" using command down']);
  }
  return run('xdotool', ['key', '--clearmodifiers', 'ctrl+w']);
}

/**
 * target: the shopping session the watcher reported, with `source` either
 *   { kind: 'extension', client, tabId, ... } or { kind: 'window' }.
 * Returns how it was handled: 'extension' | 'keys' | 'failed' | 'nothing'.
 */
export async function punish(target, { action, bridge, sendKeys = sendCloseTabKeys }) {
  if (action === 'nothing' || !target) return 'nothing';
  const src = target.source || {};
  if (src.kind === 'extension' && bridge.closeTab(src.client, src.tabId)) return 'extension';
  return (await sendKeys()) ? 'keys' : 'failed';
}
