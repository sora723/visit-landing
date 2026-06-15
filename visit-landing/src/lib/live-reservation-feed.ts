import type { ReservationItem } from "./types";
import {
  COMPOUND_SURNAMES,
  pickWeightedKoreanSurname,
} from "./virtual-surnames";

export const LIVE_FEED_MAX_MINUTES = 20;
export const LIVE_FEED_MOBILE_MAX = 5;
export const LIVE_FEED_PC_MAX = 10;
/** 가상 카드 간 최소 분 간격 — 1·2·3분 연속 방지 */
export const VIRTUAL_MINUTE_GAP = 3;
export const VIRTUAL_INJECT_MIN_MS = 40_000;
export const VIRTUAL_INJECT_MAX_MS = 120_000;

export const VIRTUAL_INQUIRY_TYPES = [
  "84A형 문의",
  "59A형 문의",
  "59형 문의",
  "방문예약 신청",
  "관심고객 등록",
] as const;

/** 실제·가상 공통 타입 표기 — 내용 없으면 방문예약 신청 */
export function formatReservationType(type?: string | null): string {
  const trimmed = String(type ?? "").trim();
  return trimmed || "방문예약 신청";
}

export function pickVirtualInquiryType(
  used: Set<string> = new Set(),
  pool: readonly string[] = VIRTUAL_INQUIRY_TYPES
): string {
  const candidates = pool.filter((t) => !used.has(t));
  const list = candidates.length ? candidates : [...pool];
  return list[Math.floor(Math.random() * list.length)]!;
}

export function surnameAvatarChar(name: string): string {
  const formatted = formatReservationName(name);
  const base = formatted.replace(/○+/g, "");
  return base.charAt(0) || "○";
}

/** 신규 가상 접수 주기 — 40~120초 랜덤 */
export function randomVirtualInjectDelayMs(): number {
  return (
    VIRTUAL_INJECT_MIN_MS +
    Math.floor(Math.random() * (VIRTUAL_INJECT_MAX_MS - VIRTUAL_INJECT_MIN_MS + 1))
  );
}

/** 분양 랜딩 표기 — 김○○ / 남궁○○ (실제·가상 공통, 성씨 제한 없음) */
export function formatReservationName(name: string | null | undefined): string {
  const trimmed = String(name ?? "")
    .trim()
    .replace(/[○*]/g, "");
  if (!trimmed) return "○○";
  for (const compound of COMPOUND_SURNAMES) {
    if (trimmed.startsWith(compound)) return `${compound}○○`;
  }
  const first = trimmed.charAt(0);
  if (!first) return "○○";
  return `${first}○○`;
}

export function reservationKey(item: ReservationItem): string {
  if (item.virtualSlotId) return item.virtualSlotId;
  return `${formatReservationName(item.name)}|${item.isVirtual ? "v" : "r"}`;
}

/** 리스트 애니메이션용 고유 키 */
export function feedItemKey(item: ReservationItem): string {
  if (item.virtualSlotId) return item.virtualSlotId;
  const ts = item.submittedAt ?? `m${item.minutesAgo}`;
  return `${reservationKey(item)}|${ts}`;
}

export function calcMinutesAgo(submittedAt: string | number, now = Date.now()): number {
  const ts =
    typeof submittedAt === "number"
      ? submittedAt
      : new Date(submittedAt).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.floor((now - ts) / 60000));
}

/** API 스냅샷 → submittedAt 앵커 부여 */
export function anchorReservationTimes(
  items: ReservationItem[],
  fetchedAt = Date.now()
): ReservationItem[] {
  return items.map((item) => {
    if (item.submittedAt) {
      return {
        ...item,
        minutesAgo: calcMinutesAgo(item.submittedAt, fetchedAt),
      };
    }
    const ts = fetchedAt - item.minutesAgo * 60000;
    return {
      ...item,
      submittedAt: new Date(ts).toISOString(),
      minutesAgo: calcMinutesAgo(ts, fetchedAt),
    };
  });
}

/** 현재 시각 기준 minutesAgo 갱신, 20분 초과 제외 */
export function tickReservationTimes(
  items: ReservationItem[],
  now = Date.now()
): ReservationItem[] {
  return items
    .map((item) => {
      const submittedAt =
        item.submittedAt ??
        new Date(now - item.minutesAgo * 60000).toISOString();
      const minutesAgo = calcMinutesAgo(submittedAt, now);
      return { ...item, submittedAt, minutesAgo };
    })
    .filter((item) => item.minutesAgo <= LIVE_FEED_MAX_MINUTES);
}

/** API·프론트 공통 — 20분 초과 항목 제거 */
export function normalizeReservationItems(
  items: ReservationItem[]
): ReservationItem[] {
  return items.filter((item) => item.minutesAgo <= LIVE_FEED_MAX_MINUTES);
}

