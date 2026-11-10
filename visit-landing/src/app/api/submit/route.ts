import { randomUUID } from "crypto";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { isDemoDuplicate, recordDemoSubmission } from "@/lib/demo-store";
import {
  FORM_TOKEN_HMAC_SECRET_ENV,
  verifyFormToken,
} from "@/lib/form-token";
import { normalizeBirthDate } from "@/lib/birth-date";
import {
  alertBusyPendingSaved,
  alertSubmitOpsFailure,
} from "@/lib/ops-slack";
import { appendSystemLog } from "@/lib/ops-system-log";
import {
  getPendingSubmission,
  savePendingSubmission,
  type PendingSubmissionRecord,
} from "@/lib/pending-submission-store";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";
import { flushPendingSubmissions } from "@/lib/sync-pending-submission";

export const dynamic = "force-dynamic";
/** Stage A: _검증로그 저장 대기 */
export const maxDuration = 60;

/**
 * Blobs-first Stage A 플래그.
 * 미설정·0 → Sheet-first (기본). 이 프로젝트는 Sheet-first 고정.
 */
function isBlobsFirstStageAEnabled(): boolean {
  const raw = String(process.env.BLOBS_FIRST_STAGE_A ?? "0")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

const DEMO_BLOCK_MS = 120 * 60 * 1000;
const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };
const APPS_SCRIPT_VERIFY_LOG_TIMEOUT_MS = 20_000;
const APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS = 35_000;

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

function isBusyOrTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("aborted") ||
    lower.includes("network") ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("503") ||
    lower.includes("429") ||
    lower.includes("lock_busy") ||
    lower.includes("busy")
  );
}

async function postAppsScript(
  appsScriptUrl: string,
  body: Record<string, unknown>,
  timeoutMs: number
) {
  const res = await fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  return (await res.json()) as {
    success?: boolean;
    data?: GasSubmitData;
    error?: { message?: string; code?: string };
  };
}

/**
 * 응답 이후 Stage B:
 * 검수 → 접수관리 → 알림톡 + awaiting_sheet Blobs flush
 * (siteCode 는 payload 에 고정 — 현장 혼선 방지)
 */
