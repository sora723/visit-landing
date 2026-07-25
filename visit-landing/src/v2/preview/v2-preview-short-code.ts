/**
 * V2 Preview 짧은 코드 — 형식·경로 계약 (서버/검증 공유).
 * 실제 발급·조회는 Apps Script CacheService (`pv:`).
 */

export const V2_PREVIEW_SHORT_CODE_RE = /^[A-Za-z0-9]{16,32}$/;
export const V2_PREVIEW_SHORT_PATH_PREFIX = "/p/";

export function isV2PreviewShortCode(code: string): boolean {
  return V2_PREVIEW_SHORT_CODE_RE.test(String(code || "").trim());
}

export function buildV2PreviewShortPath(code: string): string {
  const c = String(code || "").trim();
  if (!isV2PreviewShortCode(c)) return "";
  return `${V2_PREVIEW_SHORT_PATH_PREFIX}${c}`;
}

/** open redirect 방지 — path-only `/p/{code}` */
export function isSafeV2PreviewShortPath(path: string): boolean {
  const p = String(path || "").trim();
  if (!p.startsWith(V2_PREVIEW_SHORT_PATH_PREFIX)) return false;
  if (p.includes("://") || p.includes("//") || p.includes("..")) return false;
  const code = p.slice(V2_PREVIEW_SHORT_PATH_PREFIX.length);
  return isV2PreviewShortCode(code) && !code.includes("/");
}