/** 실제 접수만 — 가상(isVirtual) 항목은 UI 전용, 서버·시트·알림 경로 제외 */
export function filterRealReservationsOnly(
  items: ReservationItem[]
): ReservationItem[] {
  return normalizeReservationItems(
    items.filter((item) => !item.isVirtual)
  );
}

export function createLocalSubmissionItem(
  name: string,
  submittedAt = new Date().toISOString(),
  type?: string
): ReservationItem {
  return {
    name: formatReservationName(name),
    minutesAgo: calcMinutesAgo(submittedAt),
    isVirtual: false,
    type: formatReservationType(type),
    submittedAt,
  };
}

const PENDING_SUBMIT_KEY = "visit_landing_pending_submit";

export function savePendingSubmission(name: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    PENDING_SUBMIT_KEY,
    JSON.stringify({ name: name.trim(), at: Date.now() })
  );
}

export function loadPendingSubmission(): ReservationItem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SUBMIT_KEY);
    if (!raw) return null;
    const { name, at } = JSON.parse(raw) as { name: string; at: number };
    if (Date.now() - at > LIVE_FEED_MAX_MINUTES * 60 * 1000) {
      sessionStorage.removeItem(PENDING_SUBMIT_KEY);
      return null;
    }
    return createLocalSubmissionItem(name, new Date(at).toISOString());
  } catch {
    return null;
  }
}

export function clearPendingSubmission() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_SUBMIT_KEY);
}

export function dedupeByName(items: ReservationItem[]): ReservationItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const n = formatReservationName(item.name);
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

export function sortByRecency(items: ReservationItem[]): ReservationItem[] {
  return [...items].sort((a, b) => {
    if (a.minutesAgo !== b.minutesAgo) return a.minutesAgo - b.minutesAgo;
    const ta = new Date(a.submittedAt ?? 0).getTime();
    const tb = new Date(b.submittedAt ?? 0).getTime();
    return tb - ta;
  });
}

/**
 * maxCount 초과 시 가장 오래된(하단) 항목 제거 + dismissed 등록
 * — 모바일 5 / PC 10 초과분은 다시 노출되지 않음
 */
export function trimFeedToMax(
  items: ReservationItem[],
  maxCount: number,
  dismissed: Set<string>,
  stableVirtuals?: Map<string, ReservationItem>
): ReservationItem[] {
  const sorted = sortByRecency(
    items.filter((i) => !dismissed.has(reservationKey(i)))
  );
  if (sorted.length <= maxCount) return sorted;

  const kept = sorted.slice(0, maxCount);
  const dropped = sorted.slice(maxCount);
  for (const item of dropped) {
    dismissed.add(reservationKey(item));
    stableVirtuals?.delete(reservationKey(item));
  }
  return kept;
}

