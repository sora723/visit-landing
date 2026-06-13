# VisitLanding Apps Script

VisitLanding_Master 전용 백엔드. **VIDAD 플랫폼과 독립** 운영.

## API (Web App)

| action | 메서드 | 용도 |
|--------|--------|------|
| `submit` | POST | 접수 저장 |
| `reservations.recent` | GET | 실시간 예약 |
| `site.provision` | GET/POST | 현장 Spreadsheet 생성 |

## 파일 (11개)

```
Main.gs
SheetUtils.gs
SubmitService.gs
ReservationsService.gs
NotificationService.gs
NotificationProviderSolapi.gs
NotificationProviderBizm.gs
NotificationProviderNhn.gs
SiteProvisioning.gs
VisitLandingSetupVerify.gs
VisitLandingSubmitTest.gs
appsscript.json
```

## 배포

```bash
cd visit-landing
npm run setup:apps-script          # create + push + deploy
npm run setup:apps-script:push     # push + deploy
npm run setup:apps-script -- --script-id YOUR_SCRIPT_ID
```

## 편집기 검증

```javascript
runVisitLandingSetupVerify()
provisionSiteSpreadsheet('L001')
testVisitLandingSubmit()
```

## Script Properties

| 키 | 설명 |
|----|------|
| NOTIFICATION_PROVIDER | `solapi` (기본) |
| SOLAPI_API_KEY | API Key |
| SOLAPI_API_SECRET | API Secret |
| SOLAPI_SENDER_PHONE | 발신번호 |
| SOLAPI_PF_ID | 카카오 채널 PF ID |
| SOLAPI_TEMPLATE_ID_SUBMISSION | 접수 알림톡 템플릿 ID (`config/notification.json` 참고) |

**콘텐츠관리 컬럼 (현장별 예약 폼)**

| 컬럼 | 예시 |
|------|------|
| unitTypeOptions | `84A\|84B\|84C` |
| visitDateDays | `30` (비우면 30일) |
| visitDateOptions | `2026-06-15\|2026-06-20` (지정 시 visitDateDays 대신) |
| unitTypeEnabled | `Y` / `N` — 관심평형 필드 노출 |
| visitDateEnabled | `Y` / `N` — 방문예약 일자 필드 노출 |

**현장별 예시**

| siteCode | unitTypeEnabled | visitDateEnabled | 노출 필드 |
|----------|-----------------|------------------|-----------|
| L001 | Y | Y | 성함, 연락처, 관심평형, 방문예약 일자 |
| L002 | N | N | 성함, 연락처 |
| L003 | N | Y | 성함, 연락처, 방문예약 일자 |

최초 1회: Apps Script 편집기 → `ensureReservationFormColumns()` 실행

Master Sheet ID: `visit-landing/config/master-sheet.json`
