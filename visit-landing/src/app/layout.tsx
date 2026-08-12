import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";
import { SmartlogBaseScripts } from "@/components/SmartlogBaseScripts";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { normalizeHostname } from "@/lib/fetch-domain-site-code-map";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { normalizeNaverInflowDomain } from "@/lib/naver-conversion";
import { isPlatformHostname } from "@/lib/platform-hostname";
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

/** 네이버 wcs.inflow — 시트 domain 우선, 없으면 커스텀 도메인 Host */
function resolveNaverInflowDomain(
  sheetDomain: string | undefined,
  requestHost: string
): string {
  const fromSheet = normalizeNaverInflowDomain(sheetDomain ?? "");
  if (fromSheet && !isPlatformHostname(fromSheet)) return fromSheet;

  const fromHost = normalizeHostname(requestHost);
  if (fromHost && !isPlatformHostname(fromHost)) return fromHost;

  return fromSheet || fromHost;
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const siteCode = await getServerSiteCode();
  const live = siteCode
    ? await fetchSiteLiveConfigFromSheet(siteCode)
    : null;
  const ownershipRaw = live?.ownershipVerification.ownershipRawHtml;
  const smartlog = live?.conversionTracking;
  const renderable =
    siteCode && live
      ? resolveRenderableSiteConfig(siteCode, live, fileConfig)
      : null;
  const theme = mergeSiteTheme(renderable?.theme ?? null);
  const requestHost = readHostnameFromHeaders(await headers());
  const inflowDomain = resolveNaverInflowDomain(live?.domain, requestHost);

  return (
    <html lang="ko" style={themeStyleObject(theme)}>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        precedence="default"
      />
      <body className="font-sans antialiased">
        {ownershipRaw ? (
          <OwnershipRawScripts html={ownershipRaw} inflowDomain={inflowDomain} />
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
