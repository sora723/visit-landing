import React, { type ComponentType } from "react";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { ValidatedV2Block } from "@/v2/types";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import {
  isV2RenderableBlockType,
  isV2StaticBlockType,
  type V2StaticBlockType,
} from "@/v2/renderable-v2-blocks";
import { V2HeroBlock } from "@/components/v2/blocks/V2HeroBlock";
import { V2NoticeBlock } from "@/components/v2/blocks/V2NoticeBlock";
import { V2RichTextBlock } from "@/components/v2/blocks/V2RichTextBlock";
import { V2FeatureCardsBlock } from "@/components/v2/blocks/V2FeatureCardsBlock";
import { V2MediaBlock } from "@/components/v2/blocks/V2MediaBlock";
import { V2LocationBlock } from "@/components/v2/blocks/V2LocationBlock";
import { V2CtaBandBlock } from "@/components/v2/blocks/V2CtaBandBlock";
import { V2FooterInfoBlock } from "@/components/v2/blocks/V2FooterInfoBlock";
import { V2FormBlock } from "@/components/v2/blocks/V2FormBlock";

type StaticBlockProps = { block: ValidatedV2Block };

export const V2_STATIC_BLOCK_RENDERERS: Record<
  V2StaticBlockType,
  ComponentType<StaticBlockProps>
> = {
  hero: V2HeroBlock,
  notice: V2NoticeBlock,
  richText: V2RichTextBlock,
  featureCards: V2FeatureCardsBlock,
  media: V2MediaBlock,
  location: V2LocationBlock,
  ctaBand: V2CtaBandBlock,
  footerInfo: V2FooterInfoBlock,
};

/** form 포함 — 검증·레지스트리 조회용 */
export const V2_BLOCK_RENDERERS = {
  ...V2_STATIC_BLOCK_RENDERERS,
  form: V2FormBlock,
} as const;

type Props = {
  blocks: readonly ValidatedV2Block[];
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
};

export function V2BlockRenderer({
  blocks,
  site,
  conversionTracking,
}: Props) {
  return (
    <>
      {blocks.map((block) => {
        if (!isV2RenderableBlockType(block.componentType)) return null;

        if (block.componentType === "form") {
          return (
            <V2FormBlock
              key={block.sectionId}
              block={block}
              site={site}
              conversionTracking={conversionTracking}
            />
          );
        }

        if (!isV2StaticBlockType(block.componentType)) return null;
        const Renderer = V2_STATIC_BLOCK_RENDERERS[block.componentType];
        if (!Renderer) return null;
        return <Renderer key={block.sectionId} block={block} />;
      })}
    </>
  );
}
