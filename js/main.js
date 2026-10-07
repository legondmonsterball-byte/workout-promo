// 운동 기록 앱 홍보 사이트: E → 3D 플립북 → 핸드폰 속 앱 → Do you wanna try?
import { sfx, music } from './sfx.js?v=1791357913';
import { makeFrames } from './figure.js?v=1791357913';

const gsap = window.gsap;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const fine = matchMedia('(pointer:fine)').matches;

const T = {
  lede: { en: 'A workout log for people who just want to <em>write it down.</em>', ko: '그냥 <em>기록</em>하고 싶은 사람을 위한 운동 기록 앱.' },
  pressE: { en: fine ? 'Press <b>E</b> to start' : 'Tap <b>E</b> to start', ko: '<b>E</b>를 눌러 시작' },
  meta: { en: 'PWA · iPhone & Android · Free', ko: 'PWA · 아이폰 · 안드로이드 · 무료' },
  openApp: { en: 'Open app ↗', ko: '앱 열기 ↗' },
  skip: { en: 'Skip ›', ko: '건너뛰기 ›' },
  sets: { en: 'Sets logged', ko: '기록한 세트' },
  body: { en: 'Body', ko: '몸무게' },
  tapPhone: { en: 'Tap the phone', ko: '핸드폰 누르기' },
  c0: { en: 'DAY ONE.', ko: '첫날.' },
  c1: { en: 'ONE SET AT A TIME.', ko: '한 세트씩.' },
  c2: { en: 'WRITE IT DOWN.', ko: '적어 두고.' },
  c3: { en: 'EVERY. SINGLE. DAY.', ko: '매일, 또 매일.' },
  c4: { en: 'IT ADDS UP.', ko: '쌓이면, 바뀐다.' },
  c5: { en: 'DONE FOR TODAY.', ko: '오늘도, 끝.' },
  c6: { en: 'NOW — TAP THE PHONE.', ko: '이제, 핸드폰을 눌러봐.' },
  tapHint: { en: 'Tap the screen to move on', ko: '화면을 누르면 넘어가요' },
  posted: { en: 'Posted to story ✓', ko: '스토리에 올림 ✓' },
  finSub: { en: 'Free. No sign-up. Your records stay on your phone.', ko: '한번 써볼래요? 무료, 가입 없음, 기록은 내 폰에만.' },
  cta: { en: 'Try it free ↗', ko: '무료로 써보기 ↗' },
  finNote: { en: 'Open in Safari or Chrome → Add to Home Screen', ko: '사파리·크롬에서 열고 → 홈 화면에 추가' },
  finHint: { en: fine ? 'Move your cursor through the words' : 'Swipe across the words', ko: fine ? '글자 위로 마우스를 움직여 보세요' : '글자 위를 문질러 보세요' },
  replay: { en: '↺ Replay', ko: '↺ 처음부터' },
};
// 몇 번째 장이 보일 때 어떤 큰 글씨를 띄울지
const CAPS = { 3: 'c1', 9: 'c2', 16: 'c3', 27: 'c4', 40: 'c5', 45: 'c6' };
const STEPS = [
  { kick: 'PLAN', title: { en: 'Open it.<br>Plan’s ready.', ko: '열면,<br>오늘 루틴 준비 끝.' },
    body: { en: 'It picks the part you’ve skipped the longest. No thinking before lifting.', ko: '가장 오래 쉰 부위를 알아서 골라줘요. 고민 없이 바로 시작.' } },
  { kick: 'RECORD', title: { en: 'Record<br>every set.', ko: '세트마다,<br>기록.' }, focus: { x: .5, y: .36, s: 1.5 },
    body: { en: 'Weight × reps in one tap. It remembers last time and tells you: one more rep, or +2.5kg. Rest timer starts by itself.', ko: '무게 × 횟수를 한 번에. 지난번 기록을 기억해서 “1회 더”, “+2.5kg”을 알려줘요. 휴식 타이머는 자동.' } },
  { kick: 'REVIEW', title: { en: 'No pricey AI coach.<br>Just today, summed up.', ko: '비싼 AI 코칭 말고,<br>오늘 하루 정리만.' }, focus: { x: .5, y: .2, s: 1.45 },
    body: { en: 'A short, honest recap of how today went — volume, progress, protein. That’s all you need. Free.', ko: '오늘 볼륨, 지난주보다 늘었는지, 단백질은 채웠는지. 딱 필요한 만큼만, 무료로.' } },
  { kick: 'SHARE', title: { en: 'Share it<br>like a run.', ko: '러닝처럼,<br>공유하세요.' },
    body: { en: 'Every workout ends with a story card. Post it — once it’s out there, you come back tomorrow.', ko: '운동이 끝나면 공유 카드가 나와요. 올리면 남고, 남으면 또 하게 돼요.' } },
];

