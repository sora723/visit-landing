/**
 * V2 Preview short code — Apps Script CacheService resolve (server-only).
 */

import "server-only";
import { isV2PreviewShortCode } from "@/v2/preview/v2-preview-short-code";

export type V2PreviewShortResolveResult =
  | { ok: true; siteCode: string; token: string; expiresAt: number }
  | { ok: false; reason: string };

function getAppsScriptUrl(): string {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

export async function resolveV2PreviewShortCode(
  code: string
): Promise<V2PreviewShortResolveResult> {
  const trimmed = String(code || "").trim();
  if (!isV2PreviewShortCode(trimmed)) {
    return { ok: false, reason: "invalid-code" };
  }

  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    return { ok: false, reason: "not-configured" };
  }

  const url =
    `${appsScriptUrl}?action=v2.preview.short.resolve` +
    `&code=${encodeURIComponent(trimmed)}`;

  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    const json = (await res.json()) as {
      success?: boolean;
      data?: {
        siteCode?: string;
        token?: string;
        expiresAt?: number;
      } | null;
      error?: { code?: string; message?: string } | null;
    };

    if (!json.success || !json.data) {
      return { ok: false, reason: "not-found" };
    }

    const siteCode = String(json.data.siteCode || "").trim();
    const token = String(json.data.token || "").trim();
    const expiresAt = Number(json.data.expiresAt);
    if (!siteCode || !token) {
      return { ok: false, reason: "invalid-payload" };
    }
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
      return { ok: false, reason: "invalid-payload" };
    }

    return { ok: true, siteCode, token, expiresAt };
  } catch {
    return { ok: false, reason: "network" };
  }
}
