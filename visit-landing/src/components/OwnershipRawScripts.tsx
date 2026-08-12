"use client";

import Script from "next/script";
import {
  escapeForInlineJsString,
  isNaverWaId,
  normalizeNaverInflowDomain,
} from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  /** 네이버 공통키(WA ID)만 있을 때 wcs.inflow(domain)에 사용 */
  inflowDomain?: string | null;
};

/**
 * 시트 '소유확인코드' 원본 — gtag.js 외부 src + inline 순서 유지
 * (script 태그만 벗기면 googletagmanager.com/gtag/js 가 빠져 Tag Assistant가 태그를 못 찾음)
 *
 * WA ID만 넣은 경우(예: s_388d13d3cd3e) → 네이버 전환 검수용 공통 PV/유입 스크립트 자동 설치
 */
export function OwnershipRawScripts({ html, inflowDomain }: Props) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (isNaverWaId(trimmed)) {
    const wa = escapeForInlineJsString(trimmed);
    const domain = normalizeNaverInflowDomain(inflowDomain ?? "");
    const domainArg = domain
      ? `"${escapeForInlineJsString(domain)}"`
      : "";

    return (
      <>
        <Script
          id="ownership-naver-wcslog"
          src="//wcs.naver.net/wcslog.js"
          strategy="afterInteractive"
        />
        <Script id="ownership-naver-pv" strategy="afterInteractive">
          {`
if (!wcs_add) var wcs_add={};
wcs_add["wa"] = "${wa}";
if(window.wcs) {
    wcs.inflow(${domainArg});
}
wcs_do();
`}
        </Script>
      </>
    );
  }

  const parts = parseRawHtmlScripts(trimmed, "ownership-raw");
  if (parts.length === 0) return null;

  return (
    <>
      {parts.map((part) =>
        part.kind === "external" ? (
          <Script
            key={part.key}
            id={part.key}
            src={part.src}
            strategy="afterInteractive"
          />
        ) : (
          <Script key={part.key} id={part.key} strategy="afterInteractive">
            {part.content}
          </Script>
        )
      )}
    </>
  );
}
