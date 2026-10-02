import { normalizeImageUrl, type ImageSizePreset } from "./image-url";
import type { SiteConfig } from "./types";

/**
 * PC 팝업 이미지 제작 가이드 (예약폼 프레임과 동일)
 * - 표시: 448×648 px (세로)
 * - 권장 원본: 896×1296 (@2x) — 비율 약 2:3
 * - object-cover 로 프레임을 채움 (중요 문구는 중앙 안전영역)
 */

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
