/**
 * 공개 Published V2 페이지 서버 로더 (React cache + 60s dedupe).
 * page.tsx: rendererVersion === v2 일 때 loadV2PublishedPage(siteCode) 연결.
 */

import "server-only";

import { cache } from "react";
import {
  loadV2PublishedPageUncached,
  type V2PublishedHttpFetcher,
} from "@/v2/server/load-v2-published-page";
import { dedupeV2PublishedPageFetch } from "@/v2/server/v2-published-page-cache";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";
import { V2_PUBLISHED_PUBLIC_MESSAGES } from "@/v2/server/types";

function failNetwork(): FetchV2PublishedPageResult {
  return {
    ok: false,
    reason: "network",
    publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES.network,
  };
}

async function fetchV2PublishedPageImpl(
  siteCodeInput: string,
  httpFetcher?: V2PublishedHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  const siteCode = String(siteCodeInput ?? "").trim();
  if (!siteCode) {
    return {
      ok: false,
      reason: "invalid-response",
      publicMessage: V2_PUBLISHED_PUBLIC_MESSAGES["invalid-response"],
    };
  }

  try {
    return await dedupeV2PublishedPageFetch(siteCode, async () => {
      const result = await loadV2PublishedPageUncached(siteCode, httpFetcher);
      if (!result.ok) {
        const err = new Error(result.reason) as Error & {
          v2Result: FetchV2PublishedPageResult;
        };
        err.v2Result = result;
        throw err;
      }
      return result;
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "v2Result" in err &&
      (err as { v2Result: FetchV2PublishedPageResult }).v2Result
    ) {
      return (err as { v2Result: FetchV2PublishedPageResult }).v2Result;
    }
    return failNetwork();
  }
}

/** 요청 단위 React cache + siteCode별 60s/in-flight dedupe */
export const fetchV2PublishedPage = cache(
  (siteCode: string): Promise<FetchV2PublishedPageResult> =>
    fetchV2PublishedPageImpl(siteCode)
);

/** page.tsx Published V2 진입점 (fetchV2PublishedPage와 동일) */
export const loadV2PublishedPage = fetchV2PublishedPage;

/** 테스트용 — React cache 우회, fetcher 주입 */
export function fetchV2PublishedPageForTest(
  siteCode: string,
  httpFetcher: V2PublishedHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  return fetchV2PublishedPageImpl(siteCode, httpFetcher);
}
