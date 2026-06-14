# VisitLanding_Master — 데이터 구조

스프레드시트 이름: **VisitLanding_Master**  
탭 4개 (Master 전용)

| 탭 | 역할 | 행 단위 |
|----|------|---------|
| 현장관리 | 현장 설정·Spreadsheet ID·운영 플래그 | 1 siteCode = 1 row |
| 콘텐츠관리 | 랜딩 UI 콘텐츠 전체 | 1 siteCode = 1 row |
| 접수관리 | 방문예약 접수 로그 (전체 통합) | 1 접수 = 1 row |
| 시스템로그 | 미러/알림/프로비저닝 오류 기록 | 1 이벤트 = 1 row |

**현장별 접수**는 Master가 아닌 **독립 Google Spreadsheet** (예: `L001_접수_더블역세권`, `L002_접수_원주한양립스`).

템플릿 CSV: `sheets/VisitLanding_Master/`  
현장 Spreadsheet 설명: `sheets/site-submissions/README.md`

---

## 현장 복제 절차 (L001 → L002 → L003)

### 스크립트 (권장 — 1분 내 생성)

```bash
node scripts/create-site.mjs L004                    # siteCode 지정
node scripts/create-site.mjs                         # 다음 번호 자동
node scripts/create-site.mjs L004 "김포 한양립스"     # 현장명 함께 지정
node scripts/create-site.mjs L004 "김포 한양립스" --provision  # Spreadsheet 자동 생성
```

L001 템플릿 복사 → `현장관리` + `콘텐츠관리` CSV 행 추가.  
Google Sheet import 후 `--provision` 또는 `provisionSiteSpreadsheet('L004')`로 현장 Spreadsheet 생성.

### 수동

1. **현장관리** — 행 복사 → `siteCode` / `siteName` / `phone` / 담당자 정보 수정
2. **콘텐츠관리** — 행 복사 → Hero·혜택·이미지 URL·JSON 섹션 데이터 수정
3. **Netlify 사이트** — `SHEET_SITE_CODE=L00x` 환경변수로 배포 (사이트 1개 = 현장 1개)
4. **Apps Script** — `siteCode` 파라미터로 해당 행 조회 (향후 연동)

---

## site.json ↔ Sheet 매핑

UI 타입: `src/lib/types.ts` → `SiteConfig`  
변환: `src/lib/site-from-sheet.ts` → `buildSiteConfigFromSheet()`

| SiteConfig | Sheet 출처 |
|------------|------------|
| `siteCode` | 현장관리.siteCode |
| `siteName` | 현장관리.siteName |
| `phone` | 현장관리.phone |
| `notificationPhone` | 현장관리.notifyPhone |
| `settings.popupEnabled` | 현장관리.popupEnabled |
| `settings.liveStatusEnabled` | 현장관리.liveStatusEnabled |
| `settings.virtualReservationsEnabled` | 현장관리.virtualReservationEnabled |
| `settings.duplicateBlockMinutes` | 현장관리.duplicateBlockMinutes |
| `notificationPhone` | 현장관리.notifyPhone |
| `hero.hook` | 콘텐츠관리.heroTitle |
| `hero.sub` | 콘텐츠관리.heroSubTitle |
| `hero.benefits[0..2]` | benefit1Title/Value … benefit3Title/Value |
| `hero.image` | 콘텐츠관리.heroImage |
| `hero.visualImage` | 콘텐츠관리.heroVisualImage |
| `hero.floatingStats.today/active` | floatingTodayReservations / floatingActiveConsultations |
| `cta.texts` | 콘텐츠관리.ctaText (JSON array) |
| `mobileBar.hookText` | 콘텐츠관리.mobileHookText |
| `overview` | 콘텐츠관리.overviewData (JSON) |
| `premium` | premiumData |
| `location` | locationData |
| `futureValue` | futureData |
| `unitTypes` | unitTypesData (별칭: unitTypes, 세대안내) |
| `community` | communityData |
| `popup`, `footer`, `seo`, `liveStatus`, `reservationGuide`, `liveReservation`, `hero.highlightDuration` | 콘텐츠관리.extendedData (JSON) |

---

## JSON 컬럼 형식

### ctaText
```json
["선착순 방문예약 진행중", "홍보관 방문 시 특별혜택 제공"]
```
파이프(`|`) 구분 문자열도 지원.

### overviewData / premiumData / locationData / futureData / layoutData / communityData
`site.json` 해당 섹션과 동일 구조 JSON 문자열.

