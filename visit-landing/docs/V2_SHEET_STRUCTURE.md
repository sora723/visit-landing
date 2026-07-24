# V2 시트 구조 · 컬럼 정의서 · 컴포넌트 레지스트리

> 상태: **설계안 확정** (코드·시트 탭 미반영)  
> 기준일: 2026-07-23  
> Master: VisitLanding_Master (기존 유지)

---

## 0. 확정 원칙

| 원칙 | 내용 |
|------|------|
| Master | 기존 Spreadsheet **유지**. 새로 만들지 않음 |
| V1 | `콘텐츠관리` 탭 **그대로** (V1 전용) |
| 공용 | `현장관리`, `접수관리`, `_검증로그`, `_IP차단` **공용** |
| V2 신규 탭 | **`V2_블록관리`**, **`V2_콘텐츠`** 만 |
| Draft vs Published | Draft=가변 작업본만 수정. Published=`pub-` **불변 스냅샷**(복제·보호). 포인터 단순 전환 금지 |
| 조인 | **블록 1개 = contentGroup 1개**. 범위 `siteCode` + `revisionId` |
| 콘텐츠 이미지 · OG · 파비콘 | **URL만** |
| 공통 섹션 배경 | `backgroundType`: **`none` / `color` / `image`만**. `video`는 공통 타입에서 **미지원** |
| JSON | `optionsJson` / `extraJson` 용도 제한. 일반 카피·이미지는 컬럼 |
| `customHtml` | **금지** |
| `templateId` | **seed 전용** |
| `themePreset` | 런타임 기본 토큰. 현장관리 색상·`themeVariant`가 제한적 override |
| 접수·전환·알림 | 제출 **요청·응답 계약**·V1 UX 유지. 보안·Headless 분리를 위해 **내부 코드 수정 가능** |

### pageStatus vs revision

| 개념 | 역할 |
|------|------|
| **pageStatus** | 사이트 공개 게이트 (`draft` / `published` / `paused`) |
| **publishedRevisionId** | 현재 공개 스냅샷 ID (불변 데이터 가리킴) |
| **draftRevisionId** | 편집·Preview 작업본 ID (가변) |

공개 중이어도 draftRevisionId는 병행할 수 있다.

---

## 1. Master 탭 구성

```
VisitLanding_Master
├─ 현장관리           ← 공용 + V2 메타/테마/SEO/리비전 포인터
├─ 콘텐츠관리         ← V1 전용
├─ V2_블록관리        ← V2 (revisionId 포함)
├─ V2_콘텐츠          ← V2 (revisionId 포함)
├─ 접수관리 / _검증로그 / _IP차단 / 시스템로그
```

```
rendererVersion
  ├─ v1 → 콘텐츠관리 → LandingPage(V1)
  └─ v2 → V2 블록+콘텐츠
         ├─ 공개   → publishedRevisionId (게이트: pageStatus·포인터)
         └─ preview → draftRevisionId (HMAC → cookie)
```

---

## 2. 리비전 관리 · 게시 흐름

### 2-1. Draft / Published 의미

| 종류 | 의미 | 편집 |
|------|------|------|
| **Draft** (`draftRevisionId`) | 가변 작업본 | **일반 콘텐츠 수정은 Draft 행에서만** |
| **Published** (`publishedRevisionId`) | 게시 시점 **불변 스냅샷** | **Published 데이터 수정 허용 안 함** |

**금지:** `publishedRevisionId ← draftRevisionId` 단순 포인터 전환.  
Draft 행을 그대로 공개 포인터로 쓰면, 이후 Draft 편집이 **이미 게시된 페이지에 즉시 반영**되는 위험이 있다.

### 2-2. Published revisionId 형식 · 충돌 방지

초 단위 timestamp만 사용하지 않는다.

**권장 형식:**

```
pub-{siteCode}-{YYYYMMDDHHmmssSSS}-{shortRandom}
예: pub-L010-20260723143000123-a7f2
```

| 규칙 | 내용 |
|------|------|
| 유일성 | `V2_블록관리`·`V2_콘텐츠`에 **동일 revisionId가 이미 있으면** 새 ID를 **다시 생성** |
| 접두사 | Published는 반드시 **`pub-`로 시작** (보호·정리 대상 식별) |
| Draft | `draft-{siteCode}-…` 등 `pub-`와 구분되는 체계 |

### 2-3. 게시(Publish) — Lock · 원자성

