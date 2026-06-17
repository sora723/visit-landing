import { buildSitePageTitle } from "@/lib/site-page-title";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import type { OwnershipVerificationConfig } from "@/lib/ownership-verification";
import {
  buildAbsoluteSiteUrl,
  readSiteOriginFromHeaders,
} from "@/lib/site-request-url";
import { getServerSiteCode } from "@/lib/server-site-code";
import type { SiteConfig } from "@/lib/types";

export type SiteSeoFields = SiteConfig["seo"];

export function buildSiteSeoMetadata(input: {
  origin: string;
  pathname: string;
  siteName: string;
  seo: SiteSeoFields;
  ownership: OwnershipVerificationConfig;
  faviconUrl?: string;
}): Metadata {
  const { origin, pathname, siteName, seo, ownership, faviconUrl } = input;
  const canonical = buildAbsoluteSiteUrl(pathname, origin);
  const pageTitle = buildSitePageTitle(siteName, seo.title);
  const ogImages = seo.ogImage ? [{ url: seo.ogImage }] : [];
  const iconUrl = faviconUrl?.trim() || seo.faviconUrl?.trim();

  const other: Record<string, string> = {};
  if (ownership.metaOwnershipCode) {
    other["facebook-domain-verification"] = ownership.metaOwnershipCode;
  }
  if (ownership.naverOwnershipCode) {
    other["naver-site-verification"] = ownership.naverOwnershipCode;
  }
  if (ownership.kakaoOwnershipCode) {
    other["kakao-site-verification"] = ownership.kakaoOwnershipCode;
  }

  return {
    metadataBase: new URL(`${origin.replace(/\/$/, "")}/`),
    title: pageTitle,
    description: seo.description,
    ...(iconUrl
      ? {
          icons: {
            icon: [{ url: iconUrl }],
            apple: [{ url: iconUrl }],
          },
        }
      : {}),
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: pageTitle,
      description: seo.description,
      images: ogImages,
      locale: "ko_KR",
    },
    twitter: {
      card: seo.ogImage ? "summary_large_image" : "summary",
      title: pageTitle,
      description: seo.description,
      images: seo.ogImage ? [seo.ogImage] : [],
    },
    verification: {
      ...(ownership.googleOwnershipCode
        ? { google: ownership.googleOwnershipCode }
        : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

/** SiteConfig.seo + 요청 hostname 기준 metadata (canonical·OG·Twitter) */
export async function generateSiteMetadata(
  fallbackPathname = "/",
  searchParamsSiteCode?: string | null
): Promise<Metadata> {
  const hdrs = await headers();
  const origin = readSiteOriginFromHeaders(hdrs);
  const pathname = hdrs.get("x-pathname") || fallbackPathname;
  const siteCode = await getServerSiteCode(searchParamsSiteCode);
  const fileConfig = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const siteConfig =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fileConfig;
  const seo = siteConfig.seo;

  return buildSiteSeoMetadata({
    origin,
    pathname,
    siteName: siteConfig.siteName,
    seo,
    ownership: live.ownershipVerification,
    faviconUrl: siteConfig.faviconUrl ?? seo.faviconUrl,
  });
}
