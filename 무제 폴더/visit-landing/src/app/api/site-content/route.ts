import { NextResponse } from "next/server";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await fetchSiteLiveConfigFromSheet();

  if (data.source !== "sheet") {
    return NextResponse.json(
      {
        success: false,
        data,
        error: {
          code: "SHEET_UNAVAILABLE",
          message: "Google Sheet 설정을 불러올 수 없습니다",
        },
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }

  return NextResponse.json(
    { success: true, data: { ...data, source: "sheet" }, error: null },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
