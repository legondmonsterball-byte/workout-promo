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
  charge() { tone(140, .8, .12, 'sawtooth', 0, 620); tone(280, .8, .06, 'sine', 0, 1240); burst({ f0: 300, f1: 4000, q: 2, dur: .8, vol: .12 }) },
  pop() { tone(520, .18, .18, 'triangle', 0, 1100); tone(1200, .25, .08, 'sine', .06, 1800) },
};

// 배경 비트: 92BPM, 뒤에서 둥둥 울리는 킥 + 낮은 베이스 + 잔잔한 패드 (파일 없이 합성)
const BPM = 92, STEP = 60 / BPM / 4, BASS = [55, 43.65, 65.41, 49], PAD = [[110, 130.81, 164.81], [87.31, 110, 130.81], [130.81, 164.81, 196], [98, 123.47, 146.83]];
let bus = null, nextT = 0, stepN = 0, timer = null;
function kick(t, v) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(42, t + .32);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .55);
  o.connect(g); g.connect(bus.lp); o.start(t); o.stop(t + .6);
  bus.duck.gain.setValueAtTime(.35, t); bus.duck.gain.linearRampToValueAtTime(1, t + .35); // 킥 칠 때 패드가 살짝 숨는다
}
function hat(t, v) {
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noise; f.type = 'highpass'; f.frequency.value = 7500;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05);
  s.connect(f); f.connect(g); g.connect(bus.out); s.start(t, Math.random() * .3, .06);
}
function note(fr, t, dur, v, type, dest) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = fr;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(.6, dur * .3)); g.gain.setTargetAtTime(0, t + dur * .75, dur * .15);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + .5);
}
function schedule() {
  while (nextT < ac.currentTime + .15) {
    const t = nextT, s = stepN % 16, bar = Math.floor(stepN / 16) % 4;
    if (s === 0 || s === 8) kick(t, .9);
    if (s === 6 || (s === 11 && bar % 2)) kick(t, .45);
    if (s % 4 === 2) hat(t, .025);
    if (s === 0) {
      note(BASS[bar], t, STEP * 16, .22, 'sine', bus.lp);
      for (const f of PAD[bar]) { note(f, t, STEP * 16, .018, 'sawtooth', bus.pad); note(f * 1.005, t, STEP * 16, .014, 'sawtooth', bus.pad) }
    }
    nextT += STEP; stepN++;
  }
}
export const music = {
  start() {
    const c = ctx(); if (!c || bus) return;
    if (c.state === 'suspended') c.resume();
    bus = { out: c.createGain(), lp: c.createBiquadFilter(), pad: c.createBiquadFilter(), duck: c.createGain() };
    bus.lp.type = 'lowpass'; bus.lp.frequency.value = 900; bus.pad.type = 'lowpass'; bus.pad.frequency.value = 700;
    bus.lp.connect(bus.out); bus.pad.connect(bus.duck); bus.duck.connect(bus.out); bus.out.connect(out);
    bus.out.gain.setValueAtTime(0, c.currentTime); bus.out.gain.linearRampToValueAtTime(.5, c.currentTime + 4);
    nextT = c.currentTime + .1; timer = setInterval(schedule, 40); schedule();
  }
};