게시 함수는 Apps Script **`LockService`**를 사용한다 (현장 단위 또는 Script Lock).

**처리 순서 (불변):**

```
1. Lock 획득
2. 현재 draftRevisionId 확인
3. Draft 블록·콘텐츠 전체 검증
4. 고유 Published revisionId 생성 (§2-2, 충돌 시 재발급)
5. 블록 행 복제 (draft → 새 pub- revisionId)
6. 콘텐츠 행 복제
7. 복제 행 수·필수 데이터 재검증
8. publishedRevisionId를 **가장 마지막에** 변경
   (필요 시 pageStatus = published; draftRevisionId는 변경하지 않음)
9. 새 Published 행에 보호 범위 설정 (§2-3a)
10. 시스템로그에 게시 성공 기록
11. 공개 캐시 무효화 (Next 측은 별도)
12. Published 보관 정리 (§2-4)
13. Lock 해제
```

**중간 실패 시:**

| 조치 | 내용 |
|------|------|
| 포인터 | **기존 `publishedRevisionId` 유지** (공개 트래픽 영향 없음) |
| 롤백 데이터 | 이번에 생성된 **불완전 Published 행 삭제** |
| 보호 | 보호 범위가 생겼다면 **함께 제거** |
| 로그 | 실패 로그 (siteCode, draftRevisionId, 시도한 pub id, 사유) |
| UX | 사용자에게 **게시 실패** 결과 반환 |
| Lock | `finally`에서 해제 |

검증 실패(3단계)만으로도 Publish 중단 · 기존 공개 유지.

### 2-3a. Published 스냅샷 보호

| 규칙 | 내용 |
|------|------|
| 대상 | `revisionId`가 **`pub-`로 시작**하는 `V2_블록관리`·`V2_콘텐츠` 행 |
| 시점 | **게시 완료 후** Apps Script가 **시트 보호 범위(Protection)** 설정 |
| 수정 | 일반 콘텐츠 수정은 **`draftRevisionId` 행에서만** |
| Published 수정 | **허용하지 않음** (운영 규칙 + 보호 범위) |
| 롤백 | Published **행을 수정하지 않음**. `현장관리.publishedRevisionId` **포인터만** 변경 |
| 스냅샷 삭제 | 오래된 Published 정리 시 **연결된 보호 범위도 함께 제거** 후 행 삭제 |
| 한계 | 시트 **소유자는 보호를 해제할 수 있음**. 이는 **권한 보안이 아니라 운영 실수 방지 장치**임을 명시 |

### 2-4. Published 보관 정책 (현장별)

현장별로 **현재 Published 포함 최근 5개** Published 스냅샷 유지.

| 규칙 | 내용 |
|------|------|
| 유지 | 현재 `publishedRevisionId` + 이전 Published **최대 4개** = 합계 5 |
| 삭제 제외 | 현재 `draftRevisionId`에 속한 행 |
| 삭제 제외 | 현재 `publishedRevisionId`에 속한 행 |
| 정리 | 오래된 Published 행 삭제 전 **보호 범위 해제**, 이후 행 삭제 |
| 로그 | 게시·삭제·롤백 이력 → **시스템로그** |

### 2-5. 롤백

이전 Published `revisionId`를 `publishedRevisionId`로 **지정**만 한다.  
**Published 스냅샷 행·셀은 수정하지 않는다.** Draft도 건드리지 않는다.  
롤백 전후 시스템로그 기록. (보호 범위는 대상 스냅샷에 이미 걸려 있으면 유지)

### 2-6. Draft를 현재 Published로 초기화 (메뉴)

현재 `publishedRevisionId` 스냅샷을 **draftRevisionId 쪽으로 복제**해 Draft 내용을 맞춘다.  
Published 원본 행은 수정하지 않는다.

### 2-7. Seed (`templateId`)

1. 템플릿으로 블록·콘텐츠 초안 생성  
2. Draft `revisionId` 발급 → `draftRevisionId` 설정  
3. 런타임에 `templateId` 재병합 **없음**
---

## 3. Preview

고정 URL 비밀번호 방식 **금지**.

### 3-1. 발급 주체

**Google Sheet Apps Script 커스텀 메뉴**에서 Preview 링크 생성.

메뉴 초안 **V2 관리**:

