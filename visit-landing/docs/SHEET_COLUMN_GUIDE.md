# Google Sheet 컬럼 운영 가이드

> 대상: `visit-landing` Master Sheet  
> 탭: **콘텐츠관리**, **현장관리**  
> 작성: 2026-06-15

---

## 공통 규칙

| 형식 | 입력 방법 |
|------|-----------|
| **Y/N** | `Y` / `N` (또는 `TRUE`/`FALSE`, `1`/`0`, `YES`/`NO`) |
| **목록** | `\|` 또는 `,` 구분 — 예: `84A\|84B\|84C` |
| **JSON** | 한 셀에 JSON 문자열 (Sheets에서 `"`는 `""`로 이스케이프) |
| **색상** | HEX — `#0f1d3a` 또는 3자리 `#RGB` |
| **URL** | `https://…` 또는 `/images/…` |

`siteCode`는 두 탭을 **1:1로 연결**하는 키입니다. (예: `L001`)

데이터 흐름: Apps Script `getSiteLiveConfig()` → `/api/site-content` → UI

---

# 1. 콘텐츠관리

## 1-1. 기본 · 히어로

| 컬럼 | 형식 | 설명 | 예시 | 화면 |
|------|------|------|------|------|
| **siteCode** | 문자열 | 현장 코드 | `L001` | 전체 설정 식별 |
| **heroTitle** | 문자열 | 히어로 **메인 카피** | `25평 2억대~ 34평 3억초~` | Hero 상단 큰 제목 |
| **heroSubTitle** | 문자열 | 히어로 **서브 카피** | `구도심 · 원도심 인프라를 누리는 원주의 중심` | Hero 부제 |
| **benefit1Title** | 문자열 | 혜택카드 1 제목 | `계약금` | Hero 혜택카드 1 |
| **benefit1Value** | 문자열 | 혜택카드 1 값 | `500만원` | Hero 혜택카드 1 |
| **cardIcon1** | 아이콘 키 | 혜택카드 1 아이콘 | `money` | Hero 아이콘 |
| **benefit2Title** | 문자열 | 혜택카드 2 제목 | `입주까지` | Hero 혜택카드 2 |
| **benefit2Value** | 문자열 | 혜택카드 2 값 | `2,700만원` | Hero 혜택카드 2 |
| **cardIcon2** | 아이콘 키 | 혜택카드 2 아이콘 | `calendar` | Hero 아이콘 |
| **benefit3Title** | 문자열 | 혜택카드 3 제목 | `중도금` | Hero 혜택카드 3 |
| **benefit3Value** | 문자열 | 혜택카드 3 값 | `무이자` | Hero 혜택카드 3 |
| **cardIcon3** | 아이콘 키 | 혜택카드 3 아이콘 | `percent` | Hero 아이콘 |
| **heroImagePc** | URL | 히어로 배경 **PC** | `/images/hero-aerial.png` | Hero `<picture>` |
| **heroImageMobile** | URL | 히어로 배경 **모바일** | `/images/hero-aerial.png` | Hero `<picture>` |

### cardIcon 사용 가능 값

`money`, `percent`, `building`, `calendar`, `gift`, `diamond`, `shield`, `home`, `train`, `users`, `trophy`, `star`, `check`, `chart`, `leaf`, `coin`, `phone`, `location`, `car`, `tag`

잘못된 값 → `gift`로 대체

---

## 1-2. CTA · 모바일 훅 · 플로팅바

| 컬럼 | 형식 | 설명 | 예시 | 화면 |
|------|------|------|------|------|
| **ctaText** | JSON 배열 또는 `\|` 구분 | CTA 문구 후보 (랜덤 1개 선택) | `["선착순 방문예약 진행중","홍보관 방문 시 특별혜택"]` | 설정 저장 (UI 직접 연결 제한적) |
| **mobileHookText** | 문자열 | 모바일/데스크톱 **훅 배지** 문구 | `선착순 방문예약 진행중` | Hero 하단 배지 |
| **floatingTodayReservations** | 숫자 | “오늘 방문예약” **기본 표시 수** | `27` | Hero 플로팅바 (실제 접수와 병합) |
| **floatingActiveConsultations** | 숫자 | “실시간 상담” **기본 표시 수** | `3` | Hero 플로팅바 |
| **stickyPromoText** | 문자열 | 화면 **하단 고정 프로모** 문구 | `마지막 2억대, 입주때까지 2500 끝!` | `PromoStickyBar` (비우면 미표시) |

