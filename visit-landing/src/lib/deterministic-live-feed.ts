/**
 * 실시간 방문예약 현황 — 결정론적 가상 피드
 * 카드 타임라인: 최신 ~ 최대 20분 전, 랜덤 간격(시드 기반, 기기 간 동일)
 * 스택: 신규 최상단 적재 → 밀려난 오래된 카드 숨김
 */

import {
  LIVE_FEED_MAX_MINUTES,
  VIRTUAL_INQUIRY_TYPES,
  calcMinutesAgo,
  dedupeByName,
  formatReservationName,
  formatReservationType,
  normalizeReservationItems,
  prependToFeedStack,
  reservationKey,
  sortByRecency,
  trimFeedToMax,
} from "@/lib/live-reservation-feed";
import type { ReservationItem } from "@/lib/types";
import { createSeededRandom, hashSeed } from "@/lib/seeded-random";
import { pickWeightedKoreanSurnameSeeded } from "@/lib/virtual-surnames";

export const FEED_BUCKET_MS = 30 * 60 * 1000;
/** 가상 타임라인 인접 카드 최소 간격(분) */
export const VIRTUAL_GAP_MIN = 1;

const INJECT_MIN_MS = 90_000;
const INJECT_MAX_MS = 150_000;

function bucketStart(now: number): number {
  return Math.floor(now / FEED_BUCKET_MS) * FEED_BUCKET_MS;
}

/** count개 간격이 totalSpan(분)을 채우도록 시드 랜덤 분배 — 각 간격 ≥ minGap */
function allocateRandomGaps(
  count: number,
  totalSpan: number,
  minGap: number,
  rand: () => number
): number[] {
  if (count <= 0) return [];
  const minTotal = count * minGap;
  if (totalSpan <= 0) return Array(count).fill(minGap);
  if (totalSpan < minTotal) {
    const base = Math.max(1, Math.floor(totalSpan / count));
    const gaps = Array.from({ length: count }, () => base);
    gaps[gaps.length - 1]! += totalSpan - base * count;
    return gaps;
  }

  const slack = totalSpan - minTotal;
  const weights = Array.from({ length: count }, () => 1 + rand() * 9);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let allocatedSlack = 0;

  return weights.map((weight, index) => {
    if (index === count - 1) return minGap + (slack - allocatedSlack);
    const extra = Math.floor((weight / weightSum) * slack);
    allocatedSlack += extra;
    return minGap + extra;
  });
}

/** fromMinutes ~ toMinutes 구간에 count개 minutesAgo를 랜덤 간격으로 배치 (오름차순) */
function pickTimelineMinutes(
  count: number,
  fromMinutes: number,
  toMinutes: number,
  rand: () => number
): number[] {
  const span = toMinutes - fromMinutes;
  if (count <= 0 || span <= 0) return [];

  const gaps = allocateRandomGaps(count, span, VIRTUAL_GAP_MIN, rand);
  const minutes: number[] = [];
  let cursor = fromMinutes;

  for (let i = 0; i < gaps.length; i++) {
    cursor += gaps[i]!;
    minutes.push(i === gaps.length - 1 ? toMinutes : Math.min(cursor, toMinutes));
  }

  return minutes;
}

function pickVirtualInquiryTypeSeeded(
  rand: () => number,
  used: Set<string>,
  pool: readonly string[]
): string {
  const candidates = pool.filter((t) => !used.has(t));
  const list = candidates.length ? candidates : [...pool];
  return list[Math.floor(rand() * list.length)]!;
}

function createVirtualItem(
  siteCode: string,
  slotId: string,
  minutesAgo: number,
  submittedAt: string,
  seed: number,
  inquiryPool: readonly string[],
  usedNames: Set<string>,
  usedTypes: Set<string>
): ReservationItem {
  const rand = createSeededRandom(seed);
  const surname = pickWeightedKoreanSurnameSeeded(rand, usedNames);
  const name = `${surname}○○`;
  const type = pickVirtualInquiryTypeSeeded(rand, usedTypes, inquiryPool);
  usedNames.add(name);
  usedTypes.add(type);
  return {
    name,
    minutesAgo,
    isVirtual: true,
    type,
    submittedAt,
    virtualSlotId: slotId,
  };
}

