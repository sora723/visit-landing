import type { NextRequest } from "next/server";

/** URL ?siteCode= → 현장관리.domain → SHEET_SITE_CODE env → L001 */

export const DEFAULT_SITE_CODE = "L001";

export type ResolveSiteCodeInput = {
  querySiteCode?: string | null;
  bodySiteCode?: string | null;
  headerSiteCode?: string | null;
  /** fetchDomainSiteCodeMap() + hostname 으로 미리 조회한 siteCode */
  domainSiteCode?: string | null;
  cookieSiteCode?: string | null;
};

/** 우선순위: query → body → header → domain(시트) → cookie → env → L001 */
export function resolveSiteCodeInput(input: ResolveSiteCodeInput = {}): string {
  const fromQuery = String(input.querySiteCode ?? "").trim();
  if (fromQuery) return fromQuery;

  const fromBody = String(input.bodySiteCode ?? "").trim();
  if (fromBody) return fromBody;

  const fromHeader = String(input.headerSiteCode ?? "").trim();
  if (fromHeader) return fromHeader;

  const fromDomain = String(input.domainSiteCode ?? "").trim();
  if (fromDomain) return fromDomain;

  const fromCookie = String(input.cookieSiteCode ?? "").trim();
  if (fromCookie) return fromCookie;

  const fromEnv = String(process.env.SHEET_SITE_CODE ?? "").trim();
  return fromEnv || DEFAULT_SITE_CODE;
}

export function resolveSiteCode(fromRequest?: string | null): string {
  return resolveSiteCodeInput({ querySiteCode: fromRequest });
}

export function getRequestHostname(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname ??
    ""
  );
}

/** API Route — query → body → middleware header → domain(시트) → env */
export async function resolveRequestSiteCode(
  request: NextRequest,
  bodySiteCode?: string | null
): Promise<string> {
  const fromQuery =
    request.nextUrl.searchParams.get("siteCode") ??
    new URL(request.url).searchParams.get("siteCode");

  const hostname = getRequestHostname(request);
  const { fetchDomainSiteCodeMap, resolveSiteCodeFromDomainMap } =
    await import("@/lib/fetch-domain-site-code-map");
  const domainMap = await fetchDomainSiteCodeMap();
  const domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);

  return resolveSiteCodeInput({
    querySiteCode: fromQuery,
    bodySiteCode,
    headerSiteCode: request.headers.get("x-site-code"),
    domainSiteCode,
  });
}

export function siteCodeQueryParam(siteCode: string): string {
  return `siteCode=${encodeURIComponent(siteCode)}`;
}

export function appendSiteCodeQuery(url: string, siteCode: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${siteCodeQueryParam(siteCode)}`;
}
