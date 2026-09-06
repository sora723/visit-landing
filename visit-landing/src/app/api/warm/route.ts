/**
 * GET /api/warm — Netlify 콜드 완화용 keep-warm.
 * Authorization: Bearer $WARM_SECRET 또는 x-warm-secret 없으면 404.
 *
 * 도메인맵에 붙은 커스텀 도메인 현장만 순차 데움.
 * L001을 “기본이라서” 데우지 않음 (다른 현장 노출·GAS 폭주 방지).
 */

import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import {
  fetchDomainSiteCodeMap,
  normalizeHostname,
} from "@/lib/fetch-domain-site-code-map";
import { fetchSiteLiveConfigFromSheetBlocking } from "@/lib/fetch-site-live-config";
import { isTenantHostname } from "@/lib/platform-hostname";

export const dynamic = "force-dynamic";
/** Netlify/서버리스 — 다현장 순차 warm */
export const maxDuration = 60;

/** 워크플로 timeout 2분 안 — 현장당 ~2–3s + 간격 */
const MAX_SITES_PER_WARM = 12;
const BETWEEN_SITE_MS = 400;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 커스텀 도메인에 실제로 붙은 siteCode만 (중복 제거) */
function siteCodesFromDomainMap(map: Record<string, string>): string[] {
  const codes = new Set<string>();
  for (const [host, raw] of Object.entries(map)) {
    if (!isTenantHostname(normalizeHostname(host))) continue;
    const code = String(raw ?? "").trim();
    if (code) codes.add(code);
  }
  return Array.from(codes).sort();
}

export async function GET(request: NextRequest) {
  const expected = expectedWarmSecret();
  const provided = readWarmSecret(request);

  // 시크릿 미설정·불일치 → 존재 비공개(404)
  if (!expected || !provided || provided !== expected) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  try {
    const domainMap = await fetchDomainSiteCodeMap({ waitIfCold: true });
    const allCodes = siteCodesFromDomainMap(domainMap);
    const siteCodes = allCodes.slice(0, MAX_SITES_PER_WARM);

    const warmed: Array<{ siteCode: string; source: string }> = [];
    const failed: Array<{ siteCode: string; error: string }> = [];

    for (let i = 0; i < siteCodes.length; i++) {
      const siteCode = siteCodes[i];
      try {
        const live = await fetchSiteLiveConfigFromSheetBlocking(siteCode);
        warmed.push({ siteCode, source: live.source });
      } catch (err) {
        failed.push({
          siteCode,
          error: err instanceof Error ? err.message : String(err),
        });
      }
      if (i < siteCodes.length - 1) {
        await sleep(BETWEEN_SITE_MS);
      }
    }

    return NextResponse.json(
      {
        ok: failed.length === 0,
        warmedAt: new Date().toISOString(),
        domainKeys: Object.keys(domainMap).length,
        siteCodesTotal: allCodes.length,
        siteCodesWarmed: siteCodes.length,
        warmed,
        failed,
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
