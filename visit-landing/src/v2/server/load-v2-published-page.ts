/**
 * V2 Published 공개 페이지 — 서버 전용 wrapper.
 * env·실제 Apps Script URL 구성 후 pure core 호출.
 */

import "server-only";

import {
  getAppsScriptEnv,
  maskAppsScriptUrl,
} from "@/lib/apps-script-env";
import {
  loadV2PublishedPageCore,
  type V2PublishedHttpFetcher,
} from "@/v2/server/load-v2-published-page-core";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";

const LOG = "[loadV2PublishedPage]";

export type { V2PublishedHttpFetcher };

export const defaultV2PublishedHttpFetcher: V2PublishedHttpFetcher = async (
  url
) => {
  const res = await fetch(url, {
    next: { revalidate: 60 },
    redirect: "follow",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, bodyText };
};

/**
 * GET action=v2.page.published&siteCode=… (revisionId 쿼리 없음)
 */
export async function loadV2PublishedPageUncached(
  siteCodeInput: string,
  httpFetcher: V2PublishedHttpFetcher = defaultV2PublishedHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(siteCodeInput ?? "").trim();
  if (!siteCode) {
    return {
      ok: false,
      reason: "invalid-response",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["invalid-response"],
    };
  }

  const { url: appsScriptUrl } = getAppsScriptEnv(siteCode);
  if (!appsScriptUrl) {
    console.error(`${LOG} APPS_SCRIPT_URL empty`);
    return {
      ok: false,
      reason: "network",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES.network,
    };
  }

  const requestUrl =
    `${appsScriptUrl}?action=v2.page.published` +
    `&siteCode=${encodeURIComponent(siteCode)}`;

  return loadV2PublishedPageCore({
    siteCode,
    requestUrl,
    httpFetcher,
    maskedBaseUrl: maskAppsScriptUrl(appsScriptUrl),
  });
}
