// 마지막 화면: 마우스를 따라 흘러내리는 액체가 글자를 밝힌다 (셰이더 + 핑퐁 버퍼)
import * as THREE from 'three';

const V = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
// 액체 양: 두꺼운 곳은 아래로 흘러내리고(줄마다 속도 다름), 마우스가 지나간 곳에 새로 붓는다
const SIM = `
uniform sampler2D uPrev;uniform vec2 uMouse,uLast,uTexel;uniform float uForce,uAspect,uRadius;varying vec2 vUv;
float h1(float n){return fract(sin(n*12.9898)*43758.5453);}
float vn(float x){float i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(h1(i),h1(i+1.),f);}
float seg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float t=clamp(dot(pa,ba)/max(dot(ba,ba),1e-8),0.,1.);return length(pa-ba*t);}
void main(){
  float col=vn(vUv.x*70.)*.75+vn(vUv.x*17.+3.)*.25;
  float sp=uTexel.y*(.3+3.4*col*col*col);
  float here=texture2D(uPrev,vUv).r;
  float up=texture2D(uPrev,vUv+vec2(0.,sp)).r;
  float l=texture2D(uPrev,vUv-vec2(uTexel.x,0.)).r,r=texture2D(uPrev,vUv+vec2(uTexel.x,0.)).r;
  float v=max(here*.992,up*smoothstep(.1,.75,up)*.989);
  v=mix(v,(l+r)*.5,.05)-.0009;
  vec2 p=vec2(vUv.x*uAspect,vUv.y),m=vec2(uMouse.x*uAspect,uMouse.y),lm=vec2(uLast.x*uAspect,uLast.y);
  float d=seg(p,lm,m);
  v+=uForce*exp(-d*d/(uRadius*uRadius));
  gl_FragColor=vec4(clamp(v,0.,1.4),0.,0.,1.);
}`;
// 화면: 액체 표면 반짝임 + 액체에 닿은 글자는 시안~라임으로 빛난다
const SHOW = `
uniform sampler2D uTrail,uText;uniform vec2 uTexel;uniform float uTime;uniform vec3 uC1,uC2;varying vec2 vUv;
void main(){
  float t=texture2D(uTrail,vUv).r;
  vec2 e=uTexel*1.5;
  vec2 g=vec2(texture2D(uTrail,vUv+vec2(e.x,0.)).r-texture2D(uTrail,vUv-vec2(e.x,0.)).r,texture2D(uTrail,vUv+vec2(0.,e.y)).r-texture2D(uTrail,vUv-vec2(0.,e.y)).r);
  float liq=smoothstep(.03,.5,t);
  vec2 tuv=vUv-g*.03;
  float a=texture2D(uText,tuv).a,glow=texture2D(uText,tuv,4.).a;
  float k=clamp(.5+.5*sin(uTime*.5+vUv.x*3.+vUv.y*2.),0.,1.);
  vec3 lc=mix(uC2,uC1,k);
  vec3 n=normalize(vec3(-g*7.,1.));
  float spec=pow(max(dot(n,normalize(vec3(-.45,.6,.65))),0.),30.);
  vec3 col=vec3(.027,.035,.043);
  col+=lc*liq*.07+spec*smoothstep(.02,.3,t)*.55;
  col+=lc*glow*liq*.5;
  vec3 dim=vec3(.17,.19,.21);
  col=mix(col,mix(dim,lc*1.1+spec*.5,liq),a);
  gl_FragColor=vec4(col,1.);
}`;

function textCanvas(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const x = cv.getContext('2d'), lines = w / h < .8 ? ['Do you', 'wanna', 'try?'] : ['Do you', 'wanna try?'];
  x.font = '900 100px Archivo';
  const widest = Math.max(...lines.map(l => x.measureText(l).width));
  const fs = Math.min(100 * w * .88 / widest, h * (lines.length === 3 ? .2 : .27));
  x.font = `900 ${fs}px Archivo`; x.fillStyle = '#fff'; x.textAlign = 'center';
  try { x.letterSpacing = `${-fs * .02}px` } catch (e) { }
  const lh = fs * .9, topY = h * .42 - lh * lines.length / 2;
  lines.forEach((l, i) => x.fillText(l, w / 2, topY + lh * (i + .8)));
  return cv;
}

