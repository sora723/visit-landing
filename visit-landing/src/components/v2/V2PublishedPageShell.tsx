/**
 * Published V2 성공 셸.
 * 이번 단계: 블록 디자인·revisionId·개발용 JSON 미노출.
 * page prop은 이후 블록 렌더러 연결용으로만 유지.
 */

import React from "react";
import type { ValidatedV2Page } from "@/v2/types";

type Props = {
  page: ValidatedV2Page;
  siteName?: string;
};

export function V2PublishedPageShell({ page, siteName }: Props) {
  const name = String(siteName || "").trim() || String(page.siteCode || "").trim();

  return (
    <main className="min-h-[100dvh] bg-[#0f1a2e] text-white">
      <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
        {name ? (
          <h1 className="text-xl font-semibold tracking-wide text-white/95">
            {name}
          </h1>
        ) : (
          <h1 className="sr-only">Visit landing</h1>
        )}
        {/* Block renderer TBD — do not dump page JSON or revisionId */}
      </div>
    </main>
  );
}
