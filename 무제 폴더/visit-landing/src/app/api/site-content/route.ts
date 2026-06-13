import { NextResponse } from "next/server";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";

export const dynamic = "force-dynamic";

const LOG = "[api/site-content]";

function logEnv() {
  const raw = process.env.APPS_SCRIPT_URL ?? "";
  const url = raw.replace(/\/$/, "");
  console.error(`${LOG} APPS_SCRIPT_URL read=${url ? "yes" : "no"} length=${url.length}`);
  if (url) {
    console.error(`${LOG} APPS_SCRIPT_URL=${url}`);
  } else {
    console.error(
      `${LOG} APPS_SCRIPT_URL missing — .env.local 확인 후 dev 서버 재시작 필요`
    );
  }
  console.error(`${LOG} SHEET_SITE_CODE=${process.env.SHEET_SITE_CODE ?? "L001"}`);
}

export async function GET() {
  logEnv();

  try {
    const data = await fetchSiteLiveConfigFromSheet();

    if (data.source !== "sheet") {
      console.error(
        `${LOG} 503 SHEET_UNAVAILABLE — fetchSiteLiveConfigFromSheet returned source=unavailable`
      );
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

    console.error(`${LOG} 200 OK siteCode=${data.siteCode}`);
    return NextResponse.json(
      { success: true, data: { ...data, source: "sheet" }, error: null },
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
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
