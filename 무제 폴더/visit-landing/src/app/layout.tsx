import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { getServerSiteCode } from "@/lib/server-site-code";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";

export const dynamic = "force-dynamic";

const fileConfig = getSiteConfigFromFile();

export async function generateMetadata(): Promise<Metadata> {
  const siteCode = await getServerSiteCode();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const ov = live.ownershipVerification;
  const seo =
    live.source === "sheet" && live.siteConfig ? live.siteConfig.seo : fileConfig.seo;
  const other: Record<string, string> = {};

  if (ov.metaOwnershipCode) {
    other["facebook-domain-verification"] = ov.metaOwnershipCode;
  }
  if (ov.naverOwnershipCode) {
    other["naver-site-verification"] = ov.naverOwnershipCode;
  }
  if (ov.kakaoOwnershipCode) {
    other["kakao-site-verification"] = ov.kakaoOwnershipCode;
  }

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      title: seo.title,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : [],
    },
    verification: {
      ...(ov.googleOwnershipCode ? { google: ov.googleOwnershipCode } : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
