// 스크롤하면 각진 사각형 웜홀을 타고 들어가 → 금이 간 조각으로 된 앱 로고가 있는 공간에 도착
// 로고 조각은 마우스를 빠르게 움직이면 흩날렸다가 멈추면 제자리로 돌아온다
import * as THREE from 'three';

const N = 46, GAP = 1.6, L = N * GAP, R = 1.6, LOGO_Z = -L - 8, S = 2.6;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

const SV = `
attribute vec3 aCenter;attribute vec3 aRand;
uniform vec3 uMouse;uniform float uPower,uTime,uAssemble;
varying vec2 vUv;varying float vF;
mat3 rot(vec3 a,float t){a=normalize(a);float s=sin(t),c=cos(t),o=1.-c;
  return mat3(o*a.x*a.x+c,o*a.x*a.y+a.z*s,o*a.z*a.x-a.y*s, o*a.x*a.y-a.z*s,o*a.y*a.y+c,o*a.y*a.z+a.x*s, o*a.z*a.x+a.y*s,o*a.y*a.z-a.x*s,o*a.z*a.z+c);}
void main(){
  vUv=uv;
  vec3 p=position-aCenter;
  vec2 d=aCenter.xy-uMouse.xy;float dist=length(d);
  float f=smoothstep(1.4,0.,dist)*uPower;
  float sc=f+(1.-uAssemble)*(.7+aRand.y*1.3);
  p=rot(aRand-.5+vec3(.001),sc*(2.+aRand.z*3.))*p;
  vec3 c=aCenter;
  c.xy+=normalize(d+vec2(1e-4))*sc*(.5+aRand.x*1.3);
  c.z+=sc*(1.2+aRand.y*3.)+.025*sin(uTime*1.3+aRand.x*6.28);
  vF=sc;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(c+p,1.);
}`;
const SF = `
uniform sampler2D uTex;varying vec2 vUv;varying float vF;
void main(){
  vec4 t=texture2D(uTex,vUv);if(t.a<.5)discard;
  vec3 c=t.rgb;if(!gl_FrontFacing)c*=.4;
  c=mix(c,vec3(.13,.9,1.),clamp(vF*.35,0.,.5));
  gl_FragColor=vec4(c,1.);
}`;
const BV = `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const BF = `uniform sampler2D uTex;uniform float uTime;varying vec2 vUv;
void main(){float a=texture2D(uTex,vUv).a;if(a<.5)discard;gl_FragColor=vec4(vec3(.13,.9,1.)*(1.1+.25*sin(uTime*2.)),1.);}`;

async function logoTexture() {
  const img = new Image(); img.src = 'logo.svg'; await img.decode();
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  cv.getContext('2d').drawImage(img, 0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return t;
}
// 로고를 살짝 비뚤어진 격자로 잘라 조각을 만든다 (사각형·삼각형 섞어서)
function shardGeometry() {
  const G = 13, cell = S / G, pts = [], rr = 112 / 512 * S, h = S / 2;
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const edge = !i || !j || i === G || j === G, jx = edge ? 0 : (Math.random() - .5) * cell * .75, jy = edge ? 0 : (Math.random() - .5) * cell * .75;
    pts.push([-h + i * cell + jx, -h + j * cell + jy]);
  }
  const P = (i, j) => pts[j * (G + 1) + i], polys = [];
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const q = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)];
    if (Math.random() < .45) { if (Math.random() < .5) polys.push([q[0], q[1], q[2]], [q[0], q[2], q[3]]); else polys.push([q[0], q[1], q[3]], [q[1], q[2], q[3]]) }
    else polys.push(q);
  }
  const inside = (x, y) => { const dx = Math.max(Math.abs(x) - (h - rr), 0), dy = Math.max(Math.abs(y) - (h - rr), 0); return dx * dx + dy * dy < rr * rr * 1.1 };
  const pos = [], uv = [], cen = [], rnd = [];
  for (const poly of polys) {
    const cx = poly.reduce((a, p) => a + p[0], 0) / poly.length, cy = poly.reduce((a, p) => a + p[1], 0) / poly.length;
    if (!inside(cx, cy)) continue;
    const z = (Math.random() - .5) * .05, r3 = [Math.random(), Math.random(), Math.random()];
    const v = poly.map(p => [cx + (p[0] - cx) * .93, cy + (p[1] - cy) * .93]);
    for (let k = 1; k < v.length - 1; k++) for (const p of [v[0], v[k], v[k + 1]]) {
      pos.push(p[0], p[1], z); uv.push(p[0] / S + .5, p[1] / S + .5); cen.push(cx, cy, z); rnd.push(...r3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('aCenter', new THREE.Float32BufferAttribute(cen, 3)); g.setAttribute('aRand', new THREE.Float32BufferAttribute(rnd, 3));
  return g;
}
function squareRing(r, w) {
  const s = new THREE.Shape([[-r, -r], [r, -r], [r, r], [-r, r]].map(p => new THREE.Vector2(...p)));
  s.holes.push(new THREE.Path([[-r + w, -r + w], [-r + w, r - w], [r - w, r - w], [r - w, -r + w]].map(p => new THREE.Vector2(...p))));
  return new THREE.ShapeGeometry(s);
}

export async function createWormhole(canvas, { sfx, onProgress, onArrive }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x07090b, .055);
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

  // 도착 공간: 금 간 로고 + 뒤에서 새어 나오는 시안 빛 + 천천히 도는 큰 사각형들
  const tex = await logoTexture();
  const logo = new THREE.Group(); logo.position.set(0, .45, LOGO_Z); scene.add(logo);
  const U = { uTex: { value: tex }, uMouse: { value: new THREE.Vector3(9, 9, 0) }, uPower: { value: 0 }, uTime: { value: 0 }, uAssemble: { value: 0 } };
  logo.add(new THREE.Mesh(shardGeometry(), new THREE.ShaderMaterial({ vertexShader: SV, fragmentShader: SF, uniforms: U, side: THREE.DoubleSide })));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(S * .985, S * .985), new THREE.ShaderMaterial({ vertexShader: BV, fragmentShader: BF, uniforms: { uTex: U.uTex, uTime: U.uTime } }));
  back.position.z = -.06; logo.add(back);
  const outer = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(squareRing(2.6 + i * 1.3, .012), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc6ff3d : 0x22e6ff, transparent: true, opacity: .35 - i * .08, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(0, .45, LOGO_Z - 1.5 - i * 1.2); scene.add(m); outer.push(m);
  }

  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }
  resize(); addEventListener('resize', resize);

  // 마우스 → 로고 평면 위 좌표
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -LOGO_Z), hit = new THREE.Vector3();
  let mx = 0, my = 0, lmx = 0, lmy = 0, power = 0, lastShard = 0;
  const pm = e => { mx = e.clientX / innerWidth * 2 - 1; my = -(e.clientY / innerHeight * 2 - 1) };
  addEventListener('pointermove', pm);

  let target = 0, p = 0, arrived = false, assemble = 0, raf, last = performance.now();
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
    if (p > .82) assemble = Math.min(1, assemble + dt * .7);
    U.uAssemble.value = smooth(assemble); U.uTime.value = t;
    if (!arrived && p >= 1) { arrived = true; onArrive && onArrive() }
    // 조각: 마우스가 빠르게 지나가면 흩날리고, 멈추면 돌아온다
    ndc.set(mx, my); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(plane, hit)) U.uMouse.value.set(hit.x - logo.position.x, hit.y - logo.position.y, 0);
    const spd = Math.hypot(mx - lmx, my - lmy) / Math.max(dt, .001); lmx = mx; lmy = my;
    const goal = arrived ? clamp(spd * .35, 0, 1.1) : 0;
    power += (goal - power) * (goal > power ? .25 : .045); U.uPower.value = power;
    if (arrived && power > .25 && now - lastShard > 70) { lastShard = now; sfx && sfx.shard(Math.min(1, power)) }
    logo.rotation.y += ((arrived ? mx * .25 : 0) - logo.rotation.y) * .05; logo.rotation.x += ((arrived ? -my * .18 : 0) - logo.rotation.x) * .05;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  return {
    push(d) { if (!arrived) target = clamp(target + d, 0, 1) },
    dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', pm); renderer.dispose() }
  };
}
