// 스케치북 플립북 그림: 연필로 그린 사람(뚱뚱 → 근육)과 뒷장 운동 일지
export const CW = 768, CH = 1024;
const INK = '#26272c', BLUE = 'rgba(64,138,206,.6)', LIME = 'rgba(198,255,61,.9)';
const lerp = (a, b, t) => a + (b - a) * t, clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) };
export function rng(seed) { let s = (Math.imul(seed | 0, 2654435761) >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }

// 장면 순서: 0~37 덤벨 숄더프레스(점점 근육), 38~45 운동 끝 → 핸드폰 들기
export function makeFrames() {
  const F = [], P = 38, cyc = [0, .5, 1, .5];
  for (let i = 0; i < P; i++) {
    const ph = i % 4;
    F.push({ mode: 'press', fit: smooth(2, 35, i), p: cyc[ph], dir: ph === 1 ? -1 : ph === 3 ? 1 : 0, effort: ph === 1 || ph === 2 ? 1 : 0, smile: 0, k: 0, day: Math.round(1 + 179 * Math.pow(i / (P - 1), 1.5)) })
  }
  const fin = [{ mode: 'press', p: 0 }, { mode: 'lower' }, { mode: 'idle', floor: 1 }, { mode: 'idle', floor: 1, smile: .4 },
    { mode: 'phone', k: .35, floor: 1 }, { mode: 'phone', k: .7, floor: 1, smile: .4 }, { mode: 'phone', k: 1, floor: 1, smile: 1 }, { mode: 'phone', k: 1, floor: 1, smile: 1, note: 1 }];
  for (const f of fin) F.push({ fit: 1, day: 180, p: 0, dir: 0, effort: 0, smile: 0, k: 0, ...f });
  F.forEach((f, i) => { f.page = i + 1; f.type = i % 3; f.prog = Math.min(1, i / (P - 1)); f.pr = i % 4 === 2 });
  return F;
}

// ───────── 종이·연필 재료 (한 번만 만든다) ─────────
let A = null;
function assets() {
  if (A) return A;
  const R = rng(11), mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c };
  const paper = gutter => {
    const c = mk(CW, CH), x = c.getContext('2d');
    x.fillStyle = '#efe8d9'; x.fillRect(0, 0, CW, CH);
    const im = x.getImageData(0, 0, CW, CH), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n * 1.1 }
    x.putImageData(im, 0, 0);
    x.strokeStyle = 'rgba(120,100,70,.05)';
    for (let i = 0; i < 260; i++) { x.lineWidth = .6 + R(); x.beginPath(); const px = R() * CW, py = R() * CH, a = R() * 6.28, l = 6 + R() * 22; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke() }
    const g = x.createRadialGradient(CW / 2, CH / 2, CH * .35, CW / 2, CH / 2, CH * .8); g.addColorStop(0, 'rgba(110,90,60,0)'); g.addColorStop(1, 'rgba(110,90,60,.16)'); x.fillStyle = g; x.fillRect(0, 0, CW, CH);
    const gx = gutter < 0 ? 0 : CW, s = x.createLinearGradient(gx, 0, gx - gutter * 110, 0); s.addColorStop(0, 'rgba(50,38,25,.32)'); s.addColorStop(1, 'rgba(50,38,25,0)'); x.fillStyle = s; x.fillRect(0, 0, CW, CH);
    return c;
  };
  const grain = mk(96, 96), gx = grain.getContext('2d'), gi = gx.createImageData(96, 96);
  for (let i = 0; i < gi.data.length; i += 4) { gi.data[i] = 30; gi.data[i + 1] = 31; gi.data[i + 2] = 37; gi.data[i + 3] = R() < .14 ? 30 : 150 + R() * 105 }
  gx.putImageData(gi, 0, 0);
  const hatch = (ang, gap, alpha) => {
    const c = mk(CW, CH), x = c.getContext('2d'), L = Math.hypot(CW, CH) / 2 + 20, ca = Math.cos(ang), sa = Math.sin(ang);
    x.lineCap = 'round'; x.strokeStyle = INK;
    for (let k = -L; k < L; k += gap) {
      let t = -L;
      while (t < L) {
        const len = 30 + R() * 90, o = k + (R() - .5) * 1.6, x0 = CW / 2 + ca * t - sa * o, y0 = CH / 2 + sa * t + ca * o;
        x.globalAlpha = alpha * (.55 + R() * .45); x.lineWidth = .7 + R() * .8;
        x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + ca * len, y0 + sa * len); x.stroke(); t += len + R() * 8;
      }
    }
    return c;
  };
  A = { paperR: paper(-1), paperL: paper(1), grain, hatchA: hatch(-Math.PI / 4, 6, .55), hatchB: hatch(Math.PI / 4, 7, .45) };
  return A;
}

