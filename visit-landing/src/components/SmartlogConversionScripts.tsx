"use client";

import Script from "next/script";
import {
  normalizeSmartlogConversionMode,
  resolveSmartlogIds,
  smartlogBaseInline,
  smartlogScriptSrc,
  smartlogTraceInline,
} from "@/lib/smartlog";

type Props = {
  account?: string | null;
  server?: string | null;
  mode?: string | null;
  /** 회원/리드 식별 — submissionId 권장 */
  memId: string;
  totalPrice?: string;
  active: boolean;
};

/**
 * Smartlog 전환 — hpt_info + hpt_trace_info 설정 후 smart_renew 재로드.
 * (트레이스는 라이브러리 로드 전에 잡혀야 함)
 */
export function SmartlogConversionScripts({
  account,
  server,
  mode,
  memId,
  totalPrice,
  active,
}: Props) {
  const ids = resolveSmartlogIds(account, server);
  if (!active || !ids || !memId.trim()) return null;

  const conversionMode = normalizeSmartlogConversionMode(mode);
  const prefix = `smartlog-conv-${ids.accountNumeric}-${conversionMode}`;
  const inline =
    smartlogBaseInline(ids) +
    "\n" +
    smartlogTraceInline(conversionMode, memId.trim(), totalPrice);

  return (
    <>
      <Script id={`${prefix}-info`} strategy="afterInteractive">
        {inline}
      </Script>
      <Script
        id={`${prefix}-core`}
        src={`${smartlogScriptSrc()}?v=${encodeURIComponent(memId.trim())}`}
        strategy="afterInteractive"
      />
    </>
  );
}
