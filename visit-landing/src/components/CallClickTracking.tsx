"use client";

import Script from "next/script";
import { useEffect } from "react";
import { shouldFireCallClick } from "@/lib/call-click-once";
import { fireCallClickConversion } from "@/lib/fire-call-click-conversion";
import {
  hasCallClickTracking,
  normalizeGoogleAdsId,
  type ConversionTrackingConfig,
} from "@/lib/conversion-tracking";

type Props = {
  siteCode: string;
  tracking: ConversionTrackingConfig;
};

/**
 * 전화(tel:) 클릭 전환 — 접수 전환과 별도 Label/이벤트
 * googleConversionId + googleCallConversionLabel / metaPixelId + metaCallConversionEvent
 */
export function CallClickTracking({ siteCode, tracking }: Props) {
  const hasGoogleCall = Boolean(
    tracking.googleConversionId && tracking.googleCallConversionLabel
  );
  const hasMetaCall = Boolean(
    tracking.metaPixelId && tracking.metaCallConversionEvent
  );
  const googleAdsId = tracking.googleConversionId
    ? normalizeGoogleAdsId(tracking.googleConversionId)
    : "";

  useEffect(() => {
    if (!hasCallClickTracking(tracking)) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href^="tel:"]');
      if (!anchor) return;
      if (!shouldFireCallClick(siteCode)) return;
      fireCallClickConversion(tracking);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [siteCode, tracking]);

  if (!hasCallClickTracking(tracking)) return null;

  return (
    <>
      {hasGoogleCall && (
        <>
          <Script
            id="call-click-gtag-loader"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
          />
          <Script id="call-click-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleAdsId}');
            `}
          </Script>
        </>
      )}
      {hasMetaCall && (
        <>
          <Script
            id="call-click-meta-base"
            strategy="afterInteractive"
            src="https://connect.facebook.net/en_US/fbevents.js"
          />
          <Script id="call-click-meta-init" strategy="afterInteractive">
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
              fbq('init', '${tracking.metaPixelId}');
            `}
          </Script>
        </>
      )}
    </>
  );
}
