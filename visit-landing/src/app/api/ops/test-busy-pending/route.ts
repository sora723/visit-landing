/**
 * POST /api/ops/test-busy-pending
 * BUSY → Blobs awaiting_sheet + 시스템로그 + Slack 만 검증.
 * GAS submit/postProcess/카톡/flush 호출 없음.
 *
 * Authorization: Bearer $WARM_SECRET
 * body: 선택 필드 덮어쓰기 가능. 기본값은 L002 실접수 검증 통과용 풀필드.
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

  const siteCode = String(body.siteCode ?? "L002").trim() || "L002";
  const submissionId = randomUUID();
  const submittedAt = new Date().toISOString();
  const name = String(body.name ?? "슬랙테스트BUSY").trim() || "슬랙테스트BUSY";
  const defaultPhone = `0108${String(Date.now()).slice(-7)}`;
  const phone =
    String(body.phone ?? defaultPhone).replace(/\D/g, "") || defaultPhone;
  const reason = "ops_test_busy_pending_no_kakao";

  /** L002 birthDateEnabled + simple/full 폼 대비 풀필드 */
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  const defaultVisitDate = `${yyyy}-${mm}-${dd}`;

  const birthDate =
    String(body.birthDate ?? body["생년월일"] ?? "19900115").trim() ||
    "19900115";
  const unitType = String(body.unitType ?? body.consultType ?? "84A").trim() || "84A";
  const visitDate =
    String(body.visitDate ?? body.reserveDate ?? defaultVisitDate).trim() ||
    defaultVisitDate;
  const visitTime =
    String(body.visitTime ?? body.reserveTime ?? "14:00").trim() || "14:00";
  const region = String(body.region ?? body["지역"] ?? "서울").trim() || "서울";
  const ageRange = String(body.ageRange ?? "40대").trim() || "40대";

  const payload: Record<string, unknown> = {
    action: "submit",
    siteCode,
    submissionId,
    submittedAt,
    name,
    phone,
    privacyAgreed: true,
    birthDate,
    생년월일: birthDate,
    unitType,
    consultType: unitType,
    visitDate,
    visitTime,
    reserveDate: visitDate,
    reserveTime: visitTime,
    region,
    ageRange,
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
      note: "카톡/flush 없음. Slack·시스템로그만 확인. flush 시 카톡 가능(isTest).",
      submissionId,
      siteCode,
      status: "awaiting_sheet",
      payloadPreview: {
        name,
        phone,
        birthDate,
        unitType,
        visitDate,
        visitTime,
        region,
        ageRange,
        isTest: true,
      },
    },
    { headers: NO_STORE }
  );
}
