import {
  type ConversionTrackingConfig,
  normalizeGoogleAdsId,
} from "@/lib/conversion-tracking";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: (...args: unknown[]) => void;
  }
}

/** tel: 클릭 시 광고 플랫폼 전환 이벤트 (gtag/fbq는 CallClickTracking에서 선로드) */
export function fireCallClickConversion(
  tracking: ConversionTrackingConfig
): void {
  const googleId = tracking.googleConversionId;
  const callLabel = tracking.googleCallConversionLabel;
  if (googleId && callLabel) {
    const adsId = normalizeGoogleAdsId(googleId);
    const sendTo = `${adsId}/${callLabel}`;
    if (typeof window.gtag === "function") {
      window.gtag("event", "conversion", { send_to: sendTo });
    } else {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(["event", "conversion", { send_to: sendTo }]);
    }
  }

  const metaId = tracking.metaPixelId;
  const metaCallEvent = tracking.metaCallConversionEvent;
  if (metaId && metaCallEvent && typeof window.fbq === "function") {
    window.fbq("track", metaCallEvent);
  }
}
