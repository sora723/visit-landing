import { Suspense } from "react";
import { getSiteConfig } from "@/lib/config";
import { ConfigProvider } from "@/components/ConfigProvider";
import { LandingPage } from "@/components/LandingPage";
import { PromoStickyBarServer } from "@/components/PromoStickyBarServer";

export default function Home() {
  const config = getSiteConfig();

  return (
    <ConfigProvider config={config}>
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
