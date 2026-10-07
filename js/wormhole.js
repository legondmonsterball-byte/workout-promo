// 스크롤하면 각진 사각형 웜홀을 타고 들어가 → 금이 간 조각으로 된 앱 로고가 있는 공간에 도착
// 로고 조각은 마우스를 빠르게 움직이면 흩날렸다가 멈추면 제자리로 돌아온다
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const N = 46, GAP = 1.6, L = N * GAP, R = 1.6, LOGO_Z = -L - 8, S = 2.6;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

async function logoTexture() {
  const img = new Image(); img.src = 'logo.svg'; await img.decode();
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const x = cv.getContext('2d'); x.drawImage(img, 0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return { t, px: x.getImageData(0, 0, 1024, 1024).data };
}
// 유리가 깨진 것처럼: 충격점 근처는 잘게, 바깥은 크게 (보로노이 조각)
function shatter() {
  const h = S / 2, rr = 112 / 512 * S, box = [];
  for (const [cx, cy, a0] of [[h - rr, -h + rr, -Math.PI / 2], [h - rr, h - rr, 0], [-h + rr, h - rr, Math.PI / 2], [-h + rr, -h + rr, Math.PI]])
    for (let k = 0; k <= 6; k++) { const a = a0 + k / 6 * Math.PI / 2; box.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]) }
  const inBox = (x, y) => { const dx = Math.max(Math.abs(x) - (h - rr), 0), dy = Math.max(Math.abs(y) - (h - rr), 0); return dx * dx + dy * dy < rr * rr };
  const hit = [.12, -.05], seeds = [];
  let tries = 0;
  while (seeds.length < 95 && tries++ < 6000) {
    const a = Math.random() * Math.PI * 2, r = Math.pow(Math.random(), .75) * S * .78, x = hit[0] + Math.cos(a) * r, y = hit[1] + Math.sin(a) * r;
    const md = .07 + .2 * (r / (S * .78));
    if (inBox(x, y) && seeds.every(q => Math.hypot(q[0] - x, q[1] - y) > md)) seeds.push([x, y]);
  }
  const clip = (poly, nx, ny, d) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], da = nx * A[0] + ny * A[1] - d, db = nx * B[0] + ny * B[1] - d;
      if (da <= 0) out.push(A);
      if (da * db < 0) { const t = da / (da - db); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]) }
    }
    return out;
  };
  return seeds.map((p, i) => {
    let poly = box;
    seeds.forEach((q, j) => { if (i !== j) poly = clip(poly, q[0] - p[0], q[1] - p[1], (q[0] * q[0] + q[1] * q[1] - p[0] * p[0] - p[1] * p[1]) / 2) });
    return poly;
  }).filter(p => p.length >= 3);
}
function squareRing(r, w) {
  const s = new THREE.Shape([[-r, -r], [r, -r], [r, r], [-r, r]].map(p => new THREE.Vector2(...p)));
  s.holes.push(new THREE.Path([[-r + w, -r + w], [-r + w, r - w], [r - w, r - w], [r - w, -r + w]].map(p => new THREE.Vector2(...p))));
  return new THREE.ShapeGeometry(s);
}

