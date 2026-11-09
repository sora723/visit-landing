/** 1접수 = 1전환 — submissionId 기준 sessionStorage 중복 방지 (새로고침 포함) */

import { hasSmartlogConversion } from "@/lib/conversion-tracking";

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
    tracking.conversionRawHtml?.trim() ||
      tracking.naverConversionScript?.trim() ||
      hasSmartlogConversion(tracking)
  );
}

/**
 * 접수 성공 UI 직후 광고 픽셀 전환 여부.
 * sheet-first(submit.full)는 allowConversion 을 신뢰.
 * 레거시 Blobs ack 는 needsPostProcess(조기차단 아님)로 판정.
 */
export function shouldFireClientConversion(result: {
  submissionId?: string;
  needsPostProcess?: boolean;
  allowConversion?: boolean;
  validationStatus?: string;
}): boolean {
  if (!result.submissionId) return false;
  const status = String(result.validationStatus || "").trim();
  if (
    status === "허니팟차단" ||
    status === "토큰차단" ||
    status === "IP대량차단" ||
    status === "중복접수"
  ) {
    return false;
  }
  if (typeof result.allowConversion === "boolean") {
    return result.allowConversion;
  }
  if (result.needsPostProcess === false) return false;
  return true;
}

/** @deprecated prefersCompletePageConversion 사용 */
export function prefersCompletePageFallback(
  tracking: import("@/lib/conversion-tracking").ConversionTrackingConfig
): boolean {
  return prefersCompletePageConversion(tracking);
}
