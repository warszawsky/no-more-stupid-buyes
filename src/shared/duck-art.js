// Procedural pixel-art duck. Everything is drawn into a small grid of palette
// keys, then outlined automatically, so new poses are a few lines each instead
// of hand-painted frames. Used by the renderer (canvas) and by the icon script
// (PNG encoder), which is why it has no DOM or Node dependencies.

export const W = 48;
export const H = 40;

export const PALETTE = {
  o: '#3d2c2e', // outline
  w: '#fff6ee', // body
  s: '#ecd6cb', // body shade
  S: '#d2b4a8', // wing edge
  y: '#f7a928', // beak / feet
  Y: '#dc7c1c', // beak underside
  k: '#1c1a1d', // eye
  e: '#ffffff', // eye glint
  b: '#2c303b', // bandana
  B: '#4d5566', // bandana fold
  g: '#7d8794', // gun
  G: '#b9c2cc', // gun highlight
  d: '#2f343c', // gun dark
  f: '#fff3a1', // muzzle flash core
  F: '#ffb43a', // muzzle flash rim
  p: '#ff7aa8', // blush
};

class Grid {
  constructor() {
    this.px = new Array(W * H).fill(null);
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= W || y >= H) return null;
    return this.px[y * W + x];
  }
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.px[y * W + x] = c;
  }
  rect(x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.set(x, y, c);
  }
  ellipse(cx, cy, rx, ry, c, test) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / (rx + 0.5);
        const dy = (y - cy) / (ry + 0.5);
        if (dx * dx + dy * dy <= 1 && (!test || test(x, y))) this.set(x, y, c);
      }
    }
  }
  tri(ax, ay, bx, by, cx, cy, c) {
    const minX = Math.min(ax, bx, cx), maxX = Math.max(ax, bx, cx);
    const minY = Math.min(ay, by, cy), maxY = Math.max(ay, by, cy);
    const side = (px, py, qx, qy, rx, ry) => (px - rx) * (qy - ry) - (qx - rx) * (py - ry);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d1 = side(x, y, ax, ay, bx, by);
        const d2 = side(x, y, bx, by, cx, cy);
        const d3 = side(x, y, cx, cy, ax, ay);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) this.set(x, y, c);
      }
    }
  }
  // Recolor the inner border of every pixel of colour `c` to `edge`, but only
  // where it touches something that isn't `c` (used for the wing crease).
  crease(c, edge, sides) {
    const hits = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.get(x, y) !== c) continue;
        for (const [dx, dy] of sides) {
          const n = this.get(x + dx, y + dy);
          if (n !== c && n !== edge) { hits.push([x, y]); break; }
        }
      }
    }
    for (const [x, y] of hits) this.set(x, y, edge);
  }
  outline(color, skip = new Set()) {
    const add = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (this.get(x, y)) continue;
        const n = [this.get(x - 1, y), this.get(x + 1, y), this.get(x, y - 1), this.get(x, y + 1)];
        if (n.some(v => v && !skip.has(v))) add.push([x, y]);
      }
    }
    for (const [x, y] of add) this.set(x, y, color);
  }
}

const X = 4; // horizontal offset so the muzzle flash fits on the right

/**
 * pose fields (all optional):
 *   bob        0|1   body pushed down a pixel (breathing / walking)
 *   step       null | 0..3   walk cycle phase; null = standing
 *   sit        bool  tucked legs (sleeping / resting)
 *   eye        'open' | 'closed' | 'happy' | 'angry'
 *   beak       'shut' | 'open'
 *   gun        0 none | 1 aiming | 2 aiming + muzzle flash
 *   wing       'rest' | 'up'
 *   tail       0|1   tail flick
 *   blush      bool
 */
