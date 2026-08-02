import { NextRequest, NextResponse } from "next/server";
import { API_NO_STORE_CACHE_CONTROL } from "@/lib/api-cache-headers";
import {
  FORM_TOKEN_HMAC_SECRET_ENV,
  FORM_TOKEN_TTL_SECONDS,
  mintFormToken,
} from "@/lib/form-token";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";

const NO_STORE = { "Cache-Control": API_NO_STORE_CACHE_CONTROL };

function getAppsScriptUrl() {
  return process.env.APPS_SCRIPT_URL?.replace(/\/$/, "") ?? "";
}

function getFormTokenHmacSecret() {
  return String(process.env[FORM_TOKEN_HMAC_SECRET_ENV] || "").trim();
}

async function issueFromAppsScript(siteCode: string, appsScriptUrl: string) {
  const url =
    `${appsScriptUrl}?action=formToken.issue` +
    `&siteCode=${encodeURIComponent(siteCode)}`;
  const res = await fetch(url, { cache: "no-store", redirect: "follow" });
  const json = await res.json();
  return { res, json };
}

export async function GET(request: NextRequest) {
  const siteCode = await resolveRequestSiteCode(request);
  const secret = getFormTokenHmacSecret();

  // 비밀키가 있으면 Netlify에서 HMAC 발급 (GAS 왕복 없음)
  if (secret) {
    const minted = mintFormToken(siteCode, secret, {
      ttlSeconds: FORM_TOKEN_TTL_SECONDS,
    });
    if (minted) {
      return NextResponse.json(
        {
          success: true,
          data: {
            formToken: minted.formToken,
            expiresIn: minted.expiresIn,
            source: "local-hmac",
          },
          error: null,
        },
        { headers: NO_STORE }
      );
    }
    // mint 실패 시에만 GAS 폴백
  }

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

  try {
    const { res, json } = await issueFromAppsScript(siteCode, appsScriptUrl);
    if (!json.success) {
      return NextResponse.json(json, { status: 400, headers: NO_STORE });
    }
    return NextResponse.json(json, {
      status: res.ok ? 200 : res.status,
      headers: NO_STORE,
    });
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