let lang = (() => { try { const v = localStorage.getItem('lang'); if (v) return v } catch (e) { } return /^ko/i.test(navigator.language) ? 'ko' : 'en' })();
let stage = 'hero', book = null, capKey = null, step = -1, liquid = null;

const split = s => s.split(' ').map(w => `<span class="w">${[...w].map(ch => `<span class="c" style="--wg:900">${ch}</span>`).join('')}</span>`).join(' ');

function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-t]').forEach(el => { const v = T[el.dataset.t]; if (v) el.innerHTML = v[lang] });
  $('#lang').textContent = lang === 'ko' ? 'KO / EN' : 'EN / KO';
  $('#hot').dataset.label = T.tapPhone[lang];
  if (stage === 'book' && capKey) caption(capKey, true);
  if (stage === 'phone') renderCopy(step, true);
}

// ───────── 글꼴이 다 오면 시작 ─────────
const fontsReady = Promise.all([
  document.fonts.load('900 100px Archivo'), document.fonts.load('700 40px Caveat'),
  document.fonts.load('40px "Nanum Pen Script"', '눌러봐 기록'), document.fonts.load('900 40px "Pretendard Variable"', '기록'),
]).catch(() => { });
const bookMod = fontsReady.then(() => import('./book.js?v=1791357913'));
bookMod.catch(() => { });

// ───────── 1. 첫 화면 ─────────
const chars = $$('#word .ch');
gsap.set(chars, { opacity: 0 });
function fitWord() {
  if (stage !== 'hero') return;
  const w = $('#word'); w.style.fontSize = '100px';
  const width = w.getBoundingClientRect().width;
  w.style.fontSize = (100 * Math.min(innerWidth * .9, innerHeight * 1.5) / width) + 'px';
}
let introDone = false;
function intro() {
  fitWord();
  gsap.timeline({ onComplete: () => introDone = true })
    .fromTo(chars, { yPercent: 115, opacity: 0, '--wg': 120, '--wd': 62 }, { yPercent: 0, opacity: 1, '--wg': 860, '--wd': 100, duration: 1.3, ease: 'expo.out', stagger: .07 })
    .from('.lede, .hint, .meta', { opacity: 0, y: 16, duration: .8, stagger: .1 }, '-=.7')
    .from('.marq', { opacity: 0, yPercent: 80, duration: 1, stagger: .12, ease: 'expo.out' }, '-=.8')
    .from('.badge', { opacity: 0, scale: .6, duration: 1.2, ease: 'expo.out' }, '-=.9');
  gsap.to(chars[0], { '--fill': '42%', duration: 1.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.6 });
}
// 마우스 근처 글자는 두껍고 넓게, 먼 글자는 얇고 좁게
const vw = chars.map(() => ({ wg: 860, wd: 100, tg: 860, td: 100 }));
let pointer = null;
addEventListener('pointermove', e => { pointer = e });
(function kinetic() {
  requestAnimationFrame(kinetic);
  if (stage !== 'hero' || !introDone) return;
  const wr = $('#word').getBoundingClientRect(), pad = wr.height * .7;
  const near = pointer && pointer.clientX > wr.left - pad && pointer.clientX < wr.right + pad && pointer.clientY > wr.top - pad && pointer.clientY < wr.bottom + pad;
  chars.forEach((c, i) => {
    const v = vw[i];
    if (near) {
      const r = c.getBoundingClientRect(), d = Math.hypot(pointer.clientX - (r.left + r.width / 2), pointer.clientY - (r.top + r.height / 2)), p = Math.max(0, 1 - d / (wr.width * .3));
      v.tg = 280 + 620 * p; v.td = 70 + 55 * p;
    } else { v.tg = 860; v.td = 100 }
    v.wg += (v.tg - v.wg) * .12; v.wd += (v.td - v.wd) * .12;
    c.style.setProperty('--wg', v.wg.toFixed(1)); c.style.setProperty('--wd', v.wd.toFixed(1));
  });
})();

