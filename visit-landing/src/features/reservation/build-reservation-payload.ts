/**
 * ReservationSubmitInput + tracking → SubmitPayload
 * ConfigProvider 기존 조립 순서·필드와 동일.
 */

import { normalizeMobilePhone } from "@/lib/phone";
import type { ReservationSubmitInput, SubmitPayload } from "@/lib/types";

export type ReservationTrackingContext = Pick<
  SubmitPayload,
  | "sourceUrl"
  | "referer"
  | "device"
  | "utmSource"
  | "utmMedium"
  | "utmCampaign"
>;

/**
 * 기존 ConfigProvider submit 본문과 동일한 payload.
 * tracking은 getTrackingContext() 결과(또는 테스트 fixture)를 주입.
 */
export function buildReservationPayload(
  input: ReservationSubmitInput,
  tracking: ReservationTrackingContext = {}
): SubmitPayload {
  return {
    name: input.name.trim(),
    phone: normalizeMobilePhone(input.phone),
    privacyAgreed: true,
    unitType: input.unitType,
    visitDate: input.visitDate,
    source: input.source,
    company: input.company,
    formToken: input.formToken,
    pageLoadedAt: input.pageLoadedAt,
    napm: input.napm,
    utmContent: input.utmContent,
    landingUrl: input.landingUrl,
    inputFocusCount: input.inputFocusCount,
    inputChangeCount: input.inputChangeCount,
    clickCount: input.clickCount,
    scrollDepth: input.scrollDepth,
    firstInputAt: input.firstInputAt,
    lastInputAt: input.lastInputAt,
    userAgent: input.userAgent,
    screenWidth: input.screenWidth,
    screenHeight: input.screenHeight,
    timezone: input.timezone,
    language: input.language,
    ...tracking,
  };
}
