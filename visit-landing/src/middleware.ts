import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { resolveSiteCode } from "@/lib/resolve-site-code";

export function middleware(request: NextRequest) {
  const fromQuery = request.nextUrl.searchParams.get("siteCode");
  const fromCookie = request.cookies.get("siteCode")?.value;
  const siteCode = resolveSiteCode(fromQuery ?? fromCookie);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-site-code", siteCode);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("x-site-code", siteCode);

  if (fromQuery?.trim()) {
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
