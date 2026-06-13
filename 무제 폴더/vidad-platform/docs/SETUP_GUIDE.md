# VIDAD MVP v1.0 — 1~3단계 설정 및 테스트 가이드

> **현재 완료 범위**: Sheet 샘플 · Apps Script · `site.get` API  
> **미구현**: submit · admin API · 랜딩/관리자 프론트

---

## 사전 준비

- Google 계정
- [clasp](https://github.com/google/clasp) (선택, 로컬 push용): `npm install -g @google/clasp`
- Node.js (clasp 사용 시)

---

## 1단계: Google Sheet 생성

### 1-1. 스프레드시트 생성

1. [Google Sheets](https://sheets.google.com) → **새 스프레드시트**
2. 이름: `VIDAD_Master`
3. 기본 시트 `Sheet1` 삭제 후 탭 4개 생성:
  - `현장관리`
  - `콘텐츠관리`
  - `접수관리`
  - `_시스템로그`

### 1-2. CSV 가져오기

각 탭에서 **파일 → 가져오기 → 업로드** 후 해당 CSV 선택:


| 탭      | CSV 파일                             |
| ------ | ---------------------------------- |
| 현장관리   | `vidad-platform/sheets/현장관리.csv`   |
| 콘텐츠관리  | `vidad-platform/sheets/콘텐츠관리.csv`  |
| 접수관리   | `vidad-platform/sheets/접수관리.csv`   |
| _시스템로그 | `vidad-platform/sheets/_시스템로그.csv` |


가져오기 옵션: **현재 시트 바꾸기**, 구분자 **쉼표**

> ⚠️ 1행 헤더명이 설계서와 **완전히 일치**해야 합니다. 열 순서는 자유입니다.

### 1-3. 스프레드시트 ID 메모

URL에서 ID 복사:

```
https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
```

---

## 1단계: Google Drive 이미지 폴더

### 2-1. 폴더 구조 생성

Google Drive에 아래 구조 생성:

```
VIDAD/
└── assets/
    └── A001/
        ├── logo.png
        ├── main-visual.jpg      ← 필수
        ├── overview.jpg
        ├── location-map.jpg
        ├── premium-01.jpg
        ├── premium-02.jpg
        ├── floorplan-01.jpg
        ├── floorplan-02.jpg
        └── og-image.jpg
```

### 2-2. 이미지 준비

- 실제 분양 이미지가 없으면 **아무 JPG/PNG**로 파일명만 맞춰 업로드
- `main-visual.jpg`, `floorplan-01.jpg`, `floorplan-02.jpg`는 **필수** (site.get 검증)

### 2-3. 공개 권한 (중요)

`A001` 폴더 또는 상위 `VIDAD` 폴더:

1. 우클릭 → **공유**
2. **일반 액세스: 링크가 있는 모든 사용자 → 뷰어**
3. 저장

---

## 2단계: Apps Script 배포

### 방법 A — clasp (권장)

```bash
cd "vidad-platform/scripts/apps-script"
clasp login
clasp create --type sheets --title "VIDAD API" --parentId YOUR_SPREADSHEET_ID
```

또는 기존 프로젝트 연결:

```bash
cp .clasp.json.example .clasp.json
# .clasp.json에 scriptId 입력
clasp push
```

### 방법 B — 수동 복사

1. `VIDAD_Master` 스프레드시트 → **확장 프로그램 → Apps Script**
2. `vidad-platform/scripts/apps-script/` 내 `.gs` 파일 내용을 각각 붙여넣기:
  - Main.gs
  - SheetUtils.gs
  - DriveUtils.gs
  - SiteService.gs
  - SubmitService.gs
  - AdminService.gs
   - NotificationService.gs
   - NotificationProviderSolapi.gs
   - NotificationProviderBizm.gs
   - NotificationProviderNhn.gs
  - SetupVerify.gs
3. `appsscript.json` 설정은 프로젝트 설정에서 timezone `Asia/Seoul` 확인

---

## 3단계: site.get 테스트

### 3-1. Apps Script 편집기 내 테스트 (이미지·시트 확인)

실행 순서:


| 순서  | 함수                     | 기대 결과                          |
| --- | ---------------------- | ------------------------------ |
| 1   | `verifySheetStructure` | 모든 탭 `[OK]`                    |
| 2   | `verifySampleSite`     | `[OK] A001 현장: 더블역세권`          |
| 3   | `testSiteGet`          | JSON 로그 + `비공개 필드 노출 검사: PASS` |


실행: 함수 선택 → **실행** → 최초 1회 권한 승인 필요

**실패 시 체크리스트**


| 오류             | 해결                                         |
| -------------- | ------------------------------------------ |
| 시트를 찾을 수 없습니다  | 탭 이름 한글 정확히 일치 확인                          |
| Drive 루트 폴더 없음 | Drive에 `VIDAD` 폴더 생성                       |
| assets 폴더 없음   | `VIDAD/assets/` 생성                         |
| 현장 이미지 폴더 없음   | `VIDAD/assets/A001/` 생성                    |
| 히어로 이미지 파일 없음  | `main-visual.jpg` 업로드                      |
| 평면 이미지 없음      | `floorplan-01.jpg`, `floorplan-02.jpg` 업로드 |


### 3-2. Web App 배포

1. Apps Script → **배포 → 새 배포**
2. 유형: **웹 앱**
3. 실행 계정: **나**
4. 액세스 권한: **모든 사용자** (익명 포함)
5. 배포 → **웹 앱 URL** 복사

```
https://script.google.com/macros/s/XXXX/exec
```

### 3-3. 브라우저/curl 테스트

```
{WEB_APP_URL}?action=site.get&siteCode=A001
```

**성공 응답 예시**

```json
{
  "success": true,
  "data": {
    "schemaVersion": "1.0",
    "siteCode": "A001",
    "meta": { "siteName": "더블역세권", "status": "ACTIVE", ... },
    "hero": { "type": "image", "image": "https://drive.google.com/uc?export=view&id=...", ... },
    "premium": [ ... ],
    ...
  },
  "error": null
}
```

**확인 항목**

- [ ] `success: true`
- [ ] `hero.image`에 Drive URL 포함
- [ ] `premium[].image` URL 포함
- [ ] `floorplan[].image` URL 포함
- [ ] 응답에 `01012345678`(담당자번호) **없음**
- [ ] 응답에 `카카오상담링크` URL **없음**
- [ ] `managerName`, `managerPhone` 키 **없음**

**존재하지 않는 현장**

```
{WEB_APP_URL}?action=site.get&siteCode=Z999
```

```json
{
  "success": false,
  "error": { "code": "SITE_NOT_FOUND", ... }
}
```

### 3-4. 캐시 확인

- 동일 siteCode 재요청 시 3분간 CacheService 사용
- 시트 수정 후 즉시 반영 필요 시 Apps Script 편집기에서 `clearSiteCache_('A001')` 실행  
(또는 3분 대기)

---

## Script Properties

Apps Script → **프로젝트 설정 → 스크립트 속성**

### 공통

| 키 | 설명 | 기본값 |
|----|------|--------|
| DRIVE_ROOT_NAME | Drive 루트 폴더명 | `VIDAD` |
| NOTIFICATION_PROVIDER | 알림 Provider ID | `solapi` |

### Solapi Provider (기본)

| 키 | 필수 | 설명 |
|----|------|------|
| SOLAPI_API_KEY | ✅ | Solapi API Key |
| SOLAPI_API_SECRET | ✅ | Solapi API Secret |
| SOLAPI_SENDER_PHONE | ✅ | 발신 번호 |
| SOLAPI_PF_ID | | 알림톡 채널 PF ID |
| SOLAPI_TEMPLATE_ID_SUBMISSION | | 접수 알림 템플릿 ID |
| SOLAPI_TEMPLATE_ID_TEST | | 테스트 알림 템플릿 ID |

> PF ID + 템플릿 ID가 없으면 **SMS/LMS 텍스트**로 발송됩니다.

### Provider 교체 (향후)

| NOTIFICATION_PROVIDER | 상태 |
|-----------------------|------|
| `solapi` | ✅ 구현됨 (기본) |
| `bizm` | ⬜ stub |
| `nhn` | ⬜ stub |

### 알림 모듈 테스트 (편집기)

| 함수 | 설명 |
|------|------|
| `testNotificationMessagePreview` | 발송 없이 메시지 본문 확인 |
| `testNotificationFailureLog` | 알림 실패 로그 `_시스템로그` 기록 테스트 |
| `testNotificationProvider` | 실제 테스트 알림 발송 (SOLAPI 설정 필요) |

### _시스템로그 — 알림 실패 기록

알림 발송 실패 시 아래 컬럼이 기록됩니다. **접수 성공 여부와 무관**합니다.

| 컬럼 | 설명 |
|------|------|
| 발생일시 | 실패 시각 |
| 액션 | `NOTIFICATION_FAIL` |
| 현장코드 | siteCode |
| provider | solapi / bizm / nhn |
| 수신번호 | 담당자 수신번호 |
| 오류메시지 | Provider 오류 내용 |
| payload | 발송 요청 JSON |
| 메시지 | 일반 로그용 (실패 시 비움) |

> 기존 `_시스템로그` 탭이 있다면 헤더를 위 컬럼으로 **교체**하거나 `sheets/_시스템로그.csv`를 다시 가져오세요.

---

## 파일 구조 요약

```
vidad-platform/
├── docs/SETUP_GUIDE.md          ← 이 문서
├── sheets/
│   ├── 현장관리.csv
│   ├── 콘텐츠관리.csv
│   ├── 접수관리.csv
│   └── _시스템로그.csv
└── scripts/apps-script/
    ├── Main.gs
    ├── SheetUtils.gs
    ├── DriveUtils.gs
    ├── SiteService.gs
    ├── SubmitService.gs        ← stub
    ├── AdminService.gs         ← stub
    ├── NotificationService.gs
    ├── NotificationProviderSolapi.gs
    ├── NotificationProviderBizm.gs   ← stub
    ├── NotificationProviderNhn.gs    ← stub
    ├── SetupVerify.gs
    ├── SubmitTest.gs
    └── appsscript.json
```

---

## 다음 단계 (승인 후)

1. ~~`submit` API~~ ✅ 완료 — [SUBMIT_API_TEST.md](SUBMIT_API_TEST.md) 참고
2. Admin API (auth, dashboard, customers, settings)
3. Landing 프론트 (Template A)
4. Admin 프론트

