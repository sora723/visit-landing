import { NextRequest, NextResponse } from "next/server";
import { getDemoRecentSubmissions } from "@/lib/demo-store";
import { filterRealReservationsOnly, formatReservationName } from "@/lib/live-reservation-feed";
import type { ReservationItem } from "@/lib/types";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL?.replace(/\/$/, "");
const SHEET_SITE_CODE = process.env.SHEET_SITE_CODE ?? "L001";

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

  if (!APPS_SCRIPT_URL) {
    const real = filterRealReservationsOnly(
      getDemoRecentSubmissions(limit)
    );
    return NextResponse.json({
      success: true,
      data: { ...sanitizeRealItems(real), demo: true },
      error: null,
    });
  }

  try {
    const url =
      `${APPS_SCRIPT_URL}?action=reservations.recent` +
      `&siteCode=${encodeURIComponent(SHEET_SITE_CODE)}` +
      `&limit=${encodeURIComponent(String(limit))}`;

    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
    });
    const json = await res.json();

    if (json.success && json.data?.items) {
      const sanitized = sanitizeRealItems(json.data.items as ReservationItem[]);
      return NextResponse.json({
        ...json,
        data: { ...json.data, ...sanitized },
      });
    }

    return NextResponse.json(json, { status: json.success ? 200 : 400 });
  } catch {
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
