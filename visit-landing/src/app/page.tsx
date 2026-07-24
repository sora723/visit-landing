import type { Metadata } from "next";
import { preload } from "react-dom";
import { headers } from "next/headers";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { isMobileUserAgent } from "@/lib/is-mobile-user-agent";
import { resolveHeroImageSources } from "@/lib/responsive-image";
import { resolveHomeRobotsMetadata, resolveRendererVersion } from "@/lib/resolve-renderer-version";
import { getServerSiteCode } from "@/lib/server-site-code";
import { ConfigProvider } from "@/components/ConfigProvider";
import { FormSubmitSecurityProvider } from "@/components/FormSubmitSecurityProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBar } from "@/components/PromoStickyBar";
import { V2PublishedPageShell } from "@/components/v2/V2PublishedPageShell";
import { V2SafeStatePage } from "@/components/v2/V2SafeStatePage";
import { hasRenderableV2Blocks } from "@/v2/renderable-v2-blocks";
import { loadV2PublishedPage } from "@/v2/server/fetch-v2-published-page";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

/**
 * V2 경로만 noindex.
 * V1(LandingPage)에는 robots를 넣지 않아 layout SEO가 유지된다.
 */
export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;

  const robots = resolveHomeRobotsMetadata(config.rendererVersion);
  return robots ? { robots } : {};
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;

  const renderer = resolveRendererVersion(config.rendererVersion);

  /** 정확히 v2만 Published loader — 실패·렌더가능 0개 시 V1 fallback 금지 */
  if (renderer === "v2") {
    const published = await loadV2PublishedPage(siteCode);
    if (published.ok && hasRenderableV2Blocks(published.page)) {
      return (
        <V2PublishedPageShell
          page={published.page}
          siteName={config.siteName}
        />
      );
    }
    return (
      <V2SafeStatePage siteName={config.siteName} phone={config.phone} />
    );
  }

  const hdrs = await headers();
  const serverMobile = isMobileUserAgent(hdrs.get("user-agent") ?? "");
  const heroSources = resolveHeroImageSources(config.hero);
  const heroPreloadUrl = serverMobile
    ? heroSources.mobile || heroSources.desktop
    : heroSources.desktop || heroSources.mobile;
  if (heroPreloadUrl) {
    preload(heroPreloadUrl, { as: "image", fetchPriority: "high" });
  }

  return (
    <ConfigProvider
      key={siteCode}
      config={config}
      contentSource={live.source}
      siteCode={siteCode}
      conversionTracking={live.conversionTracking}
    >
      <FormSubmitSecurityProvider siteCode={siteCode}>
        <LandingPage
          promoBar={
            <PromoStickyBar
              siteCode={siteCode}
              initialText={config.stickyPromoText ?? null}
              serverMobile={serverMobile}
            />
          }
        />
      </FormSubmitSecurityProvider>
    </ConfigProvider>
  );
}
