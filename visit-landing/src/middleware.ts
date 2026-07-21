import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  fetchDomainSiteCodeMap,
  resolveSiteCodeFromDomainMap,
} from "@/lib/fetch-domain-site-code-map";
import {
  getRequestHostname,
  resolveSiteCodeInput,
} from "@/lib/resolve-site-code";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/favicon.ico") {
    /**
     * 브라우저 자동 /favicon.ico 는 siteCode 없음.
     * cookie·domain 기본값·L001 로 다른 현장 파비콘을 주면 안 됨.
     * → ?siteCode= 있을 때만 프록시, 없으면 404 (없는 그대로).
     * 실제 아이콘은 metadata의 /api/favicon?siteCode= 만 사용.
     */
    const siteCode = request.nextUrl.searchParams.get("siteCode")?.trim() || "";

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
  const domainMap = await fetchDomainSiteCodeMap();
  const domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);

  const siteCode = resolveSiteCodeInput({
    querySiteCode: fromQuery,
    domainSiteCode,
    cookieSiteCode: fromCookie,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-code", siteCode);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-site-code", siteCode);

  const shouldPersistCookie =
    Boolean(fromQuery?.trim()) || Boolean(domainSiteCode);

  if (shouldPersistCookie) {
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