---

## 1-3. 섹션 JSON

각 컬럼은 **JSON 한 덩어리**입니다.

### overviewData — 사업개요

```json
{
  "title": "사업개요",
  "image": "https://example.com/overview.jpg",
  "specs": [
    { "label": "위치", "value": "강원특별자치도 원주시 반곡동 일원" },
    { "label": "규모", "value": "지하 2층 / 지상 최고 29층" },
    { "label": "세대수", "value": "12개동 / 총 1,236세대" },
    { "label": "입주예정", "value": "2027년 상반기" },
    { "label": "시공사", "value": "한양건설" }
  ]
}
```

→ `#사업개요` 섹션

### premiumData — 프리미엄

```json
{
  "title": "프리미엄 커뮤니티",
  "items": [
    {
      "title": "역세권",
      "description": "KTX 원주역 도보권 프리미엄 입지",
      "image": "https://example.com/premium1.jpg"
    }
  ]
}
```

### locationData — 입지환경

```json
{
  "title": "입지환경",
  "mapImage": "https://example.com/map.jpg",
  "items": [
    {
      "category": "교통",
      "title": "원주고속·시외버스터미널 인접",
      "description": "광역 교통망과의 접근성 우수"
    }
  ]
}
```

### futureData — 미래가치

```json
{
  "title": "미래가치",
  "items": [
    {
      "title": "혁신도시 성장",
      "description": "원주혁신도시 중심 개발로 지속적인 가치 상승",
      "image": "https://example.com/future1.jpg"
    }
  ]
}
```

### unitTypesData — 세대안내

```json
{
  "title": "세대안내",
  "items": [
    {
      "tab": "84A",
      "title": "84A 타입",
      "description": "4Bay 대형평형",
      "image": "https://example.com/84a.jpg"
    }
  ]
}
```

→ `#세대안내` 탭 UI (없으면 레거시 `layoutData` fallback)

### communityData — 커뮤니티

큰 설명 이미지(`galleryImages`)와 카드(`items`)를 **함께** 쓸 수 있습니다. 이미지는 **배열에 여러 개** 넣으면 세로로 쌓여 표시됩니다.

```json
{
  "title": "커뮤니티",
  "galleryImages": [
    {
      "image": "https://example.com/community-1.jpg",
      "alt": "커뮤니티 전경"
    },
    {
      "image": "https://example.com/community-2.jpg",
      "imagePc": "https://example.com/community-2-pc.jpg",
      "imageMobile": "https://example.com/community-2-m.jpg",
      "alt": "커뮤니티 실내"
    }
  ],
  "items": [
    {
      "title": "피트니스",
      "description": "최신 운동기구를 갖춘 프리미엄 피트니스",
      "image": "https://example.com/gym.jpg"
    },
    {
      "title": "골프연습장",
      "description": "실내 골프 연습 공간",
      "image": "https://example.com/golf.jpg"
    }
  ]
}
```

| 필드 | 용도 |
|------|------|
| **galleryImages** | 풀폭 큰 이미지. **여러 장** OK (세로 스택 + 클릭 확대) |
| **items** | 제목·설명 있는 카드 그리드. 여러 개 OK |

카드 없이 이미지만 쓰려면 `galleryImages`만 넣으면 됩니다. `image` 단일 필드는 없고, 반드시 `galleryImages: [ {...}, {...} ]` 배열로 넣습니다.

---

## 1-4. 예약 폼 옵션

| 컬럼 | 형식 | 설명 | 예시 | 화면 |
|------|------|------|------|------|
| **unitTypeOptions** | `\|` 또는 `,` | **관심평형** 드롭다운 | `84A\|84B\|84C` | 예약 폼 |
| **unitTypeEnabled** | Y/N | 관심평형 필드 노출 | `Y` | `N`이면 숨김 |
| **visitDateOptions** | 날짜 목록 | **고정 방문일** (`YYYY-MM-DD`) | `2026-06-15\|2026-06-20` | 예약 폼 (있으면 우선) |
| **visitDateDays** | 숫자 | `visitDateOptions` 없을 때 **오늘부터 N일** | `30` | 예약 폼 |
| **visitDateEnabled** | Y/N | 방문일자 필드 노출 | `Y` | `N`이면 숨김 |

---

## 1-5. 테마 색상

