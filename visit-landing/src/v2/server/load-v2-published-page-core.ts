/**
 * V2 Published 공개 로드 — 순수 core (env/fetch URL 구성 없음).
 * 테스트 스크립트는 이 모듈을 import한다.
 */

import { validateV2Page } from "@/v2/validate-v2-page";
import {
  coerceV2BlockRows,
  coerceV2ContentRows,
  parseV2PublishedRemoteResponse,
} from "@/v2/server/parse-v2-published-response";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";

const LOG = "[loadV2PublishedPageCore]";

export type V2PublishedHttpFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  bodyText: string;
}>;

export type LoadV2PublishedPageCoreInput = {
  siteCode: string;
  /** 이미 구성된 Apps Script 요청 URL (호출측이 만듦 — core는 env 미접근) */
  requestUrl: string;
  httpFetcher: V2PublishedHttpFetcher;
  /** 로그용 마스킹 URL (선택) */
  maskedBaseUrl?: string;
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
 * HTTP 응답 → parse → validateV2Page.
 * process.env / getAppsScriptEnv 사용 금지.
 */
export async function loadV2PublishedPageCore(
  input: LoadV2PublishedPageCoreInput
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(input.siteCode ?? "").trim();
  if (!siteCode) {
    return fail("invalid-response");
  }
  if (!input.requestUrl || input.requestUrl.includes("revisionId=")) {
    return fail("invalid-response");
  }

  try {
    const res = await input.httpFetcher(input.requestUrl);
    if (!res.ok) {
      console.error(
        `${LOG} HTTP ${res.status}` +
          (input.maskedBaseUrl ? ` url=${input.maskedBaseUrl}` : "")
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
