"use client";

import Script from "next/script";

type Props = {
  html: string;
};

/** 시트 '소유확인코드' 원본 — script 부분만 (meta는 layout metadata) */
export function OwnershipRawScripts({ html }: Props) {
  if (!html.trim()) return null;

  return (
    <Script id="ownership-raw" strategy="beforeInteractive">
      {html.replace(/<\/?script[^>]*>/gi, "")}
    </Script>
  );
}
