import React, { type ComponentType } from "react";
import type { ValidatedV2Block } from "@/v2/types";
import {
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

type BlockProps = { block: ValidatedV2Block };

export const V2_BLOCK_RENDERERS: Record<
  V2StaticBlockType,
  ComponentType<BlockProps>
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

type Props = {
  blocks: readonly ValidatedV2Block[];
};

export function V2BlockRenderer({ blocks }: Props) {
  return (
    <>
      {blocks.map((block) => {
        if (!isV2StaticBlockType(block.componentType)) return null;
        const Renderer = V2_BLOCK_RENDERERS[block.componentType];
        if (!Renderer) return null;
        return <Renderer key={block.sectionId} block={block} />;
      })}
    </>
  );
}
