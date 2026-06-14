import type { NextRequest } from "next/server";

/** URL ?siteCode= → SHEET_SITE_CODE env → L001 */

export const DEFAULT_SITE_CODE = "L001";

/** query/cookie/body 값 → 정규화된 siteCode */
export function resolveSiteCode(fromRequest?: string | null): string {
  const trimmed = String(fromRequest ?? "").trim();
  if (trimmed) return trimmed;
  const fromEnv = String(process.env.SHEET_SITE_CODE ?? "").trim();
  return fromEnv || DEFAULT_SITE_CODE;
}

/** API Route — query → body → middleware header → env (Netlify searchParams 누락 대비) */
export function resolveRequestSiteCode(
  request: NextRequest,
  bodySiteCode?: string | null
): string {
  const fromQuery =
    request.nextUrl.searchParams.get("siteCode") ??
    new URL(request.url).searchParams.get("siteCode");
  const fromHeader = request.headers.get("x-site-code");
  return resolveSiteCode(fromQuery ?? bodySiteCode ?? fromHeader);
}

export function siteCodeQueryParam(siteCode: string): string {
  return `siteCode=${encodeURIComponent(siteCode)}`;
}

export function appendSiteCodeQuery(url: string, siteCode: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${siteCodeQueryParam(siteCode)}`;
}
