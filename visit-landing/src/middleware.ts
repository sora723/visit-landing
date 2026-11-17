import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  fetchDomainSiteCodeMap,
  resolveSiteCodeFromDomainMap,
} from "@/lib/fetch-domain-site-code-map";
import { isTenantHostname } from "@/lib/platform-hostname";
import {
  getRequestHostname,
  isValidSiteCodePathSegment,
  normalizeSiteCode,
  resolveSiteCodeInput,
} from "@/lib/resolve-site-code";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/favicon.ico") {
    /**
     * 브라우저가 자동으로 /favicon.ico 를 먼저 요청함.
     * app/favicon.ico 기본 파일은 금지(다른 현장·깨진 아이콘 우선 노출).
     * siteCode: query → cookie → 커스텀 도메인만. env/L001 폴백 금지.
     */
    let siteCode = normalizeSiteCode(
      request.nextUrl.searchParams.get("siteCode")
    );
    if (!siteCode) {
      const fromCookie = normalizeSiteCode(
        request.cookies.get("siteCode")?.value
      );
      if (isValidSiteCodePathSegment(fromCookie)) siteCode = fromCookie;
    }
    if (!siteCode) {
      const hostname = getRequestHostname(request);
      if (isTenantHostname(hostname)) {
        const domainMap = await fetchDomainSiteCodeMap({ waitIfCold: true });
        siteCode = normalizeSiteCode(
          resolveSiteCodeFromDomainMap(hostname, domainMap)
        );
      }
    }

    if (!siteCode) {
      return new NextResponse(null, {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
          "CDN-Cache-Control": "no-store",
        },
      });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-site-code", siteCode);

    const url = request.nextUrl.clone();
    url.pathname = "/api/favicon";
    url.searchParams.set("siteCode", siteCode);
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  const fromQuery = request.nextUrl.searchParams.get("siteCode");
  const fromCookie = request.cookies.get("siteCode")?.value;
  const hostname = getRequestHostname(request);
  const tenantHost = isTenantHostname(hostname);
  const hasQuerySite = Boolean(normalizeSiteCode(fromQuery));
  const hasCookieSite = isValidSiteCodePathSegment(
    normalizeSiteCode(fromCookie)
  );

  /**
   * 커스텀 도메인: Host→siteCode 를 항상 확정(콜드여도 GAS await).
   * 빈 맵/L001 폴백으로 다른 현장이 잠깐이라도 보이면 안 됨.
   * 공유 호스트: ?siteCode= 또는 유효 cookie 면 domains 조회 생략(광고 TTFB).
   */
  let domainSiteCode: string | null = null;
  const shouldResolveDomain =
    !hasQuerySite && (tenantHost || !hasCookieSite);

  if (shouldResolveDomain) {
    const domainMap = await fetchDomainSiteCodeMap({
      waitIfCold: tenantHost,
    });
    domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);
  }

  let siteCode = "";
  let siteUnresolved = false;

  if (hasQuerySite) {
    siteCode = resolveSiteCodeInput({
      querySiteCode: fromQuery,
      domainSiteCode,
      cookieSiteCode: fromCookie,
    });
  } else if (tenantHost) {
    if (domainSiteCode) {
      // 도메인이 쿠키보다 우선 — 잘못된 쿠키로 다른 현장 노출 방지
      siteCode = normalizeSiteCode(domainSiteCode);
    } else {
      siteUnresolved = true;
    }
  } else {
    siteCode = resolveSiteCodeInput({
      querySiteCode: fromQuery,
      domainSiteCode,
      cookieSiteCode: fromCookie,
    });
  }

  const requestHeaders = new Headers(request.headers);
  if (siteUnresolved) {
    requestHeaders.set("x-site-unresolved", "1");
    requestHeaders.delete("x-site-code");
  } else {
    requestHeaders.set("x-site-code", siteCode);
    requestHeaders.delete("x-site-unresolved");
  }
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (siteUnresolved) {
    response.headers.set("x-site-unresolved", "1");
    response.headers.delete("x-site-code");
  } else {
    response.headers.set("x-site-code", siteCode);
  }

  const shouldPersistCookie =
    Boolean(fromQuery?.trim()) || Boolean(domainSiteCode);

  if (shouldPersistCookie && siteCode) {
    response.cookies.set("siteCode", siteCode, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/favicon.ico",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
