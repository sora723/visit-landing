/**
 * GET /p/[code]
 * 짧은 Preview 코드 → HttpOnly cookie → 토큰 제거된 홈 redirect.
 * enter 와 동일 제약: Location path-only (Netlify host 분리 방지).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  V2_PREVIEW_COOKIE_NAME,
  buildV2PreviewSafeRedirectPath,
  previewCookieMaxAgeSeconds,
  verifyV2PreviewToken,
} from "@/v2/preview/v2-preview-token";
import { isV2PreviewShortCode } from "@/v2/preview/v2-preview-short-code";
import { resolveV2PreviewShortCode } from "@/v2/server/resolve-v2-preview-short-code";

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

type Params = { params: Promise<{ code: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const secret = String(process.env.V2_PREVIEW_HMAC_SECRET ?? "").trim();
  if (!secret) return forbidden();

  const { code: rawCode } = await params;
  const code = String(rawCode || "").trim();
  if (!isV2PreviewShortCode(code)) return forbidden();

  const resolved = await resolveV2PreviewShortCode(code);
  if (!resolved.ok) return forbidden();

  const verified = verifyV2PreviewToken(resolved.token, secret, {
    expectedSiteCode: resolved.siteCode,
  });
  if (!verified.ok) return forbidden();
  if (verified.payload.siteCode !== resolved.siteCode) return forbidden();

  const maxAge = previewCookieMaxAgeSeconds(verified.payload.expiresAt);
  if (maxAge <= 0) return forbidden();

  const redirectPath = buildV2PreviewSafeRedirectPath(resolved.siteCode);
  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return forbidden();
  }

  const response = new NextResponse(null, {
    status: 303,
    headers: {
      Location: redirectPath,
      "Cache-Control": "no-store",
      "CDN-Cache-Control": "no-store",
    },
  });

  const isProd = process.env.NODE_ENV === "production";
  response.cookies.set(V2_PREVIEW_COOKIE_NAME, resolved.token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  return response;
}
