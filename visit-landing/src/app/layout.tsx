import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { generateSiteMetadata } from "@/lib/site-seo-metadata";
import { getServerSiteCode } from "@/lib/server-site-code";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";

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
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const ownershipRaw = live.ownershipVerification.ownershipRawHtml;
  const theme = mergeSiteTheme(
    live.source === "sheet" && live.siteConfig
      ? live.siteConfig.theme
      : fileConfig.theme
  );

  return (
    <html lang="ko" style={themeStyleObject(theme)}>
      <body className="font-sans antialiased">
        {ownershipRaw ? <OwnershipRawScripts html={ownershipRaw} /> : null}
        {children}
      </body>
    </html>
  );
}
