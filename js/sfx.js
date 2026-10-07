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
  get on() { return on }, set on(v) { on = v },
  flip(v = 1) { burst({ f0: 700, f1: 3600, q: .7, dur: .16 + .1 * v, vol: .22 + .2 * v }); burst({ f0: 2400, f1: 900, q: 1.2, dur: .08, vol: .08 * v, at: .1 }) },
  whoosh() { burst({ f0: 180, f1: 2600, q: .6, dur: .9, vol: .35 }); tone(60, .9, .25, 'sine', .6, 38) },
  thud() { tone(90, .35, .35, 'sine', 0, 45); burst({ f0: 400, f1: 120, q: .7, dur: .25, vol: .2, type: 'lowpass' }) },
  tick() { tone(1400, .05, .04, 'square') },
  pop() { tone(520, .18, .18, 'triangle', 0, 1100); tone(1200, .25, .08, 'sine', .06, 1800) },
};
