/**
 * 이번 단계 정적 렌더 대상 componentType.
 * form / liveFeed / stickyPromo / popup 제외.
 */

import type { ValidatedV2Block, ValidatedV2Page } from "@/v2/types";

export const V2_STATIC_BLOCK_TYPES = [
  "hero",
  "notice",
  "richText",
  "featureCards",
  "media",
  "location",
  "ctaBand",
  "footerInfo",
] as const;

export type V2StaticBlockType = (typeof V2_STATIC_BLOCK_TYPES)[number];

const STATIC_SET = new Set<string>(V2_STATIC_BLOCK_TYPES);

export function isV2StaticBlockType(type: string): type is V2StaticBlockType {
  return STATIC_SET.has(type);
}

/** Document blocks 중 이번 렌더러가 그릴 수 있는 것만 (order 유지) */
export function getRenderableV2Blocks(
  page: ValidatedV2Page
): ValidatedV2Block[] {
  return page.blocks.filter((b) => isV2StaticBlockType(b.componentType));
}

export function hasRenderableV2Blocks(page: ValidatedV2Page): boolean {
  return getRenderableV2Blocks(page).length > 0;
}
