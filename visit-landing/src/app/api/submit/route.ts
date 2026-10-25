import { randomUUID } from "crypto";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { isDemoDuplicate, recordDemoSubmission } from "@/lib/demo-store";
import {
  FORM_TOKEN_HMAC_SECRET_ENV,
  verifyFormToken,
} from "@/lib/form-token";
import {
  savePendingSubmission,
  type PendingSubmissionRecord,
} from "@/lib/pending-submission-store";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";
import {
  flushPendingSubmissions,
  syncPendingSubmissionRecord,
} from "@/lib/sync-pending-submission";

export const dynamic = "force-dynamic";
/** after() 시트 동기화·재시도 여유 */
export const maxDuration = 60;

const DEMO_BLOCK_MS = 120 * 60 * 1000;
const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };

function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

function getFormTokenHmacSecret() {
  return String(process.env[FORM_TOKEN_HMAC_SECRET_ENV] || "").trim();
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return request.headers.get("x-real-ip") ?? "";
}

function normalizePhone(raw: unknown): string {
  return String(raw ?? "").replace(/\D/g, "").slice(0, 11);
}

/**
 * 임시 원장 확보 후 백그라운드:
 * 1) 해당 건 GAS 동기화(재시도)
 * 2) 잔여 pending flush
 */
function scheduleSheetSync(record: PendingSubmissionRecord) {
  after(async () => {
    try {
      await syncPendingSubmissionRecord(record);
    } catch (err) {
      console.error(
        "[api/submit] background sync failed",
        record.submissionId,
        err
      );
    }
    try {
      await flushPendingSubmissions(5);
    } catch (err) {
      console.error("[api/submit] background pending flush failed", err);
    }
  });
}

function handleDemoSubmit(
  request: NextRequest,
  body: Record<string, string | undefined>
) {
  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(body.phone);
  const clientIp = getClientIp(request);

  if (isDemoDuplicate(name, phone, DEMO_BLOCK_MS)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "DUPLICATE_SUBMISSION",
          message: "이미 접수된 정보입니다. 120분 후 다시 시도해주세요.",
        },
        _debug: { clientIp, mode: "demo" },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  recordDemoSubmission(name, phone);

  return NextResponse.json(
    {
      success: true,
      data: {
        submissionId: `demo-${Date.now()}`,
        demo: true,
        savedToVerificationLog: true,
        savedToPendingStore: true,
        needsPostProcess: false,
        notificationSent: false,
        allowConversion: false,
        savedToSubmissions: false,
        includeInLiveFeed: false,
        stored: {
          utmSource: body.utmSource ?? "",
          utmMedium: body.utmMedium ?? "",
          utmCampaign: body.utmCampaign ?? "",
          sourceUrl: body.sourceUrl ?? "",
          referer: body.referer ?? "",
          device: body.device ?? "",
          clientIp,
        },
      },
      error: null,
      _debug: { clientIp, mode: "demo" },
    },
    { headers: NO_STORE }
  );
}

/**
 * 조기 차단 여부(전환 픽셀용). 실제 차단 기록·검증로그는 GAS submit이 수행.
 * HMAC 토큰은 Netlify에서 사전 검증 가능.
 */