| 메뉴 | 동작 |
|------|------|
| 현재 현장 미리보기 링크 생성 | HMAC 토큰 URL 발급 (30분) |
| Draft 게시 | §2-3 Publish |
| Published 롤백 | §2-5 |
| Draft를 현재 Published로 초기화 | §2-6 |

### 3-2. HMAC 비밀값

| 항목 | 값 |
|------|-----|
| 이름 | **`V2_PREVIEW_HMAC_SECRET`** |
| 보관 | Apps Script **Script Properties** + Netlify **Environment Variables** |
| 금지 | Google Sheet 셀, 클라이언트 번들/코드 |

Apps Script 발급과 Next `/api/preview/enter` 검증이 **동일 비밀값**을 사용해야 한다.

### 3-3. 토큰 필드

| 필드 | 설명 |
|------|------|
| `siteCode` | 대상 현장 |
| `draftRevisionId` | Preview에 쓸 Draft ID |
| `expiresAt` | 만료 (발급 + **30분**) |
| `nonce` | 재사용·추측 완화 |
| `signature` | HMAC |

### 3-4. 진입 흐름

```
1. 메뉴가 서명 토큰이 붙은 일회성 enter URL 생성
2. GET /api/preview/enter?token=…
3. 서버: HMAC·만료·siteCode·draftRevisionId 검증
4. 성공 시 HttpOnly Preview Cookie 발급
5. 토큰이 URL에 남지 않는 **깨끗한 Preview URL**로 리다이렉트
6. Preview 페이지: draftRevisionId 데이터, Cache-Control: no-cache/no-store, **noindex**
7. 실패: 403 등 (공개 published로 폴백하지 않음)
```

Preview는 **항상 draftRevisionId**.  
인증된 Preview에서는 **상세 검증 오류**를 표시할 수 있다 (공개 안전 페이지와 구분).

---

## 4. 공개 게이트 (`pageStatus` · `isActive`)

### 4-1. pageStatus 허용값

| 값 | 공개 | Preview | HTTP·기타 |
|----|------|---------|-----------|
| **draft** | **금지** → 404 또는 안전한 「준비 중」 | 허용 | **404**, **noindex** |
| **published** | `publishedRevisionId` 데이터 공개 | 허용 | 200 (정상) |
| **paused** | 점검 UI | 허용 | **503**, **noindex** |

- `pageStatus` **비어 있으면 → `draft`로 처리**  
- `pageStatus=published`이어도 **`publishedRevisionId`가 없으면 공개하지 않음** (준비 중/404 계열)  
- 기존 **`isActive`**: 최상위 **긴급 중단**. `isActive=N`이면 V2 pageStatus와 무관하게 공개 중단 (기존 운영과 동일 취지)

### 4-2. 공개 요청 판정 순서 (요지)

```
isActive == N     → 중단 (기존 정책)
pageStatus 빈값   → draft 취급
pageStatus=draft  → 404 / 준비 중, noindex
pageStatus=paused → 503 점검 UI, noindex
pageStatus=published && publishedRevisionId 없음 → 공개 금지
pageStatus=published && publishedRevisionId 있음 → 스냅샷 렌더
```

---

## 4-3. siteCode 라우팅 (V1 운영 방식 유지 · 변경하지 않음)

V2에서도 **기존 공통 siteCode 흐름을 그대로 재사용**한다.  
V2 전용 resolver·별도 환경변수·별도 도메인 정책을 **만들지 않는다**.

### 운영 방식 (현행 = 유지)

| 상황 | siteCode |
|------|-----------|
| 공용 도메인 / Netlify 기본 도메인 | `?siteCode=L000` 으로 현장 선택 |
| 현장별 도메인 등록됨 | 해당 도메인 → 현장 선택 (시트 `현장관리.domain`) |
| 도메인 없는 현장 | 공용·Netlify 도메인 + `?siteCode=` |
| 연속성 | cookie · `x-site-code` · `/complete` · 내부 API 기존과 동일 |

### 현재 코드 우선순위 (보존)

근거: `src/lib/resolve-site-code.ts`, `src/middleware.ts`, `src/lib/server-site-code.ts`

```
query → body → header → domain(시트) → cookie → env → L001
```

### V2 분기 위치 (siteCode 이후)

```
siteCode = 기존 middleware / getServerSiteCode / resolveRequestSiteCode
  → 현장관리 설정 조회
  → rendererVersion이 v1 또는 빈값 → 기존 LandingPage
  → rendererVersion이 v2 → V2 renderer
```

