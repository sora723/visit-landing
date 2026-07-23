import { preload } from "react-dom";
import { headers } from "next/headers";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { isMobileUserAgent } from "@/lib/is-mobile-user-agent";
import { resolveHeroImageSources } from "@/lib/responsive-image";
import { resolveRendererVersion } from "@/lib/resolve-renderer-version";
import { getServerSiteCode } from "@/lib/server-site-code";
import { ConfigProvider } from "@/components/ConfigProvider";
import { FormSubmitSecurityProvider } from "@/components/FormSubmitSecurityProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBar } from "@/components/PromoStickyBar";
import { V2Placeholder } from "@/components/v2/V2Placeholder";

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

  const renderer = resolveRendererVersion(config.rendererVersion);

  /** V2 자유형 렌더러 자리 — Sheet/레지스트리 미연결. 폼·전환 미실행. */
  if (renderer === "v2") {
    return <V2Placeholder siteCode={siteCode} renderer={renderer} />;
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
