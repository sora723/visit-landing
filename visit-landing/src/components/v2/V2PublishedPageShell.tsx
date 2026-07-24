/**
 * Published V2 성공 셸 — 렌더 가능 블록 + 시스템 법적 footer.
 * footerInfo는 디자인 블록이며 시스템 footer를 대체하지 않음.
 */

import React from "react";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { ValidatedV2Page } from "@/v2/types";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import { getRenderableV2Blocks } from "@/v2/renderable-v2-blocks";
import { V2BlockRenderer } from "@/components/v2/V2BlockRenderer";
import { SiteSystemFooter } from "@/components/SiteSystemFooter";

type Props = {
  page: ValidatedV2Page;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
};

export function V2PublishedPageShell({
  page,
  site,
  conversionTracking,
}: Props) {
  const blocks = getRenderableV2Blocks(page);

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f4] text-[#1a1a1a]">
      <V2BlockRenderer
        blocks={blocks}
        site={site}
        conversionTracking={conversionTracking}
      />
      <SiteSystemFooter siteName={site.siteName} footer={site.footer} />
    </main>
  );
}
