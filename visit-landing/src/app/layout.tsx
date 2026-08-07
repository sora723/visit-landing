import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { resolveRenderableSiteConfig } from "@/lib/safe-site-config";
import { generateSiteMetadata } from "@/lib/site-seo-metadata";
import { getServerSiteCode } from "@/lib/server-site-code";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";
import { SmartlogBaseScripts } from "@/components/SmartlogBaseScripts";

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

  return (
    <html lang="ko" style={themeStyleObject(theme)}>
      <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        precedence="default"
      />
      <body className="font-sans antialiased">
        {ownershipRaw ? <OwnershipRawScripts html={ownershipRaw} /> : null}
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
