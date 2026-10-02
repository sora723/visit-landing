import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { NaverCommonPvScripts, ownershipHtmlIsNaver } from "@/components/NaverCommonPvScripts";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";
import { SmartlogBaseScripts } from "@/components/SmartlogBaseScripts";
import { getSiteConfigFromFile } from "@/lib/config-source";
import {
  fetchSiteLiveConfigFromSheet,
  fetchSiteLiveConfigFromSheetBlocking,
  type SiteLiveConfigData,
} from "@/lib/fetch-site-live-config";
import { resolveNaverInflowDomain } from "@/lib/resolve-naver-inflow-domain";
import { resolveRenderableSiteConfig } from "@/lib/safe-site-config";
import { getServerSiteCode } from "@/lib/server-site-code";
import { generateSiteMetadata } from "@/lib/site-seo-metadata";
import { readHostnameFromHeaders } from "@/lib/site-request-url";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";

export const dynamic = "force-dynamic";

const fileConfig = getSiteConfigFromFile();

export async function generateMetadata(): Promise<Metadata> {
  return generateSiteMetadata("/");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  /** Samsung/Chrome "어둡게 보기" — 그라데이션·canvas 텍스트 색 왜곡 방지 */
  colorScheme: "light",
};

function needsTrackingConfig(live: SiteLiveConfigData | null): boolean {
  if (!live || live.source !== "sheet") return true;
  const ownership = live.ownershipVerification.ownershipRawHtml?.trim();
  const naver = live.conversionTracking.naverConversionScript?.trim();
  const smartlog =
    live.conversionTracking.smartlogAccount?.trim() &&
    live.conversionTracking.smartlogServer?.trim();
  return !ownership && !naver && !smartlog;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteCode = await getServerSiteCode();
  let live: SiteLiveConfigData | null = siteCode
    ? await fetchSiteLiveConfigFromSheet(siteCode)
    : null;
  /**
   * SSR 1.2s 예산에 지면 소유확인·lead가 빠져 어시스턴트 Site ID 0건.
   * 추적 설정이 비면 GAS 응답까지 대기 (광고 검수·전환 필수).
   */
  if (siteCode && needsTrackingConfig(live)) {
    live = await fetchSiteLiveConfigFromSheetBlocking(siteCode);
  }
  const ownershipRaw = live?.ownershipVerification.ownershipRawHtml;
  const smartlog = live?.conversionTracking;
  const renderable =
    siteCode && live
      ? resolveRenderableSiteConfig(siteCode, live, fileConfig)
      : null;
  const theme = mergeSiteTheme(renderable?.theme ?? null);
  const hdrs = await headers();
  const requestHost = readHostnameFromHeaders(hdrs);
  const inflowDomain = resolveNaverInflowDomain(live?.domain, requestHost);
  const pathname = hdrs.get("x-pathname")?.trim() || "";
  /** /complete 는 PV+lead 한 블록 — 레이아웃 PV 중복 방지 */
  const skipNaverLayoutPv =
    pathname === "/complete" &&
    Boolean(ownershipRaw && ownershipHtmlIsNaver(ownershipRaw));

  return (
    <html lang="ko" style={themeStyleObject(theme)}>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        precedence="default"
      />
      <body className="font-sans antialiased">
        {ownershipRaw && ownershipHtmlIsNaver(ownershipRaw) && !skipNaverLayoutPv ? (
          <NaverCommonPvScripts
            html={ownershipRaw}
            inflowDomain={inflowDomain}
          />
        ) : ownershipRaw && !ownershipHtmlIsNaver(ownershipRaw) ? (
          <OwnershipRawScripts html={ownershipRaw} />
        ) : null}
        {smartlog ? (
          <SmartlogBaseScripts
            account={smartlog.smartlogAccount}
            server={smartlog.smartlogServer}
          />
        ) : null}
        {children}
      </body>
    </html>
  );
}
