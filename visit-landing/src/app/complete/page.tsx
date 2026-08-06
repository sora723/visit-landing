import { SiteContentBoot } from "@/components/SiteContentBoot";
import { CompletePageClient } from "@/components/CompletePageClient";
import { getSiteConfigFromFile } from "@/lib/config-source";
import {
  EMPTY_CONVERSION_TRACKING,
} from "@/lib/conversion-tracking";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { resolveRenderableSiteConfig } from "@/lib/safe-site-config";
import { getServerSiteCode } from "@/lib/server-site-code";

export const dynamic = "force-dynamic";

type CompletePageProps = {
  searchParams: Promise<{
    siteCode?: string;
    submissionId?: string;
    autoReturn?: string;
    returnTo?: string;
    verified?: string;
  }>;
};

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  if (!siteCode) {
    return <SiteContentBoot unresolvedDomain />;
  }

  const fileConfig = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const config = resolveRenderableSiteConfig(siteCode, live, fileConfig);
  if (!config) {
    return <SiteContentBoot siteCode={siteCode} />;
  }

  const submissionId = String(params.submissionId ?? "").trim() || null;
  const verified = params.verified === "1" || params.verified === "true";
  const autoReturn = params.autoReturn === "1" || params.autoReturn === "true";
  const returnTo = String(params.returnTo ?? "").trim();
  const homeHref = appendSiteCodeQuery("/", siteCode);

  return (
    <CompletePageClient
      siteName={config.siteName}
      homeHref={homeHref}
      tracking={
        live.source === "sheet"
          ? live.conversionTracking
          : EMPTY_CONVERSION_TRACKING
      }
      submissionId={submissionId}
      conversionAllowed={verified}
      autoReturn={autoReturn}
      returnTo={returnTo || homeHref}
    />
  );
}
