import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";

const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };

function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

export async function GET(request: NextRequest) {
  const siteCode = await resolveRequestSiteCode(request);
  const appsScriptUrl = getAppsScriptUrl();

  if (!appsScriptUrl) {
    return NextResponse.json(
      {
        success: true,
        data: { formToken: `demo-${Date.now()}`, expiresIn: 600, demo: true },
        error: null,
      },
      { headers: NO_STORE }
    );
  }

  const url =
    `${appsScriptUrl}?action=formToken.issue` +
    `&siteCode=${encodeURIComponent(siteCode)}`;

  try {
    const res = await fetch(url, { cache: "no-store", redirect: "follow" });
    const json = await res.json();
    if (!json.success) {
      return NextResponse.json(json, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json(json, { headers: NO_STORE });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "NETWORK_ERROR", message: "토큰 발급 실패" },
      },
      { status: 502, headers: NO_STORE }
    );
  }
}
