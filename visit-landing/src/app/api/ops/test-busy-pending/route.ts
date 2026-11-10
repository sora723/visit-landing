/**
 * POST /api/ops/test-busy-pending
 * 실접수와 같은 payload 형태로 Blobs awaiting_sheet + 시스템로그 + Slack 만 검증.
 * GAS submit/postProcess/카톡/flush 호출 없음.
 *
 * 복구(warm/ops flush)는 Blobs에 저장된 payload를 그대로 재전송한다.
 * formToken 포함 — 토큰 우회 없음.
 *
 * Authorization: Bearer $WARM_SECRET
 * body: siteCode·이름·연락처·생년월일·평형·방문일·시간 선택 덮어쓰기
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import {
  FORM_TOKEN_HMAC_SECRET_ENV,
  mintFormToken,
} from "@/lib/form-token";
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

function formTokenSecret(): string {
  return String(process.env[FORM_TOKEN_HMAC_SECRET_ENV] ?? "").trim();
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
  const secret = formTokenSecret();
  const minted = secret ? mintFormToken(siteCode, secret) : null;
  const formToken =
    String(body.formToken ?? "").trim() || minted?.formToken || "";
  if (!formToken) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "formToken 발급 실패 — FORM_TOKEN_HMAC_SECRET 또는 body.formToken 필요",
      },
      { status: 500, headers: NO_STORE }
    );
  }

  const submissionId = randomUUID();
  const submittedAt = new Date().toISOString();
  const name = String(body.name ?? "슬랙테스트BUSY").trim() || "슬랙테스트BUSY";
  const defaultPhone = `0108${String(Date.now()).slice(-7)}`;
  const phone =
    String(body.phone ?? defaultPhone).replace(/\D/g, "") || defaultPhone;
  const reason = "ops_test_busy_pending_no_kakao";

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const dd = String(tomorrow.getDate()).padStart(2, "0");
  const defaultVisitDate = `${yyyy}-${mm}-${dd}`;

  const birthDate =
    String(body.birthDate ?? "19900115").trim() || "19900115";
  const unitType = String(body.unitType ?? "84A").trim() || "84A";
  const visitDate =
    String(body.visitDate ?? defaultVisitDate).trim() || defaultVisitDate;
  const visitTime = String(body.visitTime ?? "14:00").trim() || "14:00";

  /** 실접수 필드 + formToken (복구 시 이 payload 그대로 재전송) */
  const payload: Record<string, unknown> = {
    action: "submit",
    siteCode,
    submissionId,
    submittedAt,
    formToken,
    name,
    phone,
    birthDate,
    unitType,
    visitDate,
    visitTime,
    privacyAgreed: true,
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
      note: "실접수와 동일 필드(formToken 포함)로 Blobs 저장. 복구=payload 재전송(토큰 우회 없음).",
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
        formToken: true,
        isTest: true,
      },
    },
    { headers: NO_STORE }
  );
}
