/** URL ?siteCode= → SHEET_SITE_CODE env → L001 */

export const DEFAULT_SITE_CODE = "L001";

/** query/cookie/body 값 → 정규화된 siteCode */
export function resolveSiteCode(fromRequest?: string | null): string {
  const trimmed = String(fromRequest ?? "").trim();
  if (trimmed) return trimmed;
  const fromEnv = String(process.env.SHEET_SITE_CODE ?? "").trim();
  return fromEnv || DEFAULT_SITE_CODE;
}

export function siteCodeQueryParam(siteCode: string): string {
  return `siteCode=${encodeURIComponent(siteCode)}`;
}

export function appendSiteCodeQuery(url: string, siteCode: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${siteCodeQueryParam(siteCode)}`;
}
