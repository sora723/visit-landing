"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ConversionTracking } from "@/components/ConversionTracking";
import { COMPLETE_DWELL_MS } from "@/lib/run-conversion-tracking";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";

type Props = {
  siteName: string;
  homeHref: string;
  tracking: ConversionTrackingConfig;
  submissionId: string | null;
  conversionAllowed: boolean;
  autoReturn: boolean;
  returnTo: string;
  /** SSR NaverLeadSyncScripts 가 lead 발화 — 클라이언트 네이버 중복 방지 */
  skipNaverConversion?: boolean;
};

export function CompletePageClient({
  siteName,
  homeHref,
  tracking,
  submissionId,
  conversionAllowed,
  autoReturn,
  returnTo,
  skipNaverConversion = false,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    if (!autoReturn || !submissionId) return;
    const timer = window.setTimeout(() => {
      router.replace(returnTo || homeHref);
    }, COMPLETE_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [autoReturn, submissionId, returnTo, homeHref, router]);

  return (
    <>
      {submissionId && conversionAllowed ? (
        <ConversionTracking
          submissionId={submissionId}
          tracking={tracking}
          skipNaver={skipNaverConversion}
        />
      ) : null}
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--color-navy)] p-5">
        <div className="w-full max-w-md bg-white p-8 text-center shadow-2xl sm:p-10">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 text-2xl text-[var(--color-gold)]">
            ✓
          </div>
          <h1 className="mb-3 text-xl font-bold text-[var(--color-text)]">
            방문예약이 접수되었습니다
          </h1>
          <p className="mb-2 text-sm text-[#6b7280]">
            담당자가 순차적으로 연락드립니다.
          </p>
          <p className="mb-8 font-semibold text-[var(--color-text)]">{siteName}</p>
          {!autoReturn ? (
            <Link
              href={homeHref}
              className="inline-block w-full bg-[var(--color-gold)] py-4 text-sm font-semibold text-[var(--color-text)] transition hover:brightness-105"
            >
              홈으로 돌아가기
            </Link>
          ) : (
            <p className="text-xs text-[#6b7280]">잠시 후 이전 페이지로 이동합니다…</p>
          )}
        </div>
      </div>
    </>
  );
}
