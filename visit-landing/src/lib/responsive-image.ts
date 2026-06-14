import { normalizeImageUrl } from "./image-url";

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
  isMobile: boolean
): string {
  const raw = isMobile
    ? source.imageMobile?.trim() || source.image
    : source.imagePc?.trim() || source.image;
  return normalizeImageUrl(raw);
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
    isMobile
  );
}