| 컬럼 | 형식 | 설명 | 예시 | 적용 |
|------|------|------|------|------|
| **mainColor** | HEX | 메인 네이비/배경 | `#0f1d3a` | `--color-navy` |
| **subColor** | HEX | 서브·그라데이션 | `#d7b56d` | `--color-sub` |
| **accentColor** | HEX | CTA·골드 포인트 | `#caa85c` | `--color-gold` |

---

## 1-6. CTA 홍보 이미지 · 팝업

| 컬럼 | 형식 | 설명 | 예시 | 화면 |
|------|------|------|------|------|
| **ctaPromoBg** | 문자열 | CTA 아래 홍보 섹션 배경 | `white` / `beige` / `#f8f6f2` | CTA 하단 이미지 섹션 |
| **ctaPromoImagePc** | URL | 홍보 이미지 PC | `https://…` | CTA 하단 |
| **ctaPromoImageMobile** | URL | 홍보 이미지 모바일 | `https://…` | CTA 하단 |
| **ctaPromoImage** | URL | PC/모바일 **공통** (fallback) | `https://…` | 위 둘 비었을 때 |
| **popupImage1** | URL | 방문예약 **팝업 이미지 1** | `https://…` | `ReservationPopup` |
| **popupImage2** | URL | 팝업 이미지 2 (2장 레이아웃) | `https://…` | `ReservationPopup` |

이미지 URL이 모두 비어 있으면 CTA 홍보 섹션은 **미노출**됩니다.

---

## 1-7. footerData — 푸터

**권장 형식 (신규):**

```json
{
  "items": [
    { "title": "시행사", "content": "OO시행" },
    { "title": "시공사", "content": "OO건설" },
    { "title": "대표번호", "content": "1688-0000" },
    { "title": "광고대행", "content": "다비드애드" },
    { "title": "사업자등록번호", "content": "123-45-67890" }
  ],
  "bottomText": "개인정보처리방침에 따른 수집·이용에 동의합니다."
}
```

**레거시 형식** (`extendedData.footer`와 동일)도 지원:

```json
{
  "developer": "OO시행",
  "constructor": "OO건설",
  "agency": "다비드애드",
  "businessNumber": "123-45-67890",
  "privacyPolicy": "개인정보…"
}
```

→ 페이지 하단 `SiteFooter`

---

## 1-8. extendedData — 보조 설정 (JSON)

플랫 컬럼에 없는 설정을 **한 셀**에 넣습니다. 전용 컬럼(`footerData`, `stickyPromoText` 등)이 있으면 **컬럼 우선**.

| JSON 경로 | 설명 | 예시 |
|-----------|------|------|
| `popup.title` | 팝업 제목 | `"선착순 방문예약"` |
| `popup.completeMessage` | 접수 완료 문구 | `"방문예약이 접수되었습니다.\n\n담당자가…"` |
| `popup.privacyText` | 팝업 개인정보 문구 | `"개인정보 수집 및 이용에 동의합니다.…"` |
| `seo.title` | 브라우저 탭·OG 제목 | `"원주 한양립스 \| 방문예약"` |
| `seo.description` | SEO 설명 | `"원주 한양립스 분양 — 선착순…"` |
| `seo.ogImage` | OG 이미지 URL | `https://…` |
| `seo.faviconUrl` | **브라우저 탭 파비콘** (타이틀 앞 아이콘) | `https://…/favicon-32.png` |
| `headerLogoUrl` | **상단 헤더 로고** (현장명 왼쪽) | `https://…/logo.png` |
| `liveStatus.title` | 실시간 현황 제목 | `"실시간 방문예약 현황"` |
| `liveStatus.subtitle` | 실시간 현황 부제 | `"홍보관 방문예약 접수 진행중"` |
| `liveReservation.mobileVisibleCount` | 모바일 노출 수 | `5` |
| `liveReservation.pcVisibleCount` | PC 노출 수 | `10` |
| `liveReservation.statusLabels` | 실시간 카드 상태 라벨 | `["접수완료","예약확정","상담예정"]` |
| `cta.buttonText` | 예약 버튼 문구 | `"방문예약하기"` |
| `cta.privacyText` | 폼 개인정보 문구 | `"개인정보 수집 및 이용에 동의합니다."` |
| `hero.highlightDuration` | 혜택카드 강조 시간(ms) | `3500` |
| `hero.floatingStats.todayLabel` | 플로팅바 라벨 | `"오늘 방문예약"` |
| `hero.floatingStats.activeLabel` | 플로팅바 라벨 | `"실시간 상담"` |
| `reservationGuide` | 방문예약 안내 3단계 | `{ "title": "…", "steps": […] }` (파싱만, UI 미연결) |
| `customSections[]` | 커스텀 이미지 블록 | `{ "id", "title", "image", … }` |

