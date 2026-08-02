/**
 * form_token HMAC — Netlify 발급 / Apps Script 검증 공통 계약.
 * 비밀값은 인자·env로만 취급 (client bundle에 넣지 말 것).
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const FORM_TOKEN_VERSION = "form.token.v1";
export const FORM_TOKEN_TTL_SECONDS = 600;
/** 만료 판정 여유(초) — Netlify/GAS 시계 오차 */
export const FORM_TOKEN_CLOCK_SKEW_SECONDS = 60;
export const FORM_TOKEN_NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;
export const FORM_TOKEN_HMAC_SECRET_ENV = "FORM_TOKEN_HMAC_SECRET";

export type FormTokenPayload = {
  siteCode: string;
  /** Unix epoch seconds */
  expiresAt: number;
  nonce: string;
  signature: string;
};

export type FormTokenVerifyFailureReason =
  | "missing-secret"
  | "invalid-format"
  | "invalid-nonce"
  | "expired"
  | "bad-signature"
  | "site-mismatch";

export type FormTokenVerifyResult =
  | { ok: true; payload: FormTokenPayload }
  | { ok: false; reason: FormTokenVerifyFailureReason };

export function buildFormTokenCanonical(
  siteCode: string,
  expiresAt: number | string,
  nonce: string
): string {
  return [
    FORM_TOKEN_VERSION,
    String(siteCode ?? "").trim(),
    String(expiresAt),
    String(nonce ?? "").trim(),
  ].join("\n");
}

export function stripBase64Padding(value: string): string {
  return String(value || "").replace(/=+$/g, "");
}

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

export function isValidFormTokenNonce(nonce: string): boolean {
  return FORM_TOKEN_NONCE_RE.test(String(nonce || "").trim());
}

export function encodeFormTokenJson(
  fields: Omit<FormTokenPayload, "signature"> & { signature: string }
): string {
  const body = JSON.stringify({
    v: FORM_TOKEN_VERSION,
    siteCode: fields.siteCode,
    expiresAt: fields.expiresAt,
    nonce: fields.nonce,
    signature: fields.signature,
  });
  return toBase64Url(Buffer.from(body, "utf8"));
}

export function decodeFormTokenJson(token: string): FormTokenPayload | null {
  const buf = fromBase64UrlToBuffer(String(token || "").trim());
  if (!buf) return null;
  try {
    const parsed = JSON.parse(buf.toString("utf8")) as Record<string, unknown>;
    if (String(parsed.v ?? "").trim() !== FORM_TOKEN_VERSION) return null;
    const siteCode = String(parsed.siteCode ?? "").trim();
    const nonce = String(parsed.nonce ?? "").trim();
    const signature = stripBase64Padding(String(parsed.signature ?? "").trim());
    const expiresAt = Number(parsed.expiresAt);
    if (!siteCode || !nonce || !signature) return null;
    if (!Number.isFinite(expiresAt) || expiresAt <= 0) return null;
    if (!Number.isInteger(expiresAt)) return null;
    return { siteCode, expiresAt, nonce, signature };
  } catch {
    return null;
  }
}

export function signFormTokenCanonical(
  canonical: string,
  secret: string
): string {
  return toBase64Url(createHmac("sha256", secret).update(canonical, "utf8").digest());
}

export function mintFormToken(
  siteCode: string,
  secret: string,
  options?: { nowSeconds?: number; ttlSeconds?: number; nonce?: string }
): { formToken: string; expiresIn: number } | null {
  const s = String(secret || "");
  const code = String(siteCode || "").trim();
  if (!s || !code) return null;
  const ttl = options?.ttlSeconds ?? FORM_TOKEN_TTL_SECONDS;
  const now = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const expiresAt = now + ttl;
  const nonce =
    options?.nonce ??
    toBase64Url(randomBytes(24)).replace(/=+$/g, "").slice(0, 32);
  if (!isValidFormTokenNonce(nonce)) return null;
  const canonical = buildFormTokenCanonical(code, expiresAt, nonce);
  const signature = signFormTokenCanonical(canonical, s);
  return {
    formToken: encodeFormTokenJson({
      siteCode: code,
      expiresAt,
      nonce,
      signature,
    }),
    expiresIn: ttl,
  };
}

function safeEqualString(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function verifyFormToken(
  token: string,
  secret: string,
  expectedSiteCode: string,
  nowSeconds?: number
): FormTokenVerifyResult {
  const s = String(secret || "");
  if (!s) return { ok: false, reason: "missing-secret" };
  const payload = decodeFormTokenJson(token);
  if (!payload) return { ok: false, reason: "invalid-format" };
  if (!isValidFormTokenNonce(payload.nonce)) {
    return { ok: false, reason: "invalid-nonce" };
  }
  const now = nowSeconds != null ? Number(nowSeconds) : Math.floor(Date.now() / 1000);
  if (payload.expiresAt + FORM_TOKEN_CLOCK_SKEW_SECONDS < now) {
    return { ok: false, reason: "expired" };
  }
  const canonical = buildFormTokenCanonical(
    payload.siteCode,
    payload.expiresAt,
    payload.nonce
  );
  const expected = signFormTokenCanonical(canonical, s);
  if (!safeEqualString(stripBase64Padding(payload.signature), expected)) {
    return { ok: false, reason: "bad-signature" };
  }
  if (
    expectedSiteCode &&
    String(expectedSiteCode).trim() !== payload.siteCode
  ) {
    return { ok: false, reason: "site-mismatch" };
  }
  return { ok: true, payload };
}