function shuffleMinutes(pool: number[]): number[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function hasMinuteGapConflict(candidate: number, others: Set<number>): boolean {
  for (const other of others) {
    if (Math.abs(other - candidate) < VIRTUAL_MINUTE_GAP) return true;
  }
  return false;
}

/** 1~19분 — 서로 최소 3분 이상 간격, 들쭉날쭉 분산 */
export function pickVirtualMinutes(used: Set<number>, count: number): number[] {
  const picked: number[] = [];
  const blocked = new Set(used);
  const pool = shuffleMinutes(
    Array.from({ length: LIVE_FEED_MAX_MINUTES - 1 }, (_, i) => i + 1)
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

/** 주기적 신규 가상 접수 1건 — 최상단 삽입용 (0분·연속 1분 방지) */
export function createIncomingVirtualItem(
  usedNames: Set<string> = new Set(),
  usedTypes: Set<string> = new Set(),
  usedMinutes: Set<number> = new Set(),
  inquiryPool: readonly string[] = VIRTUAL_INQUIRY_TYPES
): ReservationItem {
  const surname = pickWeightedKoreanSurname(usedNames);
  const minutes =
    pickVirtualMinutes(usedMinutes, 1)[0] ??
    Math.min(LIVE_FEED_MAX_MINUTES - 1, 4 + Math.floor(Math.random() * 12));
  const submittedAt = new Date(Date.now() - minutes * 60000).toISOString();
  return {
    name: `${surname}○○`,
    minutesAgo: minutes,
    isVirtual: true,
    type: pickVirtualInquiryType(usedTypes, inquiryPool),
    submittedAt,
  };
}

export function registerVirtualItem(
  stableVirtuals: Map<string, ReservationItem>,
  item: ReservationItem
): string {
  const key = reservationKey(item);
  stableVirtuals.set(key, item);
  return key;
}

export function buildLiveFeed(
  raw: ReservationItem[],
  options: {
    maxCount: number;
    virtualEnabled: boolean;
    dismissed: Set<string>;
    stableVirtuals: Map<string, ReservationItem>;
    localPending?: ReservationItem | null;
    inquiryPool?: readonly string[];
  }
): ReservationItem[] {
  const {
    maxCount,
    virtualEnabled,
    dismissed,
    stableVirtuals,
    localPending,
    inquiryPool = VIRTUAL_INQUIRY_TYPES,
  } = options;

  // 1. 실제 접수 — 20분 이내만
  let real = sortByRecency(
    normalizeReservationItems(raw.filter((i) => !i.isVirtual)).filter(
      (i) => !dismissed.has(reservationKey(i))
    )
  );

  // 2. submit 직후 로컬 신규 접수 최상단 병합
  if (localPending && !dismissed.has(reservationKey(localPending))) {
    const localName = formatReservationName(localPending.name);
    real = real.filter((i) => formatReservationName(i.name) !== localName);
    real = [{ ...localPending, minutesAgo: calcMinutesAgo(localPending.submittedAt ?? Date.now()) }, ...real];
  }

  real = dedupeByName(real);
  let merged = trimFeedToMax(real, maxCount, dismissed, stableVirtuals);

  // 3. 부족분 가상 보충
  if (virtualEnabled && merged.length < maxCount) {
    const usedMinutes = new Set(merged.map((i) => i.minutesAgo));
    const usedNames = new Set(merged.map((i) => formatReservationName(i.name)));

    const stableList = sortByRecency(
      [...stableVirtuals.values()].filter(
        (i) =>
          i.minutesAgo <= LIVE_FEED_MAX_MINUTES &&
          !dismissed.has(reservationKey(i)) &&
          !merged.some(
            (m) =>
              m.minutesAgo === i.minutesAgo &&
              formatReservationName(m.name) === formatReservationName(i.name)
          )
      )
    );

    for (const v of stableList) {
      if (merged.length >= maxCount) break;
      if (!usedMinutes.has(v.minutesAgo)) {
        merged.push(v);
        usedMinutes.add(v.minutesAgo);
        usedNames.add(formatReservationName(v.name));
      }
    }

    merged = sortByRecency(merged);

    if (merged.length < maxCount) {
      const need = maxCount - merged.length;
      const minutes = pickVirtualMinutes(usedMinutes, need);
      const usedTypes = new Set(
        merged.map((i) => formatReservationType(i.type))
      );

      for (const min of minutes) {
        if (merged.length >= maxCount) break;

        const surname = pickWeightedKoreanSurname(usedNames);

        const submittedAt = new Date(Date.now() - min * 60000).toISOString();
        const item: ReservationItem = {
          name: `${surname}○○`,
          minutesAgo: min,
          isVirtual: true,
          type: pickVirtualInquiryType(usedTypes, inquiryPool),
          submittedAt,
        };
        usedTypes.add(formatReservationType(item.type));
        const key = reservationKey(item);

        if (dismissed.has(key)) continue;

        stableVirtuals.set(key, item);
        merged.push(item);
        usedNames.add(`${surname}○○`);
      }
    }
  }

  // 4. 최신순 정렬 → 5. maxCount 초과 시 하단 삭제
  return trimFeedToMax(merged, maxCount, dismissed, stableVirtuals);
}

export function collectDismissed(
  previous: ReservationItem[],
  current: ReservationItem[],
  existing: Set<string>
): Set<string> {
  const next = new Set(existing);
  const currentKeys = new Set(current.map(reservationKey));
  for (const item of previous) {
    const key = reservationKey(item);
    if (!currentKeys.has(key)) next.add(key);
  }
  return next;
}

/** API 응답에 로컬 pending이 반영됐으면 pending 해제 */
export function shouldClearLocalPending(
  localPending: ReservationItem | null,
  raw: ReservationItem[]
): boolean {
  if (!localPending) return false;
  const localName = formatReservationName(localPending.name);
  return normalizeReservationItems(raw.filter((i) => !i.isVirtual)).some(
    (i) => formatReservationName(i.name) === localName
  );
}

export function clearLocalPendingIfSynced(
  localPending: ReservationItem | null,
  raw: ReservationItem[]
): ReservationItem | null {
  if (shouldClearLocalPending(localPending, raw)) {
    clearPendingSubmission();
    return null;
  }
  return localPending;
}

/** stableVirtuals Map 내 경과 시간 갱신, 20분 초과 항목 제거 */
export function tickStableVirtuals(
  map: Map<string, ReservationItem>,
  now = Date.now()
) {
  for (const [key, item] of [...map.entries()]) {
    const [ticked] = tickReservationTimes([item], now);
    if (!ticked) map.delete(key);
    else map.set(key, ticked);
  }
}
