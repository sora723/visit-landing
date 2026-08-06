/**
 * GET /api/site-content/[siteCode] — 경로에 siteCode를 넣어 CDN 캐시 키 분리.
 * 쿼리 ?siteCode= 방식은 현장 교차 오염 이력이 있어 사용하지 않음.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  API_NO_STORE_CACHE_CONTROL,
  SITE_CONTENT_BROWSER_CACHE_CONTROL,
  SITE_CONTENT_CDN_CACHE_CONTROL,
  SITE_CONTENT_NETLIFY_CDN_CACHE_CONTROL,
} from "@/lib/api-cache-headers";
import { logAppsScriptEnv } from "@/lib/apps-script-env";
import { fetchSiteLiveConfigFromSheetBlocking } from "@/lib/fetch-site-live-config";
import { isValidSiteCodePathSegment } from "@/lib/resolve-site-code";
import { readHostnameFromRequest } from "@/lib/site-request-url";

const LOG = "[api/site-content/[siteCode]]";

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

const SUCCESS_CACHE_HEADERS = {
  "Cache-Control": SITE_CONTENT_BROWSER_CACHE_CONTROL,
  "CDN-Cache-Control": SITE_CONTENT_CDN_CACHE_CONTROL,
  "Netlify-CDN-Cache-Control": SITE_CONTENT_NETLIFY_CDN_CACHE_CONTROL,
} as const;

const NO_STORE_HEADERS = {
  "Cache-Control": API_NO_STORE_CACHE_CONTROL,
  "CDN-Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store",
} as const;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ siteCode: string }> }
) {
  const params = await context.params;
  const siteCode = String(params.siteCode || "").trim();
  const requestedHost = readHostnameFromRequest(request);
  const envDebug = logAppsScriptEnv(LOG, siteCode);

  if (!isValidSiteCodePathSegment(siteCode)) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "INVALID_SITE_CODE", message: "siteCode가 올바르지 않습니다" },
      },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const live = await fetchSiteLiveConfigFromSheetBlocking(siteCode);

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
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const resolvedSiteCode = String(live.siteConfig.siteCode ?? siteCode).trim();
    if (resolvedSiteCode && resolvedSiteCode !== siteCode) {
      console.error(
        `${LOG} 409 SITE_CODE_MISMATCH requested=${siteCode} resolved=${resolvedSiteCode}`
      );
      return NextResponse.json(
        {
          success: false,
          data: {
            source: live.source,
            siteCode: resolvedSiteCode,
            _requestedSiteCode: siteCode,
            _requestedHost: requestedHost,
          },
          error: {
            code: "SITE_CODE_MISMATCH",
            message: "요청 현장과 응답 현장이 일치하지 않습니다",
          },
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    console.error(`${LOG} 200 OK siteCode=${resolvedSiteCode}`);
    return NextResponse.json(
      {
        success: true,
        data: {
          ...live.siteConfig,
          siteCode: resolvedSiteCode || siteCode,
          source: "sheet" as const,
          updatedAt: live.updatedAt,
          _apiVersion: 2 as const,
          _requestedSiteCode: siteCode,
          _requestedHost: requestedHost,
        },
        error: null,
      },
      { headers: SUCCESS_CACHE_HEADERS }
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
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
