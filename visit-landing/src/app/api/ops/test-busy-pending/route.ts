/**
 * POST /api/ops/test-busy-pending
 * BUSY → Blobs awaiting_sheet + 시스템로그 + Slack 만 검증.
 * GAS submit/postProcess/카톡/flush 호출 없음.
 *
 * 복구(warm/ops flush)는 Blobs payload 그대로 재전송 (formToken 포함, 토큰 우회 없음).
 * 접수 필드(생년월일·평형·방문일 등)는 사이트마다 다르므로 **고정 금지** —
 * 호출 body에 넣은 값만 payload에 실어 저장한다.
 *
 * Authorization: Bearer $WARM_SECRET
 * body: { siteCode?, name?, phone?, formToken?, ...사이트별 접수필드 }
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

/** ops/식별용 — 사이트 폼 스키마에 넣지 않음 */
const RESERVED_BODY_KEYS = new Set([
  "siteCode",
  "name",
  "phone",
  "formToken",
  "action",
  "submissionId",
  "submittedAt",
  "privacyAgreed",
  "source",
  "isTest",
]);

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

  /** 사이트별 접수 필드 — body에 온 것만 (기본값 고정 없음) */
  const siteFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (RESERVED_BODY_KEYS.has(key)) continue;
    if (value === undefined) continue;
    siteFields[key] = value;
  }

  const payload: Record<string, unknown> = {
    action: "submit",
    siteCode,
    submissionId,
    submittedAt,
    formToken,
    name,
    phone,
    privacyAgreed: true,
    source: "ops_test_busy",
    isTest: true,
    ...siteFields,
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
      note: "formToken+식별필드만 고정. 접수 필드는 body 전달분만 저장(사이트별 고정 금지). 복구=payload 재전송.",
      submissionId,
      siteCode,
      status: "awaiting_sheet",
      payloadPreview: {
        name,
        phone,
        formToken: true,
        siteFieldKeys: Object.keys(siteFields),
        isTest: true,
      },
    },
    { headers: NO_STORE }
  );
}
