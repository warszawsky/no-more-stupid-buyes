// settings.json in the app's user-data folder. Written with defaults on first
// run so it can be edited by hand; edits are picked up without a restart.
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { DEFAULT_IGNORE_TITLES } from './stores.js';

export const DEFAULTS = {
  countdown: 5,           // seconds the duck gives you
  action: 'peck',         // 'peck' (fly up, close with the beak) | 'shoot' | 'nothing' (threats only)
  sound: true,
  scale: 3,               // size of one duck pixel, in screen pixels
  disabledStores: [],     // names from the built-in list to ignore, e.g. ["Steam"]
  customStores: [],       // [{ "name": "Zara", "domains": ["zara.com"], "keywords": ["ZARA"] }]
  ignoreTitles: DEFAULT_IGNORE_TITLES,
  stopped: 0,             // stupid buys prevented so far
};

export class Config extends EventEmitter {
  constructor(file) {
    super();
    this.file = file;
    this.data = { ...DEFAULTS };
    this.load();
    if (!fs.existsSync(file)) this.save();
    this.watch();
  }

  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.data = { ...DEFAULTS, ...raw };
      if (this.data.action === 'close-tab') this.data.action = 'peck'; // name from v0.1
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`[config] ${this.file}: ${err.message}, using defaults`);
    }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    this.written = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(this.file, this.written);
  }

  watch() {
    fs.watchFile(this.file, { interval: 1500 }, () => {
      let text;
      try { text = fs.readFileSync(this.file, 'utf8'); } catch { return; }
      if (text === this.written) return; // our own save
      this.written = text;
      this.load();
      this.emit('change');
    });
  }

  get(key) {
    return this.data[key];
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
    this.emit('change');
  }
}
