import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import {
  hasAnyConversionTracking,
  type ConversionTrackingConfig,
} from "@/lib/conversion-tracking";
import { prefersCompletePageFallback } from "@/lib/conversion-once";

export type RunConversionOptions = {
  siteCode: string;
  submissionId: string;
  tracking: ConversionTrackingConfig;
  navigate: (url: string) => void;
  returnPath?: string;
};

export const COMPLETE_DWELL_MS = 2500;

/**
 * 접수 1건당 전환 1회.
 * raw HTML(전환코드) → /complete 잠시 방문 후 autoReturn
 * 그 외 → 랜딩 inline (ConversionTrackingHost)
 */
export function runConversionAfterSubmit({
  siteCode,
  submissionId,
  tracking,
  navigate,
  returnPath = "/",
}: RunConversionOptions): void {
  if (!submissionId || !hasAnyConversionTracking(tracking)) return;

  const returnTo = appendSiteCodeQuery(returnPath, siteCode);
  const completeUrl =
    appendSiteCodeQuery("/complete", siteCode) +
    `&submissionId=${encodeURIComponent(submissionId)}` +
    `&autoReturn=1&returnTo=${encodeURIComponent(returnTo)}`;

  if (prefersCompletePageFallback(tracking)) {
    navigate(completeUrl);
    return;
  }

  window.dispatchEvent(
    new CustomEvent("reservation-conversion", {
      detail: { submissionId, tracking },
    })
  );
}