$$('[data-e]').forEach(el => el.addEventListener('click', go));
addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (stage === 'hero' && (e.code === 'KeyE' || /^[eㄷ]$/i.test(e.key))) go();  // 한글 입력 상태(ㄷ)여도 된다
  if (stage === 'phone') { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goStep(step + 1) } if (e.key === 'ArrowLeft') goStep(step - 1) }
});

async function go() {
  if (stage !== 'hero' || !introDone) return;
  stage = 'toBook'; startAudio(); sfx.charge();
  const e = chars[0], others = chars.slice(1);
  gsap.killTweensOf(chars); $('#word').style.overflow = 'visible';
  e.style.setProperty('--wg', 900); e.style.setProperty('--wd', 100);
  gsap.set(e, { transformOrigin: '20% 55%' });
  // E 안이 아래부터 차오르며 꽉 채워지고 → 그대로 화면을 덮을 만큼 커진다
  const fill = { v: parseFloat(e.style.getPropertyValue('--fill')) || 0 };
  const tl = gsap.timeline();
  tl.to('.lede, .hint, .badge, .marq, .meta', { opacity: 0, duration: .35 }, 0)
    .to(others, { y: () => innerHeight * gsap.utils.random(.6, 1.1), x: () => gsap.utils.random(-80, 80), rotation: () => gsap.utils.random(-80, 80), opacity: 0, duration: 1, ease: 'power3.in', stagger: { each: .04, from: 'end' } }, 0)
    .to(fill, { v: 100, duration: .8, ease: 'power2.inOut', onUpdate: () => e.style.setProperty('--fill', fill.v + '%') }, 0)
    .to(e, { scale: 1.12, duration: .8, ease: 'power2.out' }, 0)
    .add(() => { e.style.color = 'var(--cyan)'; e.style.background = 'none'; sfx.whoosh() }, .8)
    .to(e, { scale: 90, duration: 1.1, ease: 'expo.in' }, .85);
  const [mod] = await Promise.all([bookMod, tl.then()]);
  showBook(mod);
}

