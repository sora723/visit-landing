import React from "react";
import type { ValidatedV2Block } from "@/v2/types";
import { PromoStickyBar } from "@/components/PromoStickyBar";
import {
  resolveV2StickyPromoText,
  resolveV2StickyPromoVariant,
} from "@/components/v2/sticky-promo/v2-sticky-promo-config";

type Props = {
  block: ValidatedV2Block;
  siteCode: string;
  serverMobile?: boolean;
};

/**
 * V2 stickyPromo overlay — 서버에서 문구 추출 후 V1 표시 컴포넌트 재사용.
 * livePoll=false: V2 Sheet 스냅샷만 사용 (V1 /api/site-content 미호출).
 */
export function V2StickyPromoOverlay({
  block,
  siteCode,
  serverMobile = false,
}: Props) {
  if (block.componentType !== "stickyPromo") return null;

  const text = resolveV2StickyPromoText(block);
  if (!text) return null;

  const code = String(siteCode || "").trim();
  if (!code) return null;

  const variant = resolveV2StickyPromoVariant(block);

  return (
    <PromoStickyBar
      siteCode={code}
      initialText={text}
      serverMobile={serverMobile}
      livePoll={false}
      compact={variant === "compact"}
    />
  );
}
