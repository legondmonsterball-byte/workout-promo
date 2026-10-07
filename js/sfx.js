// 효과음: 파일 없이 Web Audio로 합성 (종이 넘김, 휙, 톡)
let ac = null, out = null, noise = null, on = true;
function ctx() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
  ac = new AC(); out = ac.createGain(); out.gain.value = .6; out.connect(ac.destination);
  const len = ac.sampleRate * .6; noise = ac.createBuffer(1, len, ac.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return ac;
}
function burst({ f0, f1, q = .9, dur = .2, vol = .4, type = 'bandpass', at = 0 }) {
  const c = ctx(); if (!c || !on) return; const t = c.currentTime + at;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noise; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(.03, dur * .2)); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .3, dur + .05);
}
function tone(fr, dur, vol, type = 'sine', at = 0, f1) {
  const c = ctx(); if (!c || !on) return; const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(fr, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0008, t + dur);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + .02);
}
export const sfx = {
  unlock() { const c = ctx(); if (c && c.state === 'suspended') c.resume() },
  get on() { return on }, set on(v) { on = v; if (out) out.gain.setTargetAtTime(v ? .6 : 0, ac.currentTime, .08) },
  flip(v = 1) { burst({ f0: 700, f1: 3600, q: .7, dur: .16 + .1 * v, vol: .22 + .2 * v }); burst({ f0: 2400, f1: 900, q: 1.2, dur: .08, vol: .08 * v, at: .1 }) },
  whoosh() { burst({ f0: 180, f1: 2600, q: .6, dur: .9, vol: .35 }); tone(60, .9, .25, 'sine', .6, 38) },
  thud() { tone(90, .35, .35, 'sine', 0, 45); burst({ f0: 400, f1: 120, q: .7, dur: .25, vol: .2, type: 'lowpass' }) },
  tick() { tone(1400, .05, .04, 'square') },
  charge(d = 3) { tone(90, d, .1, 'sawtooth', 0, 620); tone(180, d, .05, 'sine', 0, 1240); burst({ f0: 200, f1: 5000, q: 2, dur: d, vol: .14 }) },
  shard(v = 1) { tone(2200 + Math.random() * 2600, .09, .025 * v, 'sine'); tone(5200 + Math.random() * 1800, .05, .012 * v, 'triangle') },
  pop() { tone(520, .18, .18, 'triangle', 0, 1100); tone(1200, .25, .08, 'sine', .06, 1800) },
};

// 배경 비트: 100BPM 긴장감 — 심장 박동 같은 둥둥 킥, 8분음표로 조여오는 베이스(필터가 8마디 동안 점점 열림),
// 시계 초침 같은 틱, 반음 부딪히는 어두운 패드, 높은 떨림음, 8마디마다 끌어올리는 소리 (파일 없이 합성)
const BPM = 100, STEP = 60 / BPM / 4, ROOT = [55, 55, 43.65, 41.2], PAD = [[110, 116.54, 164.81], [110, 116.54, 164.81], [87.31, 92.5, 130.81], [82.41, 87.31, 123.47]];
let bus = null, nextT = 0, stepN = 0;
function kick(t, v) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + .3);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .5);
  o.connect(g); g.connect(bus.out); o.start(t); o.stop(t + .55);
  bus.duck.gain.setValueAtTime(.3, t); bus.duck.gain.linearRampToValueAtTime(1, t + .3);
}
function noiseHit(t, v, type, f, d, dest) {
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; fl.type = type; fl.frequency.value = f;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
  s.connect(fl); fl.connect(g); g.connect(dest || bus.out); s.start(t, Math.random() * .3, d + .02);
}
function osc(fr, t, d, v, type, dest, att = .01) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = fr;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.setTargetAtTime(0, t + d * .8, d * .15);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + .4);
}
function schedule() {
  while (nextT < ac.currentTime + .15) {
    const t = nextT, s = stepN % 16, barN = Math.floor(stepN / 16), bar = barN % 4, in8 = barN % 8;
    if (s === 0 || s === 8) kick(t, .95);
    if (s === 3 || s === 11) kick(t, .55);                       // 둥-둥 (심장 박동)
    if (s % 2 === 0) osc(ROOT[bar], t, STEP * 1.6, .16, 'sawtooth', bus.bass);   // 8분음표로 조여오는 베이스
    if (s % 4 === 2) noiseHit(t, .02, 'highpass', 8000, .04);
    if (s % 2 === 1) noiseHit(t, .007, 'highpass', 9000, .02);
    if (s % 4 === 0) osc(2300, t, .025, .018, 'sine', bus.out);    // 초침
    if (s % 2 === 0) osc(659.25, t, STEP * 1.8, .006 + .004 * (in8 / 7), 'sine', bus.pad); // 높은 떨림음
    if (s === 0) {
      bus.bass.frequency.cancelScheduledValues(t); bus.bass.frequency.setValueAtTime(180 + 90 * in8, t); bus.bass.frequency.linearRampToValueAtTime(270 + 90 * in8, t + STEP * 16);
      for (const f of PAD[bar]) { osc(f, t, STEP * 16, .016, 'sawtooth', bus.pad, 1.2); osc(f * 1.006, t, STEP * 16, .012, 'sawtooth', bus.pad, 1.2) }
      if (in8 === 7) { const r = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();  // 끌어올리기
        r.buffer = noise; r.loop = true; fl.type = 'bandpass'; fl.Q.value = 1.5; fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(6000, t + STEP * 16);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + STEP * 15.5); g.gain.linearRampToValueAtTime(0, t + STEP * 16);
        r.connect(fl); fl.connect(g); g.connect(bus.out); r.start(t); r.stop(t + STEP * 16 + .05) }
    }
    nextT += STEP; stepN++;
  }
}
export const music = {
  start() {
    const c = ctx(); if (!c || bus) return;
    if (c.state === 'suspended') c.resume();
    bus = { out: c.createGain(), bass: c.createBiquadFilter(), pad: c.createBiquadFilter(), duck: c.createGain() };
    bus.bass.type = 'lowpass'; bus.bass.Q.value = 6; bus.bass.frequency.value = 200; bus.pad.type = 'lowpass'; bus.pad.frequency.value = 900;
    bus.bass.connect(bus.duck); bus.pad.connect(bus.duck); bus.duck.connect(bus.out); bus.out.connect(out);
    bus.out.gain.setValueAtTime(0, c.currentTime); bus.out.gain.linearRampToValueAtTime(.5, c.currentTime + 4);
    nextT = c.currentTime + .1; setInterval(schedule, 40); schedule();
  }
};
