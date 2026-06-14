import { Suspense } from "react";
import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { ConfigProvider } from "@/components/ConfigProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBarServer } from "@/components/PromoStickyBarServer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet();
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fallback;

  return (
    <ConfigProvider config={config} contentSource={live.source}>
      <LandingPage
        promoBar={
          <Suspense fallback={null}>
            <PromoStickyBarServer />
          </Suspense>
        }
      />
    </ConfigProvider>
  );
}
