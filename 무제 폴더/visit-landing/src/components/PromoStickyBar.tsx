"use client";

import { useCallback, useEffect, useState } from "react";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";

const POLL_MS = 15_000;

/** 하단 프로모 — Google Sheet stickyPromoText 전용 (site.json 미사용) */
export function PromoStickyBar({
  siteCode,
  initialText,
}: {
  siteCode: string;
  initialText: string | null;
}) {
  const [text, setText] = useState(initialText);

  const fetchLivePromo = useCallback(async () => {
    try {
      const res = await fetch(appendSiteCodeQuery("/api/site-content", siteCode), {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && json.data?.source === "sheet") {
        const t = json.data.stickyPromoText;
        setText(typeof t === "string" ? t.trim() || null : null);
      }
    } catch {
      /* 현재 표시 유지 */
    }
  }, [siteCode]);

  useEffect(() => {
    fetchLivePromo();
    const timer = setInterval(fetchLivePromo, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchLivePromo();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchLivePromo]);

  if (!text) return null;

  return (
    <div
      className="promo-sticky-bar pointer-events-none fixed inset-x-0 z-[199] flex items-end justify-center px-3 pb-1.5 md:px-6 md:pb-2"
      aria-hidden={false}
    >
      <p className="promo-sticky-text m-0 text-center leading-none">
        <span className="promo-sticky-text-inner">{text}</span>
      </p>
    </div>
  );
}