siteCode 해석 코드를 바꾸지 않는다. 회귀는 `npm run verify:site-code`로 고정한다.

---

## 5. 데이터 조인 · 캐시

### 5-1. 조인

| 규칙 | 내용 |
|------|------|
| 키 | `(siteCode, revisionId, contentGroup)` |
| 관계 | 블록 : contentGroup = **1:1** |
| `sectionId` | `(siteCode, revisionId)` 유일 |
| `contentGroup` | `(siteCode, revisionId)` 내 블록마다 고유 |

### 5-2. 조립

공개 → `publishedRevisionId` / Preview → `draftRevisionId`  
→ 블록 → 콘텐츠 → 검증 → document vs overlay → **법적 footer 항상**

### 5-3. 캐시 · 폴링

| 모드 | 캐시 | 폴링 |
|------|------|------|
| 공개 | 서버 **60초** | V2 설정 **15초 폴링 없음** |
| Preview | **no-cache** | — |
| liveFeed | 기존 API | **피드만** 별도 폴링 |

Sheet 실패: 마지막 정상 캐시 → 없으면 §11 안전 페이지(503).

---

## 6. 현장관리 — V2 컬럼

### 6-1. 운영 · 리비전

| 컬럼 | 형식 | 설명 | 예시 |
|------|------|------|------|
| **rendererVersion** | 문자열 | `v1` / `v2` | `v2` |
| **pageStatus** | 문자열 | `draft` / `published` / `paused` (빈값=`draft`) | `published` |
| **pageSchemaVersion** | 문자열/숫자 | 스키마 버전 | `1` |
| **publishedRevisionId** | 문자열 | 공개 스냅샷 | `pub-L010-20260723143000123-a7f2` |
| **draftRevisionId** | 문자열 | Draft 작업본 | `draft-L010-…` |
| **templateId** | 문자열 | seed 전용 | `freeform-default` |
| **themePreset** | 문자열 | 런타임 기본 토큰 | `navy-gold` |

### 6-2. 테마

`mainColor` / `subColor` / `accentColor` (재사용) + 선택 `surfaceColor` / `textColor` / `radiusPreset` / `spacingPreset`  
적용: themePreset → 현장 색상 → 블록 themeVariant

### 6-3. SEO (V2만 · 초기 범위)

| 컬럼 | 형식 |
|------|------|
| **seoTitle** | 문자열 |
| **seoDescription** | 문자열 |
| **ogImage** | **URL** |
| **faviconUrl** | **URL** |

**V1 SEO 이관은 V2 초기 개발 범위에서 제외.**  
V1은 기존 SEO 로직 유지. V2만 위 현장관리 컬럼 사용.  
V1→현장관리 SEO 통합은 **V2 안정화 이후 별도 단계**.

### 6-4. 기타 공용

`phone`, `notifyPhone`, `domain`, 전환코드, 폼 옵션, **`isActive`**(긴급 중단) 등 재사용.

---

## 7. `V2_블록관리` / `V2_콘텐츠` 컬럼

블록·콘텐츠 공통: **`revisionId` 필수**.

### `V2_블록관리` 컬럼

| 컬럼 | 형식 | 설명 |
|------|------|------|
| siteCode | 문자열 | 현장 코드 |
| revisionId | 문자열 | Draft/Published 리비전 |
| sectionId | 문자열 | revision 내 유일 |
| sectionOrder | 숫자 | 섹션 순서 (빈 셀 → 행 순서로 fallback) |
| componentType | 문자열 | 레지스트리 타입 |
| variant | 문자열 | 타입별 허용 variant |
| contentGroup | 문자열 | 블록 1:1 콘텐츠 그룹 |
| enabled | Y/N | |
| desktopVisible | Y/N | |
| mobileVisible | Y/N | |
| **backgroundType** | `none` \| `color` \| `image` | 공통 배경 모드 (`video` 미지원) |
| **backgroundColor** | HEX | `backgroundType=color`일 때만 사용 |
| **backgroundPc** | URL | `backgroundType=image`일 때 PC 배경 |
| **backgroundMobile** | URL | `backgroundType=image`일 때 모바일 배경 |
| themeVariant | 문자열 | |
| paddingPreset | 문자열 | |
| animationPreset | 문자열 | |
| optionsJson | JSON | 레지스트리 `allowedOptionKeys`만 |

**배경 규칙:**

