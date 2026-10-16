import { app, BrowserWindow, Tray, Menu, nativeImage, screen, ipcMain, shell, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Config } from './config.js';
import { Watcher } from './watcher.js';
import { Bridge } from './bridge.js';
import { punish } from './punish.js';
import { compile } from './matcher.js';
import { DEFAULT_STORES } from './stores.js';
import { tabCloseTarget } from './tabs.js';
import { duckPng } from './png.js';
import { LINES } from '../shared/lines.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STRIP_HEIGHT = 380; // room for a zoomed-in duck plus the speech bubble
const BRIDGE_PORT = 47821; // must match extension/background.js

// --simulate-window=<file.json> reads the "active window" from a JSON file
// instead of the OS. Handy for trying the duck without a real shop open.
// --self-test=<report.json> boots everything, checks it, writes a report and
// exits (used by CI to check the packaged Windows build actually works).
const flag = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const simulateFile = flag('simulate-window');
const selfTestFile = flag('self-test');

if (!selfTestFile && !app.requestSingleInstanceLock()) app.quit();

let win, tray, config, watcher, bridge, compiled;
let session = 0;
let demoSession = null;
let rendererReady = false;
let expanded = false;  // overlay temporarily covers the whole work area (duck in flight)
let lastActive = null; // last foreground window, for aiming the demo

const lang = () => {
  const l = config.get('lang');
  if (l === 'uk' || l === 'ru' || l === 'en') return l;
  const locale = app.getLocale();
  if (/^uk/i.test(locale)) return 'uk';
  if (/^ru/i.test(locale)) return 'ru';
  return 'en';
};
const L = () => LINES[lang()];

function recompile() {
  const disabled = new Set(config.get('disabledStores'));
  const stores = [...DEFAULT_STORES.filter(s => !disabled.has(s.name)), ...config.get('customStores')];
  compiled = compile(stores, config.get('ignoreTitles'));
}

function extensionDir() {
  return app.isPackaged ? path.join(process.resourcesPath, 'extension') : path.join(__dirname, '../../extension');
}

async function windowSource() {
  if (simulateFile) {
    return async () => {
      try { return JSON.parse(fs.readFileSync(simulateFile, 'utf8')); } catch { return undefined; }
    };
  }
  try {
    const { activeWindow } = await import('get-windows');
    // No screen-recording prompt on macOS; we only need the URL there.
    return () => activeWindow({ screenRecordingPermission: false });
  } catch (err) {
    console.error(`[watcher] get-windows unavailable: ${err.message}`);
    return async () => undefined;
  }
}

function stripBounds() {
  const { workArea } = screen.getPrimaryDisplay();
  return { x: workArea.x, y: workArea.y + workArea.height - STRIP_HEIGHT, width: workArea.width, height: STRIP_HEIGHT };
}

function overlayBounds() {
  return expanded ? screen.getPrimaryDisplay().workArea : stripBounds();
}

function setExpanded(value) {
  expanded = value;
  if (win && !win.isDestroyed()) win.setBounds(overlayBounds());
}

// get-windows reports physical pixels on Windows; Electron works in DIPs, so
// at 125%/150% scaling the two disagree unless converted.
const toDip = b => (b && process.platform === 'win32' ? screen.screenToDipRect(null, b) : b);

