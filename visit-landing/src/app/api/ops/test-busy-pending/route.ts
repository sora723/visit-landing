/**
 * POST /api/ops/test-busy-pending
 * BUSY → Blobs awaiting_sheet + 시스템로그 + Slack 만 검증.
 * GAS submit/postProcess/카톡/flush 호출 없음.
 *
 * Authorization: Bearer $WARM_SECRET
 * body: { siteCode?: string, name?: string, phone?: string }
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { alertBusyPendingSaved } from "@/lib/ops-slack";
import { appendSystemLog } from "@/lib/ops-system-log";
import { savePendingSubmission } from "@/lib/pending-submission-store";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

export async function POST(request: NextRequest) {
  const expected = expectedWarmSecret();
  const provided = readWarmSecret(request);
  if (!expected || !provided || provided !== expected) {
    return new NextResponse(null, { status: 404, headers: NO_STORE });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const siteCode = String(body.siteCode ?? "L013").trim() || "L013";
  const submissionId = randomUUID();
  const submittedAt = new Date().toISOString();
  const name = String(body.name ?? "테스트BUSY").trim() || "테스트BUSY";
  const phone = String(body.phone ?? "01000000000").replace(/\D/g, "") || "01000000000";
  const reason = "ops_test_busy_pending_no_kakao";

  const payload: Record<string, unknown> = {
    action: "submit",
    siteCode,
    submissionId,
    submittedAt,
    name,
    phone,
    privacyAgreed: true,
    unitType: String(body.unitType ?? "테스트형"),
    visitDate: String(body.visitDate ?? ""),
    visitTime: String(body.visitTime ?? ""),
    source: "ops_test_busy",
    isTest: true,
  };

  await savePendingSubmission({
    submissionId,
    siteCode,
    submittedAt,
    needsPostProcess: true,
    payload,
    status: "awaiting_sheet",
    attempts: 0,
    lastError: reason,
    createdAt: submittedAt,
    updatedAt: submittedAt,
  });

  await appendSystemLog({
    siteCode,
    logAction: "BUSY_PENDING_SAVED",
    message: `접수ID=${submissionId}, status=awaiting_sheet, reason=${reason}, test=1`,
  });

  await alertBusyPendingSaved({
    siteCode,
    submissionId,
    reason,
    payload,
  });

  return NextResponse.json(
    {
      ok: true,
      note: "카톡/flush 없음. Slack·시스템로그만 확인. flush=1 하지 마세요(복구 시 카톡 가능).",
      submissionId,
      siteCode,
      status: "awaiting_sheet",
    },
    { headers: NO_STORE }
  );
}
