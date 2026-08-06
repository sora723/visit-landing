"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { siteContentApiPath } from "@/lib/resolve-site-code";

/**
 * 시트 설정이 아직 없을 때 — 다른 현장(site.json)을 절대 그리지 않는 중립 대기.
 * siteCode 가 있으면 /api/site-content 로 채운 뒤 refresh.
 */
export function SiteContentBoot({
  siteCode,
  unresolvedDomain = false,
}: {
  siteCode?: string;
  unresolvedDomain?: boolean;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const code = String(siteCode || "").trim();

  useEffect(() => {
    if (unresolvedDomain || !code) {
      const timer = window.setTimeout(() => router.refresh(), 2_000);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    let attempts = 0;

    const tick = () => {
      attempts += 1;
      fetch(siteContentApiPath(code))
        .then((res) => res.json())
        .then((json) => {
          if (cancelled) return;
          if (json?.success && json?.data?.source === "sheet") {
            router.refresh();
            return;
          }
          if (attempts >= 8) {
            setFailed(true);
            return;
          }
          window.setTimeout(tick, Math.min(1_500 * attempts, 5_000));
        })
        .catch(() => {
          if (cancelled) return;
          if (attempts >= 8) {
            setFailed(true);
            return;
          }
          window.setTimeout(tick, Math.min(1_500 * attempts, 5_000));
        });
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [code, unresolvedDomain, router]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[#f7f6f4] px-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="mx-auto mb-5 h-9 w-9 animate-pulse rounded-full bg-[#d9d4cc]"
          aria-hidden
        />
        <p className="text-sm text-[#6b6560]">
          {failed
            ? "현장 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
            : unresolvedDomain || !code
              ? "연결 중…"
              : "불러오는 중…"}
        </p>
      </div>
    </main>
  );
}