// ───────── 2. 플립북 ─────────
function showBook(mod) {
  stage = 'book';
  const B = $('#book'); B.classList.add('on');
  const frames = makeFrames();
  book = mod.createBook($('#bookc'), { frames, getLang: () => lang, sfx, onReveal, onFinal });
  gsap.fromTo(B, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(150% at 50% 50%)', duration: 1.5, ease: 'expo.inOut', onComplete: () => { B.style.clipPath = ''; $('#hero').classList.remove('on') } });
  gsap.from('.hud, #skip', { opacity: 0, y: 20, duration: .8, delay: 1.4, stagger: .1 });
  onReveal(0, frames[0]);
  setTimeout(() => caption('c0'), 900);
  book.start(2600);
}
function onReveal(i, fr) {
  const dn = $('#dayN'), day = String(fr.day).padStart(3, '0');
  if (dn.textContent !== day) { dn.textContent = day; gsap.fromTo(dn, { scale: 1.05 }, { scale: 1, duration: .45, ease: 'expo.out' }) }
  $('#setsN').textContent = (fr.day * 11).toLocaleString();
  $('#kgN').textContent = (96 - 18 * fr.fit).toFixed(1) + 'kg';
  if (CAPS[i]) caption(CAPS[i]);
}
function caption(key, instant) {
  capKey = key;
  const box = $('#cap');
  [...box.children].forEach(o => gsap.to(o.querySelectorAll('.c'), { yPercent: -120, opacity: 0, duration: .4, ease: 'power3.in', stagger: .012, onComplete: () => o.remove() }));
  const ln = document.createElement('div'); ln.className = 'cline'; ln.innerHTML = split(T[key][lang]); box.appendChild(ln);
  if (!instant) gsap.fromTo(ln.querySelectorAll('.c'), { yPercent: 120, rotate: 6, '--wg': 150, opacity: 0 }, { yPercent: 0, rotate: 0, '--wg': 900, opacity: 1, duration: .9, ease: 'expo.out', stagger: .028, delay: .15 });
}
function onFinal() {
  const hot = $('#hot'); hot.classList.add('on');
  gsap.to(hot, { opacity: 1, duration: .6 });
  gsap.to('#skip', { opacity: 0, duration: .3, onComplete: () => $('#skip').style.display = 'none' });
  (function pos() {
    if (stage !== 'book' || !book) return;
    const h = book.hotspot();
    if (h) { const s = Math.max(90, h.r * 2.6); Object.assign(hot.style, { width: s + 'px', height: s + 'px', margin: `${-s / 2}px 0 0 ${-s / 2}px`, transform: `translate(${h.x}px,${h.y}px)` }) }
    requestAnimationFrame(pos);
  })();
}
$('#skip').addEventListener('click', () => book && book.skip());
$('#hot').addEventListener('click', openPhone);
async function openPhone() {
  if (stage !== 'book') return;
  stage = 'toPhone'; sfx.pop();
  gsap.to('#hot, #cap, .hud', { opacity: 0, duration: .35 });
  await book.zoomTo(1300);
  gsap.to('#flash', { opacity: 1, duration: .22, ease: 'power2.in', onComplete: () => {
    $('#book').classList.remove('on'); book.dispose(); book = null; startPhone();
    gsap.to('#flash', { opacity: 0, duration: .9, ease: 'power2.out' });
  } });
}

// ───────── 3. 핸드폰 속 앱 화면 (인스타 스토리처럼 넘어간다) ─────────
const DUR = 7;
let barTw = null, zTop = 1;
function startPhone() {
  stage = 'phone'; $('#phone').classList.add('on');
  gsap.from('#device', { y: 120, scale: .7, rotationX: 30, transformPerspective: 900, opacity: 0, duration: 1.3, ease: 'expo.out' });
  gsap.from('.ph-steps li', { x: 30, opacity: 0, stagger: .08, duration: .8, delay: .3 });
  goStep(0);
}
function goStep(n) {
  if (stage !== 'phone') return;
  if (n >= STEPS.length) return toFinale();
  n = Math.max(0, n); if (n === step) return;
  const prev = step; step = n; sfx.tick();
  const imgs = $$('.screen img'), cur = imgs[n];
  imgs.forEach(im => gsap.killTweensOf(im));
  imgs.forEach((im, i) => { if (i !== n) gsap.to(im, { opacity: 0, duration: .4, delay: .35 }) });
  cur.style.zIndex = ++zTop;
  gsap.set(cur, { scale: 1, transformOrigin: '50% 50%' });
  gsap.fromTo(cur, { opacity: 1, clipPath: n > prev ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'expo.out' });
  const fo = STEPS[n].focus;
  if (fo) gsap.to(cur, { scale: fo.s, transformOrigin: `${fo.x * 100}% ${fo.y * 100}%`, duration: 1.6, delay: 1.4, ease: 'power3.inOut' });
  const bars = $$('.bars b');
  bars.forEach((b, i) => gsap.set(b, { width: i < n ? '100%' : '0%' }));
  barTw && barTw.kill();
  barTw = gsap.fromTo(bars[n], { width: '0%' }, { width: '100%', duration: DUR, ease: 'none', onComplete: () => goStep(step + 1) });
  $$('.ph-steps li').forEach((li, i) => li.classList.toggle('on', i === n));
  renderCopy(n);
  story(n === 3);
}
function renderCopy(n, instant) {
  const s = STEPS[n];
  $('#phNum').innerHTML = `<span>${String(n + 1).padStart(2, '0')}</span>`;
  $('#phKick').textContent = s.kick;
  $('#phTitle').innerHTML = s.title[lang].split('<br>').map(l => `<span class="tl">${split(l)}</span>`).join('');
  $('#phBody').innerHTML = s.body[lang];
  $('#bgTrack').textContent = (s.kick + ' ✶ ').repeat(8);
  if (instant) return;
  gsap.killTweensOf('#phBody, #phKick, #bgword');
  gsap.fromTo('#phNum span', { yPercent: 100 }, { yPercent: 0, duration: .8, ease: 'expo.out' });
  gsap.fromTo('#phTitle .c', { yPercent: 110, opacity: 0, '--wg': 200 }, { yPercent: 0, opacity: 1, '--wg': 900, duration: .8, ease: 'expo.out', stagger: .016 });
  gsap.fromTo('#phBody', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, delay: .25 });
  gsap.fromTo('#phKick', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .6 });
  gsap.fromTo('#bgword', { opacity: 0 }, { opacity: 1, duration: 1.2 });
}
function story(show) {
  const st = $('#story'); gsap.killTweensOf(st);
  if (!show) { gsap.to(st, { opacity: 0, scale: .6, duration: .4, ease: 'power2.in' }); gsap.to('.ph-steps', { opacity: 1, duration: .4 }); return }
  const d = $('#device').getBoundingClientRect(), mobile = innerWidth < 861;
  gsap.set(st, { left: d.left + d.width / 2, top: d.top + d.height / 2, xPercent: -50, yPercent: -50, x: 0, y: 0, opacity: 0, scale: .5, rotation: 0, rotationY: 0, transformPerspective: 900 });
  gsap.to('.ph-steps', { opacity: 0, duration: .4, delay: 1 });
  gsap.to(st, { opacity: 1, scale: mobile ? .62 : 1, x: mobile ? d.width * .5 : d.width * .95, y: mobile ? d.height * .12 : -d.height * .03, rotation: 7, rotationY: -16, duration: 1.2, delay: 1.1, ease: 'expo.out', onStart: () => sfx.pop() });
  gsap.fromTo('#story .chip', { scale: 0 }, { scale: 1, duration: .6, delay: 2.0, ease: 'back.out(2.5)' });
}
$('#device').addEventListener('click', e => {
  const r = e.currentTarget.getBoundingClientRect();
  goStep((e.clientX - r.left) / r.width < .33 ? step - 1 : step + 1);
});
$('#next').addEventListener('click', () => goStep(step + 1));
$('#prev').addEventListener('click', () => goStep(step - 1));