export function createLiquid(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const pr = Math.min(devicePixelRatio, 1.5); renderer.setPixelRatio(pr);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), scene = new THREE.Scene(), quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  scene.add(quad);
  const simMat = new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: SIM, uniforms: {
    uPrev: { value: null }, uMouse: { value: new THREE.Vector2(-1, -1) }, uLast: { value: new THREE.Vector2(-1, -1) },
    uTexel: { value: new THREE.Vector2() }, uForce: { value: 0 }, uAspect: { value: 1 }, uRadius: { value: .055 } } });
  const showMat = new THREE.ShaderMaterial({ vertexShader: V, fragmentShader: SHOW, uniforms: {
    uTrail: { value: null }, uText: { value: null }, uTexel: { value: new THREE.Vector2() }, uTime: { value: 0 },
    uC1: { value: new THREE.Vector3(.133, .902, 1) }, uC2: { value: new THREE.Vector3(.776, 1, .239) } } });
  let W, H, rtA, rtB, textTex;
  function resize() {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H, false);
    const sw = Math.max(2, Math.round(W * .5)), sh = Math.max(2, Math.round(H * .5));
    const o = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    rtA && rtA.dispose(); rtB && rtB.dispose(); rtA = new THREE.WebGLRenderTarget(sw, sh, o); rtB = new THREE.WebGLRenderTarget(sw, sh, o);
    simMat.uniforms.uTexel.value.set(1 / sw, 1 / sh); showMat.uniforms.uTexel.value.set(1 / sw, 1 / sh); simMat.uniforms.uAspect.value = W / H;
    textTex && textTex.dispose();
    textTex = new THREE.CanvasTexture(textCanvas(Math.round(W * pr), Math.round(H * pr)));
    textTex.minFilter = THREE.LinearMipmapLinearFilter; textTex.generateMipmaps = true;
    showMat.uniforms.uText.value = textTex;
  }
  resize(); addEventListener('resize', resize);

  let mx = .5, my = .5, lx = -1, ly = -1, force = 0, lastMove = 0, raf;
  const t0 = performance.now();
  const pm = e => {
    const x = e.clientX / W, y = 1 - e.clientY / H, d = Math.hypot((x - mx) * W / H, y - my);
    mx = x; my = y; force = Math.min(.75, force + d * 7 + .06); lastMove = performance.now();
  };
  addEventListener('pointermove', pm);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = (now - t0) / 1000; let px, py, f;
    if (t < 1.8) { const p = t / 1.8; px = -.05 + 1.1 * p; py = .6 + .05 * Math.sin(p * 9); f = .55 }        // 처음: 글자 위로 쏟아 붓기
    else if (now - lastMove > 2000) { px = .5 + .36 * Math.sin(t * .55); py = .5 + .14 * Math.sin(t * .9 + 1.3); f = .2 } // 가만히 있으면 혼자 흐른다
    else { px = mx; py = my; f = force; force *= .85 }
    if (lx < 0 || Math.hypot(px - lx, py - ly) > .2) { lx = px; ly = py }
    const U = simMat.uniforms; U.uLast.value.set(lx, ly); U.uMouse.value.set(px, py); U.uForce.value = f; lx = px; ly = py;
    U.uPrev.value = rtA.texture; quad.material = simMat; renderer.setRenderTarget(rtB); renderer.render(scene, cam);
    [rtA, rtB] = [rtB, rtA];
    showMat.uniforms.uTrail.value = rtA.texture; showMat.uniforms.uTime.value = t;
    quad.material = showMat; renderer.setRenderTarget(null); renderer.render(scene, cam);
  }
  raf = requestAnimationFrame(frame);
  return { dispose() { cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', pm); renderer.dispose() } };
}
