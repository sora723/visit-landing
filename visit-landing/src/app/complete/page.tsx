import { headers } from "next/headers";
import { SiteContentBoot } from "@/components/SiteContentBoot";
import { CompletePageClient } from "@/components/CompletePageClient";
import {
  NaverCommonPvScripts,
  ownershipHtmlIsNaver,
} from "@/components/NaverCommonPvScripts";
import { NaverLeadSyncScripts } from "@/components/NaverLeadSyncScripts";
import { isNaverWaId } from "@/lib/naver-conversion";
import { resolveNaverInflowDomain } from "@/lib/resolve-naver-inflow-domain";
import { readHostnameFromHeaders } from "@/lib/site-request-url";
import { getSiteConfigFromFile } from "@/lib/config-source";
import {
  EMPTY_CONVERSION_TRACKING,
} from "@/lib/conversion-tracking";
import { fetchSiteLiveConfigFromSheetBlocking } from "@/lib/fetch-site-live-config";
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
  const live = await fetchSiteLiveConfigFromSheetBlocking(siteCode);
  const config = resolveRenderableSiteConfig(siteCode, live, fileConfig);
  if (!config) {
    return <SiteContentBoot siteCode={siteCode} />;
  }

  const submissionId = String(params.submissionId ?? "").trim() || null;
  const verified = params.verified === "1" || params.verified === "true";
  const autoReturn = params.autoReturn === "1" || params.autoReturn === "true";
  const returnTo = String(params.returnTo ?? "").trim();
  const homeHref = appendSiteCodeQuery("/", siteCode);
  const tracking =
    live.source === "sheet"
      ? live.conversionTracking
      : EMPTY_CONVERSION_TRACKING;
  const naverLeadHtml = tracking.naverConversionScript?.trim() || "";
  /**
   * GFA/CTS는 사이트맵의 `/complete`(쿼리 없음)를 열어 lead 문자열을 찾음.
   * verified 없을 때도 lead 패턴은 SSR에 항상 노출하고,
   * 실제 wcs.trans 는 접수 완료(verified+submissionId)일 때만 호출.
   */
  const embedNaverLead = Boolean(naverLeadHtml);
  const fireNaverLeadTrans = Boolean(verified && submissionId && naverLeadHtml);
  const ownershipRaw =
    live.source === "sheet"
      ? live.ownershipVerification.ownershipRawHtml?.trim() || ""
      : "";
  const hdrs = await headers();
  const inflowDomain = resolveNaverInflowDomain(
    live.domain,
    readHostnameFromHeaders(hdrs)
  );
  const ownershipWaId = isNaverWaId(ownershipRaw) ? ownershipRaw : null;
  const showNaverPvOnly =
    !embedNaverLead &&
    Boolean(ownershipRaw && ownershipHtmlIsNaver(ownershipRaw));

  return (
    <>
      {embedNaverLead ? (
        <NaverLeadSyncScripts
          html={naverLeadHtml}
          submissionId={submissionId}
          inflowDomain={inflowDomain}
          ownershipWaId={ownershipWaId}
          fireTrans={fireNaverLeadTrans}
        />
      ) : showNaverPvOnly ? (
        <NaverCommonPvScripts
          html={ownershipRaw}
          inflowDomain={inflowDomain}
        />
      ) : null}
      <CompletePageClient
        siteName={config.siteName}
        homeHref={homeHref}
        tracking={tracking}
        submissionId={submissionId}
        conversionAllowed={verified}
        autoReturn={autoReturn}
        returnTo={returnTo || homeHref}
        skipNaverConversion={embedNaverLead}
      />
    </>
  );
}
