/**
 * Published / Preview V2 성공 셸.
 * isPreview: 배너 + 폼 제출 차단. revisionId/token 미노출.
 */

import React from "react";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { ValidatedV2Page } from "@/v2/types";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import { getRenderableV2Blocks } from "@/v2/renderable-v2-blocks";
import {
  getRenderableV2Popup,
  getRenderableV2StickyPromo,
} from "@/v2/renderable-v2-overlays";
import { V2BlockRenderer } from "@/components/v2/V2BlockRenderer";
import { SiteSystemFooter } from "@/components/SiteSystemFooter";
import { V2PreviewBanner } from "@/components/v2/V2PreviewBanner";
import { V2StickyPromoOverlay } from "@/components/v2/overlays/V2StickyPromoOverlay";
import { V2PopupOverlay } from "@/components/v2/overlays/V2PopupOverlay";

type Props = {
  page: ValidatedV2Page;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
  /** Preview 세션일 때만 true — 폼 실제 접수 금지 */
  isPreview?: boolean;
  serverMobile?: boolean;
};

export function V2PublishedPageShell({
  page,
  site,
  conversionTracking,
  isPreview = false,
  serverMobile = false,
}: Props) {
  const blocks = getRenderableV2Blocks(page);
  const sticky = getRenderableV2StickyPromo(page);
  const popup = getRenderableV2Popup(page);

  return (
    <main className="min-h-[100dvh] bg-[#f7f6f4] text-[#1a1a1a]">
      {isPreview ? <V2PreviewBanner /> : null}
      <V2BlockRenderer
        blocks={blocks}
        site={site}
        conversionTracking={conversionTracking}
        isPreview={isPreview}
      />
      <SiteSystemFooter siteName={site.siteName} footer={site.footer} />
      {sticky ? (
        <V2StickyPromoOverlay
          block={sticky}
          siteCode={site.siteCode}
          serverMobile={serverMobile}
        />
      ) : null}
      {popup ? (
        <V2PopupOverlay
          block={popup}
          site={site}
          conversionTracking={conversionTracking}
          isPreview={isPreview}
        />
      ) : null}
    </main>
  );
}
