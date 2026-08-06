import { preload } from "react-dom";
import { headers } from "next/headers";
import { ConfigProvider } from "@/components/ConfigProvider";
import { FormSubmitSecurityProvider } from "@/components/FormSubmitSecurityProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBar } from "@/components/PromoStickyBar";
import { SiteContentBoot } from "@/components/SiteContentBoot";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { EMPTY_CONVERSION_TRACKING } from "@/lib/conversion-tracking";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { isMobileUserAgent } from "@/lib/is-mobile-user-agent";
import { resolveHeroImageSources } from "@/lib/responsive-image";
import { resolveRenderableSiteConfig } from "@/lib/safe-site-config";
import { getServerSiteCode } from "@/lib/server-site-code";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const hdrs = await headers();
  const unresolvedDomain = hdrs.get("x-site-unresolved") === "1" || !siteCode;

  if (unresolvedDomain) {
    return <SiteContentBoot unresolvedDomain />;
  }

  const fileConfig = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config = resolveRenderableSiteConfig(siteCode, live, fileConfig);

  if (!config) {
    return <SiteContentBoot siteCode={siteCode} />;
  }

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
      conversionTracking={
        live.source === "sheet"
          ? live.conversionTracking
          : EMPTY_CONVERSION_TRACKING
      }
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
