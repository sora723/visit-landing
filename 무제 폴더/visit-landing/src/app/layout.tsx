import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getSiteConfig } from "@/lib/config";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { mergeSiteTheme, themeStyleObject } from "@/lib/site-theme";
import { OwnershipRawScripts } from "@/components/OwnershipRawScripts";

export const dynamic = "force-dynamic";

const config = getSiteConfig();
const initialTheme = mergeSiteTheme(config.theme);

export async function generateMetadata(): Promise<Metadata> {
  const live = await fetchSiteLiveConfigFromSheet();
  const ov = live.ownershipVerification;
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
    title: config.seo.title,
    description: config.seo.description,
    openGraph: {
      title: config.seo.title,
      description: config.seo.description,
      images: config.seo.ogImage ? [config.seo.ogImage] : [],
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
  const live = await fetchSiteLiveConfigFromSheet();
  const ownershipRaw = live.ownershipVerification.ownershipRawHtml;

  return (
    <html lang="ko" style={themeStyleObject(initialTheme)}>
      <body className="font-sans antialiased">
        {ownershipRaw ? <OwnershipRawScripts html={ownershipRaw} /> : null}
        {children}
      </body>
    </html>
  );
}