export async function createWormhole(canvas, { sfx, onProgress, onArrive }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.setClearColor(0x07090b); renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = .9;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07090b); scene.fog = new THREE.FogExp2(0x07090b, .055);
  const camera = new THREE.PerspectiveCamera(60, 1, .05, 200);

  // 터널: 사각 프레임이 조금씩 비틀리며 이어진다
  const ringGeo = squareRing(R, .022), glowGeo = squareRing(R + .05, .14), frames = [];
  for (let i = 0; i < N; i++) {
    const col = new THREE.Color(i % 2 ? 0x22e6ff : 0xc6ff3d), g = new THREE.Group();
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    const gl = new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(m, gl); g.position.z = -i * GAP; g.rotation.z = i * .07; scene.add(g); frames.push({ g, m, gl, col });
  }
  // 모서리 레일 + 속도선
  const lp = [], sp = [];
  for (const [x, y] of [[-R, -R], [R, -R], [R, R], [-R, R]]) lp.push(x, y, 2, x, y, -L);
  for (let i = 0; i < 700; i++) { const x = (Math.random() - .5) * 2.8, y = (Math.random() - .5) * 2.8, z = 3 - Math.random() * (L + 14); sp.push(x, y, z, x, y, z - .35 - Math.random() * .5) }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  scene.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x22e6ff, transparent: true, opacity: .25 })));
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .45, blending: THREE.AdditiveBlending })));

  // 도착 공간: 두께 있는 유리 조각으로 된 앱 로고 (금 사이로 시안 빛) + 천천히 도는 큰 사각형들
  const pm2 = new THREE.PMREMGenerator(renderer); scene.environment = pm2.fromScene(new RoomEnvironment(), .04).texture;
  const { t: tex, px } = await logoTexture();
  const logo = new THREE.Group(); logo.position.set(0, .45, LOGO_Z); scene.add(logo);
  const key = new THREE.DirectionalLight(0xffffff, .9); key.position.set(-3.5, 4.5, LOGO_Z + 2.5); key.target = logo; scene.add(key, key.target);
  const rimC = new THREE.PointLight(0x22e6ff, 5, 8, 2), rimL = new THREE.PointLight(0xc6ff3d, 3, 8, 2); scene.add(rimC, rimL);
  const capMat = new THREE.MeshPhysicalMaterial({ map: tex, roughness: .5, metalness: 0, specularIntensity: .35, clearcoat: .35, clearcoatRoughness: .25, envMapIntensity: .22 });
  const sideMat = new THREE.MeshPhysicalMaterial({ color: 0x9fdfff, emissive: 0x22e6ff, emissiveIntensity: .18, roughness: .12, metalness: .1, clearcoat: 1, envMapIntensity: .7 });
  const uvGen = {
    generateTopUV(g, v, a, b, c) { return [a, b, c].map(i => new THREE.Vector2(v[i * 3] / S + .5, v[i * 3 + 1] / S + .5)) },
    generateSideWallUV(g, v, a, b, c, d) { return [a, b, c, d].map(i => new THREE.Vector2(v[i * 3] / S + .5, v[i * 3 + 1] / S + .5)) }
  };
  const bright = (x, y) => { const i = (Math.round((.5 - y / S) * 1023) * 1024 + Math.round((x / S + .5) * 1023)) * 4; return px[i] > 235 && px[i + 1] > 235 };
  const shards = shatter().map(poly => {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    const v = poly.map(p => new THREE.Vector2(cx + (p[0] - cx) * .9, cy + (p[1] - cy) * .9));
    const depth = bright(cx, cy) ? .3 : .16 + Math.random() * .05;   // 하얀 케틀벨 부분은 더 두껍게 튀어나온다
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(v), { depth, bevelEnabled: true, bevelThickness: .025, bevelSize: .018, bevelSegments: 2, UVGenerator: uvGen });
    g.translate(-cx, -cy, -depth / 2);
    const m = new THREE.Mesh(g, [capMat, sideMat]); m.position.set(cx, cy, depth / 2); logo.add(m);
    const R3 = () => (Math.random() - .5);
    return { m, home: new THREE.Vector3(cx, cy, depth / 2), off: new THREE.Vector3(R3() * 9, R3() * 7, 2 + Math.random() * 7), vel: new THREE.Vector3(), rot: new THREE.Vector3(R3() * 7, R3() * 7, R3() * 7), av: new THREE.Vector3(), r: Math.random() };
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(S * .9, S * .9), new THREE.MeshBasicMaterial({ color: 0x22e6ff, transparent: true, opacity: .4 }));
  glow.position.z = -.02; logo.add(glow);
  const outer = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(squareRing(2.6 + i * 1.3, .012), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc6ff3d : 0x22e6ff, transparent: true, opacity: .35 - i * .08, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, .45, LOGO_Z - 1.5 - i * 1.2); scene.add(m); outer.push(m);
  }

  // 빛 번짐
  const composer = new EffectComposer(renderer), bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .45, .4, .9);
  composer.addPass(new RenderPass(scene, camera)); composer.addPass(bloom); composer.addPass(new OutputPass());
  function resize() { renderer.setSize(innerWidth, innerHeight, false); composer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
  resize(); addEventListener('resize', resize);

  // 마우스 → 로고 평면 위 좌표
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -LOGO_Z), hit = new THREE.Vector3();
  let mx = 0, my = 0, mvx = 0, mvy = 0, pmx = 0, pmy = 0, lastShard = 0;
  const pm = e => { mx = e.clientX / innerWidth * 2 - 1; my = -(e.clientY / innerHeight * 2 - 1) };
  addEventListener('pointermove', pm);

  let target = 0, p = 0, arrived = false, raf, last = performance.now();
  const startZ = 4, endZ = LOGO_Z + 6.2;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000), t = now / 1000; last = now;
    if (target > .02) target = Math.min(1, target + dt * .13);   // 한번 들어오면 계속 빨려 들어간다
    p += (target - p) * Math.min(1, dt * 2.2); if (target >= 1 && 1 - p < .002) p = 1;
    const e = smooth(p), warp = Math.sin(Math.PI * clamp(p * 1.15, 0, 1));
    camera.position.set(Math.sin(t * .7) * .12 * warp, .1 + Math.cos(t * .9) * .08 * warp, lerp(startZ, endZ, e));
    camera.fov = 60 + warp * 38; camera.updateProjectionMatrix();
    camera.rotation.set(0, 0, warp * .5 * Math.sin(p * 4));
    frames.forEach((f, i) => { const k = .35 + .65 * Math.pow(.5 + .5 * Math.sin(t * 3 - i * .45), 4); f.m.material.opacity = k; f.gl.material.opacity = .05 + .1 * k * warp });
    outer.forEach((m, i) => { m.rotation.z = t * (.05 + i * .03) * (i % 2 ? -1 : 1) });
    onProgress && onProgress(p);
    if (!arrived && p >= 1) { arrived = true; onArrive && onArrive() }
    // 마우스 위치·속도 (로고 평면 위)
    ndc.set(mx, my); ray.setFromCamera(ndc, camera);
    const has = ray.ray.intersectPlane(plane, hit);
    const lx2 = hit.x - logo.position.x, ly2 = hit.y - logo.position.y;
    mvx = has ? (lx2 - pmx) / Math.max(dt, .001) : 0; mvy = has ? (ly2 - pmy) / Math.max(dt, .001) : 0; pmx = lx2; pmy = ly2;
    const ms = Math.min(14, Math.hypot(mvx, mvy));
    // 조각 물리: 마우스가 친 방향으로 튕겨 나가 돌다가, 스프링처럼 출렁이며 제자리로
    if (p > .8) {
      let kicked = 0;
      for (const sh of shards) {
        if (arrived && ms > .6) {
          const wx = sh.home.x + sh.off.x, wy = sh.home.y + sh.off.y, d = Math.hypot(wx - lx2, wy - ly2);
          if (d < .85) {
            const w = Math.pow(1 - d / .85, 2), ox = (wx - lx2) / (d + 1e-3), oy = (wy - ly2) / (d + 1e-3);
            sh.vel.x += (mvx * .05 + ox * ms * .05) * w; sh.vel.y += (mvy * .05 + oy * ms * .05) * w; sh.vel.z += ms * .09 * w * (.5 + sh.r);
            sh.av.x += (Math.random() - .5) * ms * .7 * w; sh.av.y += (Math.random() - .5) * ms * .7 * w; sh.av.z += (Math.random() - .5) * ms * .4 * w;
            kicked += w;
          }
        }
        const k = arrived ? 26 : 9, c = arrived ? 5.2 : 3.2;
        sh.vel.addScaledVector(sh.off, -k * dt).multiplyScalar(Math.max(0, 1 - c * dt)); sh.off.addScaledVector(sh.vel, dt);
        sh.av.addScaledVector(sh.rot, -20 * dt).multiplyScalar(Math.max(0, 1 - 4.6 * dt)); sh.rot.addScaledVector(sh.av, dt);
        sh.m.position.copy(sh.home).add(sh.off); sh.m.position.z += .02 * Math.sin(t * 1.3 + sh.r * 6.28);
        sh.m.rotation.set(sh.rot.x, sh.rot.y, sh.rot.z);
      }
      if (kicked > .3 && now - lastShard > 70) { lastShard = now; sfx && sfx.shard(Math.min(1, kicked * .4)) }
    }
    rimC.position.set(logo.position.x + Math.cos(t * .6) * 3, logo.position.y + Math.sin(t * .8) * 2, LOGO_Z + 2.5);
    rimL.position.set(logo.position.x - Math.cos(t * .5) * 3, logo.position.y - Math.sin(t * .7) * 2, LOGO_Z + 2);
    glow.material.opacity = .22 + .08 * Math.sin(t * 2);
    logo.rotation.y += ((arrived ? mx * .3 : 0) - logo.rotation.y) * .05; logo.rotation.x += ((arrived ? -my * .2 : 0) - logo.rotation.x) * .05;
    composer.render();
  }
  raf = requestAnimationFrame(frame);
  return {
    push(d) { if (!arrived) target = clamp(target + d, 0, 1) },
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', pm); composer.dispose(); renderer.dispose() }
  };
}
