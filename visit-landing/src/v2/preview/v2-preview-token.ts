/**
 * V2 Preview HMAC 토큰 — 순수 함수 (Apps Script와 canonical/HMAC 계약 동일).
 * 비밀값은 인자로만 받음. process.env 접근 금지 (client bundle 오염 방지).
 */

import { createHmac, timingSafeEqual } from "crypto";

export const V2_PREVIEW_TOKEN_VERSION = "v2.preview.v1";
export const V2_PREVIEW_TTL_SECONDS = 30 * 60;
export const V2_PREVIEW_COOKIE_NAME = "vl_v2_preview";
export const V2_PREVIEW_QUERY_PARAM = "t";

/** nonce: 16–128자 base64url-ish */
export const V2_PREVIEW_NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;

export type V2PreviewTokenPayload = {
  siteCode: string;
  draftRevisionId: string;
  /** Unix epoch seconds */
  expiresAt: number;
  nonce: string;
  signature: string;
};

export type V2PreviewTokenFields = Omit<V2PreviewTokenPayload, "signature">;

export type V2PreviewVerifyFailureReason =
  | "missing-secret"
  | "invalid-format"
  | "invalid-nonce"
  | "expired"
  | "bad-signature"
  | "site-mismatch"
  | "revision-mismatch";

export type V2PreviewVerifyResult =
  | { ok: true; payload: V2PreviewTokenPayload }
  | { ok: false; reason: V2PreviewVerifyFailureReason };

/** Apps Script / TS 공통 canonical — 필드 순서·구분자 고정 */
export function buildV2PreviewCanonicalString(
  siteCode: string,
  draftRevisionId: string,
  expiresAt: number | string,
  nonce: string
): string {
  return [
    V2_PREVIEW_TOKEN_VERSION,
    String(siteCode ?? "").trim(),
    String(draftRevisionId ?? "").trim(),
    String(expiresAt),
    String(nonce ?? "").trim(),
  ].join("\n");
}

export function stripBase64Padding(value: string): string {
  return String(value || "").replace(/=+$/g, "");
}

