/**
 * GET /api/ops/pending-submissions
 * 임시 원장(pending) 현황 — 유실·재시도 가시화
 * Authorization: Bearer $WARM_SECRET 또는 x-warm-secret
 *
 * ?includePayload=1 — items[].payload 포함 (이름·전화 등, 운영 조회용)
 * ?flush=1 — awaiting/pending/신규 sheet_logged 복구 (1회 기본 2건)
 * ?includeSheetLogged=1 | includeLegacySheetLogged=1 — 2026-11-10 이전 옛 잔여 포함(카톡 가능)
 * ?limit=50 — 목록 상한 (최대 80)
 */

import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { summarizePendingSubmissions } from "@/lib/pending-submission-store";
import {
  flushPendingSubmissions,
  WARM_FLUSH_BATCH_SIZE,
} from "@/lib/sync-pending-submission";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

export async function GET(request: NextRequest) {
  const expected = expectedWarmSecret();
  const provided = readWarmSecret(request);
  if (!expected || !provided || provided !== expected) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  const flush =
    request.nextUrl.searchParams.get("flush") === "1" ||
    request.nextUrl.searchParams.get("flush") === "true";
  const includePayload =
    request.nextUrl.searchParams.get("includePayload") === "1" ||
    request.nextUrl.searchParams.get("includePayload") === "true";
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || 50);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

  const includeLegacySheetLogged =
    request.nextUrl.searchParams.get("includeLegacySheetLogged") === "1" ||
    request.nextUrl.searchParams.get("includeLegacySheetLogged") === "true" ||
    request.nextUrl.searchParams.get("includeSheetLogged") === "1" ||
    request.nextUrl.searchParams.get("includeSheetLogged") === "true";

  let flushResult: {
    processed: number;
    synced: number;
    failed: number;
    statuses?: string[];
    skippedLegacySheetLogged?: number;
  } | null = null;

  if (flush) {
    flushResult = await flushPendingSubmissions(WARM_FLUSH_BATCH_SIZE, {
      includeLegacySheetLogged,
    });
  }

  const summary = await summarizePendingSubmissions(limit, { includePayload });

  return NextResponse.json(
    {
      ok: true,
      at: new Date().toISOString(),
      includePayload,
      summary,
      flush: flushResult,
    },
    { headers: NO_STORE }
  );
}
