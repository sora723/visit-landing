# Performance Optimization Report (2026-06-15)

## 적용 변경

### 1. `/api/site-content` 캐싱
- **HTTP:** `Cache-Control: private, no-store` — Netlify Durable/Edge가 `siteCode` 쿼리를 vary에 넣지 않아 현장별 stickyPromo/콘텐츠가 교차 오염되던 문제 방지
- **헤더:** `CDN-Cache-Control: no-store`, `Netlify-Vary: query=siteCode`
- **서버 메모리:** `site-live-config-cache.ts` — siteCode별 60초 TTL (유지)
- **클라이언트:** `ConfigProvider`, `PromoStickyBar` — `cache: "no-store"` + 응답 `siteCode` 일치 검증
- **503/에러:** `no-store` 유지

### 2. `/api/submit` 캐싱 금지
- 모든 응답에 `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`
- Apps Script POST는 기존 `cache: "no-store"` 유지

### 3. 이미지
| 영역 | 변경 |
|------|------|
| Hero | `<picture>` + `fetchPriority="high"` + `loading="eager"` (JS viewport 대기 없음) |
| 섹션 | `ResponsiveImg` 기본 `loading="lazy"`, `decoding="async"` |
| Drive URL | 용도별 thumbnail (`hero 1920/960`, `popup 1280/720`, `section 1200`) |
| Fallback | 로드 실패 시 더 작은 Drive thumbnail → SVG placeholder |

### 4. 팝업 이미지
- `extendedData.popup.image1Mobile` / `image1Pc` / `image2Mobile` / `image2Pc` 지원
- 모바일·PC 각각 최적화 URL + `loading="lazy"` (팝업 visible 후 로드)
- Sheet `popupImage1`/`popupImage2`는 PC fallback

### 5. 번들 / 렌더
- `Sections.tsx`: `whileInView` motion.article 3곳 → 일반 `<article>` (framer-motion 스크롤 observer 제거)
- Location 탭 전환: `motion.div` → CSS `location-tab-in`
- **빌드 크기:** `/` 68.3 kB (이전 ~67.8 kB), First Load JS 171 kB — 큰 변화 없음 (framer-motion은 팝업·히어로 CTA에 잔존)

---

## 빌드 Route Size (`npm run build`)

| Route | Size | First Load JS |
|-------|------|---------------|
| `/` | 68.3 kB | 171 kB |
| `/api/site-content` | 799 B | 103 kB |
| `/api/submit` | 133 B | 103 kB |
| Middleware | 34.6 kB | — |

---

## 병목 분석 (코드 기준)

| 항목 | 이전 | 개선 |
|------|------|------|
| **TTFB** | page + layout + API 각각 Apps Script 호출 | 60s 메모리 캐시 + CDN s-maxage |
| **LCP** | Hero `useIsMobile()` 후 img src | `<picture>` 즉시 로드 + priority |
| **TBT** | 다수 `whileInView` IntersectionObserver | 섹션 카드 정적 렌더 |
| **이미지 용량** | Drive 원본/큰 sz | preset별 w960~1920 thumbnail |
| **API** | 매 요청 `no-store` | site-content 60s edge cache |

### Lighthouse 실측 (로컬)
배포 전 로컬 `next start` + Chrome Lighthouse 권장. 스모크 테스트:

```bash
npm run build && npm run start
node scripts/verify-performance.mjs http://localhost:3000
```

---

## 운영 체크리스트

- [ ] Netlify 배포 후 `/api/site-content` 응답 헤더에 `s-maxage=60` 확인
- [ ] Galaxy/Chrome Lighthouse — LCP Hero, TBT 개선 확인
- [ ] 팝업 `extendedData.popup.image1Mobile` / `image1Pc` 시트 입력 (선택)

---

## 주요 파일

- `src/lib/site-live-config-cache.ts`
- `src/lib/api-cache-headers.ts`
- `src/app/api/site-content/route.ts`
- `src/app/api/submit/route.ts`
- `src/lib/image-url.ts`
- `src/lib/popup-image.ts`
- `src/components/ResponsiveImg.tsx`
- `src/components/HeroSection.tsx`
- `scripts/verify-performance.mjs`
