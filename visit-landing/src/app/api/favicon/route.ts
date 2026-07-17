import { NextRequest, NextResponse } from "next/server";
import { fetchFaviconBytes } from "@/lib/favicon-proxy";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";

export const dynamic = "force-dynamic";

/** /favicon.ico rewrite 대상 — 시트 파비콘 프록시 (siteCode별) */
export async function GET(request: NextRequest) {
  const siteCode = await resolveRequestSiteCode(request);
  const favicon = await fetchFaviconBytes(siteCode);
  if (!favicon) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(favicon.body, {
    headers: {
      "Content-Type": favicon.contentType,
      /** siteCode 쿼리별로 캐시 분리 — 동일 /favicon.ico 경로로 현장 섞임 방지 */
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      Vary: "Cookie",
      "X-Site-Code": siteCode,
    },
  });
}
