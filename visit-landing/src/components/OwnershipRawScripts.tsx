"use client";

import Script from "next/script";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
};

/**
 * 시트 '소유확인코드' 원본 — gtag.js 외부 src + inline 순서 유지
 * (script 태그만 벗기면 googletagmanager.com/gtag/js 가 빠져 Tag Assistant가 태그를 못 찾음)
 */
export function OwnershipRawScripts({ html }: Props) {
  const parts = parseRawHtmlScripts(html, "ownership-raw");
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
