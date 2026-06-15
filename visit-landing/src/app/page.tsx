import { preload } from "react-dom";
import { headers } from "next/headers";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { isMobileUserAgent } from "@/lib/is-mobile-user-agent";
import { resolveHeroImageSources } from "@/lib/responsive-image";
import { getServerSiteCode } from "@/lib/server-site-code";
import { ConfigProvider } from "@/components/ConfigProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBar } from "@/components/PromoStickyBar";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;

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
    >
      <LandingPage
        promoBar={
          <PromoStickyBar
            siteCode={siteCode}
            initialText={config.stickyPromoText ?? null}
            serverMobile={serverMobile}
          />
        }
      />
    </ConfigProvider>
  );
}
