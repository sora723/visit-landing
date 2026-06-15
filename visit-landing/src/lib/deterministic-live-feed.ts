/**
 * 실시간 방문예약 현황 — 결정론적 가상 피드
 * siteCode + 30분 버킷 기준 동일 생성 → 모바일/PC·새로고침 간 목록 일치
 */

import {
  LIVE_FEED_MAX_MINUTES,
  VIRTUAL_INQUIRY_TYPES,
  VIRTUAL_MINUTE_GAP,
  calcMinutesAgo,
  dedupeByName,
  formatReservationName,
  formatReservationType,
  normalizeReservationItems,
  reservationKey,
  sortByRecency,
  trimFeedToMax,
} from "@/lib/live-reservation-feed";
import type { ReservationItem } from "@/lib/types";
import { createSeededRandom, hashSeed, seededShuffle } from "@/lib/seeded-random";
import { pickWeightedKoreanSurnameSeeded } from "@/lib/virtual-surnames";

export const FEED_BUCKET_MS = 30 * 60 * 1000;
const INJECT_MIN_MS = 90_000;
const INJECT_MAX_MS = 150_000;

function bucketStart(now: number): number {
  return Math.floor(now / FEED_BUCKET_MS) * FEED_BUCKET_MS;
}

/** 현장별 고정 주입 간격 — 버킷 내 동일 */
export function injectionIntervalMs(siteCode: string, now = Date.now()): number {
  const seed = hashSeed(`${siteCode}:interval:${bucketStart(now)}`);
  const rand = createSeededRandom(seed);
  return INJECT_MIN_MS + Math.floor(rand() * (INJECT_MAX_MS - INJECT_MIN_MS + 1));
}

function hasMinuteGapConflict(candidate: number, others: Set<number>): boolean {
  for (const other of others) {
    if (Math.abs(other - candidate) < VIRTUAL_MINUTE_GAP) return true;
  }
  return false;
}

function pickVirtualMinutesSeeded(
  seed: number,
  used: Set<number>,
  count: number
): number[] {
  const rand = createSeededRandom(seed);
  const picked: number[] = [];
  const blocked = new Set(used);
  const pool = seededShuffle(
    Array.from({ length: LIVE_FEED_MAX_MINUTES - 1 }, (_, i) => i + 1),
    rand
  );

  for (const m of pool) {
    if (picked.length >= count) break;
    if (hasMinuteGapConflict(m, blocked)) continue;
    picked.push(m);
    blocked.add(m);
  }

  if (picked.length < count) {
    for (const m of pool) {
      if (picked.length >= count) break;
      if (blocked.has(m)) continue;
      picked.push(m);
      blocked.add(m);
    }
  }

  return picked;
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

function createBaseVirtualItem(
  siteCode: string,
  slotIndex: number,
  minutesAgo: number,
  now: number,
  inquiryPool: readonly string[],
  usedNames: Set<string>,
  usedTypes: Set<string>
): ReservationItem {
  const bucket = bucketStart(now);
  const seed = hashSeed(`${siteCode}:base:${bucket}:${slotIndex}:${minutesAgo}`);
  const rand = createSeededRandom(seed);
  const surname = pickWeightedKoreanSurnameSeeded(rand, usedNames);
  const name = `${surname}○○`;
  const submittedAt = new Date(now - minutesAgo * 60000).toISOString();
  const type = pickVirtualInquiryTypeSeeded(rand, usedTypes, inquiryPool);
  usedNames.add(name);
  usedTypes.add(type);
  return {
    name,
    minutesAgo,
    isVirtual: true,
    type,
    submittedAt,
    virtualSlotId: `${siteCode}:base:${bucket}:${slotIndex}`,
  };
}

/** 버킷 시작 이후 경과 시간 기준 — 주입되어야 할 가상 접수 */
export function createScheduledInjectionItems(
  siteCode: string,
  now: number,
  inquiryPool: readonly string[],
  existingKeys: Set<string>
): ReservationItem[] {
  const start = bucketStart(now);
  const interval = injectionIntervalMs(siteCode, now);
  if (interval <= 0) return [];

  const elapsed = now - start;
  const injectionCount = Math.floor(elapsed / interval);
  const items: ReservationItem[] = [];
  const usedNames = new Set(existingKeys);

  for (let i = 0; i < injectionCount; i++) {
    const firedAt = start + (i + 1) * interval;
    if (firedAt > now) break;

    const seed = hashSeed(`${siteCode}:inj:${bucketStart(now)}:${i}`);
    const rand = createSeededRandom(seed);
    const surname = pickWeightedKoreanSurnameSeeded(rand, usedNames);
    const name = `${surname}○○`;
    const key = `${name}|v`;
    if (existingKeys.has(key)) continue;

    const type = pickVirtualInquiryTypeSeeded(rand, new Set(), inquiryPool);
    const submittedAt = new Date(firedAt).toISOString();
    const minutesAgo = calcMinutesAgo(submittedAt, now);
    if (minutesAgo > LIVE_FEED_MAX_MINUTES) continue;

    items.push({
      name,
      minutesAgo,
      isVirtual: true,
      type,
      submittedAt,
      virtualSlotId: `${siteCode}:inj:${bucketStart(now)}:${i}`,
    });
    usedNames.add(name);
    existingKeys.add(key);
  }

  return items;
}

/** 다음 가상 주입까지 남은 ms — 클라이언트 타이머용 */
export function msUntilNextInjection(siteCode: string, now = Date.now()): number {
  const start = bucketStart(now);
  const interval = injectionIntervalMs(siteCode, now);
  const elapsed = now - start;
  const nextAt = start + (Math.floor(elapsed / interval) + 1) * interval;
  return Math.max(1000, nextAt - now);
}

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
  let merged = trimFeedToMax(real, maxCount, dismissed);

  if (!virtualEnabled || merged.length >= maxCount) {
    return merged;
  }

  const existingKeys = new Set(merged.map(reservationKey));
  const usedMinutes = new Set(merged.map((i) => i.minutesAgo));
  const usedNames = new Set(merged.map((i) => formatReservationName(i.name)));
  const usedTypes = new Set(merged.map((i) => formatReservationType(i.type)));

  const injections = createScheduledInjectionItems(
    siteCode,
    now,
    inquiryPool,
    existingKeys
  );
  for (const item of sortByRecency(injections)) {
    if (merged.length >= maxCount) break;
    if (dismissed.has(reservationKey(item))) continue;
    merged.push(item);
    usedMinutes.add(item.minutesAgo);
    usedNames.add(formatReservationName(item.name));
    usedTypes.add(formatReservationType(item.type));
  }

  merged = sortByRecency(merged);

  if (merged.length < maxCount) {
    const need = maxCount - merged.length;
    const minutes = pickVirtualMinutesSeeded(
      hashSeed(`${siteCode}:fill:${bucketStart(now)}`),
      usedMinutes,
      need
    );

    minutes.forEach((min, slotIndex) => {
      if (merged.length >= maxCount) return;
      const item = createBaseVirtualItem(
        siteCode,
        slotIndex,
        min,
        now,
        inquiryPool,
        usedNames,
        usedTypes
      );
      if (dismissed.has(reservationKey(item))) return;
      merged.push(item);
    });
  }

  return trimFeedToMax(sortByRecency(merged), maxCount, dismissed);
}
