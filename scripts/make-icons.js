// Writes the app icon (build/icon.png, for electron-builder) and the browser
// extension icon from the procedural duck.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { duckPng } from '../src/main/png.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'build', 'icon.png'), duckPng(512, { crop: 'head' }));
fs.writeFileSync(path.join(root, 'extension', 'icon.png'), duckPng(128, { crop: 'head' }));
console.log('wrote build/icon.png and extension/icon.png');
