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
- 그 다음: 스크롤 → js/wormhole.js 사각 웜홀 → 금 간 앱 로고(logo.svg = 앱 아이콘, 마우스 빠르게 움직이면 조각이 흩날렸다 돌아옴) + 아래 링크. 이글루(igloo.inc) 마지막 장면 참고
- 배포할 때 index.html·js의 ?v=숫자를 새로 바꿔야 브라우저가 새 파일을 받는다
