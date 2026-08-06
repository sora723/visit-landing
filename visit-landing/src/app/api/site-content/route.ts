import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import {
  resolveRequestSiteCode,
  siteContentApiPath,
} from "@/lib/resolve-site-code";

const NO_STORE = {
  "Cache-Control": API_NO_STORE_CACHE_CONTROL,
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
} as const;

/**
 * 레거시: /api/site-content?siteCode=L010
 * → 경로형 /api/site-content/L010 로 307 (CDN 캐시 키 = path)
 */
export async function GET(request: NextRequest) {
  const siteCode = await resolveRequestSiteCode(request);
  if (!siteCode) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "SITE_UNRESOLVED",
          message: "도메인에 연결된 현장을 찾지 못했습니다",
        },
      },
      { status: 503, headers: NO_STORE }
    );
  }
  const target = new URL(siteContentApiPath(siteCode), request.url);
  return NextResponse.redirect(target, { status: 307, headers: NO_STORE });
}
