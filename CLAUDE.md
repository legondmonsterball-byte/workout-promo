# 운동 앱 홍보 사이트 (workout-promo)

운동 기록 앱(~/workout-app) 홍보용 인터랙티브 사이트. 정적 사이트, GitHub Pages. 무료 도구만.

- 흐름: EXERCISE의 E 누르기 → 3D 스케치북 플립북(뚱뚱 → 근육, 느리게→빠르게→멈춤) → 핸드폰 누르기 → 앱 화면 4단계(인스타 스토리식) → "Do you wanna try?" 액체 글자 + 앱 링크
- 의도(사용자 말): 기록이 중요하다 / 돈 내는 AI 코칭 말고 오늘 하루 정리만 / 러닝앱처럼 공유카드로 인스타에 남기면 더 자주 하게 된다
- 색: 다크 + 시안(#22e6ff) + 라임(#c6ff3d). 글꼴: Archivo(가변 굵기·폭), Pretendard, Caveat/나눔펜(손글씨)
- 파일: index.html, style.css, js/main.js(장면·글자·번역), js/figure.js(사람 스케치·일지를 캔버스에 코드로 그림), js/book.js(Three.js 3D 책), js/liquid.js(액체 셰이더), js/sfx.js(효과음 합성), shots/(앱 스크린샷)
- 외부: GSAP(cdnjs), three(jsdelivr importmap), 폰트(Google Fonts, Pretendard jsdelivr)
- 테스트: 주소 끝에 #stage=book / #stage=phone / #stage=finale 로 바로 이동
- 문구 수정: js/main.js 맨 위 T(공통 문구), STEPS(앱 화면 설명), CAPS(책 넘길 때 큰 글씨)
- 책 넘김 속도: js/book.js의 interval / SLOW
- 배경 비트: js/sfx.js의 music (100BPM 긴장감: 심장박동 킥·조여오는 베이스·초침·반음 패드, 첫 클릭/키 입력 때 시작, ♪ 버튼으로 끔)
- 마지막 액체 효과: js/liquid.js (처음 버전 + 점성만 낮춤: sp 속도, here*.955 붙어있는 정도). 글자는 액체가 지금 있는 곳만 색, 없으면 회색 (사용자 요청)
- 그 다음: 스크롤 → js/wormhole.js 사각 웜홀 → 금 간 앱 로고(logo.svg = 앱 아이콘을 보로노이로 깨서 두께 있는 유리 조각으로 만듦 + 스프링 물리 + 빛번짐(bloom). 밝기는 wormhole.js의 조명·bloom·NeutralToneMapping으로 조절) + 아래 링크. 이글루(igloo.inc) 마지막 장면 참고
- 배포할 때 index.html·js의 ?v=숫자를 새로 바꿔야 브라우저가 새 파일을 받는다

## 진행 상황 (2026-10-07)
배포 완료: https://legondmonsterball-byte.github.io/workout-promo/ (git push 후 1분쯤 뒤 반영, push 전에 ?v= 숫자 바꾸기)

사용자 피드백으로 바꾼 것 (순서대로):
1. E 누르면 안이 아래부터 3초 동안 차오르며 점점 세게 흔들림 → 꽉 차면 다른 글자 떨어지고 E가 화면 덮음. 한글 입력(ㄷ)이어도 시작
2. 앱 화면 4단계: 01·제목·설명 위치 고정 (단계마다 들썩이던 것 수정)
3. 책 마지막 느린 장: Day 173 → 180으로 하루씩 (전부 180이던 것 수정)
4. 액체: 처음 버전 + 점성만 낮춤. 글자는 액체 닿은 곳만 색, 나머지 바로 회색. (폭포·물 버전은 사용자가 싫어해서 되돌림 — 효과 자체는 바꾸지 말 것)
5. 배경 비트: 긴장감 있게 (첫 클릭/키 때 시작, ♪ 버튼)
6. Do you wanna try? 에서 스크롤 → 사각 웜홀 → 깨진 유리 조각 앱 로고 + 링크 (이글루 참고)
7. 처음부터 버튼이 #stage=finale 주소 때문에 마지막으로 돌아가던 버그 수정

사용자가 아직 확인 안 한 것: 비트 소리(내가 들을 수 없음), 흔들림 세기, 웜홀 속도·로고 크기, 휴대폰에서 웜홀 성능
사용자 성향: 요청한 부분만 바꾸고 나머지는 그대로 둘 것 (액체 효과 건으로 한 번 지적받음)
