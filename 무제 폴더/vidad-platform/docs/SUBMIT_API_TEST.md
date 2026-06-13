# submit API 테스트 가이드

> **action**: `submit`  
> **Method**: POST  
> **Content-Type**: `application/json`

---

## 요청 Body

### simple 폼 (현장관리 `폼타입=simple`)

| 필드 | 필수 | 설명 |
|------|------|------|
| action | ✅ | `submit` |
| siteCode | ✅ | hidden (프론트에서 전달) |
| name | ✅ | 성함 |
| phone | ✅ | 연락처 |
| privacyAgreed | ✅ | `true`만 허용 |
| utmSource / utmMedium / utmCampaign | | 선택 |

### full 폼 (현장관리 `폼타입=full`)

| 필드 | 필수 |
|------|------|
| 위 simple 필드 | ✅ |
| ageRange | ✅ |
| consultType | ✅ |
| reserveDate | ✅ (`YYYY-MM-DD`) |
| reserveTime | ✅ (`HH:mm`) |
| inquiry | 선택 |

---

## 성공 응답

```json
{
  "success": true,
  "data": {
    "submissionId": "uuid",
    "isDuplicate": false,
    "redirectUrl": "/complete.html?site=A001&utm_source=...",
    "notificationSent": false
  },
  "error": null
}
```

| 필드 | 설명 |
|------|------|
| notificationSent | `true` = 알림 성공, `false` = 알림 실패 (접수는 성공) |

---

## 실패 응답

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 메시지"
  }
}
```

| code | 조건 |
|------|------|
| SITE_NOT_FOUND | siteCode 없음 |
| SITE_INACTIVE | 운영상태 INACTIVE 또는 관심등록 비활성 |
| VALIDATION_ERROR | 필수값 누락·연락처 형식·미동의 |
| DUPLICATE_SUBMISSION | 2시간 내 동일 4필드 재접수 |
| INTERNAL_ERROR | 서버 오류 |

### 중복 차단 조건

아래 4개 **모두 동일** + **2시간 이내** → `DUPLICATE_SUBMISSION`

- 성함
- 연락처
- 상담유형 (simple은 빈값)
- 기타문의

**하나라도 다르면 허용**

---

## 테스트 순서

### A. Apps Script 편집기 (단위 테스트)

| 순서 | 함수 | 기대 결과 |
|------|------|-----------|
| 1 | `verifySheetStructure` | 전 탭 PASS |
| 2 | `verifySampleSite` | A001 확인 |
| 3 | `runSubmitTests` | ALL PASS |

개별 실행:

| 함수 | 기대 |
|------|------|
| `testSubmitSimpleSuccess` | 접수관리 1행 추가, success |
| `testSubmitFullSuccess` | full 필드 저장 (폼타입 임시 full) |
| `testSubmitDuplicateBlocked` | 2회째 DUPLICATE_SUBMISSION |
| `testSubmitDuplicateAllowed` | 기타문의 다르면 2회 모두 성공 |
| `testSubmitSiteNotFound` | SITE_NOT_FOUND |
| `testSubmitValidationError` | VALIDATION_ERROR |
| `testSubmitPrivacyNotAgreed` | VALIDATION_ERROR |
| `testSubmitNotificationFailureStillSuccess` | 접수 성공 (알림 실패 가능) |

### B. Web App (통합 테스트)

Web App 배포 후 POST:

```bash
curl -X POST "{WEB_APP_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "siteCode": "A001",
    "name": "홍길동",
    "phone": "01012345678",
    "privacyAgreed": true,
    "utmSource": "google"
  }'
```

| 순서 | 시나리오 | 기대 |
|------|----------|------|
| 1 | simple 정상 접수 | `success: true`, 접수관리 행 추가 |
| 2 | 동일 body 재전송 | `DUPLICATE_SUBMISSION` |
| 3 | name만 변경 | `success: true` |
| 4 | siteCode=Z999 | `SITE_NOT_FOUND` |
| 5 | privacyAgreed=false | `VALIDATION_ERROR` |

### C. 시트 확인

접수 후 **접수관리** 탭:

- 접수ID (UUID)
- 접수일시
- 현장코드 / 현장명
- 성함 / 연락처
- utm_source
- 담당자명 / 담당자번호 (스냅샷)
- 중복여부 = `N`

알림 실패 시 **_시스템로그**:

- 액션 = `NOTIFICATION_FAIL`
- provider / 수신번호 / 오류메시지 / payload 기록
- **접수관리에는 행이 존재** (접수 성공)

---

## full 폼 curl 예시

```bash
curl -X POST "{WEB_APP_URL}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit",
    "siteCode": "A001",
    "name": "김철수",
    "phone": "01087654321",
    "ageRange": "30대",
    "consultType": "방문상담",
    "reserveDate": "2026-06-15",
    "reserveTime": "14:00",
    "inquiry": "84㎡ 문의",
    "privacyAgreed": true
  }'
```

> A001 `폼타입`이 `full`이어야 합니다.

---

## 실패 케이스 요약

| # | 입력 | error.code |
|---|------|------------|
| 1 | siteCode 누락 | VALIDATION_ERROR |
| 2 | siteCode=Z999 | SITE_NOT_FOUND |
| 3 | status=INACTIVE | SITE_INACTIVE |
| 4 | name 빈값 | VALIDATION_ERROR |
| 5 | phone=123 | VALIDATION_ERROR |
| 6 | privacyAgreed=false | VALIDATION_ERROR |
| 7 | full인데 ageRange 누락 | VALIDATION_ERROR |
| 8 | 2시간 내 동일 4필드 | DUPLICATE_SUBMISSION |
| 9 | 기타문의만 다름 (full) | success (허용) |
