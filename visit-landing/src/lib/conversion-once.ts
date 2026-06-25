/** 1접수 = 1전환 — submissionId 기준 sessionStorage 중복 방지 (새로고침 포함) */

const STORAGE_PREFIX = "vl_conv_fired:";

export function conversionFiredKey(submissionId: string): string {
  return `${STORAGE_PREFIX}${submissionId}`;
}

export function hasConversionFired(submissionId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(conversionFiredKey(submissionId)) === "1";
}

/**
 * 최초 1회만 true. 이미 발화됐으면 false (새로고침·재진입 차단).
 */
export function claimConversionFire(submissionId: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const key = conversionFiredKey(submissionId);
  if (sessionStorage.getItem(key) === "1") return false;
  sessionStorage.setItem(key, "1");
  return true;
}

/** complete 페이지에서 전환 실행 (랜딩 inline 대신 — 네이버 wcslog 등 로드 시간 확보) */
export function prefersCompletePageConversion(
  tracking: import("@/lib/conversion-tracking").ConversionTrackingConfig
): boolean {
  return Boolean(
    tracking.conversionRawHtml?.trim() || tracking.naverConversionScript?.trim()
  );
}

/** @deprecated prefersCompletePageConversion 사용 */
export function prefersCompletePageFallback(
  tracking: import("@/lib/conversion-tracking").ConversionTrackingConfig
): boolean {
  return prefersCompletePageConversion(tracking);
}