// ───────── 4. Do you wanna try? ─────────
async function toFinale() {
  if (stage !== 'phone') return;
  stage = 'toFinale'; barTw && barTw.kill(); sfx.whoosh();
  const tl = gsap.timeline();
  tl.to('#story', { opacity: 0, y: '-=40', duration: .4 }, 0)
    .to('#device', { scale: .85, y: -40, opacity: 0, duration: .7, ease: 'power3.in' }, 0)
    .to('.ph-copy, .ph-steps, #bgword', { opacity: 0, y: -30, duration: .6, ease: 'power3.in', stagger: .05 }, 0);
  const [mod] = await Promise.all([import('./liquid.js?v=1791357913'), tl.then()]);
  $('#phone').classList.remove('on'); stage = 'finale';
  $('#finale').classList.add('on');
  liquid = mod.createLiquid($('#liq'));
  gsap.from('#liq', { opacity: 0, duration: 1.2 });
  gsap.from('.fin-ui > *, .fin-hint', { opacity: 0, y: 24, duration: .9, stagger: .12, delay: 1.4, ease: 'expo.out' });
}
$('#replay').addEventListener('click', () => location.reload());

// ───────── 공통: 언어, 소리, 커서 ─────────
$('#lang').addEventListener('click', () => { lang = lang === 'ko' ? 'en' : 'ko'; try { localStorage.setItem('lang', lang) } catch (e) { } applyLang(); sfx.tick() });
$('#snd').addEventListener('click', e => { e.stopPropagation(); startAudio(); sfx.on = !sfx.on; $('#snd').textContent = sfx.on ? '♪ ON' : '♪ OFF'; $('#snd').classList.toggle('off', !sfx.on) });
// 배경 비트: 브라우저 규칙상 첫 클릭·키 입력 때 시작된다
function startAudio() { sfx.unlock(); music.start() }
addEventListener('pointerdown', startAudio, { once: true }); addEventListener('keydown', startAudio, { once: true });
if (fine) {
  const cur = $('#cursor'), qx = gsap.quickTo(cur, 'x', { duration: .25, ease: 'power3' }), qy = gsap.quickTo(cur, 'y', { duration: .25, ease: 'power3' });
  addEventListener('pointermove', e => { qx(e.clientX); qy(e.clientY); cur.style.opacity = 1 });
  document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a, button, [data-e], #device')));
}
addEventListener('resize', fitWord);

applyLang();
fontsReady.then(intro);

// 테스트용: 주소 끝에 #stage=book|phone|finale 이면 바로 그 장면으로
const jump = location.hash.match(/stage=(\w+)/);
if (jump) fontsReady.then(async () => {
  introDone = true; const t = jump[1];
  if (t === 'book') return go();
  $('#hero').classList.remove('on');
  if (t === 'phone') { startPhone() }
  if (t === 'finale') { stage = 'phone'; startPhone(); toFinale() }
});
