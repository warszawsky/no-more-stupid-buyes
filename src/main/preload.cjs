// The renderer only gets these few calls, nothing from Node.
const { contextBridge, ipcRenderer } = require('electron');

const CHANNELS = new Set(['settings', 'shopping', 'say']);

contextBridge.exposeInMainWorld('duck', {
  on(channel, fn) {
    if (CHANNELS.has(channel)) ipcRenderer.on(channel, (_e, data) => fn(data));
  },
  ready: () => ipcRenderer.send('ready'),
  setIgnoreMouse: ignore => ipcRenderer.send('set-ignore', ignore),
  punish: session => ipcRenderer.invoke('punish', session),
  outcome: (kind, session) => ipcRenderer.send('outcome', { kind, session }),
  menu: () => ipcRenderer.send('menu'),
});
