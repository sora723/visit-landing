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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
