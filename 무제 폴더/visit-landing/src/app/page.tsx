import { Suspense } from "react";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { resolveSiteCode } from "@/lib/resolve-site-code";
import { ConfigProvider } from "@/components/ConfigProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBarServer } from "@/components/PromoStickyBarServer";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const siteCode = resolveSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;

  return (
    <ConfigProvider
      config={config}
      contentSource={live.source}
      siteCode={siteCode}
    >
      <LandingPage
        promoBar={
          <Suspense fallback={null}>
            <PromoStickyBarServer siteCode={siteCode} />
          </Suspense>
        }
      />
    </ConfigProvider>
  );
}