| backgroundType | 사용 필드 | 나머지 |
|----------------|-----------|--------|
| `none` | (없음) | `backgroundColor` / `backgroundPc` / `backgroundMobile` **무시** |
| `color` | **`backgroundColor`** (HEX) | 이미지 URL 필드 무시 |
| `image` | **`backgroundPc`** / **`backgroundMobile`** (URL) | `backgroundColor` 무시 |

콘텐츠: `siteCode`, `revisionId`, `contentGroup`, `itemId`, `itemOrder`, `role`, 카피·**URL 이미지**·`videoUrl`·action·`extraJson`·`enabled`

---

## 8. Overlay · Popup 제어

| 타입 | 영역 | 페이지당 | 제어 |
|------|------|----------|------|
| `stickyPromo` | overlay | ≤1 | 블록 `enabled` |
| `popup` | overlay | ≤1 | 블록 **`enabled`만** |

- **V1**: 기존 `popupReservationEnabled` 계속 사용  
- **V2**: `popupReservationEnabled`와 **연동하지 않음**. 이중 AND **없음**  
- Overlay 오류 → **해당 overlay만 제외**  
- `footerInfo` 없어도 **시스템 법적 footer 항상 출력**

---

## 9. 검증 실패 정책

시스템로그: `siteCode`, `revisionId`, `sectionId`(+ 게시/삭제 이력).

| 상황 | 처리 |
|------|------|
| 잘못된 콘텐츠 아이템 | 아이템만 제외 |
| 필수 누락 블록 | 블록만 제외 |
| 잘못된 variant | 기본 variant |
| 알 수 없는 componentType | 블록 제외 |
| optionsJson 오류 | 기본 옵션 |
| 중복 sectionId/contentGroup | 후순위 블록 제외 |
| overlay 2개 이상 | 첫 유효 1개만 |
| 미지원 pageSchemaVersion | §11 안전 페이지 (503) |
| 유효 document 블록 0개 | §11 (503) |
| Sheet 조회 실패 | 마지막 캐시 → 없으면 §11 (503) |

게시 전 Draft **전체 검증** 실패 시 Publish 중단 · 기존 공개 유지.

**게시 중(복제·재검증) 실패:** §2-3 중간 실패 — 불완전 `pub-` 행·보호 제거, `publishedRevisionId` 불변, 실패 로그·사용자 반환.

---

## 10. componentType 레지스트리

`customHtml` **금지**.

### 10-1. 공통 backgroundType

허용: **`none` | `color` | `image`만**.  
**`backgroundType=video` 초기 미지원.**

### 10-2. 영상은 variant로만

| componentType | variant | 용도 |
|---------------|---------|------|
| `hero` | **`video`** | 히어로 영상 배경 |
| `media` | **`background-video`** | 미디어 섹션 영상 배경 |

영상 variant **필수**:

- `muted`, `autoplay`, `loop`, `playsinline`
- **poster** 이미지 (URL)
- **모바일 fallback** 이미지 (URL)
- 영상 실패 시 **이미지 fallback**

### 10-3. Overlay

#### `stickyPromo` — overlay, ≤1, variant `default`|`compact`, roles root/cta

#### `popup` — overlay, ≤1, variant `image`|`form`|`imageForm`  
제어: **`enabled`만** (V1 `popupReservationEnabled` 비연동)

### 10-4. Document (요약)

| type | 기본 variant | 기타 |
|------|--------------|------|
| hero | fullBleed | + **`video`** (영상 필수조건 §10-2) |
| notice | banner | |
| liveFeed | default | reservations API 폴링 |
| richText | left | 제한 Markdown만 (script/iframe/style 금지) |
| featureCards | grid3 | |
| media | single | + **`background-video`**, gallery, video(콘텐츠 영상) |
| location | mapImage | |
| form | card | 제출 계약 유지 |
| ctaBand | dark | |
| footerInfo | default | 법적 footer와 별개 |

---

## 11. 안전 오류 · 게이트 UI

공개 오류 화면은 **기술 세부 비표시**.

**사용 가능 데이터:** 현장명, 대표 전화번호, 전화 문의 버튼, 일반 안내 문구.

| 상황 | HTTP | 기타 |
|------|------|------|
| draft 공개 접속 | **404** | noindex |
| paused | **503** | 점검 UI, noindex |
| Sheet 실패 (캐시 없음) | **503** | |
| 미지원 Schema | **503** | |
| 유효 블록 0개 | **503** | |

