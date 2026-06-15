import { normalizeImageUrl, type ImageSizePreset } from "./image-url";

export const MOBILE_BREAKPOINT = 768;
/** 실시간 방문예약 PC 레이아웃 전환 (1024px~) */
export const LIVE_FEED_DESKTOP_BREAKPOINT = 1024;

export interface ResponsiveImageFields {
  image: string;
  imagePc?: string;
  imageMobile?: string;
}

export function resolveResponsiveImage(
  source: ResponsiveImageFields,
  isMobile: boolean,
  preset: ImageSizePreset = "section"
): string {
  const raw = isMobile
    ? source.imageMobile?.trim() || source.image
    : source.imagePc?.trim() || source.image;
  return normalizeImageUrl(raw, preset);
}

/** Hero 배경 — imagePc / imageMobile (현장 조감도) 우선 */
export function resolveHeroImage(
  hero: {
    image: string;
    imagePc?: string;
    imageMobile?: string;
    visualImage?: string;
    visualImagePc?: string;
    visualImageMobile?: string;
  },
  isMobile: boolean
): string {
  return resolveResponsiveImage(
    { image: hero.image, imagePc: hero.imagePc, imageMobile: hero.imageMobile },
    isMobile,
    isMobile ? "hero-mobile" : "hero"
  );
}

export function resolveHeroImageSources(hero: {
  image: string;
  imagePc?: string;
  imageMobile?: string;
}): { mobile: string; desktop: string } {
  const mobileRaw = hero.imageMobile?.trim() || hero.image;
  const desktopRaw = hero.imagePc?.trim() || hero.image;
  return {
    mobile: normalizeImageUrl(mobileRaw, "hero-mobile"),
    desktop: normalizeImageUrl(desktopRaw, "hero"),
  };
}
