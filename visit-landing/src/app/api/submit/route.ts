import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { isDemoDuplicate, recordDemoSubmission } from "@/lib/demo-store";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";

const DEMO_BLOCK_MS = 120 * 60 * 1000;
const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };
/** Apps Script 저장+검증 상한 — 알림톡은 defer 후 after()에서 flush */
const APPS_SCRIPT_SUBMIT_TIMEOUT_MS = 20_000;
const APPS_SCRIPT_NOTIFY_FLUSH_TIMEOUT_MS = 25_000;

function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "";
  return request.headers.get("x-real-ip") ?? "";
}

function handleDemoSubmit(
  request: NextRequest,
  body: Record<string, string | undefined>
) {
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").replace(/\D/g, "");
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
        notificationSent: false,
        allowConversion: true,
        savedToSubmissions: true,
        includeInLiveFeed: true,
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

function scheduleNotifyFlush(appsScriptUrl: string) {
  after(async () => {
    try {
      await fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "notify.flush", limit: 10 }),
        cache: "no-store",
        signal: AbortSignal.timeout(APPS_SCRIPT_NOTIFY_FLUSH_TIMEOUT_MS),
      });
    } catch (err) {
      console.error("[api/submit] notify.flush after() failed", err);
    }
  });
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

  const clientIp = getClientIp(request);
  const payload = {
    action: "submit",
    siteCode,
    /** 알림톡은 큐에 넣고 응답 먼저 — after()에서 notify.flush */
    deferNotify: true,
    name: body.name,
    phone: body.phone,
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

  try {
    const res = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(APPS_SCRIPT_SUBMIT_TIMEOUT_MS),
    });
    const json = await res.json();

    if (
      json?.success === true &&
      (json?.data?.notificationQueued === true ||
        json?.data?.savedToSubmissions === true)
    ) {
      scheduleNotifyFlush(appsScriptUrl);
    }

    return NextResponse.json(
      { ...json, _debug: { clientIp, mode: "live", siteCode } },
      { status: json.success ? 200 : 400, headers: NO_STORE }
    );
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError");
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: timedOut ? "TIMEOUT" : "NETWORK_ERROR",
          message: timedOut
            ? "접수 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."
            : "API 서버에 연결할 수 없습니다",
        },
        _debug: { clientIp, mode: "live", siteCode },
      },
      { status: 502, headers: NO_STORE }
    );
  }
}