안전 오류(및 draft/paused 공개 대체 화면)에서 **실행하지 않음:**

- 광고 전환  
- 예약 폼  
- Live Feed  
- Popup  
- Sticky Promo  

Preview(인증): 상세 검증 오류 표시 **가능**.

---

## 12. SEO 마이그레이션

| 단계 | 내용 |
|------|------|
| **V2 초기** | V2만 현장관리 `seoTitle` / `seoDescription` / `ogImage` / `faviconUrl` |
| **V1** | 기존 SEO 로직 **유지** (이관 없음) |
| **이후** | V2 운영 안정화 후 V1 SEO 이관 **별도 단계** |

---

## 13. V1 경계 · 백엔드

| 영역 | 정책 |
|------|------|
| 콘텐츠 | V1 탭 / V2 탭 분리 |
| Popup | V1=`popupReservationEnabled` / V2=`popup.enabled`만 |
| 제출 계약·V1 UX | 유지 |
| 내부 코드 | 보안·Headless·V2 연결 위해 수정 가능 |
| 시스템로그 | 검증·게시·삭제·롤백 이력 |

---

## 14. 구현 불변조건 (게시 안전)

구현 시 다음을 **깨면 안 된다.**

1. Draft 포인터를 Published로 **그대로 올리지 않는다** (반드시 `pub-` 스냅샷 복제).  
2. `publishedRevisionId` 변경은 **복제·재검증 성공 후 마지막**에만.  
3. 게시·정리·롤백은 **`LockService`** 하에서 (동시 게시 경합 방지).  
4. `pub-` 행은 게시 후 **보호 범위** + 운영상 **수정 금지**. 수정은 Draft만.  
5. 롤백·공개 전환은 **포인터만** 변경. Published 셀 편집 없음.  
6. Published ID는 `pub-…-SSS-shortRandom`, **충돌 시 재발급**.  
7. 실패 시 **기존 공개 유지** + 불완전 `pub-` 행·보호 **정리**.  
8. 오래된 Published 삭제 시 **보호 해제 → 행 삭제** 순서.  
9. 보호는 **실수 방지**이지 ACL 보안이 아님 (소유자 해제 가능).

---

## 15. 구현 단계

| 단계 | 내용 |
|------|------|
| 1 | Sheet 컬럼·`V2_*` 탭 (문서 기준). **siteCode 라우팅은 변경하지 않음** |
| 2 | 페이지 진입: 기존 siteCode 확정 → 현장관리 → `rendererVersion` 분기 (v1 LandingPage / v2 renderer) |
| 3 | 읽기 API + 공개 게이트(pageStatus/isActive) + 60s 캐시 |
| 4 | 레지스트리·검증·시스템로그 |
| 5 | 렌더러 (document/overlay/법적 footer/영상 variant) |
| 6 | Preview: 메뉴 발급 + `/api/preview/enter` + cookie + noindex |
| 7 | Publish: **Lock** → 검증 → 고유 pub ID → 복제 → 재검증 → **마지막에 포인터** → **보호** → 5개 정리(보호 해제 포함) |
| 8 | 롤백(포인터만)·Draft←Published 초기화 메뉴 |
| 9 | Seed (`templateId`) |
| 10 | Form Headless 연결 |
| 11 | 안전 오류 페이지 · 게시 실패·경합 QA |

---

## 16. 미결 사항

**없음.**

구현 전 외부 운영값: `V2_PREVIEW_HMAC_SECRET`(Script Properties + Netlify), `APPS_SCRIPT_URL`, Master/스크립트 ID, Preview origin.

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2026-07-21 | 초안 |
| 2026-07-23 | 배경 color\|image, URL 전용 메타 |
| 2026-07-23 | 리비전·preview·overlay·검증·캐시 초안 |
| 2026-07-23 | Published=스냅샷 복제, 5개 보관, Preview 메뉴, pageStatus, popup, 영상 variant, 안전 페이지, V1 SEO 제외 |
| 2026-07-23 | **게시 안전**: pub- 보호 범위, LockService 원자성, ID에 ms+random·충돌 재발급, 실패 시 불완전 행 정리, §14 불변조건 |
| 2026-07-23 | **siteCode**: V1 운영 라우팅 유지. domain-first 폐기. rendererVersion만 분기. `verify:site-code` 회귀 |