function createWindow() {
  win = new BrowserWindow({
    ...overlayBounds(),
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false, // never steal focus from the browser we are yelling at
    alwaysOnTop: true,
    show: false,
    ...(process.platform === 'win32' && { type: 'toolbar' }),
    ...(process.platform === 'darwin' && { type: 'panel' }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  win.setAlwaysOnTop(true, process.platform === 'darwin' ? 'floating' : 'normal');
  if (process.platform === 'darwin') win.setVisibleOnAllWorkspaces(true);
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '../renderer/index.html'));
  win.once('ready-to-show', () => win.showInactive());

  const reposition = () => win && !win.isDestroyed() && win.setBounds(overlayBounds());
  screen.on('display-metrics-changed', reposition);
  screen.on('display-added', reposition);
  screen.on('display-removed', reposition);
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

function rendererSettings() {
  return {
    lang: lang(), countdown: config.get('countdown'), sound: config.get('sound'),
    scale: config.get('scale'), action: config.get('action'),
  };
}

// Where on our strip the shop window's centre is, so the duck can walk there.
function targetX(bounds) {
  const b = toDip(bounds);
  if (!b) return null;
  return Math.round(b.x + b.width / 2 - stripBounds().x);
}

// Screen point (DIP) the duck should peck: the shop tab's close button, or
// null when we can't tell or it is on another monitor.
function peckTarget(state) {
  const wa = screen.getPrimaryDisplay().workArea;
  const src = state.source || {};
  let t = null;
  if (src.window) { // from the extension, already in DIPs
    const w = src.window;
    t = tabCloseTarget({
      bounds: { x: w.left, y: w.top, width: w.width, height: w.height },
      index: src.index, count: src.count, maximized: w.state === 'maximized' || w.state === 'fullscreen',
    });
  } else if (state.bounds) {
    const b = toDip(state.bounds);
    t = tabCloseTarget({ bounds: b, maximized: b.y <= wa.y });
  }
  const inside = t && t.x >= wa.x && t.x <= wa.x + wa.width && t.y >= wa.y && t.y <= wa.y + wa.height;
  return inside ? t : null;
}

// Get out of the way of fullscreen games and videos (unless the fullscreen
// thing is a shop). The desktop itself is "fullscreen" too, so skip it.
function hideForFullscreen(active) {
  if (active) lastActive = active;
  if (!win || win.isDestroyed()) return;
  const d = screen.getPrimaryDisplay().bounds;
  const b = toDip(active?.bounds);
  const exe = (active?.owner?.path || '').split(/[\\/]/).pop().toLowerCase();
  const fullscreen = !!b && b.x <= d.x && b.y <= d.y && b.x + b.width >= d.x + d.width && b.y + b.height >= d.y + d.height
    && !/^(explorer\.exe|finder)$/.test(exe) && active.owner?.name !== 'Finder';
  if (fullscreen && !watcher.current.active && !expanded) {
    if (win.isVisible()) win.hide();
  } else if (!win.isVisible()) {
    win.showInactive();
  }
}

function onShoppingChange(state) {
  if (state.active) session++;
  send('shopping', { active: state.active, store: state.store, targetX: targetX(state.bounds), session });
}

function startDemo() {
  demoSession = ++session;
  send('shopping', { active: true, store: 'Demo', targetX: null, session: demoSession, demo: true });
}

function snooze(minutes) {
  watcher.snooze(minutes === Infinity ? Infinity : minutes * 60_000);
  const l = L();
  send('say', minutes === Infinity ? l.snoozeForever : l.snooze.replace('{n}', `{${l.minutes(minutes)}}`));
  buildMenu();
}

function showExtensionHelp() {
  const dir = extensionDir();
  const t = L().extension;
  shell.openPath(dir);
  dialog.showMessageBox({ type: 'info', title: t.title, message: t.message, detail: t.detail(dir) });
}

function buildMenu() {
  const m = L().menu;
  const radio = (label, key, value) => ({
    label, type: 'radio', checked: config.get(key) === value, click: () => config.set(key, value),
  });
  const template = [
    { label: `${watcher.snoozed ? m.paused : m.watching} · ${m.saved(config.get('stopped'))}`, enabled: false },
    { type: 'separator' },
    { label: m.demo, click: startDemo },
    watcher.snoozed
      ? { label: m.resume, click: () => { watcher.resume(); send('say', L().resume); buildMenu(); } }
      : {
          label: m.pause,
          submenu: [
            { label: m.pause15, click: () => snooze(15) },
            { label: m.pause60, click: () => snooze(60) },
            { label: m.pauseRestart, click: () => snooze(Infinity) },
          ],
        },
    { type: 'separator' },
    {
      label: m.action,
      submenu: [radio(m.actionPeck, 'action', 'peck'), radio(m.actionShoot, 'action', 'shoot'), radio(m.actionNothing, 'action', 'nothing')],
    },
    { label: m.countdown, submenu: [3, 5, 10].map(n => radio(L().seconds(n), 'countdown', n)) },
    { label: m.size, submenu: [[m.small, 2], [m.medium, 3], [m.large, 4]].map(([label, n]) => radio(label, 'scale', n)) },
    { label: m.sound, type: 'checkbox', checked: config.get('sound'), click: i => config.set('sound', i.checked) },
    {
      label: m.language,
      submenu: [radio('Авто / Auto', 'lang', 'auto'), radio('Українська', 'lang', 'uk'), radio('Русский', 'lang', 'ru'), radio('English', 'lang', 'en')],
    },
    ...(process.platform === 'linux' ? [] : [{
      label: m.autostart, type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked }),
    }]),
    { type: 'separator' },
    { label: `${m.extension}${bridge.connected ? ' ✓' : ''}`, click: showExtensionHelp },
    { label: m.settings, click: () => shell.openPath(config.file) },
    { type: 'separator' },
    { label: m.quit, click: () => app.quit() },
  ];
  const menu = Menu.buildFromTemplate(template);
  tray.setContextMenu(menu);
  tray.setToolTip(`No More Stupid Buys · ${m.saved(config.get('stopped'))}`);
  return menu;
}

