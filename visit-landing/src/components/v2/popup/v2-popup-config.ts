/**
 * V2 popup overlay — Sheet roles → V1급 UX용 스냅샷.
 * V1 extendedData.popup / popupEnabled 와 분리 (block.enabled + variant만).
 */

import { normalizeImageUrl } from "@/lib/image-url";
import { parseSafeHttpsUrl } from "@/v2/safe-url";
import type { ValidatedV2Block, ValidatedV2ContentItem } from "@/v2/types";
import { firstByRole, itemsByRole } from "@/components/v2/v2-block-helpers";

export const V2_POPUP_VARIANTS = ["image", "form", "imageForm"] as const;
export type V2PopupVariant = (typeof V2_POPUP_VARIANTS)[number];

export const V2_POPUP_DEFAULT_COMPLETE_MESSAGE =
  "방문예약이 접수되었습니다.\n감사합니다.";

export const V2_POPUP_DEFAULT_BUTTON_TEXT = "방문예약하기";

export function resolveV2PopupVariant(block: ValidatedV2Block): V2PopupVariant {
  const v = String(block.variant || "").trim();
  if (v === "form" || v === "imageForm" || v === "image") return v;
  return "image";
}

export function resolveV2PopupTitle(block: ValidatedV2Block): string {
  const root = firstByRole(block.items, "root");
  return String(root?.title || root?.description || "").trim();
}

export function resolveV2PopupCompleteMessage(block: ValidatedV2Block): string {
  const root = firstByRole(block.items, "root");
  const fromSubtitle = String(root?.subtitle || "").trim();
  if (fromSubtitle) return fromSubtitle;
  const title = String(root?.title || "").trim();
  const desc = String(root?.description || "").trim();
  if (title && desc) return desc;
  return V2_POPUP_DEFAULT_COMPLETE_MESSAGE;
}

export function resolveV2PopupButtonText(
  block: ValidatedV2Block,
  fallback?: string
): string {
  const cta = firstByRole(block.items, "cta");
  const label = String(cta?.actionLabel || "").trim();
  if (label) return label;
  const fb = String(fallback || "").trim();
  return fb || V2_POPUP_DEFAULT_BUTTON_TEXT;
}

function itemImageSrc(
  item: ValidatedV2ContentItem | undefined,
  isMobile: boolean,
  preset: "popup-mobile" | "popup-pc"
): string {
  if (!item) return "";
  const mobile = String(item.imageMobile || "").trim();
  const pc = String(item.imagePc || "").trim();
  const raw = isMobile ? mobile || pc : pc || mobile;
  if (!raw) return "";
  const normalized = normalizeImageUrl(raw, preset);
  return parseSafeHttpsUrl(normalized) || "";
}

export function resolveV2PopupImageSrcs(block: ValidatedV2Block): {
  mobile: string;
  pc: string[];
} {
  const images = itemsByRole(block.items, "image");
  const presetMobile = "popup-mobile" as const;
  const presetPc = "popup-pc" as const;
  const mobile = itemImageSrc(images[0], true, presetMobile);
  const pc = images
    .slice(0, 2)
    .map((img) => itemImageSrc(img, false, presetPc))
    .filter(Boolean);
  return { mobile, pc };
}

export function resolveV2PopupShowsForm(block: ValidatedV2Block): boolean {
  const variant = resolveV2PopupVariant(block);
  if (variant === "image") return false;
  return Boolean(firstByRole(block.items, "form"));
}

export function resolveV2PopupCanShow(
  block: ValidatedV2Block,
  isMobile: boolean
): boolean {
  if (block.componentType !== "popup") return false;
  const { mobile, pc } = resolveV2PopupImageSrcs(block);
  const hasImages = isMobile ? Boolean(mobile) : pc.length > 0;
  const showForm = resolveV2PopupShowsForm(block);
  return showForm || hasImages;
}
