import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { getServerSiteCode } from "@/lib/server-site-code";
import { CompletePageClient } from "@/components/CompletePageClient";

export const dynamic = "force-dynamic";

type CompletePageProps = {
  searchParams: Promise<{
    siteCode?: string;
    submissionId?: string;
    autoReturn?: string;
    returnTo?: string;
  }>;
};

export default async function CompletePage({ searchParams }: CompletePageProps) {
  const params = await searchParams;
  const siteCode = await getServerSiteCode(params.siteCode);
  const fallback = getSiteConfigFromFile();
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const siteName =
    live.source === "sheet" && live.siteConfig
      ? live.siteConfig.siteName
      : fallback.siteName;

  const submissionId = String(params.submissionId ?? "").trim() || null;
  const autoReturn = params.autoReturn === "1" || params.autoReturn === "true";
  const returnTo = String(params.returnTo ?? "").trim();
  const homeHref = appendSiteCodeQuery("/", siteCode);

  return (
    <CompletePageClient
      siteName={siteName}
      homeHref={homeHref}
      tracking={live.conversionTracking}
      submissionId={submissionId}
      autoReturn={autoReturn}
      returnTo={returnTo || homeHref}
    />
  );
}
