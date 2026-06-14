import Link from "next/link";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { ConversionTracking } from "@/components/ConversionTracking";

export const dynamic = "force-dynamic";

export default async function CompletePage() {
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet();
  const siteName =
    live.source === "sheet" && live.siteConfig
      ? live.siteConfig.siteName
      : fallback.siteName;

  return (
    <>
      <ConversionTracking tracking={live.conversionTracking} />
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0f1a2e] p-5">
        <div className="w-full max-w-md bg-white p-8 text-center shadow-2xl sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#c9a962]/30 bg-[#c9a962]/10 text-2xl text-[#c9a962]">
            ✓
          </div>
          <h1 className="mb-3 text-xl font-bold text-[#0f1a2e]">
            방문예약이 접수되었습니다
          </h1>
          <p className="mb-2 text-sm text-[#6b7280]">
            담당자가 순차적으로 연락드립니다.
          </p>
          <p className="mb-8 font-semibold text-[#0f1a2e]">{siteName}</p>
          <Link
            href="/"
            className="inline-block w-full bg-[#c9a962] py-4 text-sm font-semibold text-[#0f1a2e] transition hover:bg-[#dfc88a]"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </>
  );
}
