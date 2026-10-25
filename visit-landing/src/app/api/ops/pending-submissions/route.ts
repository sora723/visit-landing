/**
 * GET /api/ops/pending-submissions
 * 임시 원장(pending) 현황 — 유실·재시도 가시화
 * Authorization: Bearer $WARM_SECRET 또는 x-warm-secret
 */

import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { summarizePendingSubmissions } from "@/lib/pending-submission-store";
import { flushPendingSubmissions } from "@/lib/sync-pending-submission";

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

  let flushResult: {
    processed: number;
    synced: number;
    failed: number;
  } | null = null;

  if (flush) {
    flushResult = await flushPendingSubmissions(10);
  }

  const summary = await summarizePendingSubmissions(50);

  return NextResponse.json(
    {
      ok: true,
      at: new Date().toISOString(),
      summary,
      flush: flushResult,
    },
    { headers: NO_STORE }
  );
}