**extendedData 예시 (축약):**

```json
{
  "popup": {
    "title": "선착순 방문예약",
    "completeMessage": "방문예약이 접수되었습니다.\n\n담당자가 순차적으로 연락드립니다.",
    "privacyText": "개인정보 수집 및 이용에 동의합니다.\n\n수집항목 : 이름, 연락처\n이용목적 : 방문예약 및 상담안내\n보유기간 : 상담 종료 후 즉시 파기"
  },
  "seo": {
    "title": "원주 한양립스 | 방문예약",
    "description": "원주 한양립스 분양 — 선착순 방문예약 접수중",
    "ogImage": "https://example.com/og.jpg",
    "faviconUrl": "https://example.com/favicon-32.png"
  },
  "headerLogoUrl": "https://example.com/logo.png",
  "liveStatus": {
    "title": "실시간 방문예약 현황",
    "subtitle": ""
  },
  "liveReservation": {
    "mobileVisibleCount": 5,
    "pcVisibleCount": 10,
    "statusLabels": ["접수완료", "예약확정", "상담예정"]
  },
  "cta": {
    "buttonText": "방문예약하기",
    "privacyText": "개인정보 수집 및 이용에 동의합니다."
  }
}
```

---

# 2. 현장관리

## 2-1. 기본 정보

| 컬럼 | 형식 | 설명 | 예시 | 용도 |
|------|------|------|------|------|
| **siteCode** | 문자열 | 현장 코드 (PK) | `L001` | 전역 식별 |
| **siteName** | 문자열 | **현장명** | `원주 한양립스` | 헤더, 푸터, SEO, 완료 페이지 |
| **domain** | 호스트명 (복수 가능) | **커스텀 도메인** → siteCode | `eomgung-travis.com` | Netlify 도메인 접속 시 현장 자동 선택 |
| **phone** | 전화번호 | **대표번호** | `1688-0000` | 헤더·하단바 전화 버튼 |
| **managerName** | 문자열 | **개인정보 수집주체** | `원주 한양립스 분양사무소` | 개인정보 모달, 접수 시트 |
| **managerPhone** | 전화번호 | 담당자 연락처 | `01012345678` | `notifyPhone` 없을 때 알림 fallback |
| **notifyPhone** | 전화번호 | **접수 알림 수신** (Solapi) | `01012345678` | 접수 시 알림톡 (**우선 사용**) |

---

## 2-2. 접수 시트 (독립 Spreadsheet)

| 컬럼 | 형식 | 설명 | 예시 |
|------|------|------|------|
| **submissionSpreadsheetId** | Google Sheet ID | 현장별 **접수 미러** 스프레드시트 | `1G4TYbbxxzVxqcIoHLEwRVsCQQtVjNwD7Ye8KCy3vs_Q` |
| **submissionSpreadsheetName** | 문자열 | 파일명 (운영용) | `L001_접수_원주한양립스` |
| **submissionSheetName** | 문자열 | 시트 **탭 이름** | `접수관리` (기본값) |

접수 시 Master `접수관리` + 현장 독립 시트에 동시 저장됩니다.

---

## 2-3. 기능 ON/OFF

| 컬럼 | 형식 | 설명 | 예시 | 효과 |
|------|------|------|------|------|
| **popupEnabled** | Y/N | 방문예약 **팝업** | `Y` | `N` → 팝업 미표시 |
| **liveStatusEnabled** | Y/N | **실시간 방문예약 현황** | `Y` | `N` → 섹션 숨김 |
| **virtualReservationEnabled** | Y/N | **가상 접수** 피드 | `Y` | `N` → 실제 접수만 |
| **duplicateBlockMinutes** | 숫자(분) | **중복 접수 차단** | `120` | 동일 이름+연락처 재접수 차단 |
| **isActive** | Y/N | **접수 마감** | `Y` | `N` → “관심고객 접수가 마감” |

---

## 2-4. 전환 추적 (광고)

