"use client";

import Script from "next/script";
import {
  resolveSmartlogIds,
  smartlogBaseInline,
  smartlogNoscriptSrc,
  smartlogScriptSrc,
} from "@/lib/smartlog";

type Props = {
  account?: string | null;
  server?: string | null;
};

/**
 * Smartlog 메인 스크립트 — 모든 페이지 (현장별 account/server).
 */
export function SmartlogBaseScripts({ account, server }: Props) {
  const ids = resolveSmartlogIds(account, server);
  if (!ids) return null;

  const prefix = `smartlog-${ids.accountNumeric}`;

  return (
    <>
      <Script id={`${prefix}-info`} strategy="afterInteractive">
        {smartlogBaseInline(ids)}
      </Script>
      <Script
        id={`${prefix}-core`}
        src={smartlogScriptSrc()}
        strategy="afterInteractive"
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={smartlogNoscriptSrc(ids)}
          alt=""
          width={0}
          height={0}
          style={{ display: "none", width: 0, height: 0 }}
        />
      </noscript>
    </>
  );
}
