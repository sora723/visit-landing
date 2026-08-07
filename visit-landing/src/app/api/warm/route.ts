/**
 * GET /api/warm — Netlify 콜드 완화용 keep-warm.
 * Authorization: Bearer $WARM_SECRET 또는 x-warm-secret 없으면 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { fetchDomainSiteCodeMap } from "@/lib/fetch-domain-site-code-map";
import { fetchSiteLiveConfigFromSheetBlocking } from "@/lib/fetch-site-live-config";
import { DEFAULT_SITE_CODE } from "@/lib/resolve-site-code";

export const dynamic = "force-dynamic";

const NO_STORE = {
  "Cache-Control": API_NO_STORE_CACHE_CONTROL,
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
} as const;

function readWarmSecret(request: NextRequest): string {
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return String(request.headers.get("x-warm-secret") ?? "").trim();
}

function expectedWarmSecret(): string {
  return String(process.env.WARM_SECRET ?? "").trim();
}

function warmSiteCode(): string {
  return (
    String(process.env.SHEET_SITE_CODE ?? "").trim() || DEFAULT_SITE_CODE
  );
}

export async function GET(request: NextRequest) {
  const expected = expectedWarmSecret();
  const provided = readWarmSecret(request);

  // 시크릿 미설정·불일치 → 존재 비공개(404)
  if (!expected || !provided || provided !== expected) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const siteCode = warmSiteCode();

  try {
    const domainMap = await fetchDomainSiteCodeMap({ waitIfCold: true });
    const live = await fetchSiteLiveConfigFromSheetBlocking(siteCode);

    return NextResponse.json(
      {
        ok: true,
        warmedAt: new Date().toISOString(),
        domainKeys: Object.keys(domainMap).length,
        siteCode,
        siteConfigSource: live.source,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error("[api/warm] failed:", err);
    return NextResponse.json(
      {
        ok: false,
        warmedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503, headers: NO_STORE }
    );
  }
}
