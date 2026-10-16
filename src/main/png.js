// Minimal PNG encoder so the tray and app icons can be rendered from the same
// pixel art as the duck itself, without shipping binary assets.
import zlib from 'node:zlib';
import { drawDuck, PALETTE, bounds } from '../shared/duck-art.js';

const CRC_TABLE = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));

// Renders the duck (or a crop of it) centred in a square PNG of `size` px.
export function duckPng(size, { crop = 'full', pose = {} } = {}) {
  const art = drawDuck(pose);
  let { x0, y0, x1, y1 } = bounds(art);
  if (crop === 'head') { x0 = 17; y0 = 3; x1 = 42; y1 = 23; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const scale = Math.max(1, Math.floor(size / Math.max(cw, ch)));
  const offX = Math.floor((size - cw * scale) / 2);
  const offY = Math.floor((size - ch * scale) / 2);
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = art.px[y * art.w + x];
      if (!c) continue;
      const [r, g, b] = hex(PALETTE[c]);
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = offX + (x - x0) * scale + sx;
          const py = offY + (y - y0) * scale + sy;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const i = (py * size + px) * 4;
          rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
        }
      }
    }
  }
  return encodePng(size, size, rgba);
}
