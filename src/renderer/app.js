import { drawDuck, paint, bounds as artBounds, W as ART_W, H as ART_H } from '../shared/duck-art.js';
import { LINES, pick } from '../shared/lines.js';
import * as sfx from './sound.js';

// Outside Electron (opening index.html in a browser) there is no bridge;
// a stub keeps the page working for previews.
const api = window.duck || {
  on() {}, ready() {}, setIgnoreMouse() {}, menu() {}, outcome() {},
  punish: async () => 'nothing',
};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const bubbleEl = document.getElementById('bubble');
const nameEl = bubbleEl.querySelector('.name');
const textEl = bubbleEl.querySelector('.text');
const timerEl = bubbleEl.querySelector('.timer');
const burstEl = document.getElementById('burst');

const settings = { lang: 'en', countdown: 5, sound: true, scale: 3 };
const L = () => LINES[settings.lang] || LINES.en;

const BODY_X = 22;      // art column the duck turns around
const MUZZLE = [45, 19]; // art pixel at the end of the barrel
const GRAVITY = 1400;    // css px / s^2
const now = () => performance.now();
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let dpr = 1, cssW = 0, cssH = 0;

const duck = {
  x: 0, y: 0, vy: 0,       // y = height above the taskbar, css px
  facing: 1,
  zoom: 1, zoomTarget: 1,
  mode: 'idle',            // idle | walk | run | sit | sleep | held
  mood: null,              // null | 'angry' | 'happy'
  alert: false,
  gun: 0,
  flashUntil: 0,
  recoilUntil: 0,
  talking: false,
  blinkUntil: 0,
  nextBlink: 0,
};

let shopping = { active: false, session: 0 };
let warned = false;        // the user actually saw the warning this session
let lastSessionEnd = -Infinity;
let cooldownUntil = 0;
let recheckTimer = null;
let lastInteraction = now();
const particles = [];

// ---------------------------------------------------------------- layout

function resize() {
  dpr = window.devicePixelRatio || 1;
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.imageSmoothingEnabled = false;
  duck.x = clamp(duck.x || cssW * 0.72, 40, cssW - 40);
}

const pixel = () => Math.max(1, Math.round(settings.scale * dpr * duck.zoom)); // device px per art px

// Where art pixel (ax, ay) lands on screen, in css px.
function artToCss(ax, ay, art) {
  const px = pixel() / dpr;
  const flip = duck.facing < 0;
  const col = flip ? ART_W - 1 - ax : ax;
  const anchor = flip ? ART_W - 1 - BODY_X : BODY_X;
  const recoil = now() < duck.recoilUntil ? -2 * duck.facing : 0;
  return {
    x: duck.x + (col - anchor + recoil) * px,
    y: cssH - duck.y - (art.h - ay) * px,
  };
}

// ---------------------------------------------------------------- poses

const artCache = new Map();
function artFor(pose) {
  const key = JSON.stringify(pose);
  let art = artCache.get(key);
  if (!art) {
    art = drawDuck(pose);
    art.box = artBounds(art);
    artCache.set(key, art);
  }
  return art;
}

function poseFor(t) {
  const p = { eye: 'open' };
  switch (duck.mode) {
    case 'walk':
    case 'run':
      p.step = Math.floor(t / (duck.mode === 'run' ? 65 : 130)) % 4;
      p.bob = p.step % 2;
      break;
    case 'sit':
      p.sit = true;
      p.bob = Math.floor(t / 900) % 2;
      break;
    case 'sleep':
      p.sit = true;
      p.eye = 'closed';
      p.bob = Math.floor(t / 1400) % 2;
      break;
    case 'held':
      p.step = 1;
      p.wing = 'up';
      p.tail = Math.floor(t / 140) % 2;
      break;
    default:
      p.bob = duck.y > 0 ? 0 : Math.floor(t / 700) % 2;
  }
  if (duck.y > 0 && duck.mode !== 'held') { p.wing = 'up'; p.step = 3; }
  if (duck.alert) p.wing = 'up';
  if (duck.mood === 'angry') p.eye = 'angry';
  if (duck.mood === 'happy') { p.eye = 'happy'; p.blush = true; }
  if (duck.gun) {
    p.gun = t < duck.flashUntil ? 2 : 1;
    delete p.wing;
    if (p.step === undefined) p.bob = Math.floor(t / 1000) % 2;
  }
  if (duck.talking && Math.floor(t / 110) % 2) p.beak = 'open';
  if (p.eye === 'open' && t < duck.blinkUntil) p.eye = 'closed';
  return p;
}

