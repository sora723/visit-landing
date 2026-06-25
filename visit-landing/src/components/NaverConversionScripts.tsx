"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fireNaverConversion, isNaverWaId } from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  script: string;
  idPrefix: string;
  /** submissionId당 1회 전환 시도 */
  active: boolean;
};

/**
 * naverConversionScript — WA ID 또는 네이버 HTML 스크립트
 * 외부 wcslog.js → 인라인 순서 유지, wcs 준비 후 전환
 */
export function NaverConversionScripts({ script, idPrefix, active }: Props) {
  const trimmed = script.trim();
  const firedRef = useRef(false);
  const [sequentialIndex, setSequentialIndex] = useState(0);

  const htmlParts = useMemo(() => {
    if (!trimmed || isNaverWaId(trimmed)) return [];
    return parseRawHtmlScripts(trimmed, idPrefix);
  }, [trimmed, idPrefix]);

  const tryFire = useCallback(() => {
    if (!active || firedRef.current) return;
    if (fireNaverConversion()) {
      firedRef.current = true;
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;

    tryFire();
    const interval = window.setInterval(tryFire, 250);
    const stop = window.setTimeout(() => window.clearInterval(interval), 5000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [active, tryFire]);

  const onPartReady = useCallback(
    (index: number, total: number) => {
      if (index + 1 < total) {
        setSequentialIndex(index + 1);
      }
      tryFire();
    },
    [tryFire]
  );

  if (!trimmed) return null;

  if (isNaverWaId(trimmed)) {
    const wa = trimmed.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return (
      <>
        <Script
          id={`${idPrefix}-wcslog`}
          strategy="afterInteractive"
          src="//wcs.naver.net/wcslog.js"
          onLoad={tryFire}
        />
        <Script
          id={`${idPrefix}-init`}
          strategy="afterInteractive"
          onReady={tryFire}
        >
          {`
            if (!window.wcs_add) window.wcs_add = {};
            window.wcs_add["wa"] = "${wa}";
            if (typeof window.wcs_inflow === "function") window.wcs_inflow();
          `}
        </Script>
      </>
    );
  }

  if (htmlParts.length > 0) {
    const visible = htmlParts.slice(0, sequentialIndex + 1);
    return (
      <>
        {visible.map((part, index) =>
          part.kind === "external" ? (
            <Script
              key={part.key}
              id={part.key}
              strategy="afterInteractive"
              src={part.src}
              onLoad={() => onPartReady(index, htmlParts.length)}
            />
          ) : (
            <Script
              key={part.key}
              id={part.key}
              strategy="afterInteractive"
              onReady={() => onPartReady(index, htmlParts.length)}
            >
              {part.content}
            </Script>
          )
        )}
      </>
    );
  }

  const bare = trimmed.replace(/<!--[\s\S]*?-->/g, "").trim();
  return (
    <Script
      id={`${idPrefix}-bare`}
      strategy="afterInteractive"
      onReady={tryFire}
    >
      {bare}
    </Script>
  );
}
