import type { ReservationItem } from "./types";
import {
  LIVE_FEED_MAX_MINUTES,
  pickVirtualInquiryType,
  pickVirtualMinutes,
  VIRTUAL_MINUTE_GAP,
} from "./live-reservation-feed";
import { pickWeightedKoreanSurnames } from "./virtual-surnames";

export function getDemoReservations(limit: number): ReservationItem[] {
  const now = Date.now();
  const surnames = pickWeightedKoreanSurnames(limit);
  const minutes = pickVirtualMinutes(new Set(), limit);

  return minutes.map((minutesAgo, i) => ({
    name: `${surnames[i]!}○○`,
    minutesAgo,
    isVirtual: true,
    type: pickVirtualInquiryType(),
    submittedAt: new Date(now - minutesAgo * 60000).toISOString(),
  })).filter((i) => i.minutesAgo <= LIVE_FEED_MAX_MINUTES);
}

export function verifyVirtualMinuteSpacing(limit = 5): boolean {
  const used = new Set<number>();
  const picked = pickVirtualMinutes(used, limit);
  for (let i = 0; i < picked.length; i++) {
    for (let j = i + 1; j < picked.length; j++) {
      if (Math.abs(picked[i]! - picked[j]!) < VIRTUAL_MINUTE_GAP) return false;
    }
  }
  return picked.length === limit;
}
