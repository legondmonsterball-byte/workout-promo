// 3D 두꺼운 스케치북: 페이지가 넘어가며 그림이 바뀌는 플립북 (Three.js)
import * as THREE from 'three';
import { CW, CH, drawFigure, drawLog, drawCover } from './figure.js?v=1791357913';

const PWU = 1, PHU = CH / CW, SEG = 28, TT = .12, CT = .03;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const ease = t => .5 - .5 * Math.cos(Math.PI * t);

function pageGeo() {
  const g = new THREE.BufferGeometry(), n = (SEG + 1) * 2, uv = new Float32Array(n * 2), idx = [];
  for (let i = 0; i <= SEG; i++) uv.set([i / SEG, 0, i / SEG, 1], i * 4);
  for (let i = 0; i < SEG; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3) }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}
// 책등을 축으로 th만큼 돌리고, 끝부분은 curl만큼 먼저/늦게 휘게 한다
function bend(g, th, curl, y0) {
  const p = g.attributes.position.array, ds = PWU / SEG; let x = 0, y = 0;
  for (let i = 0; i <= SEG; i++) {
    if (i) { const s = (i - .5) / SEG, ph = clamp(th + curl * Math.pow(s, 1.5), 0, Math.PI); x += Math.cos(ph) * ds; y += Math.sin(ph) * ds }
    p.set([x, y + y0, PHU / 2, x, y + y0, -PHU / 2], i * 6);
  }
  g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
}

