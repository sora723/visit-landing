/**
 * V2 Published 런타임 — 폼·시스템 footer용 최소 컨텍스트.
 * SiteConfig 전체·비밀값·conversionRawHtml 미포함.
 */

import type { SiteConfig } from "@/lib/types";
import { formatFooterBottomText } from "@/lib/footer-config";
import {
  isUnitTypeFieldEnabled,
  isVisitDateFieldEnabled,
  resolveUnitTypeOptions,
  resolveVisitDateOptions,
} from "@/lib/reservation-form-options";

export type V2FooterItem = { title: string; content: string };

export type V2RuntimeSiteContext = {
  siteCode: string;
  siteName: string;
  phone: string;
  managerName?: string;
  privacyText: string;
  formButtonText: string;
  unitTypeEnabled: boolean;
  unitTypeOptions: { value: string; label: string }[];
  visitDateEnabled: boolean;
  visitDateOptions: { value: string; label: string }[];
  footer: {
    items: V2FooterItem[];
    bottomText?: string;
  };
};

export function buildV2RuntimeSiteContext(
  siteCode: string,
  config: SiteConfig
): V2RuntimeSiteContext {
  const unitTypeEnabled = isUnitTypeFieldEnabled(config);
  const visitDateEnabled = isVisitDateFieldEnabled(config);
  return {
    siteCode,
    siteName: String(config.siteName || "").trim(),
    phone: String(config.phone || "").trim(),
    managerName: config.managerName?.trim() || undefined,
    privacyText:
      config.cta?.privacyText?.trim() ||
      "개인정보 수집 및 이용에 동의합니다.",
    formButtonText:
      config.cta?.buttonText?.trim() || "방문예약하기",
    unitTypeEnabled,
    unitTypeOptions: unitTypeEnabled
      ? resolveUnitTypeOptions(config)
      : [],
    visitDateEnabled,
    visitDateOptions: visitDateEnabled
      ? resolveVisitDateOptions(config)
      : [],
    footer: {
      items: (config.footer?.items ?? [])
        .map((item) => ({
          title: String(item.title || "").trim(),
          content: String(item.content || "").trim(),
        }))
        .filter((item) => item.title || item.content),
      bottomText: formatFooterBottomText(config.footer?.bottomText),
    },
  };
}
