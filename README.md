# Mobile Block Duel — WU01

모바일·태블릿 세로 화면 전용 1인 플레이 기본판.

## 포함

- 10×20 보드, 7-bag, HOLD, NEXT 3개, 고스트, 줄 제거
- 버튼 모드 5개 입력
- 스와이프 모드
- 점수·라인·콤보
- 진동 및 보드 흔들림
- 모바일/태블릿 화면 크기에 맞춘 동적 보드 리사이즈

## 로컬 실행

```bash
bash run_mobile_preview.sh
```

브라우저: `http://localhost:8080`

## GitHub Pages 배포

GitHub CLI 로그인을 먼저 확인한다.

```bash
gh auth login
bash deploy_github_pages.sh
```

기본 공개 주소:

```text
https://gt10300407.github.io/mobile-block-duel-wu01/
```

다른 저장소 이름:

```bash
bash deploy_github_pages.sh 원하는-저장소명
```

## 테스트

```bash
npm test
```
