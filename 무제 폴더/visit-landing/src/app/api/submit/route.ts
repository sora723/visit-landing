import { NextRequest, NextResponse } from "next/server";
import { isDemoDuplicate, recordDemoSubmission } from "@/lib/demo-store";
import { resolveSiteCode } from "@/lib/resolve-site-code";

const DEMO_BLOCK_MS = 120 * 60 * 1000;

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
      { status: 400 }
    );
  }

  recordDemoSubmission(name, phone);

  return NextResponse.json({
    success: true,
    data: {
      submissionId: `demo-${Date.now()}`,
      demo: true,
      notificationSent: false,
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
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const siteCode = resolveSiteCode(
    request.nextUrl.searchParams.get("siteCode") ??
      (typeof body.siteCode === "string" ? body.siteCode : null)
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
      { status: 400 }
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
    name: body.name,
    phone: body.phone,
    privacyAgreed: true,
    unitType: body.unitType ?? "",
    visitDate: body.visitDate ?? "",
    visitTime: body.visitTime ?? "",
    source: body.source ?? "",
    sourceUrl: body.sourceUrl ?? "",
    referer: body.referer ?? request.headers.get("referer") ?? "",
    device: body.device ?? "",
    utmSource: body.utmSource ?? "",
    utmMedium: body.utmMedium ?? "",
    utmCampaign: body.utmCampaign ?? "",
    clientIp,
  };

  try {
    const res = await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const json = await res.json();
    return NextResponse.json(
      { ...json, _debug: { clientIp, mode: "live", siteCode } },
      { status: json.success ? 200 : 400 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "NETWORK_ERROR", message: "API 서버에 연결할 수 없습니다" },
        _debug: { clientIp, mode: "live", siteCode },
      },
      { status: 502 }
    );
  }
}
