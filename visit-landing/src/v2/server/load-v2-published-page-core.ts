/**
 * V2 원격 페이지 로드 core — HTTP/JSON/validate 공통.
 * Published / Draft Preview 는 각자 parser를 주입한다.
 */

import { validateV2Page } from "@/v2/validate-v2-page";
import {
  coerceV2BlockRows,
  coerceV2ContentRows,
  parseV2PublishedRemoteResponse,
} from "@/v2/server/parse-v2-published-response";
import { parseV2DraftPreviewRemoteResponse } from "@/v2/server/parse-v2-draft-preview-response";
import type {
  FetchV2PublishedPageResult,
  V2PublishedFetchReason,
  V2PublishedRemoteData,
} from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";

export type V2PublishedHttpFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  bodyText: string;
}>;

export type V2RemotePageParseResult =
  | { ok: true; data: V2PublishedRemoteData }
  | { ok: false; reason: V2PublishedFetchReason; remoteCode?: string };

export type LoadV2RemotePageCoreInput = {
  siteCode: string;
  /** 이미 구성된 Apps Script 요청 URL (호출측이 만듦 — core는 env 미접근) */
  requestUrl: string;
  httpFetcher: V2PublishedHttpFetcher;
  /** Published / Draft 전용 parser (혼용 금지 — 호출측이 선택) */
  parseRemote: (json: unknown) => V2RemotePageParseResult;
  /** 로그용 태그 */
  logTag?: string;
  /** 로그용 마스킹 URL (선택) */
  maskedBaseUrl?: string;
};

export type LoadV2PublishedPageCoreInput = {
  siteCode: string;
  requestUrl: string;
  httpFetcher: V2PublishedHttpFetcher;
  maskedBaseUrl?: string;
};

export type LoadV2DraftPreviewPageCoreInput = {
  siteCode: string;
  /** Preview cookie/token에서 검증된 draftRevisionId */
  expectedDraftRevisionId: string;
  requestUrl: string;
  httpFetcher: V2PublishedHttpFetcher;
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
 * HTTP 응답 → parseRemote → validateV2Page.
 * process.env / getAppsScriptEnv 사용 금지.
 */
export async function loadV2RemotePageCore(
  input: LoadV2RemotePageCoreInput
): Promise<FetchV2PublishedPageResult> {
  const LOG = input.logTag ?? "[loadV2RemotePageCore]";
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

    const parsed = input.parseRemote(json);
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

/**
 * Published 공개 로드 — pub-{siteCode}- revision만 허용.
 */
export async function loadV2PublishedPageCore(
  input: LoadV2PublishedPageCoreInput
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(input.siteCode ?? "").trim();
  return loadV2RemotePageCore({
    siteCode,
    requestUrl: input.requestUrl,
    httpFetcher: input.httpFetcher,
    maskedBaseUrl: input.maskedBaseUrl,
    logTag: "[loadV2PublishedPageCore]",
    parseRemote: (json) => parseV2PublishedRemoteResponse(json, siteCode),
  });
}

/**
 * Draft Preview 로드 — expectedDraftRevisionId와 정확히 일치하는 draft만 허용.
 * Published parser를 사용하지 않음.
 */
export async function loadV2DraftPreviewPageCore(
  input: LoadV2DraftPreviewPageCoreInput
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(input.siteCode ?? "").trim();
  const expectedDraftRevisionId = String(
    input.expectedDraftRevisionId ?? ""
  ).trim();
  if (!siteCode || !expectedDraftRevisionId) {
    return fail("invalid-response");
  }

  return loadV2RemotePageCore({
    siteCode,
    requestUrl: input.requestUrl,
    httpFetcher: input.httpFetcher,
    maskedBaseUrl: input.maskedBaseUrl,
    logTag: "[loadV2DraftPreviewPageCore]",
    parseRemote: (json) =>
      parseV2DraftPreviewRemoteResponse(json, {
        expectedSiteCode: siteCode,
        expectedDraftRevisionId,
      }),
  });
}
