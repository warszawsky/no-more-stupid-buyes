// Reports the focused tab to the No More Stupid Buys app over a local
// WebSocket and closes a tab when the duck says so. Nothing leaves your PC.
const URL_ = 'ws://127.0.0.1:47821'; // must match BRIDGE_PORT in src/main/main.js
let ws = null;

function connect() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  try {
    ws = new WebSocket(URL_);
  } catch {
    return;
  }
  ws.onopen = () => report();
  ws.onmessage = async e => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (msg.type === 'close-tab' && Number.isInteger(msg.tabId)) {
      chrome.tabs.remove(msg.tabId).catch(() => {});
    }
  };
  ws.onclose = () => { ws = null; };
  ws.onerror = () => {};
}

async function report() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return connect();
  let win;
  try {
    win = await chrome.windows.getLastFocused({ populate: true });
  } catch {
    return;
  }
  const tab = win?.tabs?.find(t => t.active);
  ws.send(JSON.stringify({
    type: 'tab',
    url: tab?.url || '',
    title: tab?.title || '',
    tabId: tab?.id,
    focused: !!win?.focused,
    // where the tab sits, so the duck knows where to fly and peck
    index: tab?.index,
    count: win?.tabs?.length,
    window: win && { left: win.left, top: win.top, width: win.width, height: win.height, state: win.state },
  }));
}

chrome.tabs.onActivated.addListener(report);
chrome.tabs.onUpdated.addListener((_id, change, tab) => {
  if (tab.active && (change.url || change.title || change.status === 'complete')) report();
});
chrome.windows.onFocusChanged.addListener(report);

// Keep the service worker (and the socket) alive, and reconnect if the app
// was started after the browser.
chrome.alarms.create('ping', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener(() => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
  else connect();
});
setInterval(() => {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send('{"type":"ping"}');
}, 20_000);

connect();
