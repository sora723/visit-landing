import { normalizeImageUrl, type ImageSizePreset } from "./image-url";
import type { SiteConfig } from "./types";

export function resolvePopupImageUrl(
  popup: SiteConfig["popup"],
  key: "image1" | "image2",
  isMobile: boolean
): string {
  const mobileKey = `${key}Mobile` as const;
  const pcKey = `${key}Pc` as const;
  const base = popup[key]?.trim() ?? "";
  const mobile = popup[mobileKey]?.trim();
  const pc = popup[pcKey]?.trim();
  const raw = isMobile ? mobile || base : pc || base;
  const preset: ImageSizePreset = isMobile ? "popup-mobile" : "popup-pc";
  return normalizeImageUrl(raw, preset);
}

export function resolvePopupZoomUrl(
  popup: SiteConfig["popup"],
  key: "image1" | "image2",
  isMobile: boolean
): string {
  const mobileKey = `${key}Mobile` as const;
  const pcKey = `${key}Pc` as const;
  const base = popup[key]?.trim() ?? "";
  const mobile = popup[mobileKey]?.trim();
  const pc = popup[pcKey]?.trim();
  const raw = isMobile ? mobile || base : pc || base;
  return normalizeImageUrl(raw, isMobile ? "popup-mobile" : "popup-pc");
}
