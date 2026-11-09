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
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";
import { flushPendingSubmissions } from "@/lib/sync-pending-submission";

export const dynamic = "force-dynamic";
/** 시트 저장 + 알림까지 동기 대기 */
export const maxDuration = 60;

const DEMO_BLOCK_MS = 120 * 60 * 1000;
const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };
const APPS_SCRIPT_FULL_TIMEOUT_MS = 45_000;

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

/** 과거 Blobs pending 잔여분 정리 — 신규 접수의 성공 경로에는 관여하지 않음 */
function scheduleLegacyPendingFlush() {
  after(async () => {
    try {
      await flushPendingSubmissions(5);
    } catch (err) {
      console.error("[api/submit] legacy pending flush failed", err);
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
        savedToPendingStore: false,
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
 * 조기 차단(허니팟·토큰) — 전환 픽셀 억제용.
 * 실제 차단·검증로그는 GAS submit.full 이 수행.
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

type GasFullData = {
  submissionId?: string;
  submittedAt?: string;
  savedToVerificationLog?: boolean;
  needsPostProcess?: boolean;
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
  const submissionId = randomUUID();
  const submittedAt = new Date().toISOString();
  const earlyGate = resolveEarlyGate(body, siteCode);

  const payload: Record<string, unknown> = {
    action: "submit.full",
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
    data?: GasFullData;
    error?: { message?: string; code?: string };
  };

  try {
    const res = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(APPS_SCRIPT_FULL_TIMEOUT_MS),
    });
    gasJson = (await res.json()) as typeof gasJson;
  } catch (err) {
    console.error("[api/submit] GAS submit.full failed", err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "SUBMIT_UPSTREAM_ERROR",
          message: "접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
        _debug: { clientIp, mode: "gas-full-fail", siteCode },
      },
      { status: 502, headers: NO_STORE }
    );
  }

  const data = gasJson?.data;
  const logged = gasJson?.success === true && data?.savedToVerificationLog === true;
  if (!logged) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: gasJson?.error?.code || "SUBMIT_REJECTED",
          message:
            gasJson?.error?.message ||
            "접수 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
        },
        _debug: { clientIp, mode: "gas-full-reject", siteCode },
      },
      { status: 400, headers: NO_STORE }
    );
  }

  scheduleLegacyPendingFlush();

  const validationStatus =
    data?.validationStatus || earlyGate.validationStatus;
  const needsPostProcess = data?.needsPostProcess === true;

  return NextResponse.json(
    {
      success: true,
      data: {
        submissionId: data?.submissionId || submissionId,
        submittedAt: data?.submittedAt || submittedAt,
        savedToPendingStore: false,
        savedToVerificationLog: true,
        needsPostProcess,
        notificationQueued: false,
        notificationSent: data?.notificationSent === true,
        allowConversion: data?.allowConversion === true,
        savedToSubmissions: data?.savedToSubmissions === true,
        includeInLiveFeed: data?.includeInLiveFeed === true,
        validationStatus,
        acceptedBy: "apps-script-sheet-first",
      },
      error: null,
      _debug: { clientIp, mode: "live-sheet-first", siteCode },
    },
    { headers: NO_STORE }
  );
}