export function drawDuck(pose = {}) {
  const {
    bob = 0, step = null, sit = false, eye = 'open', beak = 'shut',
    gun = 0, wing = 'rest', tail = 0, blush = false,
  } = pose;
  const g = new Grid();
  const dy = bob + (sit ? 3 : 0);

  // legs + feet
  if (!sit) {
    const legs = [[15, 0], [21, 0]];
    if (step !== null) {
      const swing = [[1, -1], [0, 0], [-1, 1], [0, 0]][step];
      const lift = [[0, 0], [1, 0], [0, 0], [0, 1]][step];
      legs[0] = [15 + swing[0], lift[0]];
      legs[1] = [21 + swing[1], lift[1]];
    }
    for (const [lx, lift] of legs) {
      g.rect(X + lx, 33, X + lx + 1, 37 - lift, 'y');
      g.rect(X + lx - 1, 38 - lift, X + lx + 3, 38 - lift, 'y');
    }
  }

  // tail
  const t = tail ? -1 : 0;
  g.tri(X + 4, 20 + dy + t, X + 12, 24 + dy, X + 10, 29 + dy, 'w');

  // body
  g.ellipse(X + 17, 28 + dy, 10, 6.5, 'w');
  g.ellipse(X + 17, 28 + dy, 10, 6.5, 's', (x, y) => y >= 32 + dy);

  // neck + head
  g.rect(X + 21, 15 + dy, X + 28, 25 + dy, 'w');
  g.ellipse(X + 25, 12 + dy, 7, 6.5, 'w');

  // bandana: crown down to the brow, a knot at the back and two short tails
  g.ellipse(X + 25, 12 + dy, 7, 6.5, 'b', (x, y) => y <= 8 + dy || (x <= X + 21 && y <= 10 + dy));
  g.rect(X + 16, 8 + dy, X + 18, 10 + dy, 'b');
  g.rect(X + 14, 11 + dy + t, X + 15, 13 + dy + t, 'b');
  g.set(X + 13, 13 + dy + t, 'b');
  g.rect(X + 17, 11 + dy, X + 18, 14 + dy, 'b');
  for (let x = X + 22; x <= X + 28; x++) g.set(x, 6 + dy, 'B');
  g.set(X + 21, 7 + dy, 'B'); g.set(X + 29, 7 + dy, 'B');
  g.set(X + 17, 9 + dy, 'B');
  if (eye === 'angry') {
    // bandana pulled down into a brow that slopes toward the beak = scowl
    g.set(X + 26, 9 + dy, 'b'); g.set(X + 27, 9 + dy, 'b');
    g.set(X + 28, 10 + dy, 'b'); g.set(X + 29, 10 + dy, 'b');
  }

  // beak
  g.rect(X + 31, 12 + dy, X + 36, 12 + dy, 'y');
  g.rect(X + 31, 13 + dy, X + 37, 13 + dy, 'y');
  if (beak === 'open') {
    g.rect(X + 31, 15 + dy, X + 36, 15 + dy, 'Y');
    g.rect(X + 31, 16 + dy, X + 35, 16 + dy, 'Y');
  } else {
    g.rect(X + 31, 14 + dy, X + 37, 14 + dy, 'Y');
    g.rect(X + 31, 15 + dy, X + 36, 15 + dy, 'Y');
  }

  // eye
  if (eye === 'closed') {
    g.rect(X + 26, 11 + dy, X + 28, 11 + dy, 'k');
  } else if (eye === 'happy') {
    g.set(X + 26, 11 + dy, 'k'); g.set(X + 27, 10 + dy, 'k'); g.set(X + 28, 11 + dy, 'k');
  } else if (eye === 'angry') {
    g.rect(X + 27, 11 + dy, X + 28, 12 + dy, 'k');
  } else {
    g.rect(X + 27, 10 + dy, X + 28, 11 + dy, 'k');
    g.set(X + 28, 10 + dy, 'e');
  }
  if (blush) { g.set(X + 27, 13 + dy, 'p'); g.set(X + 28, 13 + dy, 'p'); }

  // wing
  if (gun) {
    // wing swung forward, gripping the pistol
    g.ellipse(X + 22, 27 + dy, 5, 3, 's');
    g.tri(X + 22, 24 + dy, X + 29, 23 + dy, X + 27, 28 + dy, 's');
  } else if (wing === 'up') {
    g.ellipse(X + 15, 25 + dy, 5, 3, 's');
    g.tri(X + 11, 24 + dy, X + 7, 17 + dy, X + 15, 23 + dy, 's');
  } else {
    g.ellipse(X + 16, 27 + dy, 6, 3.5, 's');
    g.tri(X + 7, 25 + dy, X + 13, 24 + dy, X + 12, 30 + dy, 's');
  }
  g.crease('s', 'S', [[0, 1], [-1, 0]]);

  // pistol: slide, muzzle, grip, trigger guard
  if (gun) {
    const gy = 18 + dy;
    g.rect(X + 27, gy, X + 39, gy, 'G');
    g.rect(X + 27, gy + 1, X + 39, gy + 3, 'g');
    g.rect(X + 40, gy, X + 40, gy + 3, 'd');
    g.rect(X + 30, gy + 1, X + 37, gy + 1, 'G');
    g.set(X + 38, gy - 1, 'd');
    g.rect(X + 27, gy + 4, X + 30, gy + 8, 'd');
    g.set(X + 28, gy + 5, 'g'); g.set(X + 28, gy + 7, 'g');
    g.rect(X + 32, gy + 4, X + 33, gy + 4, 'd'); g.set(X + 33, gy + 5, 'd'); g.set(X + 32, gy + 6, 'd'); g.set(X + 31, gy + 6, 'd');
  }

  g.outline('o', new Set(['f', 'F']));

  if (gun === 2) {
    const gy = 18 + dy;
    const fx = X + 41;
    g.rect(fx, gy, fx + 1, gy + 2, 'f');
    g.set(fx + 2, gy + 1, 'f');
    for (const [x, y] of [[fx, gy - 1], [fx + 1, gy - 2], [fx + 2, gy], [fx + 3, gy + 1], [fx + 2, gy + 2], [fx + 1, gy + 4], [fx, gy + 3]]) g.set(x, y, 'F');
  }

  return { w: W, h: H, px: g.px };
}

// Paints a drawn duck onto any 2D context (browser canvas or OffscreenCanvas).
export function paint(ctx, art, ox, oy, scale, flip = false) {
  for (let y = 0; y < art.h; y++) {
    for (let x = 0; x < art.w; x++) {
      const c = art.px[y * art.w + x];
      if (!c) continue;
      ctx.fillStyle = PALETTE[c];
      const dx = flip ? art.w - 1 - x : x;
      ctx.fillRect(ox + dx * scale, oy + y * scale, scale, scale);
    }
  }
}

// Tight bounding box of the opaque pixels, for hit-testing.
export function bounds(art) {
  let x0 = art.w, y0 = art.h, x1 = -1, y1 = -1;
  for (let y = 0; y < art.h; y++) {
    for (let x = 0; x < art.w; x++) {
      if (!art.px[y * art.w + x]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  return { x0, y0, x1, y1 };
}
