/** Google Sheet 콘텐츠관리 — 실시간 UI 설정 (site.config) */

import {
  DEFAULT_SITE_THEME,
  mergeSiteTheme,
  type SiteTheme,
} from "@/lib/site-theme";
import {
  EMPTY_CONVERSION_TRACKING,
  parseConversionTracking,
  type ConversionTrackingConfig,
} from "@/lib/conversion-tracking";
import {
  EMPTY_OWNERSHIP_VERIFICATION,
  parseOwnershipVerification,
  type OwnershipVerificationConfig,
} from "@/lib/ownership-verification";
import {
  parseSiteConfigApiResponse,
  type VisitDateOption,
} from "@/lib/site-config-api";

export type { VisitDateOption };

export type SiteLiveConfigData = {
  siteCode: string;
  stickyPromoText: string | null;
  unitTypeOptions: string[];
  visitDateDays: number;
  visitDateOptions: VisitDateOption[] | null;
  unitTypeEnabled: boolean;
  visitDateEnabled: boolean;
  theme: SiteTheme;
  conversionTracking: ConversionTrackingConfig;
  ownershipVerification: OwnershipVerificationConfig;
  updatedAt?: string;
  source: "sheet" | "unavailable";
};

const LOG = "[fetchSiteLiveConfigFromSheet]";

function getEnv() {
  const raw = process.env.APPS_SCRIPT_URL ?? "";
  return {
    url: raw.replace(/\/$/, ""),
    siteCode: process.env.SHEET_SITE_CODE ?? "L001",
  };
}

function mapApiDataToLiveConfig(
  data: NonNullable<ReturnType<typeof parseSiteConfigApiResponse>>
): SiteLiveConfigData {
  return {
    siteCode: data.siteCode,
    stickyPromoText: data.stickyPromoText,
    unitTypeOptions: data.unitTypeOptions,
    visitDateDays: data.visitDateDays,
    visitDateOptions: data.visitDateOptions,
    unitTypeEnabled: data.unitTypeEnabled,
    visitDateEnabled: data.visitDateEnabled,
    theme: mergeSiteTheme({
      mainColor: data.mainColor,
      subColor: data.subColor,
      accentColor: data.accentColor,
    }),
    conversionTracking: parseConversionTracking(data.conversionTracking),
    ownershipVerification: parseOwnershipVerification(data.ownershipVerification),
    updatedAt: data.updatedAt,
    source: "sheet",
  };
}

export async function fetchSiteLiveConfigFromSheet(): Promise<SiteLiveConfigData> {
  const { url: appsScriptUrl, siteCode } = getEnv();

  const unavailable: SiteLiveConfigData = {
    siteCode,
    stickyPromoText: null,
    unitTypeOptions: [],
    visitDateDays: 30,
    visitDateOptions: null,
    unitTypeEnabled: true,
    visitDateEnabled: true,
    theme: DEFAULT_SITE_THEME,
    conversionTracking: EMPTY_CONVERSION_TRACKING,
    ownershipVerification: EMPTY_OWNERSHIP_VERIFICATION,
    source: "unavailable",
  };

  if (!appsScriptUrl) {
    console.error(`${LOG} APPS_SCRIPT_URL empty — returning unavailable`);
    return unavailable;
  }

  const fetchUrl =
    `${appsScriptUrl}?action=site.config` +
    `&siteCode=${encodeURIComponent(siteCode)}`;

  try {
    console.error(`${LOG} fetch URL=${fetchUrl}`);

    const res = await fetch(fetchUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    const bodyText = await res.text();
    console.error(
      `${LOG} response status=${res.status} content-type=${res.headers.get("content-type") ?? "(none)"}`
    );
    console.error(`${LOG} response body=${bodyText.slice(0, 800)}`);

    let json: unknown;
    try {
      json = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error(`${LOG} JSON parse failed:`, parseErr);
      return unavailable;
    }

    const parsed = parseSiteConfigApiResponse(json, siteCode);
    if (parsed) {
      return mapApiDataToLiveConfig(parsed);
    }

    console.error(`${LOG} Apps Script success=false or data missing`);
  } catch (err) {
    console.error(`${LOG} fetch failed:`, err);
  }

  return unavailable;
}

/** @deprecated fetchSiteLiveConfigFromSheet 사용 */
export async function fetchStickyPromoFromSheet() {
  const data = await fetchSiteLiveConfigFromSheet();
  return {
    siteCode: data.siteCode,
    stickyPromoText: data.stickyPromoText,
    updatedAt: data.updatedAt,
    source: data.source,
  };
}