export function injectionIntervalMs(siteCode: string, now = Date.now()): number {
  const seed = hashSeed(`${siteCode}:interval:${bucketStart(now)}`);
  const rand = createSeededRandom(seed);
  return INJECT_MIN_MS + Math.floor(rand() * (INJECT_MAX_MS - INJECT_MIN_MS + 1));
}

export function currentInjectionIndex(siteCode: string, now = Date.now()): number {
  const start = bucketStart(now);
  const interval = injectionIntervalMs(siteCode, now);
  if (interval <= 0) return 0;
  return Math.floor((now - start) / interval);
}

export function createInjectionItemAtIndex(
  siteCode: string,
  index: number,
  inquiryPool: readonly string[],
  now = Date.now()
): ReservationItem {
  const bucket = bucketStart(now);
  const firedAt = bucket + (index + 1) * injectionIntervalMs(siteCode, now);
  const submittedAt = new Date(Math.min(firedAt, now)).toISOString();
  const minutesAgo = calcMinutesAgo(submittedAt, now);
  const usedNames = new Set<string>();
  const usedTypes = new Set<string>();
  return createVirtualItem(
    siteCode,
    `${siteCode}:inj:${bucket}:${index}`,
    minutesAgo,
    submittedAt,
    hashSeed(`${siteCode}:inj:${bucket}:${index}`),
    inquiryPool,
    usedNames,
    usedTypes
  );
}

function buildHistoricalInjectionItems(
  siteCode: string,
  now: number,
  inquiryPool: readonly string[],
  dismissed: Set<string>
): ReservationItem[] {
  const bucket = bucketStart(now);
  const count = currentInjectionIndex(siteCode, now);
  const items: ReservationItem[] = [];

  for (let i = 0; i <= count; i++) {
    const slotId = `${siteCode}:inj:${bucket}:${i}`;
    if (dismissed.has(slotId)) continue;
    const item = createInjectionItemAtIndex(siteCode, i, inquiryPool, now);
    if (item.minutesAgo > LIVE_FEED_MAX_MINUTES) continue;
    items.push(item);
  }

  return items;
}

export function msUntilNextInjection(siteCode: string, now = Date.now()): number {
  const start = bucketStart(now);
  const interval = injectionIntervalMs(siteCode, now);
  const elapsed = now - start;
  const nextAt = start + (Math.floor(elapsed / interval) + 1) * interval;
  return Math.max(1000, nextAt - now);
}

function fillVirtualTimelineGaps(
  merged: ReservationItem[],
  need: number,
  siteCode: string,
  now: number,
  inquiryPool: readonly string[],
  usedNames: Set<string>,
  usedTypes: Set<string>,
  dismissed: Set<string>
): void {
  if (need <= 0) return;

  const bucket = bucketStart(now);
  const rand = createSeededRandom(hashSeed(`${siteCode}:gaps:${bucket}`));
  const oldestMinutes =
    merged.length > 0 ? merged[merged.length - 1]!.minutesAgo : 0;
  const timelineMinutes = pickTimelineMinutes(
    need,
    oldestMinutes,
    LIVE_FEED_MAX_MINUTES,
    rand
  );

  for (let slot = 0; slot < timelineMinutes.length; slot++) {
    const minutesAgo = timelineMinutes[slot]!;
    const slotId = `${siteCode}:base:${bucket}:${slot}`;
    if (dismissed.has(slotId)) continue;

    const submittedAt = new Date(now - minutesAgo * 60000).toISOString();
    merged.push(
      createVirtualItem(
        siteCode,
        slotId,
        minutesAgo,
        submittedAt,
        hashSeed(`${siteCode}:base:${bucket}:${slot}:${minutesAgo}`),
        inquiryPool,
        usedNames,
        usedTypes
      )
    );
  }
}