function createTray() {
  const icon = nativeImage.createFromBuffer(duckPng(32, { crop: 'head' }), { scaleFactor: 2 });
  tray = new Tray(icon);
  buildMenu();
}

function wireIpc() {
  ipcMain.on('ready', () => {
    rendererReady = true;
    send('settings', rendererSettings());
    send('say', { hello: true });
    if (watcher.current.active) onShoppingChange(watcher.current);
  });

  let ignoring = true;
  ipcMain.on('set-ignore', (_e, ignore) => {
    if (ignore === ignoring) return;
    ignoring = ignore;
    win.setIgnoreMouseEvents(ignore, { forward: true });
  });

  ipcMain.on('menu', () => buildMenu().popup());

  // The duck is about to fly up and peck the tab: make room and tell it where.
  ipcMain.handle('finale-start', (_e, id) => {
    const demo = id === demoSession;
    if (!demo && (id !== session || !watcher.current.active)) return { left: true };
    const wa = screen.getPrimaryDisplay().workArea;
    let t = peckTarget(demo ? { bounds: lastActive?.bounds } : watcher.current);
    if (!t && demo) t = { x: wa.x + wa.width / 2, y: wa.y + 60 };
    if (!t) return { target: null };
    setExpanded(true);
    return { target: { x: t.x - wa.x, y: wa.y + wa.height - t.y }, height: wa.height };
  });
  ipcMain.handle('finale-end', () => setExpanded(false));

  ipcMain.handle('punish', async (_e, id) => {
    if (id === demoSession) { demoSession = null; return 'demo'; }
    // Only shoot if the user is still on the same shop the duck warned about.
    if (id !== session || !watcher.current.active) return 'left';
    return punish(watcher.current, { action: config.get('action'), bridge });
  });

  ipcMain.on('outcome', (_e, { kind, session: id }) => {
    if (id === demoSession || (kind !== 'relief' && kind !== 'shot')) return;
    config.set('stopped', config.get('stopped') + 1);
  });
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin') app.dock?.hide();
  config = new Config(path.join(app.getPath('userData'), 'settings.json'));
  recompile();

  bridge = new Bridge(BRIDGE_PORT);
  bridge.start();

  watcher = new Watcher({ getWindow: await windowSource(), getCompiled: () => compiled, bridge });
  watcher.on('change', onShoppingChange);
  watcher.on('window', hideForFullscreen);
  watcher.on('resumed', () => { send('say', L().resume); buildMenu(); });

  createWindow();
  createTray();
  wireIpc();
  watcher.start();

  bridge.on('change', buildMenu);
  config.on('change', () => {
    recompile();
    buildMenu();
    send('settings', rendererSettings());
  });
});

async function selfTest() {
  const report = { platform: process.platform, packaged: app.isPackaged };
  const finish = extra => {
    Object.assign(report, extra);
    fs.writeFileSync(selfTestFile, JSON.stringify(report, null, 2));
    app.exit(report.ok ? 0 : 1);
  };
  process.on('uncaughtException', err => finish({ ok: false, error: String(err.stack || err) }));
  process.on('unhandledRejection', err => finish({ ok: false, error: String(err?.stack || err) }));
  await app.whenReady();
  setTimeout(async () => {
    try {
      // get-windows silently returns nothing when its native part is missing,
      // so list all windows: ours is there if the reader really works.
      const { openWindows } = await import('get-windows');
      const all = await openWindows();
      report.windowReader = Array.isArray(all) ? `ok, sees ${all.length} windows` : 'broken (Windows: native module missing; Linux: install xprop and xwininfo)';
      report.rendererReady = rendererReady;
      report.tray = !!tray;
      report.extensionFolder = fs.existsSync(path.join(extensionDir(), 'manifest.json'));
      finish({ ok: Array.isArray(all) && rendererReady && report.tray && report.extensionFolder });
    } catch (err) {
      finish({ ok: false, error: String(err.stack || err) });
    }
  }, 6000);
}
if (selfTestFile) selfTest();

app.on('second-instance', () => send('say', { hello: true }));
app.on('window-all-closed', e => e.preventDefault());
app.on('before-quit', () => { watcher?.stop(); bridge?.stop(); });
