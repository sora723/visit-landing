# Day 3 — Apps Script 연동 및 운영 검증

> **목표**: 접수 → Sheet 저장 → 알림톡 → 실시간 현황 → 완료페이지 전체 플로우 검증

---

## 사전 준비

### 1. 환경변수 (`visit-landing/.env.local`)

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
SHEET_SITE_CODE=A001
```

### 2. Google Sheet

- `sheets/*.csv` 최신 헤더로 시트 업데이트
- A001 현장 `운영상태=ACTIVE`, `관심등록사용=Y`, `폼타입=simple`
- 접수관리 탭 헤더: `유입URL`, `Referer`, `디바이스`, `IP` 포함

### 3. Apps Script

```bash
cd visit-landing/apps-script
clasp push   # 또는 수동 복사
```

- Web App 배포: **모든 사용자** 액세스
- Script Properties: Solapi 키 설정

### 4. 로컬 실행

```bash
cd visit-landing
npm run dev
```

---

## Apps Script 연동 체크리스트

| # | 항목 | 확인 방법 | PASS |
|---|------|-----------|------|
| 1 | submit 정상 저장 | 접수 후 접수관리 시트 1행 추가 | □ |
| 2 | 이름+연락처 중복차단 | 동일 정보 2회 접수 → 에러 메시지 | □ |
| 3 | 유입URL 저장 | `유입URL` 열 = 전체 URL | □ |
| 4 | UTM Source | `?utm_source=naver` 접수 후 저장 | □ |
| 5 | UTM Medium | `?utm_medium=cpc` | □ |
| 6 | UTM Campaign | `?utm_campaign=test` | □ |
| 7 | Referer | 외부 링크 유입 또는 referer 헤더 | □ |
| 8 | 디바이스 | mobile / desktop | □ |
| 9 | IP | Netlify/프록시 통해 `x-forwarded-for` 저장 | □ |
| 10 | 완료페이지 | `/complete` 이동 | □ |
| 11 | Solapi 알림톡 | 담당자 번호로 `[방문예약]` 수신 | □ |
| 12 | 실시간 현황 반영 | 접수 후 1초 내 NEW 표시 | □ |

---

## API 아키텍처

```
브라우저 → /api/submit (Next.js) → Apps Script → Google Sheet
                ↓ IP: x-forwarded-for
                ↓ Solapi 알림톡

브라우저 → /api/reservations → Apps Script → 접수관리 시트
```

로컬 개발 시 IP는 `127.0.0.1` 또는 비어 있을 수 있음.  
**Netlify 배포 후** 실 IP 저장을 최종 확인하세요.

---

## 테스트 curl

### submit (직접 Apps Script)

```bash
curl -X POST "$APPS_SCRIPT_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d '{
    "action": "submit",
    "siteCode": "A001",
    "name": "테스트",
    "phone": "01099998888",
    "privacyAgreed": true,
    "sourceUrl": "https://example.com/?utm_source=naver",
    "referer": "https://google.com",
    "device": "desktop",
    "utmSource": "naver",
    "utmMedium": "cpc",
    "utmCampaign": "day3-test",
    "clientIp": "1.2.3.4"
  }'
```

### submit (Next.js 프록시 — 로컬)

```bash
curl -X POST "http://localhost:3000/api/submit" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트",
    "phone": "01099998888",
    "sourceUrl": "http://localhost:3000/?utm_source=naver",
    "referer": "https://google.com",
    "device": "desktop",
    "utmSource": "naver",
    "utmMedium": "cpc",
    "utmCampaign": "day3-test"
  }'
```

### reservations.recent

```bash
curl "http://localhost:3000/api/reservations?limit=12"
```

### 중복 차단 테스트

동일 name + phone으로 2회 연속 POST → 2회째 `DUPLICATE_SUBMISSION`

---

## 실시간 방문예약 현황 시나리오

### Case 1 — 실제 접수 0건

1. 접수관리에서 A001 행 전부 삭제 (또는 테스트 시트 사용)
2. `config/site.json` → `virtualReservationsEnabled: true`
3. 페이지 새로고침 → 가상 데이터만 노출 (isVirtual)

### Case 2 — 실제 접수 1건

1. 방문예약 1건 접수
2. 실시간 현황 **최상단 NEW** + `○○` 마스킹 이름
3. 1분 이내 "방금 전" 또는 "N분 전"

### Case 3 — 실제 10건 이상

1. curl 또는 폼으로 10건+ 접수 (이름/번호 다르게)
2. PC: 실제 12건 우선 표시
3. 가상 데이터는 부족분만 보충

---

## site.json 설정 (실시간 현황)

```json
"liveReservation": {
  "mobileVisibleCount": 3,
  "mobileRotateSeconds": 5,
  "pcVisibleCount": 12
}
```

코드 수정 없이 노출 수·롤링 속도 변경 가능.

---

## 모바ile 실기기 테스트

### iPhone (Safari)

| 항목 | 확인 |
|------|------|
| 팝업 1.5초 후 노출 | □ |
| Hero Ken Burns / 혜택카드 | □ |
| 세로 롤링 3건 / 5초 | □ |
| 하단 고정바 safe-area | □ |
| 전화걸기 (`tel:`) | □ |
| 방문예약 → CTA 스크롤 | □ |
| 완료페이지 | □ |
| 키보드 올릴 때 팝업/폼 레이아웃 | □ |

### Android (Chrome)

동일 항목 □

### UTM 테스트 URL

```
https://YOUR-DOMAIN/?utm_source=naver&utm_medium=gfa&utm_campaign=mobile-test
```

---

## Solapi 알림톡 확인

예상 메시지:

```
[방문예약]
이름 : 홍길동
연락처 : 010-1234-5678
유입경로 : naver
접수시간 : 2026-06-11 15:23
```

Script Properties:

- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_PHONE`

---

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| submit 502 | APPS_SCRIPT_URL 오류 | .env.local 확인 |
| SITE_NOT_FOUND | SHEET_SITE_CODE 불일치 | A001 현장관리 행 확인 |
| IP 비어있음 | 로컬 개발 | Netlify에서 재확인 |
| 알림 미수신 | Solapi 미설정 | Script Properties |
| 실시간 현황 안 바뀜 | 캐시 | 새로고침 / 60초 대기 |
| CORS 오류 | 직접 Apps Script 호출 | `/api/submit` 프록시 사용 (기본) |

---

## Day 3 완료 기준

- [ ] 체크리스트 12항목 전부 PASS
- [ ] Case 1~3 실시간 현황 PASS
- [ ] iPhone + Android 실기기 PASS
- [ ] Netlify 스테이징 URL에서 E2E PASS