// ───────── 연필 도구 ─────────
function kit(c, R, u, cx, y0, paperImg) {
  const a = assets(), ink = c.createPattern(a.grain, 'repeat'), pap = c.createPattern(paperImg, 'no-repeat');
  const P = p => [cx + p[0] * u, y0 + p[1] * u];
  const J = (p, j) => [p[0] + (R() - .5) * j, p[1] + (R() - .5) * j];
  const open = pts => {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
    if (pts.length === 2) { c.lineTo(pts[1][0], pts[1][1]); return }
    for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]);
  };
  const closed = pts => {
    const n = pts.length, m = i => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2], s = m(0);
    c.moveTo(s[0], s[1]);
    for (let i = 1; i <= n; i++) { const q = pts[i % n], e = m(i); c.quadraticCurveTo(q[0], q[1], e[0], e[1]) }
    c.closePath();
  };
  // 연필 선: 두세 번 겹쳐 긋고 끝을 살짝 넘긴다
  function line(pts, o = {}) {
    const al = o.a ?? .9; if (al < .03 || pts.length < 2) return;
    const w = o.w ?? 2.3, n = o.n ?? 2, j = o.j ?? 2.2, px = pts.map(P);
    for (let k = 0; k < n; k++) {
      const q = px.map(p => J(p, j * (1 + k * .8)));
      if (o.over !== false) {
        const e = (A, B) => { const dx = A[0] - B[0], dy = A[1] - B[1], l = Math.hypot(dx, dy) || 1, s = R() * 5; return [A[0] + dx / l * s, A[1] + dy / l * s] };
        q[0] = e(q[0], q[1]); q[q.length - 1] = e(q[q.length - 1], q[q.length - 2]);
      }
      open(q); c.strokeStyle = o.col || ink; c.globalAlpha = al * (k ? .45 : 1); c.lineWidth = w * (k ? .65 : 1) * (.85 + R() * .3); c.stroke();
    }
    c.globalAlpha = 1;
  }
  function ring(pts, o = {}) {
    const al = o.a ?? .9; if (al < .03) return;
    const px = pts.map(P), n = o.n ?? 2, j = o.j ?? 2;
    for (let k = 0; k < n; k++) { c.beginPath(); closed(px.map(p => J(p, j * (1 + k)))); c.strokeStyle = o.col || ink; c.globalAlpha = al * (k ? .45 : 1); c.lineWidth = (o.w ?? 2.2) * (k ? .65 : 1); c.stroke() }
    c.globalAlpha = 1;
  }
  function fill(pts) { c.beginPath(); closed(pts.map(P)); c.fillStyle = pap; c.fill() }
  // 그림자: 모양 안에서, 빛 쪽으로 민 모양을 뺀 초승달 부분만 빗금
  function shade(pts, sh, al = .8, cross = 0) {
    if (al < .03) return;
    const px = pts.map(P), sx = sh[0] * u, sy = sh[1] * u;
    c.save(); c.beginPath(); closed(px); c.clip();
    c.beginPath(); c.rect(0, 0, CW, CH); closed(px.map(p => [p[0] + sx, p[1] + sy])); c.clip('evenodd');
    c.globalAlpha = .06 * al; c.fillStyle = '#3a3026'; c.fillRect(0, 0, CW, CH);
    c.globalAlpha = al; c.drawImage(a.hatchA, 0, 0);
    if (cross) { c.globalAlpha = al * cross; c.drawImage(a.hatchB, 0, 0) }
    c.restore(); c.globalAlpha = 1;
  }
  function tone(pts, al, cross = 0) {
    if (al < .03) return;
    c.save(); c.beginPath(); closed(pts.map(P)); c.clip(); c.globalAlpha = al; c.drawImage(a.hatchA, 0, 0);
    if (cross) { c.globalAlpha = al * cross; c.drawImage(a.hatchB, 0, 0) }
    c.restore(); c.globalAlpha = 1;
  }
  function dot(p, r) { const q = P(p); c.beginPath(); c.arc(q[0], q[1], r, 0, 7); c.fillStyle = ink; c.globalAlpha = .9; c.fill(); c.globalAlpha = 1 }
  function marker(pts, w, col = LIME) { c.save(); c.globalCompositeOperation = 'multiply'; open(pts.map(P)); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'butt'; c.globalAlpha = .75; c.stroke(); c.restore() }
  return { c, R, u, P, J, open, closed, line, ring, fill, shade, tone, dot, marker, ink };
}
const ell = (x, y, rx, ry, n = 14) => Array.from({ length: n }, (_, i) => { const t = i / n * Math.PI * 2; return [x + Math.cos(t) * rx, y + Math.sin(t) * ry] });
const mir = p => [-p[0], p[1]];
function hand(c, txt, x, y, size, o = {}) {
  c.save(); c.translate(x, y); c.rotate(o.rot || 0);
  c.font = `${o.w || 700} ${size}px Caveat, "Nanum Pen Script", cursive`;
  c.fillStyle = o.col || INK; c.globalAlpha = o.a ?? .88; c.textAlign = o.align || 'left'; c.fillText(txt, 0, 0); c.restore();
}
function rawLine(c, ink, pts, w = 2.4, a = .85) { c.save(); c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2); const l = pts[pts.length - 1]; c.lineTo(l[0], l[1]); c.strokeStyle = ink; c.lineWidth = w; c.globalAlpha = a; c.lineCap = 'round'; c.stroke(); c.restore() }

