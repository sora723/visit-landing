# VisitLanding — Apps Script 연결

코드 위치: **`visit-landing/apps-script/`** (VIDAD와 독립)

Master Sheet ID: `1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA`

URL: https://docs.google.com/spreadsheets/d/1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA/edit

---

## 자동 연결 (clasp)

### 사전 조건

1. **clasp 로그인** — `vidad.public@gmail.com`
2. **Apps Script API** — https://script.google.com/home/usersettings → 사용

```bash
cd visit-landing/apps-script
npx clasp login

cd ..
npm run setup:apps-script
```

기존 편집기 프로젝트:

```bash
npm run setup:apps-script -- --script-id YOUR_SCRIPT_ID
npm run setup:apps-script:push
```

### 자주 나는 오류

| 오류 | 해결 |
|------|------|
| `access_denied` | vidad.public@gmail.com 으로 OAuth 허용 |
| `Apps Script API` | usersettings → 사용 → 2분 후 재실행 |
| `.clasp.json 없음` | `--script-id` 또는 full setup |

---

## API (3개)

| action | 용도 |
|--------|------|
| `submit` | 접수 저장 + 현장 Spreadsheet 미러 |
| `reservations.recent` | 실시간 예약 |
| `site.provision` | 현장 Spreadsheet 생성 |

---

## 수동 연결

```bash
npm run manual:apps-script
```

Master Sheet → 확장 프로그램 → Apps Script → `visit-landing/apps-script/*.gs`

Web App 배포: 실행 **나** / 액세스 **모든 사용자**

`.env.local`:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
SHEET_SITE_CODE=L001
```

---

## Script Properties (알림톡)

| 키 | 설명 |
|----|------|
| NOTIFICATION_PROVIDER | `solapi` |
| SOLAPI_API_KEY / SECRET / SENDER_PHONE | Solapi |

---

## 검증

```bash
npm run verify:apps-script
```

편집기:

```javascript
runVisitLandingSetupVerify()
provisionSiteSpreadsheet('L001')
testVisitLandingSubmit()
```

---

## 폴더 구조

```
visit-landing/
├── apps-script/           ← 11 .gs + appsscript.json
├── config/master-sheet.json
├── scripts/setup-apps-script.mjs
└── .env.local
```

상세 파일 목록: [apps-script/README.md](../apps-script/README.md)
