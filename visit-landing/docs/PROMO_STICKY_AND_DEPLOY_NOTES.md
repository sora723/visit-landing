# 프로모 스티키바 · Galaxy 대응 · 배포 기록

> 작성: 2026-06-15  
> 대상: `visit-landing` (Netlify + Apps Script + Google Sheet)

---

## 1. 문제 요약

### 증상 (Galaxy / Samsung Internet·Chrome)
- `stickyPromoText` (예: `마지막 2억대, 입주까지 2500 끝!`)가 **화면이 넓어도 두 줄**로 갈라짐 (`입` / `주` 중간)
- **어둡게 보기** ON 시 글자색 이상 (청록/파란 그라데이션, 가독성 저하)
- **밝게 보기** ON 시 상대적으로 정상
- iPhone / PC는 대체로 정상

### 원인
| 원인 | 설명 |
|------|------|
| Samsung DOM 텍스트 버그 | `-webkit-background-clip: text` + `-webkit-text-stroke` 조합이 `nowrap` 무시하고 한글 중간 줄바꿈 |
| SSR/hydration | `useMemo`로 모바일 판별 시 서버에서 PC(span) HTML 전송 → Galaxy에 그라데이션 span 노출 |
| 어둡게 보기 | 브라우저 강제 다크 모드가 `background-clip: text` 색상 왜곡 |
| 11:42 배포 이후 미반영 | 코드만 수정하고 `git push` 안 해서 Netlify에 반영 안 됨 |

---

## 2. 최종 구현 (현재 main)

### 모바일 (767px 이하 · Galaxy UA)
- **DOM `<span>` 텍스트 사용 안 함** (서버 UA로 span HTML 미전송)
- **애니메이션 canvas** 한 줄 렌더
  - `fillText` / `strokeText` → 줄바꿈 불가
  - 쉬머: 흰 → `#00e5ff` → 흰 (**우→좌** sweep, 2.4s)
  - 깜빡임: CSS `promo-text-blink` (1.15s)
- `color-scheme: light only` — 어둡게 보기 색 왜곡 완화

### PC (768px+)
- 기존 `<span>` + CSS 그라데이션 쉬머
- 쉬머 방향: **우→좌** (모바일과 동일)

### 핵심 파일
| 파일 | 역할 |
|------|------|
| `src/components/PromoStickyBar.tsx` | 모바일 canvas / PC span 분기 |
| `src/components/PromoStickyBarServer.tsx` | UA 감지 → `serverMobile` prop |
| `src/lib/render-promo-canvas.ts` | canvas 쉬머 애니메이션 루프 |
| `src/lib/fit-promo-text.ts` | 글자 크기 추정·sanitize |
| `src/lib/is-mobile-user-agent.ts` | Galaxy 등 UA 판별 |
| `src/app/globals.css` | `.promo-sticky-*` 스타일, keyframes |
| `src/app/layout.tsx` | `viewport.colorScheme: "light"` |

### 시트 설정
- **콘텐츠관리** → `stickyPromoText` 컬럼
- `site.json`의 `stickyPromoText`는 **미사용** (Sheet 전용)

---

## 3. 시도했던 접근 (실패/부분 성공)

1. CSS `nowrap` + `calc` font-size → Galaxy 두 줄 유지
2. WORD JOINER (`U+2060`) → 효과 없음
3. Android 전용 CSS (gradient 제거, 흰 글자+stroke) → span 자체가 문제
4. canvas `measureText` fit → span이 DOM에 남으면 무의미
5. **정적 PNG img** → 한 줄 성공, **쉬머 애니메이션 사라짐**
6. **애니메이션 canvas** → 한 줄 + 쉬머 복구 ✅

---

## 4. 같은 세션의 기타 작업 (커밋 `b6ce031`)

### 도메인 → siteCode (Sheet 기반)
- `apps-script/SiteDomainService.gs` — `현장관리.domain` 컬럼
- `src/lib/fetch-domain-site-code-map.ts` (60s cache)
- `middleware.ts`, `resolve-site-code.ts` 우선순위: `?siteCode=` → sheet domain → cookie → env → L001

### SEO (도메인별)
- `src/lib/site-seo-metadata.ts`, `site-request-url.ts`
- `src/app/robots.ts`, `sitemap.ts` — hostname 동적
- `SiteConfig.seo` (sheet `extendedData.seo`)

### Footer / 타이틀
- `footerData` JSON 컬럼 (Apps Script)
- `src/lib/site-page-title.ts` — `siteName` 기반 title
- `CtaSection` → `SiteFooter` copyright: `© {year} All rights reserved. - 다비드 제작`

---

## 5. 배포 커밋 타임라인

| 커밋 | 내용 |
|------|------|
| `735fb2f` | 11:42 전후 마지막 배포 (footerData 등) |
| `b6ce031` | Galaxy PNG + domain/SEO + color-scheme (**00:56 push**) |
| `692230e` | 모바일 쉬머 애니메이션 canvas 복구 |
| `f7efe61` | 쉬머 방향 반전 (좌→우 → **우→좌**) |

- 저장소: `https://github.com/sora723/visit-landing.git`
- 브랜치: `main` → Netlify 자동 배포

---

## 6. 확인 체크리스트 (Galaxy)

- [ ] Netlify Published 시간이 최신 커밋 이후인지
- [ ] 시크릿 탭 / 캐시 삭제 후 접속
- [ ] 프로모 문구 **한 줄**
- [ ] **흰 글자 + 검은 외곽선 + 청록 쉬머** (우→좌)
- [ ] 어둡게 보기 / 밝게 보기 둘 다 확인

---

## 7. 운영 메모

- **Apps Script** domain/footer 컬럼 변경 시 `setup:apps-script:push` + 재배포 필요
- **현장관리** `domain` 예: L001→`eomgung-travis.com`, L002→`wonju-hanyang.com`
- 프로모 문구 변경: Sheet `stickyPromoText` → 15초 polling (`PromoStickyBar`)

---

## 8. 알려진 제한

- Samsung **「모든 사이트 강제 반전」** 등 극단적 다크 설정은 `color-scheme`로도 완전 차단 불가할 수 있음
- PC 쉬머는 CSS `background-clip: text`, 모바일은 canvas — 미세한 색감 차이 가능