const bump = (t, pk) => Math.sin(Math.PI * (t < pk ? t / pk * .5 : .5 + (t - pk) / (1 - pk) * .5));
function limb(A, B, rA, rB, b1 = [0, .5], b2 = [0, .5]) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, e1 = [], e2 = [];
  for (const t of [0, .17, .34, .5, .66, .83, 1]) {
    const r = lerp(rA, rB, t), x = A[0] + dx * t, y = A[1] + dy * t, r1 = r + b1[0] * bump(t, b1[1]), r2 = r + b2[0] * bump(t, b2[1]);
    e1.push([x + nx * r1, y + ny * r1]); e2.push([x - nx * r2, y - ny * r2]);
  }
  return { e1, e2, shape: [...e1, [B[0] + ux * rB * .6, B[1] + uy * rB * .6], ...e2.slice().reverse(), [A[0] - ux * rA * .6, A[1] - uy * rA * .6]], n: [nx, ny], u: [ux, uy] };
}
// 몸 바깥쪽 근육이 바깥으로 불룩하게
function limbOut(A, B, rA, rB, outer, inner, ctr) {
  const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L, mx = (A[0] + B[0]) / 2 - ctr[0], my = (A[1] + B[1]) / 2 - ctr[1];
  return nx * mx + ny * my > 0 ? limb(A, B, rA, rB, outer, inner) : limb(A, B, rA, rB, inner, outer);
}
function ik(S, T, L1, L2, s) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = clamp(Math.hypot(dx, dy), Math.abs(L1 - L2) + .01, L1 + L2 - .001);
  const a = Math.atan2(dy, dx), al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const c1 = [S[0] + L1 * Math.cos(a + al), S[1] + L1 * Math.sin(a + al)], c2 = [S[0] + L1 * Math.cos(a - al), S[1] + L1 * Math.sin(a - al)];
  const E = c1[0] * s > c2[0] * s ? c1 : c2, ex = T[0] - E[0], ey = T[1] - E[1], el = Math.hypot(ex, ey) || 1;
  return { E, W: [E[0] + ex / el * L2, E[1] + ey / el * L2] };
}
function dumbbell(K, x, y, sc = 1) {
  const { line, fill, tone, ring } = K, q = (dx, dy) => [x + dx * sc, y + dy * sc];
  line([q(-.44, 0), q(.44, 0)], { w: 3.2 });
  for (const s of [-1, 1]) for (const [px, w, h] of [[.27, .075, .27], [.4, .055, .2]]) {
    const pl = [q(s * px - w, -h), q(s * px + w, -h), q(s * px + w, h), q(s * px - w, h)];
    fill(pl); tone(pl, .5, .7); ring(pl, { w: 2.1 });
  }
}
function phone(K, pc, w, h, rot, k) {
  const { c, P, fill, tone, ring, line, u, closed } = K;
  const pt = (x, y) => [pc[0] + x * Math.cos(rot) - y * Math.sin(rot), pc[1] + x * Math.sin(rot) + y * Math.cos(rot)];
  const rr = (hw, hh, r) => [pt(-hw + r, -hh), pt(hw - r, -hh), pt(hw, -hh + r), pt(hw, hh - r), pt(hw - r, hh), pt(-hw + r, hh), pt(-hw, hh - r), pt(-hw, -hh + r)];
  const body = rr(w / 2, h / 2, .09), scr = rr(w / 2 - .05, h / 2 - .06, .05), g = P(pc);
  const rg = c.createRadialGradient(g[0], g[1], 0, g[0], g[1], u * 1.5);
  rg.addColorStop(0, `rgba(34,230,255,${.42 * k})`); rg.addColorStop(1, 'rgba(34,230,255,0)');
  c.fillStyle = rg; c.fillRect(g[0] - u * 1.6, g[1] - u * 1.6, u * 3.2, u * 3.2);
  fill(body); tone(body, .45, .6); ring(body, { w: 2.4 });
  const a = P(pt(0, -h / 2)), b = P(pt(0, h / 2)), lg = c.createLinearGradient(a[0], a[1], b[0], b[1]);
  lg.addColorStop(0, '#22e6ff'); lg.addColorStop(1, '#c6ff3d');
  c.beginPath(); closed(scr.map(P)); c.fillStyle = lg; c.globalAlpha = .3 + .7 * k; c.fill(); c.globalAlpha = 1;
  ring(scr, { w: 1.5, n: 1, a: .7 });
  const wl = { col: 'rgba(255,255,255,.95)', n: 1, j: .6, a: k, over: false };
  line([pt(-.17, -.3), pt(.08, -.3)], { ...wl, w: 6 }); line([pt(-.17, -.19), pt(0, -.19)], { ...wl, w: 3 });
  for (let i = 0; i < 4; i++) line([pt(-.15 + i * .1, .32), pt(-.15 + i * .1, .32 - .08 - i * .07)], { col: 'rgba(8,24,28,.75)', w: 6, n: 1, j: .5, a: k, over: false });
  return { x: g[0], y: g[1], w: w * u, h: h * u };
}

