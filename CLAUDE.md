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
- 배경 비트: js/sfx.js의 music (92BPM 킥·베이스·패드 합성, 첫 클릭/키 입력 때 시작, ♪ 버튼으로 끔)
- 마지막 물 효과: js/liquid.js SIM(떨어지는 속도 sp, 젖음 유지 .994), SHOW(색·반짝임)
