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
  /** 멀티테넌트 — /api/favicon?siteCode= 로 캐시·현장 분리 */
  siteCode?: string;
}): Metadata {
  const { origin, pathname, siteName, seo, ownership, faviconUrl, siteCode } =
    input;
  const canonical = buildAbsoluteSiteUrl(pathname, origin);
  const pageTitle = buildSitePageTitle(siteName, seo.title);
  const ogImages = seo.ogImage ? [{ url: seo.ogImage }] : [];
  const hasFavicon = Boolean(faviconUrl?.trim());
  const code = siteCode?.trim() || "";
  /** siteCode 없는 공용 /api/favicon·/favicon.ico 금지 — 다른 현장 아이콘 섞임 방지 */
  const faviconHref = code
    ? `/api/favicon?siteCode=${encodeURIComponent(code)}`
    : "";

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
    /**
     * 시트에 파비콘 있을 때만 현장별 API 링크.
     * 없으면 icons 비움 + Next 기본 /favicon.ico 억제(빈 아이콘) — 다른 현장으로 대체하지 않음.
     */
    icons: hasFavicon && faviconHref
      ? {
          icon: [{ url: faviconHref, type: "image/png", sizes: "32x32" }],
          apple: [{ url: faviconHref }],
        }
      : {
          icon: [
            {
              url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E",
              type: "image/svg+xml",
            },
          ],
        },
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
  const sheetConfig =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : null;
  const siteConfig = sheetConfig ?? fileConfig;
  const seo = siteConfig.seo;
  /** 파비콘만 시트 값 — fileConfig로 다른 아이콘 대체 금지 */
  const faviconUrl =
    sheetConfig?.faviconUrl?.trim() ||
    sheetConfig?.seo.faviconUrl?.trim() ||
    undefined;

  return buildSiteSeoMetadata({
    origin,
    pathname,
    siteName: siteConfig.siteName,
    seo,
    ownership: live.ownershipVerification,
    faviconUrl,
    siteCode,
  });
}
