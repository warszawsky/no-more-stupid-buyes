// Polls the foreground window and tells the duck when the user is shopping.
import { EventEmitter } from 'node:events';
import { matchStore } from './matcher.js';
import { isBrowser } from './stores.js';

const START_TICKS = 2; // must look like a shop this many polls in a row
const END_TICKS = 2;   // and not like one this many before we call it over

export class Watcher extends EventEmitter {
  /**
   * getWindow: async () => get-windows style { title, url?, owner, bounds } | undefined
   * getCompiled: () => compiled store matcher (re-read so settings apply live)
   * bridge: Bridge or null
   */
  constructor({ getWindow, getCompiled, bridge = null, interval = 700 }) {
    super();
    Object.assign(this, { getWindow, getCompiled, bridge, interval });
    this.current = { active: false };
    this.hits = 0;
    this.misses = 0;
    this.snoozeUntil = 0;
  }

  start() {
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
  }

  snooze(ms) {
    this.snoozeUntil = ms === Infinity ? Infinity : Date.now() + ms;
    this.hits = 0;
    if (this.current.active) this.set({ active: false });
  }

  resume() {
    this.snoozeUntil = 0;
  }

  get snoozed() {
    return Date.now() < this.snoozeUntil;
  }

  async detect() {
    let win;
    try {
      win = await this.getWindow();
      this.failing = false;
    } catch (err) {
      // reads fail while a window is closing; log once per streak, not per poll
      if (!this.failing) console.warn(`[watcher] ${err.message}`);
      this.failing = true;
    }
    this.emit('window', win);
    if (!win || !isBrowser(win.owner)) return null;
    const compiled = this.getCompiled();

    // The extension knows the real URL, so when the focused browser has it,
    // that wins over guessing from the title.
    const tab = this.bridge?.focusedTab();
    if (tab) {
      const store = matchStore({ url: tab.url }, compiled);
      const { client, tabId, index, count, window } = tab;
      return store && { store, bounds: win.bounds, source: { kind: 'extension', client, tabId, index, count, window } };
    }
    const store = matchStore({ url: win.url, title: win.title }, compiled);
    return store && { store, bounds: win.bounds, source: { kind: 'window' } };
  }

  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const found = await this.detect();
      if (this.snoozed) return;
      if (this.snoozeUntil) { this.snoozeUntil = 0; this.emit('resumed'); }
      if (found) {
        this.misses = 0;
        if (++this.hits >= START_TICKS && (!this.current.active || this.current.store !== found.store)) {
          this.set({ active: true, ...found });
        } else if (this.current.active) {
          this.current = { active: true, ...found }; // keep tab id / bounds fresh
        }
      } else {
        this.hits = 0;
        if (this.current.active && ++this.misses >= END_TICKS) this.set({ active: false });
      }
    } finally {
      this.busy = false;
    }
  }

  set(state) {
    this.current = state;
    this.misses = 0;
    this.emit('change', state);
  }
}
