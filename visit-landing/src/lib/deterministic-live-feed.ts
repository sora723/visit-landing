/**
 * 실시간 방문예약 현황 — 결정론적 가상 피드
 * 카드 간격: 이전 카드 대비 1~10분 (시드 기반, 기기 간 동일)
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
export const VIRTUAL_GAP_MIN = 1;
export const VIRTUAL_GAP_MAX = 10;

const INJECT_MIN_MS = 90_000;
const INJECT_MAX_MS = 150_000;

function bucketStart(now: number): number {
  return Math.floor(now / FEED_BUCKET_MS) * FEED_BUCKET_MS;
}

function pickGapMinutes(
  rand: () => number,
  remainingSlots: number,
  remainingMinutes: number
): number {
  if (remainingSlots <= 0 || remainingMinutes <= 0) return VIRTUAL_GAP_MAX;
  const maxAllowed = Math.min(
    VIRTUAL_GAP_MAX,
    Math.max(VIRTUAL_GAP_MIN, Math.floor(remainingMinutes / remainingSlots))
  );
  const minAllowed = Math.min(VIRTUAL_GAP_MIN, maxAllowed);
  return minAllowed + Math.floor(rand() * (maxAllowed - minAllowed + 1));
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
  let lastMinutes = merged.length > 0 ? merged[merged.length - 1]!.minutesAgo : 0;

  for (let slot = 0; slot < need; slot++) {
    const remainingSlots = need - slot;
    const remainingMinutes = LIVE_FEED_MAX_MINUTES - lastMinutes;
    const gap = pickGapMinutes(rand, remainingSlots, remainingMinutes);
    const minutesAgo = lastMinutes + gap;
    if (minutesAgo > LIVE_FEED_MAX_MINUTES) break;

    lastMinutes = minutesAgo;
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
