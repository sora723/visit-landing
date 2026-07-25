/**
 * V2 Draft Preview 응답 파싱 — Published parser와 완전 분리.
 * revisionId는 expectedDraftRevisionId와 정확히 일치 + draft-{siteCode}- 형식만 허용.
 */

import type {
  V2PublishedFetchReason,
  V2PublishedRemoteData,
} from "@/v2/server/types";
import { mapV2RemoteCodeToReason } from "@/v2/server/parse-v2-published-response";

export type ParseV2DraftPreviewRemoteOptions = {
  expectedSiteCode: string;
  expectedDraftRevisionId: string;
};

/** draft-{siteCode}-… 형식 (pub- 거부, 타 siteCode draft 거부) */
export function isDraftRevisionIdForSite(
  revisionId: string,
  siteCode: string
): boolean {
  const code = siteCode.trim();
  const rev = revisionId.trim();
  if (!code || !rev) return false;
  return rev.startsWith(`draft-${code}-`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Apps Script `v2.page.preview` JSON → 허용 필드만.
 * expectedSiteCode / expectedDraftRevisionId 와 응답이 모두 일치해야 함.
 */
export function parseV2DraftPreviewRemoteResponse(
  json: unknown,
  options: ParseV2DraftPreviewRemoteOptions
):
  | { ok: true; data: V2PublishedRemoteData }
  | { ok: false; reason: V2PublishedFetchReason; remoteCode?: string } {
  const expectedSiteCode = String(options.expectedSiteCode ?? "").trim();
  const expectedDraftRevisionId = String(
    options.expectedDraftRevisionId ?? ""
  ).trim();

  if (!expectedSiteCode || !expectedDraftRevisionId) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!isDraftRevisionIdForSite(expectedDraftRevisionId, expectedSiteCode)) {
    return { ok: false, reason: "invalid-response" };
  }

  if (!isRecord(json)) {
    return { ok: false, reason: "invalid-response" };
  }

  if (json.ok === false) {
    const remoteCode =
      typeof json.code === "string" ? json.code.trim() : undefined;
    return {
      ok: false,
      reason: mapV2RemoteCodeToReason(remoteCode),
      remoteCode,
    };
  }

  if (json.ok !== true || !isRecord(json.data)) {
    return { ok: false, reason: "invalid-response" };
  }

  const raw = json.data;
  const siteCode = String(raw.siteCode ?? "").trim();
  const revisionId = String(raw.revisionId ?? "").trim();
  const pageSchemaVersion = String(raw.pageSchemaVersion ?? "").trim();

  if (!siteCode || siteCode !== expectedSiteCode) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!pageSchemaVersion) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!revisionId || revisionId !== expectedDraftRevisionId) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!isDraftRevisionIdForSite(revisionId, expectedSiteCode)) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!Array.isArray(raw.blocks)) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!Array.isArray(raw.contents)) {
    return { ok: false, reason: "invalid-response" };
  }

  return {
    ok: true,
    data: {
      siteCode,
      revisionId,
      pageSchemaVersion,
      blocks: raw.blocks,
      contents: raw.contents,
    },
  };
}
