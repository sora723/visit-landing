/**
 * Published V2 성공 셸 — 정적 블록 렌더러 연결.
 * revisionId·개발용 JSON 미노출.
 * 시스템 법적 footer는 별도 TODO (footerInfo와 분리).
 */

import React from "react";
import type { ValidatedV2Page } from "@/v2/types";
import { getRenderableV2Blocks } from "@/v2/renderable-v2-blocks";
import { V2BlockRenderer } from "@/components/v2/V2BlockRenderer";

type Props = {
  page: ValidatedV2Page;
  /** 예약 — 시스템 법적 footer 연결 시 사용. 현재 블록 렌더에 미사용 */
  siteName?: string;
};

export function V2PublishedPageShell({ page }: Props) {
  const blocks = getRenderableV2Blocks(page);

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f4] text-[#1a1a1a]">
      <V2BlockRenderer blocks={blocks} />
      {/* TODO: system legal SiteFooter — do not replace with footerInfo copy */}
    </main>
  );
}
