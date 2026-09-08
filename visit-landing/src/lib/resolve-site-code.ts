import type { NextRequest } from "next/server";

/** URL ?siteCode= → 현장관리.domain → SHEET_SITE_CODE env → L001 */

export const DEFAULT_SITE_CODE = "L001";

/**
 * 시트·광고 URL은 L013 형식. 소문자 l013 등으로 오면 콘텐츠/접수 실패하므로 대문자로 통일.
 */
export function normalizeSiteCode(siteCode?: string | null): string {
  return String(siteCode ?? "").trim().toUpperCase();
}

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
  const fromQuery = normalizeSiteCode(input.querySiteCode);
  if (fromQuery) return fromQuery;

  const fromBody = normalizeSiteCode(input.bodySiteCode);
  if (fromBody) return fromBody;

  const fromHeader = normalizeSiteCode(input.headerSiteCode);
  if (fromHeader) return fromHeader;

  const fromDomain = normalizeSiteCode(input.domainSiteCode);
  if (fromDomain) return fromDomain;

  const fromCookie = normalizeSiteCode(input.cookieSiteCode);
  if (fromCookie) return fromCookie;

  const fromEnv = normalizeSiteCode(process.env.SHEET_SITE_CODE);
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

  const headerSiteCode = normalizeSiteCode(request.headers.get("x-site-code"));
  if (headerSiteCode && !normalizeSiteCode(fromQuery) && !normalizeSiteCode(bodySiteCode)) {
    return headerSiteCode;
  }

  /** query/body siteCode 가 있으면 domains Apps Script 호출 생략 */
  if (normalizeSiteCode(fromQuery) || normalizeSiteCode(bodySiteCode)) {
    return resolveSiteCodeInput({
      querySiteCode: fromQuery,
      bodySiteCode,
      headerSiteCode: request.headers.get("x-site-code"),
    });
  }

  const hostname = getRequestHostname(request);
  const { fetchDomainSiteCodeMap, resolveSiteCodeFromDomainMap } =
    await import("@/lib/fetch-domain-site-code-map");
  const { isTenantHostname } = await import("@/lib/platform-hostname");
  const tenantHost = isTenantHostname(hostname);
  const domainMap = await fetchDomainSiteCodeMap({ waitIfCold: tenantHost });
  const domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);

  if (tenantHost) {
    if (domainSiteCode) return normalizeSiteCode(domainSiteCode);
    // 커스텀 도메인 미해석 — L001 등 다른 현장으로 떨어지지 않음
    return "";
  }

  return resolveSiteCodeInput({
    querySiteCode: fromQuery,
    bodySiteCode,
    headerSiteCode: request.headers.get("x-site-code"),
    domainSiteCode,
  });
}

export function siteCodeQueryParam(siteCode: string): string {
  return `siteCode=${encodeURIComponent(normalizeSiteCode(siteCode))}`;
}

export function appendSiteCodeQuery(url: string, siteCode: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${siteCodeQueryParam(siteCode)}`;
}

/** siteCode path segment — CDN 캐시 키 분리용 */
const SITE_CODE_PATH_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;

export function isValidSiteCodePathSegment(siteCode: string): boolean {
  return SITE_CODE_PATH_RE.test(normalizeSiteCode(siteCode));
}

/** /api/site-content/L010 — 쿼리 방식 대신 경로로 현장 구분 */
export function siteContentApiPath(siteCode: string): string {
  const code = normalizeSiteCode(siteCode);
  return `/api/site-content/${encodeURIComponent(code)}`;
}
