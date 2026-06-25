# L007 네이버 전환 · 설치대행 · 멀티 채널 정리

> 작성: 2026-06-25  
> 대상: visit-landing (Netlify + Apps Script + Google Sheet)  
> 현장: **L007** 신검단 로열파크시티2

---

## 1. L007 네이버 전환 설정 (시트)

| 컬럼 | L007 값 |
|------|---------|
| `naverConversionScript` | 314자, 네이버 lead HTML (아래 전문) |
| `conversionRawHtml` (전환코드) | 비어 있음 (불필요) |
| `ownershipRawHtml` | 249자, 유입 추적 (`wcs.inflow` + `wcs_do`) |
| Google / Meta / 카카오 | 없음 |
| WA ID | `s_265c62d58d16` |

### naverConversionScript 전문

```html
<!-- NAVER 신청완료(lead) SCRIPT -->
<script type="text/javascript" src="//wcs.naver.net/wcslog.js"></script>
<script type="text/javascript">
    if(window.wcs){
    if(!wcs_add) var wcs_add = {};
    wcs_add['wa'] = 's_265c62d58d16';
    var _conv = {};
    	_conv.type = 'lead';
    wcs.trans(_conv);
    }
</script>
```

### ownershipRawHtml (전 페이지 유입)

```html
<script type="text/javascript" src="//wcs.naver.net/wcslog.js"> </script>
<script type="text/javascript">
if (!wcs_add) var wcs_add={};
wcs_add["wa"] = "s_265c62d58d16";
if (!_nasa) var _nasa={};
if(window.wcs){
wcs.inflow();
wcs_do();
}
</script>
```

---

## 2. 접수 시 실행 흐름 (코드)

```
방문예약 접수 성공
  → prefersCompletePageConversion = true (naverConversionScript 있음)
  → /complete?siteCode=L007&submissionId=xxx&autoReturn=1
  → claimConversionFire(submissionId) — 최초 1회만 true
  → ① wcslog.js 순차 로드
  → ② 인라인 wcs.trans({ type: 'lead' }) — 전환 1회
  → 약 2.5초 후 랜딩 복귀
```

**랜딩 inline 전환은 사용하지 않음** — sessionStorage 선점 race로 `/complete`에서 스크립트가 비어 보이던 문제 해결.

### 관련 커밋

| 커밋 | 내용 |
|------|------|
| `f19e473` | naverConversionScript HTML 파싱·순차 로드 |
| `8230141` | 네이버 전환을 `/complete`에서 실행 (race 제거) |
| `5d4300c` | 인라인 `wcs.trans` 있을 때 `fireNaverConversion` 중복 방지 |

### 관련 파일

- `src/lib/conversion-once.ts` — `prefersCompletePageConversion()`
- `src/lib/run-conversion-tracking.ts` — 접수 후 라우팅
- `src/components/ConversionTracking.tsx` — `/complete` 전환 실행
- `src/components/NaverConversionScripts.tsx` — wcslog 순차 로드
- `src/components/ConfigProvider.tsx` — 이중 `router.push` 방지
- `src/app/complete/page.tsx` — 시트 `conversionTracking` 주입

---

## 3. 프로덕션 확인 (2026-06-25)

| 항목 | 결과 |
|------|------|
| URL | `https://david-ad.kr/?siteCode=L007` 또는 `https://smodelhouse.netlify.app/?siteCode=L007` |
| 배포 | Netlify `main` 자동 배포, 최신 `5d4300c` |
| `/complete` HTML | `wcslog.js`, `s_265c62d58d16`, `wcs.trans`, `lead` 포함 확인 |
| L007 `domain` 시트 | `null` — `?siteCode=L007` 쿼리 필요 |

### 전환 측정 안 되는 경우 (정상)

- `/complete`만 직접 접속 후 접수 없이 테스트
- 동일 `submissionId`로 새로고침 (sessionStorage 중복 차단)
- 네이버 광고 유입 없이 URL 직접 접속 (유입 attribution 제한)

### 실기기 최종 확인 (미완 ☐)

