/**
 * 이번 단계 렌더 가능 componentType.
 * liveFeed / stickyPromo / popup 제외.
 * form 은 클라이언트 island 포함 (정적 블록과 구분).
 */

import type { ValidatedV2Block, ValidatedV2Page } from "@/v2/types";

/** 서버 전용 정적 블록 (use client 없음) */
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

/** Published 페이지에 그리면 SafeState를 피할 수 있는 블록 */
export const V2_RENDERABLE_BLOCK_TYPES = [
  ...V2_STATIC_BLOCK_TYPES,
  "form",
] as const;

export type V2RenderableBlockType =
  (typeof V2_RENDERABLE_BLOCK_TYPES)[number];

const STATIC_SET = new Set<string>(V2_STATIC_BLOCK_TYPES);
const RENDERABLE_SET = new Set<string>(V2_RENDERABLE_BLOCK_TYPES);

export function isV2StaticBlockType(type: string): type is V2StaticBlockType {
  return STATIC_SET.has(type);
}

export function isV2RenderableBlockType(
  type: string
): type is V2RenderableBlockType {
  return RENDERABLE_SET.has(type);
}

/** Document blocks 중 이번 렌더러가 그릴 수 있는 것만 (order 유지) */
export function getRenderableV2Blocks(
  page: ValidatedV2Page
): ValidatedV2Block[] {
  return page.blocks.filter((b) => isV2RenderableBlockType(b.componentType));
}

export function hasRenderableV2Blocks(page: ValidatedV2Page): boolean {
  return getRenderableV2Blocks(page).length > 0;
}
