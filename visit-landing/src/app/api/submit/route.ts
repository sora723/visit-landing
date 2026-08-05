import { randomUUID } from "crypto";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { isDemoDuplicate, recordDemoSubmission } from "@/lib/demo-store";
import {
  FORM_TOKEN_HMAC_SECRET_ENV,
  verifyFormToken,
} from "@/lib/form-token";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";

const DEMO_BLOCK_MS = 120 * 60 * 1000;
const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };
/** 백그라운드: _검증로그 저장 */
const APPS_SCRIPT_SUBMIT_TIMEOUT_MS = 15_000;
const APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS = 25_000;
const APPS_SCRIPT_FLUSH_TIMEOUT_MS = 45_000;
const PENDING_FLUSH_LIMIT = 5;

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

async function postAppsScriptAction(
  appsScriptUrl: string,
  body: Record<string, unknown>,
  timeoutMs: number
) {
  return fetch(appsScriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

/**
 * Netlify 수락 후 백그라운드:
 * 1) GAS submit → _검증로그
 * 2) needsPostProcess면 postProcess
 * 3) 정체 검수중 flush
 */
function scheduleAcceptedSubmissionPersist(
  appsScriptUrl: string,
  payload: Record<string, unknown>,
  submissionId: string,
  submittedAt: string,
  needsPostProcess: boolean
) {
  after(async () => {
    let logged = false;
    let shouldPostProcess = needsPostProcess;

    try {
      const res = await postAppsScriptAction(
        appsScriptUrl,
        {
          ...payload,
          action: "submit",
          submissionId,
          submittedAt,
        },
        APPS_SCRIPT_SUBMIT_TIMEOUT_MS
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: {
          savedToVerificationLog?: boolean;
          needsPostProcess?: boolean;
          submissionId?: string;
        };
      };

      logged =
        json?.success === true && json?.data?.savedToVerificationLog === true;
      if (json?.data?.needsPostProcess === false) {
        shouldPostProcess = false;
      }

      if (!logged) {
        console.error(
          "[api/submit] background GAS submit did not log",
          json?.data ?? json
        );
      }
    } catch (err) {
      console.error("[api/submit] background GAS submit failed", err);
    }

    if (logged && shouldPostProcess) {
      try {
        await postAppsScriptAction(
          appsScriptUrl,
          {
            ...payload,
            action: "submit.postProcess",
            submissionId,
            submittedAt,
          },
          APPS_SCRIPT_POST_PROCESS_TIMEOUT_MS
        );
      } catch (err) {
        console.error("[api/submit] background postProcess failed", err);
      }
    }

    try {
      await postAppsScriptAction(
        appsScriptUrl,
        { action: "notify.flush", limit: PENDING_FLUSH_LIMIT },
        APPS_SCRIPT_FLUSH_TIMEOUT_MS
      );
    } catch (err) {
      console.error("[api/submit] background notify.flush failed", err);
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

  // Netlify가 요청을 수락한 뒤 즉시 완료 UI — 시트 기입·알림은 after()
  scheduleAcceptedSubmissionPersist(
    appsScriptUrl,
    payload,
    submissionId,
    submittedAt,
    needsPostProcess
  );

  return NextResponse.json(
    {
      success: true,
      data: {
        submissionId,
        submittedAt,
        savedToVerificationLog: true,
        needsPostProcess,
        notificationQueued: needsPostProcess,
        notificationSent: false,
        allowConversion: false,
        savedToSubmissions: false,
        includeInLiveFeed: false,
        validationStatus: earlyGate.validationStatus,
        acceptedBy: "netlify",
      },
      error: null,
      _debug: { clientIp, mode: "live-fast-ack", siteCode },
    },
    { headers: NO_STORE }
  );
}
