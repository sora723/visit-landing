/**
 * Draft Preview 진입점 — Published fetch/cache와 분리.
 */

import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import {
  loadV2DraftPreviewPageUncached,
  defaultV2PreviewHttpFetcher,
} from "@/v2/server/load-v2-draft-preview-page";
import type { V2PublishedHttpFetcher } from "@/v2/server/load-v2-published-page-core";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";

export type { V2PublishedHttpFetcher };
export { defaultV2PreviewHttpFetcher };

/** page.tsx Preview 경로 — 캐시 없음 */
export async function loadV2DraftPreviewPage(
  siteCode: string,
  previewToken: string
): Promise<FetchV2PublishedPageResult> {
  noStore();
  return loadV2DraftPreviewPageUncached(siteCode, previewToken);
}

/** 테스트용 */
export function loadV2DraftPreviewPageForTest(
  siteCode: string,
  previewToken: string,
  httpFetcher: V2PublishedHttpFetcher
): Promise<FetchV2PublishedPageResult> {
  return loadV2DraftPreviewPageUncached(siteCode, previewToken, httpFetcher);
}