/** 초기 베이스 피드 — 가상 보충만 */
export function buildDeterministicLiveFeed(
  raw: ReservationItem[],
  options: {
    siteCode: string;
    maxCount: number;
    virtualEnabled: boolean;
    dismissed: Set<string>;
    localPending?: ReservationItem | null;
    inquiryPool?: readonly string[];
    now?: number;
  }
): ReservationItem[] {
  const {
    siteCode,
    maxCount,
    virtualEnabled,
    dismissed,
    localPending,
    inquiryPool = VIRTUAL_INQUIRY_TYPES,
    now = Date.now(),
  } = options;

  let real = sortByRecency(
    normalizeReservationItems(raw.filter((i) => !i.isVirtual)).filter(
      (i) => !dismissed.has(reservationKey(i))
    )
  );

  if (localPending && !dismissed.has(reservationKey(localPending))) {
    const localName = formatReservationName(localPending.name);
    real = real.filter((i) => formatReservationName(i.name) !== localName);
    real = [
      {
        ...localPending,
        minutesAgo: calcMinutesAgo(localPending.submittedAt ?? now, now),
      },
      ...real,
    ];
  }

  real = dedupeByName(real);
  const merged: ReservationItem[] = trimFeedToMax(real, maxCount, dismissed);

  if (!virtualEnabled || merged.length >= maxCount) {
    return sortByRecency(merged);
  }

  const usedNames = new Set(merged.map((i) => formatReservationName(i.name)));
  const usedTypes = new Set(merged.map((i) => formatReservationType(i.type)));

  fillVirtualTimelineGaps(
    merged,
    maxCount - merged.length,
    siteCode,
    now,
    inquiryPool,
    usedNames,
    usedTypes,
    dismissed
  );

  return trimFeedToMax(sortByRecency(merged), maxCount, dismissed);
}

/** 첫 진입·siteCode 변경 — 베이스 + 버킷 내 LIVE 주입 이력을 스택으로 복원 */
export function buildInitialFeedStack(
  raw: ReservationItem[],
  options: {
    siteCode: string;
    maxCount: number;
    virtualEnabled: boolean;
    dismissed: Set<string>;
    localPending?: ReservationItem | null;
    inquiryPool?: readonly string[];
    now?: number;
  }
): ReservationItem[] {
  const {
    siteCode,
    maxCount,
    virtualEnabled,
    dismissed,
    inquiryPool = VIRTUAL_INQUIRY_TYPES,
    now = Date.now(),
    ...rest
  } = options;

  let stack = buildDeterministicLiveFeed(raw, {
    siteCode,
    maxCount,
    virtualEnabled,
    dismissed,
    inquiryPool,
    now,
    ...rest,
  });

  if (!virtualEnabled) return stack;

  const injections = sortByRecency(
    buildHistoricalInjectionItems(siteCode, now, inquiryPool, dismissed)
  );
  for (let i = injections.length - 1; i >= 0; i--) {
    stack = prependToFeedStack(stack, injections[i]!, maxCount, dismissed);
  }

  return stack;
}

export function adjacentMinuteGaps(items: ReservationItem[]): number[] {
  const sorted = sortByRecency(items);
  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    gaps.push(sorted[i + 1]!.minutesAgo - sorted[i]!.minutesAgo);
  }
  return gaps;
}

export function isSortedByRecency(items: ReservationItem[]): boolean {
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i]!.minutesAgo > items[i + 1]!.minutesAgo) return false;
    if (
      items[i]!.minutesAgo === items[i + 1]!.minutesAgo &&
      new Date(items[i]!.submittedAt ?? 0).getTime() <
        new Date(items[i + 1]!.submittedAt ?? 0).getTime()
    ) {
      return false;
    }
  }
  return true;
}
