// Local WebSocket the optional browser extension connects to. The extension
// reports the real URL of the focused tab and can close a tab by id, which is
// more precise than reading window titles and faking Ctrl+W.
import { EventEmitter } from 'node:events';
import { WebSocketServer, WebSocket } from 'ws';

export class Bridge extends EventEmitter {
  constructor(port) {
    super();
    this.port = port;
    this.clients = new Map(); // ws -> last reported tab state
  }

  start() {
    this.wss = new WebSocketServer({
      host: '127.0.0.1',
      port: this.port,
      // Only browser extensions, never a random web page talking to localhost.
      verifyClient: ({ origin }) => /^(chrome|moz)-extension:\/\//.test(origin || ''),
    });
    this.wss.on('error', err => console.warn(`[bridge] disabled: ${err.message}`));
    this.wss.on('connection', ws => {
      this.clients.set(ws, null);
      this.emit('change');
      ws.on('message', data => {
        let msg;
        try { msg = JSON.parse(data); } catch { return; }
        if (msg.type === 'tab') {
          this.clients.set(ws, { url: msg.url, title: msg.title, tabId: msg.tabId, focused: !!msg.focused, at: Date.now() });
        }
      });
      ws.on('close', () => { this.clients.delete(ws); this.emit('change'); });
    });
  }

  get connected() {
    return this.clients.size;
  }

  // The tab the user is looking at right now, if a browser with the extension
  // has focus.
  focusedTab() {
    let best = null, client = null;
    for (const [ws, s] of this.clients) {
      if (s && s.focused && (!best || s.at > best.at)) { best = s; client = ws; }
    }
    return best && { ...best, client };
  }

  closeTab(client, tabId) {
    if (!client || client.readyState !== WebSocket.OPEN) return false;
    client.send(JSON.stringify({ type: 'close-tab', tabId }));
    return true;
  }

  stop() {
    this.wss?.close();
  }
}
