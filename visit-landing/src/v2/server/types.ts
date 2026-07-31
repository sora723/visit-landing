/**
 * V2 Published 공개 읽기 — 서버 전용 타입.
 * Preview / Draft 계약과 분리.
 */

import type { ValidatedV2Page, V2Warning } from "@/v2/types";

export type V2PublishedFetchReason =
  | "not-configured"
  | "not-published"
  | "network"
  | "invalid-response"
  | "invalid-page";

export type FetchV2PublishedPageSuccess = {
  ok: true;
  page: ValidatedV2Page;
  warnings: V2Warning[];
  /** Apps Script가 확정한 published revision (결과 모델에도 page.revisionId로 포함) */
  revisionId: string;
};

export type FetchV2PublishedPageFailure = {
  ok: false;
  reason: V2PublishedFetchReason;
  publicMessage: string;
  /** Apps Script 오류 코드 (있을 때만, 로그·매핑용) */
  remoteCode?: string;
};

export type FetchV2PublishedPageResult =
  | FetchV2PublishedPageSuccess
  | FetchV2PublishedPageFailure;

/** Apps Script `v2.page.published` 성공 data (허용 필드만) */
export type V2PublishedRemoteData = {
  siteCode: string;
  revisionId: string;
  pageSchemaVersion: string;
  blocks: unknown[];
  contents: unknown[];
};

export const V2_PUBLISHED_PUBLIC_MESSAGES: Record<
  V2PublishedFetchReason,
  string
> = {
  "not-configured": "Published V2 page is not configured.",
  "not-published": "Published V2 page is not available.",
  network: "Published V2 page is temporarily unavailable.",
  "invalid-response": "Published V2 page is temporarily unavailable.",
  "invalid-page": "Published V2 page is temporarily unavailable.",
};
