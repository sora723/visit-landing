/**
 * V2 stickyPromo overlay — V2 Sheet root title/description 스냅샷.
 * V1 stickyPromoText /api/site-content 폴링과 분리.
 */

import { sanitizePromoText } from "@/lib/fit-promo-text";
import type { ValidatedV2Block } from "@/v2/types";
import { firstByRole } from "@/components/v2/v2-block-helpers";

export const V2_STICKY_PROMO_VARIANTS = ["default", "compact"] as const;

export type V2StickyPromoVariant = (typeof V2_STICKY_PROMO_VARIANTS)[number];

export function resolveV2StickyPromoText(
  block: ValidatedV2Block
): string | null {
  const root = firstByRole(block.items, "root");
  return sanitizePromoText(root?.title || root?.description);
}

export function resolveV2StickyPromoVariant(
  block: ValidatedV2Block
): V2StickyPromoVariant {
  return block.variant === "compact" ? "compact" : "default";
}