export function createBook(canvas, { frames, getLang, onReveal, onFinal, sfx }) {
  const N = frames.length, last = N - 1;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07090b); scene.fog = new THREE.Fog(0x07090b, 3.5, 9);
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 40);

  // 조명: 책상 스탠드 + 시안/라임 림라이트
  scene.add(new THREE.HemisphereLight(0xcdeeff, 0x0b0f12, 1.1));
  const key = new THREE.DirectionalLight(0xfff0de, 3.6); key.position.set(-1.4, 3.2, 1.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -1.7, right: 1.7, top: 1.7, bottom: -1.7, near: .5, far: 9 });
  key.shadow.bias = -.0005; key.shadow.normalBias = .02; key.shadow.radius = 5; scene.add(key);
  const c1 = new THREE.PointLight(0x22e6ff, 4, 7, 2); c1.position.set(2.2, .35, -1.3); scene.add(c1);
  const c2 = new THREE.PointLight(0xc6ff3d, 5, 7, 2); c2.position.set(-2.1, .4, -.9); scene.add(c2);

  // 책상, 표지, 책등
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x0b0f12, roughness: .85, metalness: .1 }));
  desk.rotation.x = -Math.PI / 2; desk.receiveShadow = true; scene.add(desk);
  const coverMat = new THREE.MeshStandardMaterial({ color: 0x14191e, roughness: .55, metalness: .15 });
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(PWU + .06, CT, PHU + .09), coverMat);
    m.position.set(s * (PWU + .06) / 2, CT / 2, 0); m.castShadow = m.receiveShadow = true; scene.add(m);
    const edge = new THREE.Mesh(new THREE.BoxGeometry(.008, .008, PHU + .09), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xc6ff3d : 0x22e6ff }));
    edge.position.set(s * (PWU + .06), CT * .5, 0); scene.add(edge);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, PHU + .09, 20), coverMat);
  spine.rotation.x = Math.PI / 2; spine.position.set(0, .012, 0); scene.add(spine);

  // 종이 뭉치 (넘길수록 오른쪽은 얇아지고 왼쪽은 두꺼워진다)
  const ec = document.createElement('canvas'); ec.width = 4; ec.height = 512;
  const ex = ec.getContext('2d'); ex.fillStyle = '#ebe3d2'; ex.fillRect(0, 0, 4, 512);
  for (let y = 0; y < 512; y += 4) { ex.fillStyle = `rgba(110,92,64,${.12 + Math.random() * .22})`; ex.fillRect(0, y, 4, 1.4) }
  const et = new THREE.CanvasTexture(ec); et.colorSpace = THREE.SRGBColorSpace;
  const edgeMat = new THREE.MeshStandardMaterial({ map: et, roughness: 1 });
  const blocks = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), edgeMat); m.castShadow = m.receiveShadow = true; scene.add(m); return m });
  let leftN = 0, rightN = N;
  const top = n => CT + .004 + TT * n / N;
  function setBlocks() {
    [leftN, rightN].forEach((n, i) => { const h = top(n) - CT, m = blocks[i]; m.scale.set(PWU - .01, h, PHU - .006); m.position.set((i ? 1 : -1) * (PWU / 2 + .002), CT + h / 2, 0) });
  }

  // 펼쳐진 두 페이지
  const mkCanvas = () => { const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; return cv };
  const mkTex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t };
  const mirror = t => { t.repeat.x = -1; t.offset.x = 1; return t };
  const mat = (map, side) => new THREE.MeshStandardMaterial({ map, roughness: .92, side });
  const rightCv = mkCanvas(), leftCv = mkCanvas(), rightTex = mkTex(rightCv), leftTex = mirror(mkTex(leftCv));
  const rGeo = pageGeo(), lGeo = pageGeo();
  const rPage = new THREE.Mesh(rGeo, mat(rightTex, THREE.FrontSide)), lPage = new THREE.Mesh(lGeo, mat(leftTex, THREE.BackSide));
  rPage.receiveShadow = lPage.receiveShadow = true; scene.add(rPage, lPage);
  const placeStatic = () => { bend(rGeo, 0, 0, top(rightN) + .0006); bend(lGeo, Math.PI, 0, top(leftN) + .0006) };

  let phoneRect = null;
  const front = (cv, i) => { const r = drawFigure(cv.getContext('2d'), frames[i], 1000 + i * 17, getLang()); if (i === last) phoneRect = r.phone };
  const back = (cv, i) => drawLog(cv.getContext('2d'), frames[i], getLang());
  front(rightCv, 0); drawCover(leftCv.getContext('2d'), getLang());
  setBlocks(); placeStatic();

  // 넘어가는 페이지들
  const pool = [], getCv = () => pool.pop() || mkCanvas(), flips = [];
  let next = 0, nextAt = Infinity, lastEnd = 0, skipping = false, finalFired = false;
  // 처음엔 천천히 → 점점 빠르게 → 마지막에 느려지며 멈춤
  const SLOW = [130, 190, 280, 420, 600, 800, 1000, 1150, 1250, 1350, 1400];
  const interval = j => skipping ? 70 : j < 2 ? 1300 : j < 34 ? Math.max(80, 1300 * Math.pow(.8, j - 1)) : (SLOW[j - 34] ?? 1400);
  function startFlip(j, now) {
    const fcv = getCv(), bcv = getCv();
    fcv.getContext('2d').drawImage(rightCv, 0, 0); back(bcv, j);
    const ft = mkTex(fcv), bt = mirror(mkTex(bcv)), geo = pageGeo();
    const fm = new THREE.Mesh(geo, mat(ft, THREE.FrontSide)), bm = new THREE.Mesh(geo, mat(bt, THREE.BackSide));
    fm.material.shadowSide = THREE.DoubleSide; fm.castShadow = true; scene.add(fm, bm);
    const iv = interval(j), dur = skipping ? 380 : clamp(iv * 1.9, 320, 1250), end = Math.max(now + dur, lastEnd + 25);
    lastEnd = end;
    const from = top(rightN);
    bend(geo, 0, 0, from + .0012);
    flips.push({ j, t0: now, end, fm, bm, geo, fcv, bcv, ft, bt, from });
    rightN--; setBlocks(); front(rightCv, j + 1); rightTex.needsUpdate = true; placeStatic();
    sfx.flip(iv > 500 ? 1 : .5); onReveal(j + 1, frames[j + 1]);
  }
  function endFlip(f) {
    leftCv.getContext('2d').drawImage(f.bcv, 0, 0); leftTex.needsUpdate = true; leftN++; setBlocks(); placeStatic();
    scene.remove(f.fm, f.bm); f.geo.dispose(); f.fm.material.dispose(); f.bm.material.dispose(); f.ft.dispose(); f.bt.dispose();
    pool.push(f.fcv, f.bcv);
    if (f.j === last - 1) sfx.thud();
  }
  function update(now) {
    if (next < last && now >= nextAt) { startFlip(next, now); nextAt = now + interval(next); next++ }
    const done = [];
    flips.forEach((f, k) => {
      const t = clamp((now - f.t0) / (f.end - f.t0), 0, 1), e = ease(t);
      bend(f.geo, Math.PI * e, .95 * Math.sin(2 * Math.PI * t) * (1 - .4 * t), lerp(f.from, top(leftN), e) + .0012 + k * .0005);
      if (t >= 1) done.push(f);
    });
    for (const f of done) { endFlip(f); flips.splice(flips.indexOf(f), 1) }
    if (!finalFired && next >= last && !flips.length) { finalFired = true; onFinal() }
  }

  // 카메라: 위에서 내려오며 시작, 마우스에 따라 살짝 기울어짐
  const look = new THREE.Vector3(), home = new THREE.Vector3(), from = new THREE.Vector3(), cur = new THREE.Vector3(), curLook = new THREE.Vector3();
  const dirV = new THREE.Vector3(0, 1, .62).normalize(); let dist = 3;
  function layout() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    const portrait = w / h < .85;
    camera.fov = portrait ? 40 : 30; camera.updateProjectionMatrix();
    look.set(portrait ? .5 : 0, 0, .04);
    const vf = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    dist = Math.max(((portrait ? 1.22 : 2.5) / 2) / Math.tan(hf / 2), (PHU * 1.3 * .5) / Math.tan(vf / 2));
    home.copy(look).addScaledVector(dirV, dist);
    from.copy(look).add(new THREE.Vector3(0, dist * 1.8, dist * .2));
  }
  let mx = 0, my = 0, sx = 0, sy = 0, zoom = null, raf, t0 = performance.now();
  const onMove = e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5 };
  addEventListener('pointermove', onMove); addEventListener('resize', layout); layout();
  function loop(now) {
    raf = requestAnimationFrame(loop);
    update(now);
    sx += (mx - sx) * .04; sy += (my - sy) * .04;
    const it = 1 - Math.pow(1 - clamp((now - t0) / 2600, 0, 1), 3);
    cur.lerpVectors(from, home, it); cur.x += sx * dist * .06; cur.z += sy * dist * .04; curLook.copy(look);
    if (zoom) {
      const z = ease(clamp((now - zoom.t0) / zoom.dur, 0, 1)); cur.lerp(zoom.pos, z); curLook.lerp(zoom.look, z);
      if (z >= 1 && zoom.cb) { const cb = zoom.cb; zoom.cb = null; cb() }
    }
    camera.position.copy(cur); camera.lookAt(curLook);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(loop);

  const phoneWorld = (dy = 0) => new THREE.Vector3(phoneRect.x / CW * PWU, top(rightN) + .002, -PHU / 2 + (phoneRect.y + dy) / CH * PHU);
  return {
    start(delay = 1500) { nextAt = performance.now() + delay },
    skip() { skipping = true; nextAt = Math.min(nextAt, performance.now()) },
    // 마지막 장의 핸드폰 위치 (화면 좌표)
    hotspot() {
      if (!phoneRect) return null;
      const a = phoneWorld().project(camera), b = phoneWorld(-phoneRect.h / 2).project(camera);
      const y = (-a.y * .5 + .5) * innerHeight;
      return { x: (a.x * .5 + .5) * innerWidth, y, r: Math.abs(y - (-b.y * .5 + .5) * innerHeight) };
    },
    zoomTo(ms) { return new Promise(res => { const p = phoneWorld(); zoom = { t0: performance.now(), dur: ms, pos: p.clone().addScaledVector(dirV, .42), look: p, cb: res } }) },
    dispose() { cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); removeEventListener('resize', layout); renderer.dispose(); renderer.forceContextLoss() }
  };
}
