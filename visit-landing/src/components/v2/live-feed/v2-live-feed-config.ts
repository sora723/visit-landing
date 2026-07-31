/**
 * V2 liveFeed — V1 `/api/reservations` + fetchRecentReservations 계약 재사용.
 * Sheet optionsJson은 registry defaultOptions({})만 사용 (추가 키 없음).
 */

import {
  LIVE_FEED_MOBILE_MAX,
  LIVE_FEED_PC_MAX,
} from "@/lib/live-reservation-feed";

/** V1 LiveReservationSection 과 동일 */
export const V2_LIVE_FEED_POLL_INTERVAL_MS = 45_000;

export const V2_LIVE_FEED_PREVIEW_MESSAGE =
  "미리보기에서는 실시간 접수 현황을 불러오지 않습니다.";

export const V2_LIVE_FEED_EMPTY_MESSAGE = "최근 접수 내역이 없습니다.";
export const V2_LIVE_FEED_ERROR_MESSAGE =
  "접수 현황을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.";
export const V2_LIVE_FEED_LOADING_MESSAGE = "접수 현황을 불러오는 중…";

export type V2LiveFeedDisplayCopy = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badge?: string;
};

/** API limit — V1 pcMax 기본과 동일 */
export function v2LiveFeedFetchLimit(): number {
  return LIVE_FEED_PC_MAX;
}

export function v2LiveFeedVisibleLimit(isMobile: boolean): number {
  return isMobile ? LIVE_FEED_MOBILE_MAX : LIVE_FEED_PC_MAX;
}