1. 네이버 광고 링크로 L007 랜딩 접속
2. 방문예약 접수 1건
3. `/complete` 잠깐 노출 확인
4. DevTools → Network → `wcslog.js` 200
5. 네이버 광고관리자 → lead 전환 반영 (수 분~수십 분 지연 가능)

---

## 4. 다른 현장 영향 (L006 등)

| 현장 | 전환 방식 | 이번 수정 영향 |
|------|----------|----------------|
| L006 | Google Ads only | **없음** — 랜딩 inline + `/complete` 완료 화면만 |
| L007 | Naver only | `/complete` 경로 + 중복 방지 |
| 네이버+구글+카카오 혼합 | 모두 `/complete`에서 1회씩 | 채널별 독립 집계, `claimConversionFire`는 접수 건당 1회 |

---

## 5. 네이버 설치대행 체크리스트 vs 우리 인프라

광고 매체(네이버 등)가 요청하는 항목은 **FTP 호스팅(카페24·가비아)** 기준이다.  
우리는 **Netlify + GitHub + Google 시트** — 항목 대부분 **해당 없음**.

| 광고사 요청 | 우리 상황 | 판단 |
|------------|----------|------|
| 서버 가용용량 확인 | Netlify 서버리스, 디스크 용량 개념 없음 | ✅ 해당 없음 |
| FTP 외부 IP 차단 확인 | FTP 없음, GitHub → Netlify 배포 | ⚠️ 구조 상이 |
| IP `103.243.200.129` 등록 | 사이트 공개, IP 차단 없음, 등록할 FTP/관리자 없음 | ✅ 접속 차단 없음 |
| FTP·관리자 수정권한 | FTP·cPanel 없음 | ⚠️ 대행사 FTP 방식 불가 |

### 주의: 중복 설치 금지

전환·유입 스크립트는 **시트 + 코드로 이미 설치 완료**.  
대행사가 FTP로 동일 스크립트를 추가하면 **이중 전환** 위험.

### 대행사 회신 템플릿

> 본 사이트는 FTP 호스팅이 아닌 **Netlify(클라우드) + GitHub 배포** 방식입니다.  
> FTP·서버 관리자 패널이 없어 설치대행용 FTP 계정 제공은 불가합니다.  
>  
> 네이버 전환 스크립트는 **이미 설치 완료**되었습니다.  
> - 유입: `wcs.inflow()` (전 페이지)  
> - 전환: `wcs.trans(lead)` (방문예약 완료 페이지)  
> - WA: `s_265c62d58d16`  
>  
> 확인 URL: `https://david-ad.kr/?siteCode=L007`  
> 접수 후 `/complete` 페이지에서 `wcslog.js` 및 전환 스크립트 동작 확인 부탁드립니다.  
> **추가 FTP 설치는 하지 말아 주세요** (중복 전환 위험).

### 권장 후속

- L007 전용 도메인을 시트 `domain`에 등록하면 광고 URL 단순화 가능
- Google 시트 편집 권한은 내부만 유지 (대행사 시트 수정 시 코드 덮어쓰기 위험)
- 설치대행은 **「설치 완료 · 동작 검증만」** 으로 신청

---

## 6. API·검증 명령

```bash
# L007 전환 설정 확인 (Apps Script)
curl -s "APPS_SCRIPT_URL?action=site.config&siteCode=L007" | jq '.data.conversionTracking'

# 프로덕션 /complete 스크립트 포함 여부
curl -sL "https://david-ad.kr/complete?siteCode=L007&submissionId=test" | rg "wcslog|s_265c62d58d16|wcs.trans"

# 빌드
cd visit-landing && npm run build
```

---

## 7. 이전에 해결한 버그 요약

1. **랜딩 inline이 sessionStorage 선점** → `/complete`에서 `canFire=false`, Network에 `wcslog.js` 없음  
   → 네이버는 `/complete`에서만 전환 (`8230141`)

2. **`<script>` 태그만 제거** → `wcslog.js` 미로드  
   → `parseRawHtmlScripts`로 외부·인라인 순차 로드 (`f19e473`)

3. **인라인 `wcs.trans` + `fireNaverConversion` 이중 호출**  
   → 인라인에 trans 있으면 폴백 스킵 (`5d4300c`)