// ───────── 앞장: 사람 ─────────
export function drawFigure(c, fr, seed = 1, lang = 'en') {
  const a = assets();
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.drawImage(a.paperR, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
  const R = rng(seed), u = CH * .084, K = kit(c, R, u, CW * .5, CH * .2, a.paperR);
  const { line, ring, fill, shade, tone, dot, marker } = K;
  const f = fr.fit, mus = smooth(.3, 1, f), fat = 1 - smooth(0, .62, f), SH = [-.13, -.07];
  const shW = lerp(1.0, 1.2, f), latW = lerp(1.06, .98, f), waW = lerp(1.2, .64, f), hipW = lerp(1.1, .76, f), nkW = lerp(.38, .29, f);
  const legX = lerp(.5, .44, f), thR = lerp(.6, .46, f), holding = fr.mode === 'press' || fr.mode === 'lower', L1 = 1.4, L2 = 1.25;

  // 바닥
  tone(ell(.05, 7.98, 1.3, .14), .45);
  line([[-1.95, 7.97], [-.5, 7.95], [.8, 7.98], [2.0, 7.95]], { a: .5, w: 1.6, n: 1 });
  if (!holding) for (const s of [-1, 1]) dumbbell(K, s * 1.55, 7.72, .85);

  // 다리
  const knees = [];
  for (const s of [-1, 1]) {
    const Hp = [s * legX, 4.0], Kn = [s * lerp(.48, .42, f), 5.95], An = [s * lerp(.46, .4, f), 7.52]; knees.push(Kn);
    const th = limbOut(Hp, Kn, thR, lerp(.3, .24, f), [lerp(.03, .1, f), .35], [lerp(.05, .09, f), .72], [0, 5]);
    const sh = limbOut(Kn, An, lerp(.27, .22, f), .12, [lerp(.04, .08, f), .3], [lerp(.05, .11, f), .3], [0, 5]);
    for (const L of [sh, th]) { fill(L.shape); shade(L.shape, SH, .75); line(L.e1); line(L.e2) }
    const kx = Kn[0];
    line([[kx - .12, 5.86], [kx, 5.99], [kx + .12, 5.86]], { a: .45, w: 1.5, n: 1 });
    line([[s * (legX + thR * .72), 4.62], [s * (legX + thR * .58), 5.25], [kx + s * .2, 5.8]], { a: mus * .7, w: 1.7, n: 1 });
    line([[kx - s * .09, 5.3], [kx - s * .2, 5.6], [kx - s * .07, 5.88]], { a: mus * .8, w: 1.7, n: 1 });
    line([[s * (legX + .1), 4.6], [s * (legX - .04), 5.1], [kx - s * .13, 5.48]], { a: mus * .4, w: 1.3, n: 1 });
    line([[kx - s * .13, 6.2], [kx - s * .2, 6.58], [kx - s * .08, 6.95]], { a: mus * .7, w: 1.5, n: 1 });
    line([[kx + s * .13, 6.22], [kx + s * .19, 6.5]], { a: mus * .5, w: 1.3, n: 1 });
    const ax = An[0], shoe = [[ax - s * .15, 7.46], [ax + s * .13, 7.48], [ax + s * .34, 7.74], [ax + s * .41, 7.9], [ax + s * .04, 7.96], [ax - s * .19, 7.9]];
    fill(shoe); shade(shoe, SH, .6); ring(shoe, { w: 2.2 });
    line([[ax - s * .18, 7.85], [ax + s * .39, 7.85]], { a: .55, w: 1.4, n: 1 });
    line([[ax - s * .02, 7.55], [ax + s * .1, 7.6]], { a: .5, w: 1.3, n: 1 }); line([[ax + s * .04, 7.63], [ax + s * .16, 7.68]], { a: .5, w: 1.3, n: 1 });
  }

  // 몸통
  const side = [[nkW, 1.2], [lerp(.6, .72, f), 1.31], [shW - .16, 1.42], [shW, 1.68], [shW - .1, 2.05], [latW, 2.42], [lerp(latW, waW, .55) + fat * .06, 2.75],
    [waW, 3.05], [waW + fat * .07, 3.32], [hipW, 3.7], [hipW * .9, 4.02], [.12, 4.2]];
  const torso = [...side, ...side.slice().reverse().map(mir)];
  fill(torso); shade(torso, SH, .7);
  for (const s of [-1, 1]) line(side.slice(1, -1).map(p => [s * p[0], p[1]]), { w: 2.4 });
  for (const s of [-1, 1]) {
    line([[s * .06, 1.34], [s * .4, 1.38], [s * (shW - .24), 1.42]], { a: .25 + mus * .45, w: 1.5, n: 1 });
    const pec = [[s * .04, 1.62], [s * .06, 2.08], [s * .3, 2.3], [s * .62, 2.28], [s * (shW - .26), 1.98]];
    line(pec, { a: mus * .9, w: 2 });
    tone([...pec.slice(1), ...pec.slice(1).reverse().map(p => [p[0], p[1] + .11])], mus * .45);
    dot([s * .45, 2.12], 2.2);
    line([[s * .4, 2.48], [s * .43, 2.9], [s * .36, 3.38], [s * .2, 3.74]], { a: mus * .7, w: 1.6, n: 1 });
    for (const y of [2.7, 3.0, 3.3]) line([[s * .03, y], [s * .2, y + .03], [s * .38, y - .02]], { a: mus * .75, w: 1.6, n: 1 });
    for (let k = 0; k < 3; k++) line([[s * (latW - .2), 2.3 + k * .15], [s * (latW - .08), 2.38 + k * .15]], { a: mus * .6, w: 1.4, n: 1 });
    line([[s * .58, 3.3], [s * .38, 3.6], [s * .14, 3.95]], { a: mus * .7, w: 1.6, n: 1 });
    line([[s * .1, 2.2], [s * .45, 2.44], [s * .84, 2.24]], { a: fat * .85, w: 2 });
    line([[s * (waW - .06), 3.12], [s * (waW - .2), 3.22]], { a: fat * .6, w: 1.5, n: 1 });
  }
  line([[0, 2.42], [0, 3.55]], { a: mus * .7, w: 1.6, n: 1 });

  // 반바지 (옆선은 라임 형광펜)
  const sb = lerp(3.78, 3.62, f), hem = 4.92, oh = legX + thR * .95 + .05, ih = Math.max(.05, legX - thR * .95 - .02);
  const shorts = [[-hipW * 1.01, sb], [hipW * 1.01, sb], [hipW * 1.04, sb + .45], [oh, hem], [ih, hem + .06], [.04, 4.42], [-.04, 4.42], [-ih, hem + .06], [-oh, hem], [-hipW * 1.04, sb + .45]];
  fill(shorts); tone(shorts, .4); shade(shorts, SH, .6, .8); ring(shorts, { w: 2.3 });
  line([[-hipW, sb + .1], [0, sb + .12], [hipW, sb + .1]], { a: .6, w: 1.6, n: 1 });
  line([[0, sb + .12], [-.07, sb + .36]], { a: .7, w: 1.4, n: 1 }); line([[0, sb + .12], [.08, sb + .34]], { a: .7, w: 1.4, n: 1 });
  for (const s of [-1, 1]) marker([[s * hipW * 1.0, sb + .14], [s * (hipW * 1.03), sb + .45], [s * (oh - .03), hem - .06]], 8);

  // 배 (뚱뚱할 때 반바지 위로 나온다)
  if (fat > .08) {
    const bb = lerp(3.5, 3.92, fat), belly = [[-waW * .98, 2.95], [waW * .98, 2.95], [waW * .96, 3.4], [waW * .55, bb - .05], [0, bb], [-waW * .55, bb - .05], [-waW * .96, 3.4]];
    fill(belly); shade(belly, [-.1, -.12], .55 * fat);
    line([[-waW * .92, 3.35], [-waW * .5, bb - .06], [0, bb], [waW * .5, bb - .06], [waW * .92, 3.35]], { a: fat, w: 2.3 });
    ring(ell(0, lerp(3.2, 3.3, fat), .045, .065, 8), { a: .7 * fat, w: 1.6, n: 1 });
  }

  // 목과 머리
  const neck = [[-nkW * .8, .9], [nkW * .8, .9], [nkW, 1.3], [-nkW, 1.3]];
  fill(neck); shade(neck, SH, .55);
  for (const s of [-1, 1]) { line([[s * nkW * .8, .92], [s * nkW * .9, 1.1], [s * nkW * 1.04, 1.28]], { w: 2.1 }); line([[s * .2, .97], [s * .12, 1.13], [s * .05, 1.29]], { a: mus * .55, w: 1.4, n: 1 }) }
  const hf = [[0, .02], [.27, .07], [.37, .3], [.37, .55], [.33, .78], [.2, .97], [0, 1.05]], hF = [[0, .02], [.3, .08], [.42, .32], [.45, .58], [.43, .82], [.29, 1.0], [0, 1.08]];
  const hs = hf.map((p, i) => [lerp(p[0], hF[i][0], fat), lerp(p[1], hF[i][1], fat)]), headS = [...hs, ...hs.slice(1, -1).reverse().map(mir)];
  for (const s of [-1, 1]) { const ex = s * hs[3][0], ear = [[ex, .44], [ex + s * .1, .47], [ex + s * .11, .6], [ex + s * .02, .7]]; fill(ear); line(ear, { w: 2 }) }
  fill(headS); shade(headS, SH, .5); line(hs, { w: 2.4 }); line(hs.map(mir), { w: 2.4 });
  const hx = hs[2][0] + .03, hair = [[-hx, .36], [-hx - .02, .16], [-.22, -.02], [0, -.07], [.22, -.02], [hx + .02, .16], [hx, .36], [hx - .06, .22], [.12, .17], [-.06, .21], [-hx + .06, .2]];
  fill(hair); tone(hair, .55, .8); ring(hair, { w: 2 });
  for (let k = 0; k < 9; k++) { const t = -2.7 + k * .28, p0 = [Math.cos(t) * .36, .2 + Math.sin(t) * .25]; line([p0, [p0[0] * 1.15 + (R() - .5) * .05, p0[1] - .06 - R() * .05]], { w: 1.6, n: 1, a: .8 }) }
  const ey = .58, sm = fr.smile || 0, ef = fr.effort || 0;
  for (const s of [-1, 1]) {
    line([[s * .07, .47 + ef * .035], [s * .16, .44], [s * .26, .46 - ef * .01]], { w: 3, n: 1 });
    if (sm > .5) line([[s * .08, ey + .01], [s * .155, ey - .045], [s * .23, ey + .01]], { w: 2.4, n: 1 });
    else { line([[s * .08, ey], [s * .155, ey - .035], [s * .23, ey]], { w: 2, n: 1 }); dot([s * .155, ey + .008], 3.2) }
    line([[s * .3, .72], [s * .26, .82]], { a: fat * .5, w: 1.4, n: 1 });
  }
  line([[.02, .6], [.055, .74], [-.025, .77]], { a: .8, w: 1.8, n: 1 });
  if (sm > .5) { line([[-.15, .85], [0, .94], [.15, .85]], { w: 2.3, n: 1 }); line([[-.12, .865], [.12, .865]], { w: 1.4, n: 1, a: .6 }) }
  else if (ef) { line([[-.12, .885], [.12, .885]], { w: 2.4, n: 1 }); line([[-.1, .865], [.1, .865]], { w: 1.2, n: 1, a: .55 }) }
  else line([[-.1, .875], [0, .89], [.1, .875]], { w: 2, n: 1 });
  line([[-.26, 1.03], [0, 1.15], [.26, 1.03]], { a: fat * .8, w: 1.8, n: 1 });
  if (ef && f < .75) for (const [x, y] of [[.55, .22], [-.6, .38]]) if (R() < .8) ring([[x, y - .07], [x + .04, y + .02], [x, y + .06], [x - .04, y + .02]], { w: 1.4, n: 1, a: .6 });

  // 팔
  let phoneRect = null; const hands = [], elbows = [], ctr = [0, 2.2];
  const target = s => {
    const bot = [s * 2.2, .45], top = [s * .7, -1.0], idle = [s * (shW + .2), 4.15];
    if (fr.mode === 'press') { const e = .5 - .5 * Math.cos(Math.PI * fr.p); return [lerp(bot[0], top[0], e), lerp(bot[1], top[1], e)] }
    if (fr.mode === 'lower') return [lerp(bot[0], idle[0], .55), lerp(bot[1], idle[1], .55)];
    if (fr.mode === 'phone') {
      if (s > 0) return [lerp(idle[0], 1.35, fr.k), lerp(idle[1], 1.22, fr.k)];
      return [lerp(idle[0], -(waW + .12), fr.k), lerp(idle[1], 3.15, fr.k)];
    }
    return idle;
  };
  for (const s of [-1, 1]) {
    const S = [s * (shW - .22), 1.62], { E, W } = ik(S, target(s), L1, L2, s); elbows.push(E);
    const ua = limbOut(S, E, lerp(.43, .35, f), lerp(.33, .19, f), [lerp(.03, .09, f), .35], [lerp(.02, .11, f), .5], ctr);
    const fa = limbOut(E, W, lerp(.31, .2, f), lerp(.18, .12, f), [lerp(.02, .08, f), .25], [lerp(.02, .05, f), .3], ctr);
    const hc = [W[0] + fa.u[0] * .1, W[1] + fa.u[1] * .1]; hands.push(hc);
    if (holding) dumbbell(K, hc[0], hc[1], .95);
    for (const L of [fa, ua]) { fill(L.shape); shade(L.shape, SH, .7); line(L.e1); line(L.e2) }
    const n = ua.n, m1 = [lerp(S[0], E[0], .35) + n[0] * .04, lerp(S[1], E[1], .35) + n[1] * .04], m2 = [lerp(S[0], E[0], .85) + n[0] * .04, lerp(S[1], E[1], .85) + n[1] * .04];
    line([m1, m2], { a: mus * .5, w: 1.4, n: 1 });
    const dr = lerp(.44, .42, f), dc = [S[0] + s * .03, S[1] - .02], delt = ell(dc[0], dc[1], dr, dr * .95, 14);
    fill(delt); shade(delt, SH, .55);
    const arc = []; for (let k = 0; k <= 8; k++) { const t = lerp(-2.5, 1.1, k / 8); arc.push([dc[0] + s * Math.cos(t) * dr, dc[1] + Math.sin(t) * dr * .95]) }
    line(arc, { w: 2.4 });
    line([[dc[0] + s * dr * .2, dc[1] + dr * .5], [dc[0] + s * dr * .55, dc[1] + dr * .95]], { a: mus * .55, w: 1.5, n: 1 });
    if (fr.mode === 'phone' && s > 0) phoneRect = phone(K, [hc[0] - .02, hc[1] - .5], .58, 1.05, -.12, fr.k);
    const fist = ell(hc[0], hc[1], .15, .13, 10);
    fill(fist); shade(fist, SH, .5); ring(fist, { w: 2.1 });
    line([[hc[0] - .08, hc[1] - .03], [hc[0] + .08, hc[1] - .04]], { a: .6, w: 1.4, n: 1 });
  }

  // 움직임 선
  if (fr.mode === 'press' && fr.dir) for (const [hx2, hy] of hands) for (let k = 0; k < 2; k++) {
    const y = hy - fr.dir * (.48 + k * .16);
    line([[hx2 - .3 + k * .07, y], [hx2, y + fr.dir * .05], [hx2 + .3 - k * .07, y]], { a: .5 - k * .15, w: 1.6, n: 1 });
  }

  // 파란 밑그림 선
  const bl = { col: BLUE, w: 1.3, n: 1, a: .5, j: 1.4 };
  line([[0, .04], [.03, 1.8], [-.02, 4.15]], bl); line([[-(shW - .22), 1.62], [shW - .22, 1.62]], bl); line([[-legX, 4.0], [legX, 4.0]], bl);
  line([[-hs[3][0], .57], [0, .62], [hs[3][0], .57]], bl);
  for (const p of [...elbows, ...knees]) ring(ell(p[0], p[1], .07, .07, 8), bl);

  // 글씨
  hand(c, `Day ${fr.day}`, 52, 86, 50, { rot: -.03 });
  rawLine(c, K.ink, [[50, 98], [120, 101], [190, 97]], 2.2, .7);
  hand(c, `${fr.page}`, CW - 52, CH - 40, 30, { align: 'right', a: .6 });
  if (fr.note && phoneRect) {
    const ko = lang === 'ko', tx = phoneRect.x + phoneRect.w * .5 + 34, ty = phoneRect.y - phoneRect.h * .5;
    hand(c, ko ? '눌러봐!' : 'tap!', tx, ty, ko ? 58 : 56, { rot: -.08 });
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(198,255,61,.7)'; c.fillRect(tx - 4, ty - 8, ko ? 150 : 96, 14); c.restore();
    const ax0 = tx + 20, ay0 = ty + 18, ax1 = phoneRect.x + phoneRect.w * .62, ay1 = phoneRect.y - phoneRect.h * .2;
    rawLine(c, K.ink, [[ax0, ay0], [ax0 - 4, ay1 - 6], [ax1 + 8, ay1]], 2.4);
    rawLine(c, K.ink, [[ax1 + 22, ay1 - 12], [ax1 + 6, ay1], [ax1 + 22, ay1 + 12]], 2.4);
  }
  c.restore();
  return { phone: phoneRect };
}

// ───────── 뒷장: 그날의 운동 일지 ─────────
const EXS = [
  [['Bench press', '벤치프레스', 40, 80, 10], ['Shoulder press', '숄더프레스', 12, 26, 10], ['Pushdown', '푸시다운', 15, 35, 12]],
  [['Deadlift', '데드리프트', 60, 140, 8], ['Lat pulldown', '랫풀다운', 30, 65, 10], ['Dumbbell curl', '덤벨 컬', 6, 16, 12]],
  [['Squat', '스쿼트', 40, 120, 8], ['Leg press', '레그프레스', 80, 200, 10], ['Leg curl', '레그 컬', 20, 45, 12]]];
const TYPES = [['PUSH', '밀기'], ['PULL', '당기기'], ['LEGS', '하체']];
const NOTES = {
  en: ['one more rep.', 'felt heavy. did it anyway.', '+2.5kg!!', 'slept 5h... still came.', 'best day so far', 'legs = jelly', 'new PR', 'showing up > motivation'],
  ko: ['한 개만 더.', '무거웠는데 해냄', '+2.5kg!!', '5시간 잤는데 옴', '오늘 최고', '다리 후들후들', '신기록', '꾸준함이 이긴다']
};
export function drawLog(c, fr, lang = 'en') {
  const a = assets(), R = rng(fr.page * 31 + 5), ko = lang === 'ko', ink = c.createPattern(a.grain, 'repeat');
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  c.drawImage(a.paperL, 0, 0);
  c.lineWidth = 1.2;
  for (let y = 170; y < CH - 50; y += 58) { c.strokeStyle = 'rgba(64,138,206,.2)'; c.beginPath(); c.moveTo(30, y); c.lineTo(CW - 40, y); c.stroke() }
  c.strokeStyle = 'rgba(214,80,80,.28)'; c.beginPath(); c.moveTo(96, 40); c.lineTo(96, CH - 40); c.stroke();
  hand(c, `Day ${fr.day}`, 116, 128, 66, { rot: -.02 });
  hand(c, TYPES[fr.type][ko ? 1 : 0], CW - 80, 124, ko ? 46 : 40, { align: 'right', a: .7 });
  const ex = EXS[fr.type]; let sets = 0, vol = 0;
  ex.forEach(([en, kr, lo, hi, reps], i) => {
    const y = 170 + 58 * (i + 1) - 10, w = Math.round((lo + (hi - lo) * fr.prog) / 2.5) * 2.5, n = fr.prog > .5 ? 4 : 3;
    sets += n; vol += w * reps * n;
    if (fr.pr && i === 0) { c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(198,255,61,.7)'; c.beginPath(); c.moveTo(108, y - 34); c.lineTo(640, y - 38); c.lineTo(642, y + 4); c.lineTo(110, y + 8); c.fill(); c.restore(); hand(c, 'PR', 56, y, 30, { rot: -.2, a: .8 }) }
    hand(c, ko ? kr : en, 116, y, ko ? 46 : 40, { rot: (R() - .5) * .02 });
    hand(c, `${w}kg × ${reps} × ${n}`, 392, y, 40, { rot: (R() - .5) * .02 });
    rawLine(c, ink, [[650, y - 16], [662, y - 2], [688, y - 34]], 3, .8);
  });
  const ny = 170 + 58 * 5 - 10, notes = NOTES[ko ? 'ko' : 'en'];
  hand(c, (ko ? '메모: ' : 'note: ') + notes[fr.page % notes.length], 116, ny, ko ? 46 : 38, { a: .75, rot: -.015 });
  const sy = 170 + 58 * 7 - 10, sum = ko ? `오늘 = ${sets}세트 · ${(vol / 1000).toFixed(1)}t · ${48 + (fr.page * 7) % 25}분` : `today = ${sets} sets · ${(vol / 1000).toFixed(1)}t · ${48 + (fr.page * 7) % 25}min`;
  c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(34,230,255,.28)'; c.fillRect(108, sy - 36, 560, 46); c.restore();
  hand(c, sum, 116, sy, ko ? 44 : 40);
  hand(c, ko ? '✓ 기록 완료' : '✓ logged', 116, sy + 116, ko ? 44 : 38, { a: .6, rot: -.03 });
  c.restore();
}

// 표지 안쪽 (첫 왼쪽 페이지)
export function drawCover(c, lang = 'en') {
  const a = assets(), R = rng(3);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(a.paperL, 0, 0); c.lineCap = 'round';
  const K = kit(c, R, 70, CW * .5, CH * .5, a.paperL);
  K.marker([[-2.5, -3.35], [2.5, -3.45]], 34);
  hand(c, 'MY RECORD', CW / 2, CH * .3, 104, { align: 'center', rot: -.04 });
  hand(c, '내 운동 기록', CW / 2, CH * .3 + 84, 66, { align: 'center', a: .7 });
  dumbbell(K, 0, .5, 1.7);
  hand(c, 'Day 1 → ?', CW / 2, CH * .72, 62, { align: 'center' });
  hand(c, lang === 'ko' ? '매일 한 줄씩.' : 'one line a day.', CW / 2, CH * .8, lang === 'ko' ? 50 : 44, { align: 'center', a: .6 });
  c.restore();
}
