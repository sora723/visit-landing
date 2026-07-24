import type { Metadata } from "next";
import { preload } from "react-dom";
import { headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
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
import { loadV2DraftPreviewPage } from "@/v2/server/fetch-v2-draft-preview-page";
import { readV2PreviewSession } from "@/v2/server/read-v2-preview-session";
import { buildV2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{ siteCode?: string }>;
};

const PREVIEW_ROBOTS: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    "max-snippet": 0,
    "max-image-preview": "none",
    "max-video-preview": 0,
  },
};

/**
 * Preview 세션이면 항상 noindex.
 * 그 외 V2 공개는 기존 resolveHomeRobotsMetadata.
 */
export async function generateMetadata({
  searchParams,
}: HomeProps): Promise<Metadata> {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const previewSession = await readV2PreviewSession(siteCode);
  if (previewSession) {
    return {
      robots: PREVIEW_ROBOTS,
      // Preview token/canonical 노출 방지
      alternates: { canonical: undefined },
    };
  }

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
  const previewSession = await readV2PreviewSession(siteCode);

  /**
   * Preview: cookie가 현재 siteCode와 일치하고 renderer가 v2일 때만.
   * V1 공개 동작을 Preview cookie로 오염시키지 않음.
   * 실패 시 V1 fallback 금지 → SafeState.
   */
  if (previewSession && renderer === "v2") {
    noStore();
    const draft = await loadV2DraftPreviewPage(siteCode, previewSession.token);
    if (draft.ok && hasRenderableV2Blocks(draft.page)) {
      const site = buildV2RuntimeSiteContext(siteCode, config);
      return (
        <V2PublishedPageShell
          page={draft.page}
          site={site}
          conversionTracking={live.conversionTracking}
          isPreview
        />
      );
    }
    return (
      <V2SafeStatePage siteName={config.siteName} phone={config.phone} />
    );
  }

  /** 정확히 v2만 Published loader — 실패·렌더가능 0개 시 V1 fallback 금지 */
  if (renderer === "v2") {
    const published = await loadV2PublishedPage(siteCode);
    if (published.ok && hasRenderableV2Blocks(published.page)) {
      const site = buildV2RuntimeSiteContext(siteCode, config);
      return (
        <V2PublishedPageShell
          page={published.page}
          site={site}
          conversionTracking={live.conversionTracking}
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
