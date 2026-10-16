// All sounds are synthesized with WebAudio, so there are no audio files.
let ctx = null;
export const sound = { enabled: true };

function ac() {
  ctx ||= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ type = 'square', from, to = from, dur, vol = 0.08, at = 0 }) {
  if (!sound.enabled) return;
  const a = ac();
  const t0 = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(from, t0);
  o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function noise({ dur, vol = 0.3, from = 4000, to = 200, at = 0, q = 0.7 }) {
  if (!sound.enabled) return;
  const a = ac();
  const t0 = a.currentTime + at;
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

export function blip(pitch = 1) {
  tone({ from: 520 * pitch, to: 480 * pitch, dur: 0.035, vol: 0.035 });
}

export function quack() {
  if (!sound.enabled) return;
  const a = ac();
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const f = a.createBiquadFilter();
  const g = a.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(620, t0);
  o.frequency.exponentialRampToValueAtTime(330, t0 + 0.18);
  f.type = 'bandpass';
  f.frequency.value = 1300;
  f.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  o.connect(f).connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + 0.22);
}

export function alert() {
  tone({ from: 700, to: 900, dur: 0.07, vol: 0.06 });
  tone({ from: 1000, to: 1300, dur: 0.09, vol: 0.06, at: 0.08 });
}

export function cock() {
  noise({ dur: 0.04, vol: 0.4, from: 6000, to: 2000, q: 4 });
  noise({ dur: 0.05, vol: 0.45, from: 5000, to: 1500, q: 4, at: 0.12 });
}

export function tick(last = false) {
  tone({ type: 'triangle', from: last ? 1400 : 1100, dur: 0.05, vol: 0.09 });
}

export function bang() {
  noise({ dur: 0.45, vol: 0.9, from: 7000, to: 120 });
  tone({ type: 'sine', from: 140, to: 40, dur: 0.35, vol: 0.6 });
}

export function happy() {
  tone({ type: 'triangle', from: 660, dur: 0.08, vol: 0.07 });
  tone({ type: 'triangle', from: 990, dur: 0.12, vol: 0.07, at: 0.09 });
}

export function peck() {
  noise({ dur: 0.05, vol: 0.5, from: 3200, to: 900, q: 6 });
  tone({ type: 'triangle', from: 720, to: 320, dur: 0.06, vol: 0.12 });
}

export function flap() {
  noise({ dur: 0.12, vol: 0.1, from: 900, to: 250, q: 0.5 });
}
