/**
 * V2 Published 공개 페이지 — 원격 로드 + 스키마 검증 (캐시 없음).
 * server-only 없음 → 단위 테스트에서 fetcher 주입 가능.
 */

import {
  getAppsScriptEnv,
  maskAppsScriptUrl,
} from "@/lib/apps-script-env";
import { validateV2Page } from "@/v2/validate-v2-page";
import {
  coerceV2BlockRows,
  coerceV2ContentRows,
  parseV2PublishedRemoteResponse,
} from "@/v2/server/parse-v2-published-response";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";

const LOG = "[loadV2PublishedPage]";

export type V2PublishedHttpFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  bodyText: string;
}>;

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

function fail(
  reason: Exclude<FetchV2PublishedPageResult, { ok: true }>["reason"],
  remoteCode?: string
): FetchV2PublishedPageResult {
  return {
    ok: false,
    reason,
    publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES[reason],
    ...(remoteCode ? { remoteCode } : {}),
  };
}

function looksLikeHtml(body: string): boolean {
  const t = body.trimStart().slice(0, 20).toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

/**
 * GET action=v2.page.published&siteCode=… (revisionId 쿼리 없음)
 */
export async function loadV2PublishedPageUncached(
  siteCodeInput: string,
  httpFetcher: V2PublishedHttpFetcher = defaultV2PublishedHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(siteCodeInput ?? "").trim();
  if (!siteCode) {
    return fail("invalid-response");
  }

  const { url: appsScriptUrl } = getAppsScriptEnv(siteCode);
  if (!appsScriptUrl) {
    console.error(`${LOG} APPS_SCRIPT_URL empty`);
    return fail("network");
  }

  const fetchUrl =
    `${appsScriptUrl}?action=v2.page.published` +
    `&siteCode=${encodeURIComponent(siteCode)}`;

  try {
    const res = await httpFetcher(fetchUrl);
    if (!res.ok) {
      console.error(
        `${LOG} HTTP ${res.status} url=${maskAppsScriptUrl(appsScriptUrl)}`
      );
      return fail("network");
    }
    if (looksLikeHtml(res.bodyText)) {
      console.error(`${LOG} HTML response (deploy access?)`);
      return fail("network");
    }

    let json: unknown;
    try {
      json = JSON.parse(res.bodyText);
    } catch {
      console.error(`${LOG} JSON parse failed`);
      return fail("invalid-response");
    }

    const parsed = parseV2PublishedRemoteResponse(json, siteCode);
    if (!parsed.ok) {
      return fail(parsed.reason, parsed.remoteCode);
    }

    const { data } = parsed;
    const validated = validateV2Page({
      siteCode: data.siteCode,
      revisionId: data.revisionId,
      pageSchemaVersion: data.pageSchemaVersion,
      blocks: coerceV2BlockRows(data.blocks),
      contents: coerceV2ContentRows(data.contents),
    });

    if (!validated.ok) {
      console.error(
        `${LOG} schema fatal siteCode=${siteCode} codes=${validated.fatalErrors
          .map((e) => e.code)
          .join(",")}`
      );
      return fail("invalid-page");
    }

    return {
      ok: true,
      page: validated.page,
      warnings: validated.warnings,
      revisionId: data.revisionId,
    };
  } catch (err) {
    console.error(
      `${LOG} fetch failed:`,
      err instanceof Error ? err.message : "error"
    );
    return fail("network");
  }
}
