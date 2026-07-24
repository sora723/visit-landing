/**
 * V2 Published 공개 응답 파싱·매핑 (순수 함수 — 테스트용).
 * draftRevisionId 등 알 수 없는 최상위 필드는 결과로 전달하지 않음.
 */

import type { V2BlockRow, V2ContentRow } from "@/v2/types";
import type {
  V2PublishedFetchReason,
  V2PublishedRemoteData,
} from "@/v2/server/types";

const REMOTE_CODE_TO_REASON: Record<string, V2PublishedFetchReason> = {
  V2_NOT_CONFIGURED: "not-configured",
  V2_SITE_NOT_FOUND: "not-published",
  V2_NOT_PUBLISHED: "not-published",
  V2_BLOCK_SHEET_MISSING: "not-published",
  V2_CONTENT_SHEET_MISSING: "not-published",
  V2_PUBLISHED_ROWS_EMPTY: "not-published",
  V2_READ_FAILED: "network",
};

export function mapV2RemoteCodeToReason(
  code: string | undefined
): V2PublishedFetchReason {
  if (!code) return "invalid-response";
  return REMOTE_CODE_TO_REASON[code] ?? "invalid-response";
}

export function isPubRevisionId(revisionId: string): boolean {
  return revisionId.startsWith("pub-");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Apps Script JSON → 허용 필드만 추출.
 * ok:false / blocks|contents 비배열 / siteCode 불일치 / pub- 아님 → invalid
 */
export function parseV2PublishedRemoteResponse(
  json: unknown,
  requestedSiteCode: string
):
  | { ok: true; data: V2PublishedRemoteData }
  | { ok: false; reason: V2PublishedFetchReason; remoteCode?: string } {
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
  const pageSchemaVersion = String(raw.pageSchemaVersion ?? "").trim() || "1";

  if (!siteCode || siteCode !== requestedSiteCode) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!revisionId || !isPubRevisionId(revisionId)) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!Array.isArray(raw.blocks)) {
    return { ok: false, reason: "invalid-response" };
  }
  if (!Array.isArray(raw.contents)) {
    return { ok: false, reason: "invalid-response" };
  }

  /** draftRevisionId·기타 최상위/데이터 필드는 의도적으로 무시 */
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

export function coerceV2BlockRows(blocks: unknown[]): V2BlockRow[] {
  return blocks.filter(isRecord).map((row) => ({
    siteCode: String(row.siteCode ?? ""),
    revisionId: String(row.revisionId ?? ""),
    sectionId: String(row.sectionId ?? ""),
    sectionOrder: row.sectionOrder as string | number,
    componentType: String(row.componentType ?? ""),
    variant: String(row.variant ?? ""),
    contentGroup: String(row.contentGroup ?? ""),
    enabled: row.enabled as string | boolean,
    desktopVisible: row.desktopVisible as string | boolean,
    mobileVisible: row.mobileVisible as string | boolean,
    backgroundType: String(row.backgroundType ?? ""),
    backgroundColor: String(row.backgroundColor ?? ""),
    backgroundPc: String(row.backgroundPc ?? ""),
    backgroundMobile: String(row.backgroundMobile ?? ""),
    themeVariant: String(row.themeVariant ?? ""),
    paddingPreset: String(row.paddingPreset ?? ""),
    animationPreset: String(row.animationPreset ?? ""),
    optionsJson: row.optionsJson as V2BlockRow["optionsJson"],
  }));
}

export function coerceV2ContentRows(contents: unknown[]): V2ContentRow[] {
  return contents.filter(isRecord).map((row) => ({
    siteCode: String(row.siteCode ?? ""),
    revisionId: String(row.revisionId ?? ""),
    contentGroup: String(row.contentGroup ?? ""),
    itemId: String(row.itemId ?? ""),
    itemOrder: row.itemOrder as string | number,
    role: String(row.role ?? ""),
    eyebrow: String(row.eyebrow ?? ""),
    title: String(row.title ?? ""),
    subtitle: String(row.subtitle ?? ""),
    description: String(row.description ?? ""),
    value: String(row.value ?? ""),
    badge: String(row.badge ?? ""),
    icon: String(row.icon ?? ""),
    imagePc: String(row.imagePc ?? ""),
    imageMobile: String(row.imageMobile ?? ""),
    videoUrl: String(row.videoUrl ?? ""),
    actionType: String(row.actionType ?? ""),
    actionLabel: String(row.actionLabel ?? ""),
    actionValue: String(row.actionValue ?? ""),
    extraJson: row.extraJson as V2ContentRow["extraJson"],
    enabled: row.enabled as string | boolean,
  }));
}
