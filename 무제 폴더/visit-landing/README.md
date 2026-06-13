# visit-landing

**단일 분양현장 방문예약 전환형 랜딩** — VIDAD 플랫폼과 별개 프로젝트

## 특징

- 단일 현장 전용 (siteCode 라우팅 없음)
- 설정은 `config/site.json`으로 관리 (관리자 페이지 없음)
- Apps Script API는 **submit**, **reservations.recent**만 사용
- Google Sheet + Solapi 알림톡 재사용

## 빠른 시작

```bash
cd visit-landing
npm install
npm run dev
```

→ `http://localhost:3000`

API 미설정 시 데모 데이터로 동작합니다.

## 설정 변경

`config/site.json` 수정:

| 항목 | 설명 |
|------|------|
| `settings.popupEnabled` | 팝업 ON/OFF |
| `settings.liveStatusEnabled` | 실시간 현황 ON/OFF |
| `settings.virtualReservationsEnabled` | 가상 예약 ON/OFF |
| `phone` | 대표번호 |
| `notificationPhone` | 알림톡 수신번호 (Sheet 담당자번호와 일치) |
| `hero.benefits` | 혜택카드 `{ title, value }` 3개 |
| `liveReservation.*` | 모바일/PC 노출 수, 롤링 속도 |
| `mobileBar.hookText` | 모바일 하단 후킹문구 |
| `cta.*` | CTA 문구 |
| `settings.duplicateBlockMinutes` | 중복 차단 (분) |

## Apps Script 연결

Master Sheet: [VisitLanding_Master](https://docs.google.com/spreadsheets/d/1rRLKLBIyZPjw1e4a14MPzaTNBib0vTKEpHEqfQg3pyA/edit)

코드: **`visit-landing/apps-script/`** (VIDAD와 독립)

```bash
cd visit-landing/apps-script && npx clasp login
cd .. && npm run setup:apps-script
```

상세: [docs/APPS_SCRIPT_SETUP.md](docs/APPS_SCRIPT_SETUP.md) · [apps-script/README.md](apps-script/README.md)

## 환경변수

`.env.local`:

```env
APPS_SCRIPT_URL=https://script.google.com/macros/s/.../exec
SHEET_SITE_CODE=L001
```

API는 Next.js 프록시(`/api/submit`, `/api/reservations`) 경유. IP는 Netlify에서 자동 수집.

## Day 3 연동 검증

**[docs/DAY3_VERIFICATION.md](docs/DAY3_VERIFICATION.md)** — 12항목 체크리스트

```bash
./scripts/verify-integration.sh http://localhost:3000
```

## 페이지 구조

1. Popup Reservation
2. Hero (Ken Burns + 혜택카드)
3. 실시간 방문예약 현황
4. 방문예약 안내
5. 사업개요
6. 프리미엄
7. 입지환경
8. 미래가치
9. 단지배치도
10. 커뮤니티
11. CTA Reservation
12. Footer
13. Mobile Fixed CTA (전화 + 방문예약, 50:50)

## Netlify 배포

1. Base directory: `visit-landing`
2. 환경변수 설정
3. `@netlify/plugin-nextjs` 자동 적용 (`netlify.toml`)

## VIDAD 플랫폼과의 관계

| | visit-landing | vidad-platform |
|--|---------------|----------------|
| 목적 | 단일 현장 전환 | 멀티현장 플랫폼 |
| 설정 | JSON 파일 | Google Sheet |
| 라우팅 | `/` 단일 | `/[siteCode]` |
| 관리자 | 없음 | (예정) |

백엔드(Apps Script, Sheet, Solapi)만 공유합니다.

## 개발 일정 (4일)

- **Day 1** ✅ Hero, Popup, 실시간 현황, 방문예약 안내
- **Day 2** ✅ 사업개요, 프리미엄, 입지, CTA
- **Day 3** — Apps Script 연동 테스트, 완료페이지
- **Day 4** — 모바일 QA, Netlify 배포