/** standard / web-safe base64 → base64url (padding 제거) */
export function toBase64Url(input: string | Buffer): string {
  const b64 =
    typeof input === "string"
      ? input
      : Buffer.from(input).toString("base64");
  return stripBase64Padding(b64.replace(/\+/g, "-").replace(/\//g, "_"));
}

export function fromBase64UrlToBuffer(value: string): Buffer | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  try {
    return Buffer.from(padded + "=".repeat(padLen), "base64");
  } catch {
    return null;
  }
}

export function isValidV2PreviewNonce(nonce: string): boolean {
  return V2_PREVIEW_NONCE_RE.test(String(nonce || "").trim());
}

export function encodeV2PreviewTokenJson(
  fields: V2PreviewTokenFields & { signature: string }
): string {
  const body = JSON.stringify({
    siteCode: fields.siteCode,
    draftRevisionId: fields.draftRevisionId,
    expiresAt: fields.expiresAt,
    nonce: fields.nonce,
    signature: fields.signature,
  });
  return toBase64Url(Buffer.from(body, "utf8"));
}

export function decodeV2PreviewTokenJson(
  token: string
): V2PreviewTokenPayload | null {
  const buf = fromBase64UrlToBuffer(String(token || "").trim());
  if (!buf) return null;
  try {
    const parsed = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    const siteCode = String(parsed.siteCode ?? "").trim();
    const draftRevisionId = String(parsed.draftRevisionId ?? "").trim();
    const nonce = String(parsed.nonce ?? "").trim();
    const signature = stripBase64Padding(String(parsed.signature ?? "").trim());
    const expiresAt = Number(parsed.expiresAt);
    if (!siteCode || !draftRevisionId || !nonce || !signature) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
    if (!Number.isInteger(expiresAt)) return null;
    return { siteCode, draftRevisionId, expiresAt, nonce, signature };
  } catch {
    return null;
  }
}

/**
 * Node HMAC-SHA256 → base64url (padding 없음).
 * Apps Script: Utilities.computeHmacSha256Signature + base64EncodeWebSafe + strip =
 */
export function signV2PreviewCanonical(
  canonical: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(canonical, "utf8")
    .digest("base64url");
}

export function mintV2PreviewToken(
  fields: V2PreviewTokenFields,
  secret: string
): string | null {
  const s = String(secret || "");
  if (!s) return null;
  const siteCode = String(fields.siteCode || "").trim();
  const draftRevisionId = String(fields.draftRevisionId || "").trim();
  const nonce = String(fields.nonce || "").trim();
  const expiresAt = Number(fields.expiresAt);
  if (!siteCode || !draftRevisionId || !isValidV2PreviewNonce(nonce)) return null;
  if (!Number.isInteger(expiresAt) || expiresAt <= 0) return null;

  const canonical = buildV2PreviewCanonicalString(
    siteCode,
    draftRevisionId,
    expiresAt,
    nonce
  );
  const signature = signV2PreviewCanonical(canonical, s);
  return encodeV2PreviewTokenJson({
    siteCode,
    draftRevisionId,
    expiresAt,
    nonce,
    signature,
  });
}

function timingSafeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyV2PreviewToken(
  token: string,
  secret: string,
  options?: {
    nowSeconds?: number;
    expectedSiteCode?: string;
    expectedDraftRevisionId?: string;
  }
): V2PreviewVerifyResult {
  const s = String(secret || "");
  if (!s) return { ok: false, reason: "missing-secret" };

  const payload = decodeV2PreviewTokenJson(token);
  if (!payload) return { ok: false, reason: "invalid-format" };
  if (!isValidV2PreviewNonce(payload.nonce)) {
    return { ok: false, reason: "invalid-nonce" };
  }

  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (payload.expiresAt < now) return { ok: false, reason: "expired" };

  const canonical = buildV2PreviewCanonicalString(
    payload.siteCode,
    payload.draftRevisionId,
    payload.expiresAt,
    payload.nonce
  );
  const expected = signV2PreviewCanonical(canonical, s);
  if (!timingSafeEqualString(stripBase64Padding(payload.signature), expected)) {
    return { ok: false, reason: "bad-signature" };
  }

  if (
    options?.expectedSiteCode &&
    options.expectedSiteCode.trim() !== payload.siteCode
  ) {
    return { ok: false, reason: "site-mismatch" };
  }
  if (
    options?.expectedDraftRevisionId &&
    options.expectedDraftRevisionId.trim() !== payload.draftRevisionId
  ) {
    return { ok: false, reason: "revision-mismatch" };
  }

  return { ok: true, payload };
}

export function previewCookieMaxAgeSeconds(
  expiresAt: number,
  nowSeconds = Math.floor(Date.now() / 1000)
): number {
  const remaining = expiresAt - nowSeconds;
  if (remaining <= 0) return 0;
  return Math.min(remaining, V2_PREVIEW_TTL_SECONDS);
}

/** Preview enter redirect — 동일 origin 내부 홈만. 외부 returnUrl 금지 */
export function buildV2PreviewSafeRedirectPath(siteCode: string): string {
  const code = String(siteCode || "").trim();
  if (!code) return "/";
  return `/?siteCode=${encodeURIComponent(code)}`;
}

export function isAllowedPreviewOrigin(
  requestedOrigin: string,
  allowlistRaw: string
): string | null {
  const requested = normalizePreviewOrigin(requestedOrigin);
  if (!requested) return null;
  const allowed = parsePreviewOriginAllowlist(allowlistRaw);
  if (allowed.length === 0) return null;
  if (allowed.includes(requested)) return requested;
  return null;
}

export function parsePreviewOriginAllowlist(raw: string): string[] {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => normalizePreviewOrigin(s))
    .filter((s): s is string => Boolean(s));
}

export function normalizePreviewOrigin(value: string): string | null {
  const t = String(value || "").trim().replace(/\/+$/, "");
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    if (u.pathname && u.pathname !== "/") return null;
    if (u.search || u.hash) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}