### extendedData
flat 컬럼에 없는 UI 설정 통합:
```json
{
  "popup": { "title", "completeMessage", "privacyText" },
  "liveStatus": { "title", "subtitle" },
  "reservationGuide": { "title", "steps": [...] },
  "liveReservation": { "mobileVisibleCount", "mobileRotateSeconds", "pcVisibleCount", "statusLabels" },
  "hero": { "highlightDuration", "floatingStats": { "todayLabel", "activeLabel" } },
  "cta": { "buttonText", "privacyText" },
  "footer": { ... },
  "seo": { "title", "description", "ogImage" }
}
```

---

## 현장관리 (Master)

| 컬럼 | 설명 |
|------|------|
| siteCode | L001 등 |
| siteName | 현장명 |
| submissionSpreadsheetId | 현장별 독립 Spreadsheet ID (Apps Script 조회) |
| submissionSpreadsheetName | Spreadsheet 파일명 — `{siteCode}_접수_{현장명}` |
| submissionSheetName | Spreadsheet 내 탭명 (기본: 접수관리) |
| phone | 대표번호 |
| managerName / managerPhone | 담당자 |
| notifyPhone | 알림톡 수신 번호 |
| isActive | Y/N |
| popupEnabled, liveStatusEnabled, … | 운영 플래그 |

예시:

```
L001 | 더블역세권 | 1AbCdEfGhIj... | 접수관리 | 1688-0000 | ...
L002 | 원주 한양립스 | 1XyZaBcDeFg... | 접수관리 | ...
```

---

## 접수 이중 저장 (Master + 현장별 Spreadsheet)

접수 발생 시 Apps Script (`SubmitService.gs`):

```
1. VisitLanding_Master → 접수관리 (전체 마스터)
2. siteCode → 현장관리.submissionSpreadsheetId 조회
3. SpreadsheetApp.openById(id) → submissionSheetName 탭에 미러 저장
4. 알림톡 발송
```

| siteCode | Spreadsheet 파일명 | 공유 대상 |
|----------|-------------------|-----------|
| L001 | L001_접수_더블역세권 | L001 담당자 |
| L002 | L002_접수_원주한양립스 | L002 담당자 |
| L003 | L003_접수_현장 | L003 담당자 |

### 오류 처리

현장 Spreadsheet 저장 실패 시:

- Master `접수관리` 저장 **유지**
- `시스템로그`에 `SUBMISSION_MIRROR_FAIL` 등 기록
- 클라이언트에는 **접수 성공** 반환

`submissionSpreadsheetId` 미설정 → 마스터만 저장 (스킵, 오류 아님).

### Google Spreadsheet 구성

```
VisitLanding_Master (1 파일 — 운영/본사)
├── 현장관리
├── 콘텐츠관리
├── 접수관리
└── 시스템로그

L001_접수_더블역세권 (독립 파일 — L001 담당자 공유)
└── 접수관리

송도_접수 (독립 파일 — L002)
└── 접수관리
```

현장 Spreadsheet 생성: `SiteProvisioning.gs` → `provisionSiteSpreadsheet('L004')`  
또는 `node scripts/create-site.mjs L004 "현장명" --provision` (Master Sheet에 행 존재 필요).

---

## 접수관리

| 컬럼 | 설명 |
|------|------|
| id | UUID |
| siteCode | L001 등 |
| createdAt | 접수일시 |
| name / phone | 고객 정보 |
| utmSource / utmMedium / utmCampaign | UTM |
| referer / device / ip | 유입 추적 |
| status | 접수완료 / 예약확정 / 상담예정 등 |
| memo | 운영 메모 |

---

## 코드 공급원 교체 (향후)

```
현재:  getSiteConfig() → config/site.json
향후:  getSiteConfigFromSheet(siteRow, contentRow)
       SITE_CONFIG_SOURCE=sheet
```

UI·컴포넌트 변경 없음. `src/lib/config-source.ts`만 교체.

---

## 제거된 구조 (VisitLanding 기준)

- 이미지관리 탭 → **콘텐츠관리.heroImage / heroVisualImage / *Data JSON**
- 설정관리 탭 → **현장관리 + extendedData**
- 콘텐츠 섹션별 다중 행 → **siteCode당 1행 + JSON**

기존 `vidad-platform/sheets/` (A001·다중행)는 레거시. 신규 현장은 VisitLanding_Master 사용.

---

## 검증

```bash
./scripts/verify-sheet-structure.sh
node -e "
  const { buildSiteConfigFromSheet } = require('./dist/...'); // build 후
"
```

L001 샘플: `site.json`과 동일 데이터가 `콘텐츠관리.csv` L001 행에 동기화됨.
