/**
 * GET /api/preview/enter?t=…&siteCode=…
 * 서명 검증 → HttpOnly cookie → 토큰 제거된 홈으로 redirect.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  V2_PREVIEW_COOKIE_NAME,
  V2_PREVIEW_QUERY_PARAM,
  buildV2PreviewSafeRedirectPath,
  previewCookieMaxAgeSeconds,
  verifyV2PreviewToken,
} from "@/v2/preview/v2-preview-token";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function forbidden(): NextResponse {
  return new NextResponse("Forbidden", {
    status: 403,
    headers: {
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const secret = String(process.env.V2_PREVIEW_HMAC_SECRET ?? "").trim();
  if (!secret) return forbidden();

  const token = (
    request.nextUrl.searchParams.get(V2_PREVIEW_QUERY_PARAM) ||
    request.nextUrl.searchParams.get("token") ||
    ""
  ).trim();
  if (!token) return forbidden();

  const querySiteCode = (
    request.nextUrl.searchParams.get("siteCode") || ""
  ).trim();

  const verified = verifyV2PreviewToken(token, secret, {
    expectedSiteCode: querySiteCode || undefined,
  });
  if (!verified.ok) return forbidden();

  const { payload } = verified;
  if (querySiteCode && querySiteCode !== payload.siteCode) {
    return forbidden();
  }

  const maxAge = previewCookieMaxAgeSeconds(payload.expiresAt);
  if (maxAge <= 0) return forbidden();

  const redirectPath = buildV2PreviewSafeRedirectPath(payload.siteCode);
  // open redirect 금지 — 동일 origin 상대 경로만
  const response = NextResponse.redirect(new URL(redirectPath, request.url), {
    status: 303,
  });

  response.headers.set("Cache-Control", "no-store");
  response.headers.set("CDN-Cache-Control", "no-store");

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(V2_PREVIEW_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return response;
}
