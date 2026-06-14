import { NextRequest, NextResponse } from "next/server";
import { getDemoRecentSubmissions } from "@/lib/demo-store";
import { filterRealReservationsOnly, formatReservationName } from "@/lib/live-reservation-feed";
import { resolveRequestSiteCode } from "@/lib/resolve-site-code";
import type { ReservationItem } from "@/lib/types";

const LOG = "[api/reservations]";

function getAppsScriptUrl() {
  return (process.env.APPS_SCRIPT_URL ?? "").replace(/\/$/, "");
}

function logEnv(siteCode: string) {
  const url = getAppsScriptUrl();
  console.error(`${LOG} APPS_SCRIPT_URL read=${url ? "yes" : "no"} length=${url.length}`);
  if (url) {
    console.error(`${LOG} APPS_SCRIPT_URL=${url}`);
  } else {
    console.error(`${LOG} APPS_SCRIPT_URL missing — demo 모드로 fallback`);
  }
  console.error(`${LOG} siteCode=${siteCode}`);
}

/** 가상 접수는 프론트 buildLiveFeed에서만 생성 — API는 실제 접수만 반환 */
function sanitizeRealItems(items: ReservationItem[]) {
  const real = filterRealReservationsOnly(items).map((item) => ({
    ...item,
    name: formatReservationName(item.name),
    type: String(item.type ?? "").trim() || undefined,
  }));
  return {
    items: real,
    realCount: real.length,
    virtualCount: 0,
  };
}

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "12");
  const siteCode = resolveRequestSiteCode(request);
  logEnv(siteCode);
  const appsScriptUrl = getAppsScriptUrl();

  if (!appsScriptUrl) {
    console.error(`${LOG} demo fallback (APPS_SCRIPT_URL empty)`);
    const real = filterRealReservationsOnly(
      getDemoRecentSubmissions(limit)
    );
    return NextResponse.json({
      success: true,
      data: { ...sanitizeRealItems(real), demo: true },
      error: null,
    });
  }

  const fetchUrl =
    `${appsScriptUrl}?action=reservations.recent` +
    `&siteCode=${encodeURIComponent(siteCode)}` +
    `&limit=${encodeURIComponent(String(limit))}`;

  try {
    console.error(`${LOG} fetch URL=${fetchUrl}`);

    const res = await fetch(fetchUrl, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
    });

    const bodyText = await res.text();
    console.error(
      `${LOG} response status=${res.status} content-type=${res.headers.get("content-type") ?? "(none)"}`
    );
    console.error(`${LOG} response body=${bodyText.slice(0, 800)}`);

    let json: {
      success?: boolean;
      data?: { items?: ReservationItem[] };
      error?: { code?: string; message?: string };
    };
    try {
      json = JSON.parse(bodyText) as typeof json;
    } catch (parseErr) {
      console.error(`${LOG} 502 JSON parse failed:`, parseErr);
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: "INVALID_RESPONSE",
            message: "예약 현황 응답을 해석할 수 없습니다",
          },
        },
        { status: 502 }
      );
    }

    if (json.success && json.data?.items) {
      const sanitized = sanitizeRealItems(json.data.items as ReservationItem[]);
      console.error(`${LOG} 200 OK items=${sanitized.items.length}`);
      return NextResponse.json({
        ...json,
        data: { ...json.data, ...sanitized },
      });
    }

    console.error(
      `${LOG} Apps Script non-success: success=${json.success} error=${JSON.stringify(json.error)}`
    );
    return NextResponse.json(json, { status: json.success ? 200 : 400 });
  } catch (err) {
    console.error(`${LOG} 502 fetch threw:`, err);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: "NETWORK_ERROR", message: "예약 현황을 불러올 수 없습니다" },
      },
      { status: 502 }
    );
  }
}
