# VIDAD Landing — Template A

분양 홈페이지 랜딩 프론트엔드. Apps Script `site.get` / `submit` API와 연동됩니다.

## 빠른 미리보기 (데모 모드)

API 없이 샘플 데이터로 바로 확인:

```bash
cd vidad-platform/landing
python3 -m http.server 8080
```

브라우저: `http://localhost:8080/?demo=1`

## API 연동

`js/config.js`에 Web App URL 설정:

```javascript
window.VIDAD_CONFIG = {
  apiBaseUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
  demoMode: false,
  defaultSiteCode: 'A001'
};
```

또는 `config.local.js` 생성 후 `index.html`에서 로드:

```html
<script src="js/config.local.js"></script>
```

## URL 규칙

| 패턴 | 설명 |
|------|------|
| `?site=A001` | 쿼리 파라미터로 현장코드 |
| `/A001/` | 경로 기반 (배포 시 rewrite 설정) |
| `?demo=1` | 데모 데이터 강제 사용 |

## 페이지 구성

- **Hero** — 메인 비주얼 + 후킹 문구
- **사업개요** — 조감도 + 스펙
- **프리미엄** — 카드 그리드
- **입지환경** — 지도 + 항목
- **평면안내** — 타입별 탭
- **관심등록** — simple / full 폼
- **하단 고정 CTA** — 전화 / 카카오 / 관심등록

## 배포 (Cloudflare Pages 예시)

```
빌드: 없음 (정적 파일)
출력 디렉터리: vidad-platform/landing
```

`_redirects` (선택):

```
/A001  /index.html?site=A001  200
/A001/ /index.html?site=A001  200
```

## 파일 구조

```
landing/
├── index.html
├── complete.html
├── css/template-a.css
├── js/
│   ├── config.js
│   ├── api.js
│   └── app.js
└── README.md
```
