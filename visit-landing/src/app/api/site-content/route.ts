import { NextRequest, NextResponse } from "next/server";
import { logAppsScriptEnv } from "@/lib/apps-script-env";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";
import { readHostnameFromRequest } from "@/lib/site-request-url";

export const dynamic = "force-dynamic";

const LOG = "[api/site-content]";

const FAILURE_HINTS: Record<string, string> = {
  EMPTY_APPS_SCRIPT_URL:
    "Netlify Environment variables에 APPS_SCRIPT_URL이 없습니다. 저장 후 Clear cache and deploy.",
  FETCH_ERROR: "Netlify 서버에서 Apps Script fetch 실패 (네트워크/타임아웃).",
  HTTP_ERROR: "Apps Script HTTP 오류 — 배포 URL 확인.",
  HTML_RESPONSE:
    'Apps Script Web App 접근 권한을 "모든 사용자(익명 포함)"로 배포했는지 확인하세요.',
  JSON_PARSE_ERROR: "Apps Script 응답이 JSON이 아닙니다 — HTML 로그인 페이지 가능성.",
  API_NOT_SUCCESS: "Apps Script success=false — siteCode 또는 Sheet 데이터 확인.",
  PARSE_RESPONSE_ERROR: "Apps Script 응답 파싱 실패 — 배포 버전 확인.",
};

export async function GET(request: NextRequest) {
  const siteCode = await resolveRequestSiteCode(request);
  const requestedHost = readHostnameFromRequest(request);
  const envDebug = logAppsScriptEnv(LOG, siteCode);

  try {
    const live = await fetchSiteLiveConfigFromSheet(siteCode);

    if (live.source !== "sheet" || !live.siteConfig) {
      const reason = live.debug?.reason ?? "PARSE_RESPONSE_ERROR";
      console.error(`${LOG} 503 SHEET_UNAVAILABLE reason=${reason} siteCode=${siteCode}`);
      return NextResponse.json(
        {
          success: false,
          data: {
            source: live.source,
            siteCode,
            _requestedSiteCode: siteCode,
            _requestedHost: requestedHost,
          },
          error: {
            code: "SHEET_UNAVAILABLE",
            message: "Google Sheet 설정을 불러올 수 없습니다",
            reason,
            hint: FAILURE_HINTS[reason] ?? FAILURE_HINTS.PARSE_RESPONSE_ERROR,
          },
          debug: {
            env: envDebug,
            fetch: live.debug ?? null,
          },
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    console.error(`${LOG} 200 OK siteCode=${live.siteConfig.siteCode}`);
    return NextResponse.json(
      {
        success: true,
        data: {
          ...live.siteConfig,
          source: "sheet" as const,
          updatedAt: live.updatedAt,
          _apiVersion: 2 as const,
          _requestedSiteCode: siteCode,
          _requestedHost: requestedHost,
        },
        error: null,
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error(`${LOG} 503 unhandled error:`, err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Google Sheet 설정을 불러올 수 없습니다",
        },
        debug: { env: envDebug, siteCode },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
