# 실시간 방문예약 현황 · 성능 · 배포 기록

> 작성: 2026-06-15  
> 대상: `visit-landing` (Netlify + Apps Script + Google Sheet)  
> 저장소: `https://github.com/sora723/visit-landing.git` · 브랜치 `main`

---

## 1. 세션 목표

- 첫 로딩 속도 개선
- 실시간 방문예약 현황 **기기·새로고침 간 일관성**
- 카드 **최신순 스택** (신규 prepend → 오래된 카드 숨김)
- 카드 간격 **1~10분** → 이후 **0~20분 전 랜덤 간격** 타임라인
- 최상단 카드 **NEW 골드 반짝임** 효과
- 모바일 5 / PC 10 노출 유지

---

## 2. 배포 커밋 타임라인 (2026-06-15)

| 커밋 | 시각 (KST) | 내용 |
|------|------------|------|
| `a37c206` | 11:17 | SSR Apps Script 중복 fetch 제거, 클라이언트 mount 즉시 refetch 생략, Hero preload·하단 dynamic import |
| `2181992` | 11:47 | 실시간 피드 새로고침·기기 간 불일치 수정 (결정론적 시드 기반) |
| `fc162d9` | 12:14 | 최신순 정렬 + 카드 간 1~10분 간격 |
| `fd3a813` | 12:37 | prepend 스택 + 1~10분 간격 확정 |
| `96bcbd3` | 12:59 | 최상단 카드 NEW 골드 shimmer (배지 + 카드 sweep + border glow) |
| `fabaca8` | **13:03** | 0~20분 타임라인 랜덤 분배 + 모바일 `spreadVisibleFeedItems` |
| `c7fa9c8` | 13:31 | **20분 앵커 보존** — LIVE 주입 merge 시 trim 버그 수정 (**현재 main**) |

---

## 3. 실시간 피드 아키텍처 (현재)

### 노출 수
- **모바일:** 5장 (`LIVE_FEED_MOBILE_MAX` / `site.json` `liveReservation.mobileVisibleCount`)
- **PC:** 10장 (`LIVE_FEED_PC_MAX` / `liveReservation.pcVisibleCount`)
- 스택 빌드는 PC max(10) 기준, 모바일은 `spreadVisibleFeedItems`로 0~20분 구간 균등 샘플링

### 타임라인
- **최대 20분 전** (`LIVE_FEED_MAX_MINUTES = 20`)
- 가상 카드: 시드 기반 **랜덤 간격**으로 0~20분 구간 채움 (마지막 카드 = 20분)
- **LIVE 주입:** 90~150초마다 1건 prepend (결정론적, 30분 버킷)

### 스택 동작
```
1-2-3-4-5  + 신규  →  0-1-2-3-4  + 신규  →  a-0-1-2-3
```
- `prependToFeedStack()` — 최상단 적재, max 초과 시 하단 제거 + `dismissed` 등록
- API 폴링(45초): **새 실제 접수만** prepend, 전체 재생성 없음
- tick(30초): `minutesAgo`만 갱신, 20분 초과 제외

### NEW 하이라이트
- 스택 **최상단** 카드에만 `newestKey` → NEW 배지 + `live-reservation-card-new` shimmer
- 신규 prepend 시 슬라이드 인 애니메이션 (`animateTop: true`)

---

## 4. 핵심 파일

| 파일 | 역할 |
|------|------|
| `src/lib/deterministic-live-feed.ts` | 결정론적 가상 타임라인, LIVE 주입, `buildInitialFeedStack` |
| `src/lib/live-reservation-feed.ts` | prepend/trim, `spreadVisibleFeedItems`, `findTimelineAnchorKey` |
| `src/components/LiveReservationSection.tsx` | 클라이언트 피드 상태, tick/폴링/주입 스케줄 |
| `src/components/ReservationCard.tsx` | NEW 배지, 골드 shimmer 클래스 |
| `src/app/globals.css` | `live-new-badge-shimmer`, `live-card-shimmer-sweep`, `live-card-glow` |
| `scripts/verify-deterministic-feed.ts` | 결정론·20분 앵커·스택 prepend 검증 |

---

## 5. 버그 · 수정 이력

### A. 새로고침마다 목록 변경 / 모바일·PC 불일치
- **원인:** 클라이언트 `Math.random()` 가상 접수 + 45초마다 전체 재빌드
- **해결:** `deterministic-live-feed.ts` 시드 기반, 초기만 `buildInitialFeedStack`, 이후 prepend만

### B. 1:03 배포(`fabaca8`) 후에도 1~6분만 보임
- **증상:** PC/모바일 모두 카드가 최근 몇 분대에만 몰림
- **원인:** 베이스 피드는 20분까지 채웠으나, **LIVE 주입 카드**(0~6분)를 순차 prepend하면서 **20분 앵커 카드가 trim으로 삭제**됨

```
베이스:  2, 3, 4, 6, 7, 9, 11, 13, 14, 20분  ✓
주입 후: 0, 1, 2, 3, 4, 4, 5, 6, 6, 8분      ✗
```

- **해결 (`c7fa9c8`):**
  1. `trimFeedToMax(..., { preserveTimelineAnchor: true })` — `:base:` 20분 슬롯 trim 시 유지
  2. `buildInitialFeedStack` — 주입 카드 **순차 prepend → merge + dedupe + anchor trim**

- **수정 후 예시 (현재 시각 기준):**
  - PC: `0, 2, 3, 5, 7, 8, 9, 10, 12, 20분`
  - 모바일: `0, 3, 8, 10, 20분`

---

## 6. 검증

```bash
cd visit-landing
npx --yes tsx scripts/verify-deterministic-feed.ts
npm run build
```

체크리스트:
- [ ] Netlify Published가 `c7fa9c8` 이후
- [ ] PC 맨 아래 카드 **20분 전**
- [ ] 모바일 5장이 0~20분 구간에 분산
- [ ] 최상단 NEW 골드 shimmer
- [ ] 새로고침·다른 기기에서 동일 목록(동일 시각·siteCode)

---

## 7. 사용자 선호 (운영)

- 배포는 **"네"** 확인 후 `git push origin main`
- 실시간 현황: 순서 섞기 ❌, **최신순 스택** ✅
- 모바일 5 / PC 10, 초과분 숨김 (`dismissed`)
- 카드 타임라인: **최대 20분 전**, 랜덤 간격

---

## 8. 관련 상수

```ts
LIVE_FEED_MAX_MINUTES = 20
LIVE_FEED_MOBILE_MAX = 5
LIVE_FEED_PC_MAX = 10
VIRTUAL_GAP_MIN = 1          // 인접 최소 간격(분)
FEED_BUCKET_MS = 30 * 60 * 1000
INJECT_MIN_MS = 90_000       // LIVE 주입 최소 간격
INJECT_MAX_MS = 150_000
```

---

## 9. 알려진 제한

- 20분 앵커는 **base 가상 슬롯**(`virtualSlotId`에 `:base:`) 기준. LIVE 주입만으로는 앵커 아님.
- tick으로 20분→21분 되면 앵커 자연 제거 (의도된 동작). 30분 버킷 전환·새로고침 시 재생성.
- `spreadVisibleFeedItems`는 모바일에서 중간 시간대 카드를 건너뛰므로 PC와 **동일 카드 목록은 아님** (타임라인 커버리지만 동일).
