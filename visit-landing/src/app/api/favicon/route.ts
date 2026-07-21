import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { fetchFaviconBytes } from "@/lib/favicon-proxy";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": API_NO_STORE_CACHE_CONTROL,
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
} as const;

function readFaviconSiteCode(request: NextRequest): string {
  return (
    request.nextUrl.searchParams.get("siteCode")?.trim() ||
    new URL(request.url).searchParams.get("siteCode")?.trim() ||
    ""
  );
}

/** 현장별 파비콘 — siteCode 필수, 없으면 404 (다른 현장·기본값 대체 금지) */
export async function GET(request: NextRequest) {
  const siteCode = readFaviconSiteCode(request);
  if (!siteCode) {
    return new NextResponse(null, {
      status: 404,
      headers: NO_STORE_HEADERS,
    });
  }

  const favicon = await fetchFaviconBytes(siteCode);
  if (!favicon) {
    return new NextResponse(null, {
      status: 404,
      headers: {
        ...NO_STORE_HEADERS,
        "X-Site-Code": siteCode,
      },
    });
  }

  return new NextResponse(favicon.body, {
    headers: {
      "Content-Type": favicon.contentType,
      ...NO_STORE_HEADERS,
      "Netlify-Vary": "query=siteCode",
      "X-Site-Code": siteCode,
    },
  });
}
