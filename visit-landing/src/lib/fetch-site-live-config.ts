/** Google Sheet 콘텐츠관리 — 실시간 UI 설정 (site.config) */

import siteJson from "../../config/site.json";
import {
  getAppsScriptEnv,
  logAppsScriptEnv,
  maskAppsScriptUrl,
} from "@/lib/apps-script-env";
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
import { buildSiteConfigFromApi } from "@/lib/site-config-from-api";
import {
  parseSiteConfigApiResponse,
  type VisitDateOption,
} from "@/lib/site-config-api";
import type { SiteConfig } from "@/lib/types";

export type { VisitDateOption };

export type SiteLiveConfigFailureReason =
  | "EMPTY_APPS_SCRIPT_URL"
  | "FETCH_ERROR"
  | "HTTP_ERROR"
  | "HTML_RESPONSE"
  | "JSON_PARSE_ERROR"
  | "API_NOT_SUCCESS"
  | "PARSE_RESPONSE_ERROR";

export type SiteLiveConfigDebug = {
  reason: SiteLiveConfigFailureReason;
  fetchUrl?: string;
  fetchUrlMasked?: string;
  httpStatus?: number;
  contentType?: string | null;
  responseSnippet?: string;
  appsScriptUrlConfigured: boolean;
  appsScriptUrlLength: number;
  deploymentId: string | null;
  siteCode: string;
};

export type SiteLiveConfigData = {
  source: "sheet" | "unavailable";
  siteConfig: SiteConfig | null;
  conversionTracking: ConversionTrackingConfig;
  ownershipVerification: OwnershipVerificationConfig;
  updatedAt?: string;
  debug?: SiteLiveConfigDebug;
};

const LOG = "[fetchSiteLiveConfigFromSheet]";
const FILE_FALLBACK = siteJson as SiteConfig;

function unavailableResult(debug: SiteLiveConfigDebug): SiteLiveConfigData {
  return {
    source: "unavailable",
    siteConfig: null,
    conversionTracking: EMPTY_CONVERSION_TRACKING,
    ownershipVerification: EMPTY_OWNERSHIP_VERIFICATION,
    debug,
  };
}

function looksLikeHtml(body: string): boolean {
  const t = body.trimStart().slice(0, 20).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

export async function fetchSiteLiveConfigFromSheet(
  siteCodeOverride?: string | null
): Promise<SiteLiveConfigData> {
  const envDebug = logAppsScriptEnv(LOG, siteCodeOverride);
  const { url: appsScriptUrl, siteCode, deploymentId } =
    getAppsScriptEnv(siteCodeOverride);

  const baseDebug: Omit<SiteLiveConfigDebug, "reason"> = {
    appsScriptUrlConfigured: envDebug.appsScriptUrlConfigured,
    appsScriptUrlLength: envDebug.appsScriptUrlLength,
    deploymentId,
    siteCode,
  };

  if (!appsScriptUrl) {
    console.error(`${LOG} APPS_SCRIPT_URL empty — returning unavailable`);
    return unavailableResult({
      ...baseDebug,
      reason: "EMPTY_APPS_SCRIPT_URL",
    });
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
      signal: AbortSignal.timeout(15000),
    });

    const bodyText = await res.text();
    const contentType = res.headers.get("content-type");
    console.error(`${LOG} response status=${res.status} content-type=${contentType ?? "(none)"}`);
    console.error(`${LOG} response body=${bodyText.slice(0, 800)}`);

    const fetchDebug: SiteLiveConfigDebug = {
      ...baseDebug,
      reason: "PARSE_RESPONSE_ERROR",
      fetchUrl,
      fetchUrlMasked: maskAppsScriptUrl(appsScriptUrl) + `?action=site.config&siteCode=${siteCode}`,
      httpStatus: res.status,
      contentType,
      responseSnippet: bodyText.slice(0, 200),
    };

    if (!res.ok) {
      return unavailableResult({ ...fetchDebug, reason: "HTTP_ERROR" });
    }

    if (looksLikeHtml(bodyText)) {
      console.error(
        `${LOG} HTML response — Web App 접근 권한을 "모든 사용자(익명 포함)"로 배포했는지 확인`
      );
      return unavailableResult({ ...fetchDebug, reason: "HTML_RESPONSE" });
    }

    let json: unknown;
    try {
      json = JSON.parse(bodyText);
    } catch (parseErr) {
      console.error(`${LOG} JSON parse failed:`, parseErr);
      return unavailableResult({ ...fetchDebug, reason: "JSON_PARSE_ERROR" });
    }

    if (isRecord(json) && json.success === false) {
      return unavailableResult({ ...fetchDebug, reason: "API_NOT_SUCCESS" });
    }

    const parsed = parseSiteConfigApiResponse(json, siteCode);
    if (parsed) {
      return {
        source: "sheet",
        siteConfig: buildSiteConfigFromApi(parsed, FILE_FALLBACK),
        conversionTracking: parseConversionTracking(parsed.conversionTracking),
        ownershipVerification: parseOwnershipVerification(parsed.ownershipVerification),
        updatedAt: parsed.updatedAt,
      };
    }

    console.error(`${LOG} Apps Script success=false or data missing`);
    return unavailableResult({ ...fetchDebug, reason: "PARSE_RESPONSE_ERROR" });
  } catch (err) {
    console.error(`${LOG} fetch failed:`, err);
    return unavailableResult({
      ...baseDebug,
      reason: "FETCH_ERROR",
      fetchUrl,
      fetchUrlMasked: maskAppsScriptUrl(appsScriptUrl) + `?action=site.config&siteCode=${siteCode}`,
      responseSnippet: err instanceof Error ? err.message : String(err),
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** @deprecated fetchSiteLiveConfigFromSheet 사용 */
export async function fetchStickyPromoFromSheet(siteCodeOverride?: string | null) {
  const data = await fetchSiteLiveConfigFromSheet(siteCodeOverride);
  return {
    siteCode: data.siteConfig?.siteCode ?? FILE_FALLBACK.siteCode,
    stickyPromoText: data.siteConfig?.stickyPromoText ?? null,
    updatedAt: data.updatedAt,
    source: data.source,
  };
}
