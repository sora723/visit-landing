import type { SiteConfig } from "./types";
import { isBirthDateFieldEnabled, isRegionFieldEnabled } from "./region-options";
import {
  isTypeFieldEnabled,
  isUnitTypeFieldEnabled,
  isVisitDateFieldEnabled,
  isVisitTimeFieldEnabled,
} from "./reservation-form-options";

/**
 * extendedData.privacy — 현장별 개인정보·마케팅 고지 설정
 *
 * 마케팅 동의(enableMarketingConsent):
 * - 신규·미설정 기본 false. 기존 현장 값은 임의 변경하지 않음.
 * - true는 광고주가 추가 마케팅을 하고 법적 요건을 확인한 현장만.
 * - 비드애드는 고객 대상 광고성 문자/카톡을 발송하지 않음.
 * - 솔라피 알림톡은 상담 담당자용 신규 접수 알림이며, 고객 마케팅과 구분.
 */
export type SitePrivacySettings = {
  /** @deprecated 개인정보처리자는 managerName 사용. 파싱만 유지 */
  privacyControllerName?: string;
  privacyContact?: string;
  privacyRetentionPeriod?: string;
  privacyCollectionPurpose?: string;
  /**
   * 선택 마케팅 동의 UI 노출.
   * 미설정·false → 체크박스/팝업 숨김, 기록은 미동의(false).
   */
  enableMarketingConsent?: boolean;
  marketingControllerName?: string;
  marketingRetentionPeriod?: string;
  marketingContact?: string;
  marketingPurpose?: string;
  marketingItems?: string;
  marketingChannels?: string;
  privacyNoticeVersion?: string;
  marketingNoticeVersion?: string;
  privacyPolicyUrl?: string;
};

export function parseSitePrivacySettings(
  raw: unknown
): SitePrivacySettings | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  const str = (k: string) => {
    const v = o[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const bool = (k: string) => {
    const v = o[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "y" || s === "yes" || s === "true" || s === "1") return true;
      if (s === "n" || s === "no" || s === "false" || s === "0") return false;
    }
    return undefined;
  };

  const parsed: SitePrivacySettings = {
    privacyControllerName: str("privacyControllerName"),
    privacyContact: str("privacyContact"),
    privacyRetentionPeriod: str("privacyRetentionPeriod"),
    privacyCollectionPurpose: str("privacyCollectionPurpose"),
    enableMarketingConsent: bool("enableMarketingConsent"),
    marketingControllerName: str("marketingControllerName"),
    marketingRetentionPeriod: str("marketingRetentionPeriod"),
    marketingContact: str("marketingContact"),
    marketingPurpose: str("marketingPurpose"),
    marketingItems: str("marketingItems"),
    marketingChannels: str("marketingChannels"),
    privacyNoticeVersion: str("privacyNoticeVersion"),
    marketingNoticeVersion: str("marketingNoticeVersion"),
    privacyPolicyUrl: str("privacyPolicyUrl"),
  };

  return Object.values(parsed).some((v) => v !== undefined) ? parsed : undefined;
}

/**
 * 고객 화면용 설정값. 없으면 빈 문자열 + 개발 로그만.
 * 영문 키·임의 문구를 UI에 노출하지 않음.
 */
export function resolvePrivacyDisplayValue(
  value: string | undefined,
  fieldKey: string,
  siteCode?: string
): string {
  const v = value?.trim() ?? "";
  if (!v) {
    console.warn("[privacy] missing config", {
      fieldKey,
      siteCode: siteCode ?? "",
    });
    return "";
  }
  return v;
}

/**
 * 개인정보처리자 = 현장관리.managerName (광고주).
 * extendedData.privacy.privacyControllerName은 쓰지 않음.
 */
export function resolvePrivacyControllerName(config: SiteConfig): string {
  const manager = config.managerName?.trim();
  if (manager) return manager;
  return resolvePrivacyDisplayValue(
    undefined,
    "managerName",
    config.siteCode
  );
}

export function resolvePrivacyCollectionPurpose(config: SiteConfig): string {
  const custom = config.privacy?.privacyCollectionPurpose?.trim();
  if (custom) return custom;
  const siteName = config.siteName?.trim() || "본 단지";
  return `${siteName}의 관심등록, 상담신청 접수, 신청자 확인, 상담 안내 및 방문예약 일정 협의`;
}

/** 보유·이용 기간 — 시트 설정 우선, 없으면 공통 문구 */
export function resolvePrivacyRetentionPeriod(config: SiteConfig): string {
  const custom = config.privacy?.privacyRetentionPeriod?.trim();
  if (custom) return custom;
  return [
    "개인정보 수집일로부터 최대 1년간 보유·이용합니다.",
    "다만, 보유기간 내에 상담 및 방문예약 업무가 종료되는 등 개인정보 처리 목적이 달성되어 해당 정보가 더 이상 필요하지 않은 경우에는 지체 없이 파기합니다.",
    "관계 법령에 보존 의무가 있는 경우에 한하여 해당 법령에서 정한 기간 동안 보관하며, 법령상 별도 보존 근거가 없으면 지체 없이 파기합니다.",
  ].join("\n\n");
}

export function resolveRequiredCollectionItems(config: SiteConfig): {
  required: string;
  optional: string;
} {
  const required = "이름, 연락처";
  const optionalParts: string[] = [];
  if (isTypeFieldEnabled(config)) optionalParts.push("상담희망시간");
  if (isUnitTypeFieldEnabled(config)) optionalParts.push("관심 평형");
  if (isVisitDateFieldEnabled(config)) optionalParts.push("방문 희망일");
  if (isVisitTimeFieldEnabled(config)) optionalParts.push("방문 희망시간");
  if (isBirthDateFieldEnabled(config)) optionalParts.push("생년월일");
  if (isRegionFieldEnabled(config)) optionalParts.push("거주지역");
  return {
    required,
    optional: optionalParts.join(", "),
  };
}

/** 신규·미설정 기본 false. true일 때만 마케팅 UI 표시 */
export function isMarketingConsentEnabled(config: SiteConfig): boolean {
  return config.privacy?.enableMarketingConsent === true;
}

/**
 * 접수 기록용 마케팅 동의값.
 * UI 미표시(비활성) 현장은 항상 false — 미표시를 동의로 간주하지 않음.
 */
export function resolveMarketingAgreedForSubmit(
  config: SiteConfig,
  checkboxAgreed: boolean
): boolean {
  if (!isMarketingConsentEnabled(config)) return false;
  return checkboxAgreed === true;
}