| 컬럼 | 형식 | 설명 | 예시 | 화면 |
|------|------|------|------|------|
| **metaPixelId** | 문자열 | Meta Pixel ID | `1234567890` | `/complete` 전환 |
| **metaConversionEvent** | 문자열 | Meta 이벤트명 | `Lead` (기본) | Meta `fbq('track', …)` |
| **googleConversionId** | 문자열 | Google Ads ID | `AW-123456789` | gtag 전환 |
| **googleConversionLabel** | 문자열 | Google Label | `AbCdEfGh` | gtag `send_to` |
| **naverConversionScript** | WA ID 또는 `<script>` | 네이버 전환 | `1234567` | wcslog |
| **kakaoPixelId** | 문자열 | 카카오 픽셀 ID | `1234567890` | completeRegistration |
| **전환코드** | HTML/스크립트 | 채널별 태그 **한 번에** | `<script>…</script>` | `/complete` raw HTML |

비워 두면 해당 채널 전환 태그는 **미삽입**됩니다.

---

## 2-5. 소유 확인 (Search Console 등)

| 컬럼 | 형식 | 설명 | 예시 |
|------|------|------|------|
| **metaOwnershipCode** | 문자열 | Meta 도메인 소유 확인 | `abc123…` |
| **googleOwnershipCode** | 문자열 | Google Search Console | `abc123…` |
| **naverOwnershipCode** | 문자열 | 네이버 서치어드바이저 | `abc123…` |
| **kakaoOwnershipCode** | 문자열 | 카카오 소유 확인 | `abc123…` |
| **소유확인코드** | HTML/스크립트 | meta 태그 **한 번에** | `<meta name="…" content="…">` |

→ `<head>`에 verification meta 자동 삽입

---

## 2-6. 운영 메타

| 컬럼 | 형식 | 설명 | 예시 |
|------|------|------|------|
| **createdAt** | 날짜 | 현장 등록일 | `2026-06-08` |
| **updatedAt** | 날짜 | 마지막 수정일 | `2026-06-11` |

UI에는 표시되지 않고, API 메타·운영 기록용입니다.

---

# 3. L001 샘플 요약

**콘텐츠관리:**  
히어로 카피 + 혜택 3장 + 이미지 URL + 섹션 JSON + `stickyPromoText` + 폼 옵션 + 색상 3개 + `footerData` + `extendedData`

**현장관리:**  
`L001` / `원주 한양립스` / `eomgung-travis.com` / 대표·알림번호 / 팝업·실시간·가상 `Y` / 중복 120분 / 접수 시트 ID

샘플 CSV: `sheets/VisitLanding_Master/콘텐츠관리.csv`, `현장관리.csv`

---

# 4. 자주 헷갈리는 점

1. **`notifyPhone` vs `managerPhone`** — 알림톡은 **`notifyPhone` 우선**. `managerPhone`은 비었을 때만 fallback.
2. **`stickyPromoText`** — `extendedData`가 아니라 **전용 컬럼** 사용 (15초 polling).
3. **`unitTypesData`** — 예전 `layoutData` 대신 사용. 없으면 `layoutData` fallback.
4. **`ctaText`** — 설정에는 들어가지만, 실제 노출은 주로 **`mobileHookText`**·`extendedData.cta.buttonText`.
5. **도메인** — `www.` 없이 호스트만 (`eomgung-travis.com`).
6. **파비콘·헤더 로고** — `extendedData.seo.faviconUrl`, `extendedData.headerLogoUrl` (별도 컬럼 없음). Google Drive 링크 가능.
7. **한글 헤더 별칭** — Apps Script가 지원: `heroTitle`=`히어로제목`=`메인카피`, `stickyPromoText`=`하단프로모문구` 등.

---

# 5. site.json 대응 (참고)

| Sheet (콘텐츠) | site.json |
|----------------|-----------|
| heroTitle | `hero.hook` |
| heroSubTitle | `hero.sub` |
| benefit* / cardIcon* | `hero.benefits[]` |
| heroImagePc/Mobile | `hero.imagePc` / `imageMobile` |
| mainColor/subColor/accentColor | `theme.*` |
| stickyPromoText | `stickyPromoText` |
| overviewData 등 | `overview`, `premium`, `location`, … |
| extendedData | `popup`, `seo`, `liveStatus`, `cta`, … |

| Sheet (현장) | site.json |
|--------------|-----------|
| siteName, phone, managerName | 최상위 |
| notifyPhone | `notificationPhone` |
| popupEnabled 등 | `settings.*` |

로컬 개발 기본값: `config/site.json`