function scheduleAfterVerificationLog(opts: {
  appsScriptUrl: string;
  payload: Record<string, unknown>;
  submissionId: string;
  submittedAt: string;
  siteCode: string;
  needsPostProcess: boolean;
}) {
  after(async () => {
    if (opts.needsPostProcess) {
      try {
        await postAppsScript(
          opts.appsScriptUrl,
          {
            ...opts.payload,
            action: "submit.postProcess",
            siteCode: opts.siteCode,
            submissionId: opts.submissionId,
            submittedAt: opts.submittedAt,
            _skipPendingFlush: true,
          },
          APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS
        );
      } catch (err) {
        console.error(
          "[api/submit] Stage B postProcess failed",
          opts.siteCode,
          opts.submissionId,
          err
        );
        await alertSubmitOpsFailure({
          siteCode: opts.siteCode,
          submissionId: opts.submissionId,
          stage: "postProcess",
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }
    try {
      await flushPendingSubmissions(5);
    } catch (err) {
      console.error("[api/submit] awaiting_sheet flush failed", err);
    }
  });
}

async function saveAwaitingSheetPending(opts: {
  submissionId: string;
  siteCode: string;
  submittedAt: string;
  payload: Record<string, unknown>;
  reason: string;
  attempts?: number;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const existing = await getPendingSubmission(opts.submissionId);
  /** 다른 siteCode 레코드와 키 충돌 시 덮어쓰지 않음 */
  if (
    existing &&
    existing.siteCode &&
    existing.siteCode !== opts.siteCode
  ) {
    console.error(
      "[api/submit] Blobs siteCode mismatch — skip overwrite",
      existing.siteCode,
      opts.siteCode,
      opts.submissionId
    );
    await alertSubmitOpsFailure({
      siteCode: opts.siteCode,
      submissionId: opts.submissionId,
      stage: "blobs_site_mismatch",
      reason: `existing=${existing.siteCode}`,
    });
    return;
  }

  const record: PendingSubmissionRecord = {
    submissionId: opts.submissionId,
    siteCode: opts.siteCode,
    submittedAt: opts.submittedAt,
    needsPostProcess: true,
    payload: { ...opts.payload, siteCode: opts.siteCode },
    status: "awaiting_sheet",
    attempts: opts.attempts ?? (existing?.attempts || 0),
    lastError: opts.reason,
    createdAt: existing?.createdAt || nowIso,
    updatedAt: nowIso,
  };
  await savePendingSubmission(record);
  const logLine = [
    `접수ID=${opts.submissionId}`,
    `status=awaiting_sheet`,
    `reason=${opts.reason}`,
  ].join(", ");
  await appendSystemLog({
    siteCode: opts.siteCode,
    logAction: "BUSY_PENDING_SAVED",
    message: logLine,
  });
  await alertBusyPendingSaved({
    siteCode: opts.siteCode,
    submissionId: opts.submissionId,
    reason: opts.reason,
    payload: record.payload,
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
        savedToPendingStore: false,
        needsPostProcess: false,
        notificationSent: false,
        allowConversion: false,
        savedToSubmissions: false,
        includeInLiveFeed: false,
      },
      error: null,
      _debug: { clientIp, mode: "demo" },
    },
    { headers: NO_STORE }
  );
}

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

type GasSubmitData = {
  submissionId?: string;
  submittedAt?: string;
  savedToVerificationLog?: boolean;
  needsPostProcess?: boolean;
  notificationQueued?: boolean;
  notificationSent?: boolean;
  allowConversion?: boolean;
  savedToSubmissions?: boolean;
  includeInLiveFeed?: boolean;
  validationStatus?: string;
};

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

  if (isBlobsFirstStageAEnabled()) {
    console.warn(
      "[api/submit] BLOBS_FIRST_STAGE_A=1 ignored; visit-landing uses sheet-first"
    );
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

  const birthRaw = String(body.birthDate ?? "").trim();
  let birthDate = "";
  if (birthRaw) {
    const birthParsed = normalizeBirthDate(birthRaw);
    if (!birthParsed.ok) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: birthParsed.error,
          },
        },
        { status: 400, headers: NO_STORE }
      );
    }
    birthDate = birthParsed.value;
  }

  const clientIp = getClientIp(request);
  /** 재시도 시 동일 submissionId 유지 */
  const submissionId =
    String(body.submissionId ?? "").trim() || randomUUID();
  const submittedAt =
    String(body.submittedAt ?? "").trim() || new Date().toISOString();
  const earlyGate = resolveEarlyGate(body, siteCode);

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
    birthDate,
    region: String(body.region ?? "").trim(),
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

  let gasJson: {
    success?: boolean;
    data?: GasSubmitData;
    error?: { message?: string; code?: string };
  };

  try {
    gasJson = await postAppsScript(
      appsScriptUrl,
      payload,
      APPS_SCRIPT_VERIFY_LOG_TIMEOUT_MS
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(
      "[api/submit] _검증로그 Stage A failed",
      siteCode,
      submissionId,
      err
    );

    if (isBusyOrTransientError(err)) {
      try {
        await saveAwaitingSheetPending({
          submissionId,
          siteCode,
          submittedAt,
          payload,
          reason,
        });
      } catch (blobErr) {
        console.error("[api/submit] Blobs awaiting_sheet save failed", blobErr);
        await alertSubmitOpsFailure({
          siteCode,
          submissionId,
          stage: "blobs_save",
          reason:
            blobErr instanceof Error ? blobErr.message : String(blobErr),
        });
      }

      return NextResponse.json(
        {
          success: false,
          data: {
            submissionId,
            submittedAt,
            stored: false,
            savedToPendingStore: true,
            pendingStatus: "awaiting_sheet",
            siteCode,
          },
          error: {
            code: "BACKEND_BUSY",
            message:
              "일시적으로 접수가 지연되고 있습니다. 같은 내용으로 다시 시도해주세요.",
          },
          _debug: { clientIp, mode: "busy-awaiting-sheet", siteCode },
        },
        { status: 503, headers: NO_STORE }
      );
    }

    await alertSubmitOpsFailure({
      siteCode,
      submissionId,
      stage: "verify_log",
      reason,
    });

    return NextResponse.json(
      {
        success: false,
        data: { submissionId, stored: false, siteCode },
        error: {
          code: "SUBMIT_UPSTREAM_ERROR",
          message: "접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
        _debug: { clientIp, mode: "gas-verify-fail", siteCode },
      },
      { status: 502, headers: NO_STORE }
    );
  }

  const data = gasJson?.data;
  const logged =
    gasJson?.success === true && data?.savedToVerificationLog === true;

  if (!logged) {
    const errMsg =
      gasJson?.error?.message ||
      "접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.";
    const busy =
      String(gasJson?.error?.code || "").includes("BUSY") ||
      /busy|lock|timeout|동시/i.test(errMsg);

    if (busy) {
      try {
        await saveAwaitingSheetPending({
          submissionId,
          siteCode,
          submittedAt,
          payload,
          reason: errMsg,
        });
      } catch (blobErr) {
        console.error("[api/submit] Blobs awaiting_sheet save failed", blobErr);
      }

      return NextResponse.json(
        {
          success: false,
          data: {
            submissionId,
            submittedAt,
            stored: false,
            savedToPendingStore: true,
            pendingStatus: "awaiting_sheet",
            siteCode,
          },
          error: {
            code: "BACKEND_BUSY",
            message:
              "일시적으로 접수가 지연되고 있습니다. 같은 내용으로 다시 시도해주세요.",
          },
          _debug: { clientIp, mode: "busy-gas-reject", siteCode },
        },
        { status: 503, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        success: false,
        data: { submissionId, stored: false, siteCode },
        error: {
          code: gasJson?.error?.code || "SUBMIT_REJECTED",
          message: errMsg,
        },
        _debug: { clientIp, mode: "gas-verify-reject", siteCode },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  const validationStatus =
    data?.validationStatus || earlyGate.validationStatus;
  const needsPostProcess =
    data?.needsPostProcess !== false && earlyGate.needsPostProcess !== false;
  const earlyBlocked =
    validationStatus === "허니팟차단" || validationStatus === "토큰차단";

  /**
   * _검증로그 성공 → 완료 UI.
   * 검수·접수관리·카톡은 after (체감 단축).
   */
  scheduleAfterVerificationLog({
    appsScriptUrl,
    payload,
    submissionId: data?.submissionId || submissionId,
    submittedAt: data?.submittedAt || submittedAt,
    siteCode,
    needsPostProcess: needsPostProcess && !earlyBlocked,
  });

  return NextResponse.json(
    {
      success: true,
      data: {
        submissionId: data?.submissionId || submissionId,
        submittedAt: data?.submittedAt || submittedAt,
        siteCode,
        stored: true,
        savedToPendingStore: false,
        savedToVerificationLog: true,
        needsPostProcess: needsPostProcess && !earlyBlocked,
        notificationQueued: needsPostProcess && !earlyBlocked,
        notificationSent: false,
        allowConversion: !earlyBlocked,
        savedToSubmissions: false,
        includeInLiveFeed: false,
        validationStatus,
        acceptedBy: "verification-log-sheet-first",
      },
      error: null,
      _debug: { clientIp, mode: "live-verify-log-first", siteCode },
    },
    { headers: NO_STORE }
  );
}
