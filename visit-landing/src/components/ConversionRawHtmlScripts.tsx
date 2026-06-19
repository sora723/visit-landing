"use client";

import Script from "next/script";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  idPrefix?: string;
};

/** 전환코드 HTML — 외부 src + inline script 순서 유지 */
export function ConversionRawHtmlScripts({
  html,
  idPrefix = "conversion-raw",
}: Props) {
  const parts = parseRawHtmlScripts(html, idPrefix);
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
