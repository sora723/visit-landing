/**
 * V2 Draft Preview 로드 — env/URL 구성 후 Draft Preview core 사용.
 * Published parser / published revision 정책 사용 금지.
 * Published 60s cache / React cache 사용 금지. no-store only.
 */

import "server-only";

import {
  getAppsScriptEnv,
  maskAppsScriptUrl,
} from "@/lib/apps-script-env";
import {
  loadV2DraftPreviewPageCore,
  type V2PublishedHttpFetcher,
} from "@/v2/server/load-v2-published-page-core";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";
import { V2_PREVIEW_QUERY_PARAM } from "@/v2/preview/v2-preview-token";

export type { V2PublishedHttpFetcher };

const LOG = "[loadV2DraftPreviewPage]";

export const defaultV2PreviewHttpFetcher: V2PublishedHttpFetcher = async (
  url
) => {
  const res = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const bodyText = await res.text();
  return { ok: res.ok, status: res.status, bodyText };
};

/**
 * GET action=v2.page.preview&siteCode=…&t=… (임의 revisionId 쿼리 없음)
 * expectedDraftRevisionId: Preview cookie/token에서 이미 검증된 값.
 */
export async function loadV2DraftPreviewPageUncached(
  siteCodeInput: string,
  previewToken: string,
  expectedDraftRevisionIdInput: string,
  httpFetcher: V2PublishedHttpFetcher = defaultV2PreviewHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(siteCodeInput ?? "").trim();
  const token = String(previewToken ?? "").trim();
  const expectedDraftRevisionId = String(
    expectedDraftRevisionIdInput ?? ""
  ).trim();
  if (!siteCode || !token || !expectedDraftRevisionId) {
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
    `${appsScriptUrl}?action=v2.page.preview` +
    `&siteCode=${encodeURIComponent(siteCode)}` +
    `&${V2_PREVIEW_QUERY_PARAM}=${encodeURIComponent(token)}`;

  if (requestUrl.includes("revisionId=")) {
    return {
      ok: false,
      reason: "invalid-response",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["invalid-response"],
    };
  }

  return loadV2DraftPreviewPageCore({
    siteCode,
    expectedDraftRevisionId,
    requestUrl,
    httpFetcher,
    maskedBaseUrl: maskAppsScriptUrl(appsScriptUrl),
  });
}