// ---------------------------------------------------------------- particles

const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];

function spawn(kind, x, y, extra = {}) {
  particles.push({ kind, x, y, vx: 0, vy: 0, born: now(), life: 1200, ...extra });
}

function headCss() {
  const art = artFor(poseFor(now()));
  return artToCss(29, art.box.y0, art);
}

function muzzleCss() {
  return artToCss(MUZZLE[0], MUZZLE[1], artFor(poseFor(now())));
}

function drawParticles(t, dt) {
  const s = Math.max(1, Math.round(settings.scale * dpr * 0.8));
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    const age = t - p.born;
    if (age > p.life) { particles.splice(i, 1); continue; }
    if (p.gravity) p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const k = age / p.life;
    const X = p.x * dpr, Y = p.y * dpr;
    ctx.globalAlpha = p.fade === false ? 1 : 1 - k * k;
    if (p.kind === 'heart') {
      HEART.forEach((row, ry) => [...row].forEach((c, rx) => {
        if (c === '#') { ctx.fillStyle = '#ff5c8a'; ctx.fillRect(X + rx * s, Y + ry * s, s, s); }
      }));
    } else if (p.kind === 'smoke') {
      ctx.fillStyle = '#d9d9d9';
      const r = (3 + k * 9) * dpr;
      ctx.beginPath();
      ctx.arc(X, Y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'shell') {
      ctx.fillStyle = '#e8b84a';
      ctx.fillRect(X, Y, s * 2, s);
    } else {
      // text particles: "!", "z", "Z"
      ctx.font = `900 ${p.size * dpr}px "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4 * dpr;
      ctx.strokeStyle = '#3d2c2e';
      ctx.fillStyle = p.color;
      ctx.strokeText(p.text, X, Y);
      ctx.fillText(p.text, X, Y);
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- bubble

let sayToken = 0;
let hideTimer = null;

function parseLine(text) {
  // "{...}" marks the highlighted bit, e.g. "You got {5 seconds} to ..."
  return text.split(/\{([^}]*)\}/).map((t, i) => ({ t, hl: i % 2 === 1 })).filter(s => s.t);
}

function renderTyped(segments, shown) {
  textEl.replaceChildren();
  let left = shown;
  for (const seg of segments) {
    const visible = seg.t.slice(0, Math.max(0, left));
    const hidden = seg.t.slice(visible.length);
    left -= seg.t.length;
    const wrap = seg.hl ? document.createElement('em') : document.createDocumentFragment();
    if (visible) wrap.append(visible);
    if (hidden) {
      // keep the full text in the layout so the bubble doesn't grow while typing
      const ghost = document.createElement('span');
      ghost.style.visibility = 'hidden';
      ghost.textContent = hidden;
      wrap.append(ghost);
    }
    textEl.append(wrap);
  }
}

// Types a line into the bubble; resolves when the last letter is out.
function say(text, { hold = 0 } = {}) {
  const token = ++sayToken;
  clearTimeout(hideTimer);
  const segments = parseLine(text);
  const total = segments.reduce((n, s) => n + s.t.length, 0);
  nameEl.textContent = L().name;
  renderTyped(segments, 0);
  bubbleEl.classList.add('show');
  positionBubble();
  return new Promise(resolve => {
    let shown = 0;
    duck.talking = true;
    const step = () => {
      if (token !== sayToken) return resolve();
      shown++;
      renderTyped(segments, shown);
      const ch = segments.map(s => s.t).join('')[shown - 1];
      if (shown % 2 && ch && ch.trim()) sfx.blip(duck.mood === 'angry' ? 0.8 : 1);
      if (shown < total) {
        setTimeout(step, /[.,!?…]/.test(ch) ? 160 : 38);
      } else {
        duck.talking = false;
        if (hold) hideTimer = setTimeout(hideBubble, hold);
        resolve();
      }
    };
    setTimeout(step, 60);
  });
}

function hideBubble() {
  sayToken++;
  duck.talking = false;
  bubbleEl.classList.remove('show');
  setTimer(null);
}

function setTimer(n) {
  if (n == null) { timerEl.classList.remove('on'); return; }
  timerEl.textContent = n;
  timerEl.classList.add('on');
  timerEl.classList.remove('pulse');
  void timerEl.offsetWidth; // restart the animation
  timerEl.classList.add('pulse');
}

function positionBubble() {
  if (!bubbleEl.classList.contains('show')) return;
  const head = headCss();
  const bw = bubbleEl.offsetWidth, bh = bubbleEl.offsetHeight;
  const left = clamp(head.x - bw / 2, 8, cssW - bw - 8);
  const top = Math.max(16, head.y - bh - 20);
  bubbleEl.style.left = `${left}px`;
  bubbleEl.style.top = `${top}px`;
  bubbleEl.style.setProperty('--tail-x', `${clamp(head.x - left, 22, bw - 22)}px`);
}

// ---------------------------------------------------------------- jobs
// The duck does one thing at a time. A higher-priority job (threat) cancels
// whatever is running by flipping `cancelled`; waits then throw CANCEL.

const CANCEL = Symbol('cancel');
let job = null;

function run(kind, fn) {
  if (job) job.cancelled = true;
  const j = { kind, cancelled: false };
  job = j;
  // a cancelled walk or drag must not leave the legs running / the duck stuck
  if (duck.mode === 'walk' || duck.mode === 'run' || (duck.mode === 'held' && kind !== 'held')) duck.mode = 'idle';
  if (kind !== 'held') dragging = null;
  fn(j)
    .catch(err => { if (err !== CANCEL) console.error(err); })
    .finally(() => { if (job === j) { job = null; decide(); } });
}

const wait = (ms, j) => new Promise((resolve, reject) => {
  setTimeout(() => (j.cancelled ? reject(CANCEL) : resolve()), ms);
});
const nextFrame = () => new Promise(r => requestAnimationFrame(r));

async function walkTo(x, j, speed = 40) {
  x = clamp(x, 40, cssW - 40);
  if (Math.abs(x - duck.x) < 2) return;
  duck.facing = x > duck.x ? 1 : -1;
  duck.mode = speed > 100 ? 'run' : 'walk';
  let last = now();
  while (Math.abs(duck.x - x) > 0.5) {
    await nextFrame();
    if (j.cancelled) throw CANCEL;
    const t = now();
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    duck.x += Math.sign(x - duck.x) * Math.min(speed * dt, Math.abs(x - duck.x));
  }
  duck.mode = 'idle';
}

async function hop(j, height = 220) {
  if (duck.y === 0) duck.vy = height;
  await nextFrame();
  while (duck.y > 0) {
    await nextFrame();
    if (j.cancelled) throw CANCEL;
  }
}

function calmDown() {
  duck.gun = 0;
  duck.zoomTarget = 1;
  duck.mood = null;
  duck.alert = false;
  setTimer(null);
}

async function idleJob(j) {
  calmDown();
  if (duck.mode === 'run' || duck.mode === 'walk') duck.mode = 'idle';
  for (;;) {
    await wait(rand(1500, 4500), j);
    const bored = now() - lastInteraction > 120_000;
    const r = Math.random();
    if (bored && r < 0.35) {
      duck.mode = 'sleep';
      await wait(rand(30_000, 90_000), j);
      duck.mode = 'idle';
    } else if (r < 0.5) {
      await walkTo(duck.x + rand(-350, 350), j, rand(32, 48));
    } else if (r < 0.65) {
      duck.mode = 'sit';
      await wait(rand(4000, 10_000), j);
      duck.mode = 'idle';
    } else if (r < 0.75) {
      duck.facing *= -1;
    }
  }
}

async function threatJob(j) {
  const l = L();
  const again = now() - lastSessionEnd < 60_000;
  warned = false;
  clearTimeout(hideTimer);
  hideBubble();
  calmDown();

  // notice
  const wasAsleep = duck.mode === 'sleep' || duck.mode === 'sit';
  duck.mode = 'idle';
  duck.alert = true;
  sfx.alert();
  const h = headCss();
  spawn('text', h.x, h.y - 6, { text: '!', size: 34, color: '#ff4b4b', vy: -30, life: 900 });
  await hop(j, wasAsleep ? 300 : 220);
  await wait(250, j);
  duck.alert = false;

  // go stand in front of the shop
  const target = clamp((shopping.targetX ?? cssW / 2) + rand(-140, -60), 60, cssW - 60);
  const dist = Math.abs(target - duck.x);
  if (dist > 30) await walkTo(target, j, Math.max(280, dist / 1.1));
  duck.facing = duck.x < cssW / 2 ? 1 : -1;
  duck.mood = 'angry';

  // warn
  const n = settings.countdown;
  warned = true;
  await say(pick(again ? l.again : l.warn).replace('{n}', `{${l.seconds(n)}}`));
  if (j.cancelled) throw CANCEL;
  await wait(250, j);

  // gun out, count down
  duck.gun = 1;
  duck.zoomTarget = 1.55;
  sfx.cock();
  say(pick(l.orElse));
  for (let i = n; i > 0; i--) {
    setTimer(i);
    sfx.tick(i === 1);
    await wait(1000, j);
  }
  setTimer(null);

  // too late
  j.kind = 'shot'; // leaving now doesn't earn a "good choice"
  duck.flashUntil = now() + 110;
  duck.recoilUntil = now() + 140;
  sfx.bang();
  const m = muzzleCss();
  burstEl.style.left = `${m.x}px`;
  burstEl.style.top = `${m.y}px`;
  burstEl.classList.remove('go');
  void burstEl.offsetWidth;
  burstEl.classList.add('go');
  canvas.classList.remove('shake');
  void canvas.offsetWidth;
  canvas.classList.add('shake');
  spawn('shell', m.x - 30 * duck.facing, m.y, { vx: -90 * duck.facing, vy: -260, gravity: 1200, life: 700, fade: false });

  const session = shopping.session;
  const result = await api.punish(session);
  lastSessionEnd = now();
  if (result === 'demo') shopping = { active: false, session };
  if (result === 'extension' || result === 'keys') api.outcome('shot', session);

  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      const p = muzzleCss();
      spawn('smoke', p.x + rand(-2, 2), p.y, { vx: rand(-6, 6) + 8 * duck.facing, vy: rand(-40, -25), life: 1400 });
    }, 120 + i * 170);
  }
  await wait(450, j);
  const line = result === 'demo' ? l.demo
    : result === 'extension' || result === 'keys' ? l.shot
      : result === 'left' ? l.relief
        : l.blank;
  await say(pick(line));
  await wait(1800, j);
  calmDown();
  await wait(700, j);
  hideBubble();
  cooldownUntil = now() + (result === 'extension' || result === 'keys' ? 2500 : 30_000);
}

async function reliefJob(j) {
  const session = shopping.session;
  if (warned) api.outcome('relief', session);
  warned = false;
  lastSessionEnd = now();
  calmDown();
  duck.mood = 'happy';
  sfx.happy();
  const h = headCss();
  spawn('heart', h.x - 10, h.y - 4, { vy: -40, life: 1300 });
  setTimeout(() => {
    const p = headCss();
    spawn('heart', p.x + 8, p.y - 2, { vy: -45, life: 1300 });
  }, 250);
  await say(pick(L().relief));
  await wait(2200, j);
  duck.mood = null;
  hideBubble();
}

// What to do when the current job ends.
function decide() {
  clearTimeout(recheckTimer);
  if (shopping.active) {
    const left = cooldownUntil - now();
    if (left <= 0) return run('threat', threatJob);
    recheckTimer = setTimeout(() => {
      if (shopping.active && (!job || job.kind === 'idle')) run('threat', threatJob);
    }, left);
  }
  run('idle', idleJob);
}

// ---------------------------------------------------------------- mouse

let dragging = null;
let ignoring = true;
let releaseDrag = null;

function duckRect() {
  const art = artFor(poseFor(now()));
  const a = artToCss(art.box.x0, art.box.y0, art);
  const b = artToCss(art.box.x1 + 1, art.box.y1 + 1, art);
  return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: a.y, y1: b.y };
}

function overDuck(x, y) {
  const r = duckRect();
  return x >= r.x0 - 4 && x <= r.x1 + 4 && y >= r.y0 - 4 && y <= r.y1 + 4;
}

function setIgnore(v) {
  if (v === ignoring) return;
  ignoring = v;
  api.setIgnoreMouse(v);
}

document.addEventListener('mousemove', e => {
  if (dragging) {
    dragging.moved ||= Math.hypot(e.clientX - dragging.sx, e.clientY - dragging.sy) > 4;
    if (dragging.moved && job?.kind !== 'held' && canDrag()) {
      run('held', heldJob);
    }
    if (job?.kind === 'held') {
      duck.x = clamp(e.clientX - dragging.dx, 20, cssW - 20);
      duck.y = clamp(cssH - e.clientY - dragging.dy, 0, cssH - 60);
    }
    return;
  }
  setIgnore(!overDuck(e.clientX, e.clientY));
});

document.addEventListener('mouseleave', () => { if (!dragging) setIgnore(true); });

document.addEventListener('mousedown', e => {
  if (!overDuck(e.clientX, e.clientY)) return;
  lastInteraction = now();
  if (e.button === 2) { api.menu(); return; }
  if (e.button !== 0) return;
  dragging = { sx: e.clientX, sy: e.clientY, dx: e.clientX - duck.x, dy: cssH - e.clientY - duck.y, moved: false };
});

document.addEventListener('mouseup', e => {
  if (!dragging) return;
  const wasDrag = dragging.moved;
  dragging = null;
  if (job?.kind === 'held') releaseDrag?.();
  else if (!wasDrag) poke();
  setIgnore(!overDuck(e.clientX, e.clientY));
});

document.addEventListener('contextmenu', e => e.preventDefault());

const canDrag = () => !job || job.kind === 'idle' || job.kind === 'relief';

function poke() {
  if (!canDrag()) return;
  sfx.quack();
  if (duck.mode === 'sleep' || duck.mode === 'sit') duck.mode = 'idle';
  if (duck.y === 0) duck.vy = 160;
  say(pick(L().quack), { hold: 1600 });
}

async function heldJob(j) {
  calmDown();
  duck.mode = 'held';
  duck.vy = 0;
  sfx.quack();
  await new Promise(resolve => { releaseDrag = resolve; });
  releaseDrag = null;
  duck.mode = 'idle';
  while (duck.y > 0) {
    await nextFrame();
    if (j.cancelled) throw CANCEL;
  }
}

// ---------------------------------------------------------------- loop

let lastFrame = now();
function frame(t) {
  const dt = Math.min(0.05, (t - lastFrame) / 1000);
  lastFrame = t;

  if (duck.mode !== 'held' && (duck.y > 0 || duck.vy > 0)) {
    duck.vy -= GRAVITY * dt;
    duck.y += duck.vy * dt;
    if (duck.y <= 0) { duck.y = 0; duck.vy = 0; }
  }
  duck.zoom += (duck.zoomTarget - duck.zoom) * Math.min(1, dt * 9);
  if (Math.abs(duck.zoom - duck.zoomTarget) < 0.01) duck.zoom = duck.zoomTarget;
  if (t > duck.nextBlink) {
    duck.blinkUntil = t + 130;
    duck.nextBlink = t + rand(2500, 6000);
  }
  if (duck.mode === 'sleep' && Math.random() < dt * 0.7) {
    const h = headCss();
    spawn('text', h.x + 8 * duck.facing, h.y, { text: Math.random() < 0.5 ? 'z' : 'Z', size: 18, color: '#ffffff', vx: 10 * duck.facing, vy: -28, life: 2200 });
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const art = artFor(poseFor(t));
  const tl = artToCss(duck.facing < 0 ? ART_W - 1 : 0, 0, art);
  paint(ctx, art, Math.round(tl.x * dpr), Math.round(tl.y * dpr), pixel(), duck.facing < 0);
  drawParticles(t, dt);
  positionBubble();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- wiring

api.on('settings', s => {
  Object.assign(settings, s);
  sfx.sound.enabled = !!settings.sound;
  nameEl.textContent = L().name;
});

api.on('shopping', s => {
  const was = shopping.active;
  shopping = s;
  lastInteraction = now();
  if (s.active) {
    if (job && (job.kind === 'threat' || job.kind === 'shot')) return; // already on it
    if (now() < cooldownUntil) return decide();
    run('threat', threatJob);
  } else if (was && job?.kind === 'threat') {
    run('relief', reliefJob);
  }
});

api.on('say', msg => {
  if (job && job.kind !== 'idle') return; // never talk over a threat
  const text = typeof msg === 'string' ? msg : pick(L().hello);
  if (duck.mode === 'sleep') duck.mode = 'idle';
  say(text, { hold: 3500 });
});

window.addEventListener('resize', resize);
resize();
duck.y = cssH - 40; // drop in from above on launch
requestAnimationFrame(frame);
run('idle', idleJob);
api.ready();
