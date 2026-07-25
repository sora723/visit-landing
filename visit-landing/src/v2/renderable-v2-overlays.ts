/**
 * V2 overlay 렌더 가능 타입.
 * popup 은 이번 단계 제외. stickyPromo 만.
 */

import type { ValidatedV2Block, ValidatedV2Page } from "@/v2/types";

export const V2_RENDERABLE_OVERLAY_TYPES = ["stickyPromo"] as const;

export type V2RenderableOverlayType =
  (typeof V2_RENDERABLE_OVERLAY_TYPES)[number];

const OVERLAY_SET = new Set<string>(V2_RENDERABLE_OVERLAY_TYPES);

export function isV2RenderableOverlayType(
  type: string
): type is V2RenderableOverlayType {
  return OVERLAY_SET.has(type);
}

/** page.overlays 중 이번 단계에서 그릴 수 있는 것만 (maxPerPage는 validate가 이미 적용) */
export function getRenderableV2Overlays(
  page: ValidatedV2Page
): ValidatedV2Block[] {
  return page.overlays.filter((o) =>
    isV2RenderableOverlayType(o.componentType)
  );
}

export function getRenderableV2StickyPromo(
  page: ValidatedV2Page
): ValidatedV2Block | null {
  return (
    getRenderableV2Overlays(page).find(
      (o) => o.componentType === "stickyPromo"
    ) ?? null
  );
}