function resolveEarlyGate(
  body: Record<string, unknown>,
  siteCode: string
): { needsPostProcess: boolean; validationStatus: string } {
  if (String(body.company ?? "").trim()) {
    return { needsPostProcess: false, validationStatus: "허니팟차단" };
  }

  const secret = getFormTokenHmacSecret();
  const formToken = String(body.formToken ?? "").trim();
  if (secret && formToken) {
    const verified = verifyFormToken(formToken, secret, siteCode);
    if (!verified.ok) {
      return { needsPostProcess: false, validationStatus: "토큰차단" };
    }
  } else if (!formToken) {
    return { needsPostProcess: false, validationStatus: "토큰차단" };
  }

  return { needsPostProcess: true, validationStatus: "검수중" };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const siteCode = await resolveRequestSiteCode(
    request,
    typeof body.siteCode === "string" ? body.siteCode : null
  );

  if (body.isVirtual === true || body.source === "live_feed_virtual") {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "가상 접수는 저장할 수 없습니다",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  const appsScriptUrl = getAppsScriptUrl();
  if (!appsScriptUrl) {
    await new Promise((r) => setTimeout(r, 200));
    return handleDemoSubmit(request, body);
  }

  const name = String(body.name ?? "").trim();
  const phone = normalizePhone(body.phone);
  if (!name || phone.length < 10) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: !name
            ? "성함은 필수입니다"
            : "올바른 연락처를 입력해주세요",
        },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  const clientIp = getClientIp(request);
  const submissionId = randomUUID();
  const submittedAt = new Date().toISOString();
  const earlyGate = resolveEarlyGate(body, siteCode);
  const needsPostProcess = earlyGate.needsPostProcess;
  const nowIso = submittedAt;

  const payload: Record<string, unknown> = {
    action: "submit",
    siteCode,
    submissionId,
    submittedAt,
    name,
    phone,
    privacyAgreed: true,
    unitType: body.unitType ?? "",
    visitDate: body.visitDate ?? "",
    visitTime: body.visitTime ?? "",
    source: body.source ?? "",
    sourceUrl: body.sourceUrl ?? body.landingUrl ?? "",
    landingUrl: body.landingUrl ?? body.sourceUrl ?? "",
    referer: body.referer ?? request.headers.get("referer") ?? "",
    device: body.device ?? "",
    utmSource: body.utmSource ?? "",
    utmMedium: body.utmMedium ?? "",
    utmCampaign: body.utmCampaign ?? "",
    utmContent: body.utmContent ?? "",
    napm: body.napm ?? "",
    formToken: body.formToken ?? "",
    pageLoadedAt: body.pageLoadedAt ?? "",
    company: body.company ?? "",
    inputFocusCount: body.inputFocusCount ?? "",
    inputChangeCount: body.inputChangeCount ?? "",
    clickCount: body.clickCount ?? "",
    scrollDepth: body.scrollDepth ?? "",
    firstInputAt: body.firstInputAt ?? "",
    lastInputAt: body.lastInputAt ?? "",
    userAgent: body.userAgent ?? request.headers.get("user-agent") ?? "",
    screenWidth: body.screenWidth ?? "",
    screenHeight: body.screenHeight ?? "",
    timezone: body.timezone ?? "",
    language: body.language ?? "",
    clientIp,
  };

  const pendingRecord: PendingSubmissionRecord = {
    submissionId,
    siteCode,
    submittedAt,
    needsPostProcess,
    payload,
    status: "pending",
    attempts: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    await savePendingSubmission(pendingRecord);
  } catch (err) {
    console.error("[api/submit] pending store save failed", err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "PENDING_STORE_ERROR",
          message: "접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
        _debug: { clientIp, mode: "pending-store-fail", siteCode },
      },
      { status: 503, headers: NO_STORE }
    );
  }

  // 임시 원장 확보 후 완료 UI — 시트·알림은 after()에서 재시도
  scheduleSheetSync(pendingRecord);

  return NextResponse.json(
    {
      success: true,
      data: {
        submissionId,
        submittedAt,
        savedToPendingStore: true,
        /** 시트 반영은 비동기 — 원장은 pending store에 확보됨 */
        savedToVerificationLog: false,
        needsPostProcess,
        notificationQueued: needsPostProcess,
        notificationSent: false,
        allowConversion: false,
        savedToSubmissions: false,
        includeInLiveFeed: false,
        validationStatus: earlyGate.validationStatus,
        acceptedBy: "netlify-pending-store",
      },
      error: null,
      _debug: { clientIp, mode: "live-pending-ack", siteCode },
    },
    { headers: NO_STORE }
  );
}
