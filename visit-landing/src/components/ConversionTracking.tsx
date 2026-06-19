"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { claimConversionFire } from "@/lib/conversion-once";
import {
  hasAnyConversionTracking,
  normalizeGoogleAdsId,
  type ConversionTrackingConfig,
} from "@/lib/conversion-tracking";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    wcs_add?: Record<string, string>;
    wcs?: { inflow: () => void; do: () => void };
    wcs_do?: () => void;
    wcs_inflow?: () => void;
    kakaoPixel?: (id: string) => {
      pageView: () => void;
      completeRegistration: () => void;
      purchase: (payload?: Record<string, unknown>) => void;
    };
  }
}

type Props = {
  tracking: ConversionTrackingConfig;
  /** 1접수=1전환 — 없으면 미실행, 새로고침 시 sessionStorage로 중복 차단 */
  submissionId?: string | null;
};

/**
 * 전환 코드 (현장관리 시트). submissionId당 최초 1회만 실행.
 */
export function ConversionTracking({ tracking, submissionId }: Props) {
  const [armed] = useState(() => {
    if (!submissionId || !hasAnyConversionTracking(tracking)) return false;
    return claimConversionFire(submissionId);
  });

  const metaId = tracking.metaPixelId;
  const metaEvent = tracking.metaConversionEvent || "Lead";
  const googleId = tracking.googleConversionId;
  const googleLabel = tracking.googleConversionLabel;
  const naverScript = tracking.naverConversionScript;
  const kakaoId = tracking.kakaoPixelId;

  const hasMeta = Boolean(metaId);
  const hasGoogle = Boolean(googleId && googleLabel);
  const hasNaver = Boolean(naverScript);
  const hasKakao = Boolean(kakaoId);
  const rawHtml = tracking.conversionRawHtml?.trim();

  useEffect(() => {
    if (!armed) return;

    if (hasNaver && typeof window.wcs_do === "function") {
      window.wcs_do();
    }

    if (hasKakao && typeof window.kakaoPixel === "function") {
      try {
        window.kakaoPixel(kakaoId!).completeRegistration();
      } catch {
        /* pixel load race */
      }
    }
  }, [armed, hasNaver, hasKakao, kakaoId]);

  if (!armed) return null;

  const googleAdsId = googleId ? normalizeGoogleAdsId(googleId) : "";
  const googleSendTo = hasGoogle ? `${googleAdsId}/${googleLabel}` : "";

  const naverWa =
    naverScript && !naverScript.includes("<") ? naverScript : null;

  return (
    <>
      {rawHtml && (
        <Script id="conversion-raw-inline" strategy="afterInteractive">
          {rawHtml.replace(/<\/?script[^>]*>/gi, "")}
        </Script>
      )}
      {hasMeta && (
        <>
          <Script
            id="meta-pixel-base"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/fbevents.js"
          />
          <Script id="meta-pixel-init" strategy="afterInteractive">
            {`
              if (!window.fbq) {
                !function(f,b,e,v,n,t,s){
                  if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)
                }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              }
              fbq('init', '${metaId}');
              fbq('track', '${metaEvent}');
            `}
          </Script>
        </>
      )}

      {hasGoogle && (
        <>
          <Script
            id="google-ads-gtag"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          />
          <Script id="google-ads-conversion" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
              gtag('event', 'conversion', {
                'send_to': '${googleSendTo}'
              });
            `}
          </Script>
        </>
      )}

      {hasNaver && naverWa && (
        <>
          <Script
            id="naver-wcslog"
            strategy="afterInteractive"
            src="//wcs.naver.net/wcslog.js"
          />
          <Script id="naver-conversion" strategy="afterInteractive">
            {`
              if (!window.wcs_add) window.wcs_add = {};
              window.wcs_add["wa"] = "${naverWa}";
              if (typeof window.wcs_inflow === "function") window.wcs_inflow();
            `}
          </Script>
        </>
      )}

      {hasNaver && !naverWa && naverScript && (
        <Script id="naver-conversion-custom" strategy="afterInteractive">
          {naverScript.replace(/<\/?script[^>]*>/gi, "")}
        </Script>
      )}

      {hasKakao && (
        <>
          <Script
            id="kakao-pixel"
            strategy="afterInteractive"
            src="https://t1.daumcdn.net/kas/static/kp.js"
          />
          <Script id="kakao-pixel-init" strategy="afterInteractive">
            {`
              if (typeof kakaoPixel === "function") {
                kakaoPixel('${kakaoId}').pageView();
              }
            `}
          </Script>
        </>
      )}
    </>
  );
}
