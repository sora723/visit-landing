/** 현장관리 시트 → 접수 완료 페이지 전환 추적 */

export type ConversionTrackingConfig = {
  metaPixelId?: string;
  metaConversionEvent?: string;
  googleConversionId?: string;
  googleConversionLabel?: string;
  /** 네이버 wcs wa 계정 또는 스크립트 본문 */
  naverConversionScript?: string;
  kakaoPixelId?: string;
  /** 시트 '전환코드' — HTML/스크립트 원본 (/complete) */
  conversionRawHtml?: string;
};

export const EMPTY_CONVERSION_TRACKING: ConversionTrackingConfig = {};

function pick(raw: unknown): string | undefined {
  const s = String(raw ?? "").trim();
  return s || undefined;
}

export function parseConversionTracking(
  raw: Record<string, unknown> | null | undefined
): ConversionTrackingConfig {
  if (!raw) return EMPTY_CONVERSION_TRACKING;

  const config: ConversionTrackingConfig = {
    metaPixelId: pick(raw.metaPixelId),
    metaConversionEvent: pick(raw.metaConversionEvent),
    googleConversionId: pick(raw.googleConversionId),
    googleConversionLabel: pick(raw.googleConversionLabel),
    naverConversionScript: pick(raw.naverConversionScript),
    kakaoPixelId: pick(raw.kakaoPixelId),
    conversionRawHtml: pick(raw.conversionRawHtml),
  };

  return hasAnyConversionTracking(config)
    ? config
    : EMPTY_CONVERSION_TRACKING;
}

export function hasAnyConversionTracking(
  config: ConversionTrackingConfig
): boolean {
  return Boolean(
    config.metaPixelId ||
      config.googleConversionId ||
      config.naverConversionScript ||
      config.kakaoPixelId ||
      config.conversionRawHtml
  );
}

export function normalizeGoogleAdsId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("AW-") ? trimmed : `AW-${trimmed}`;
}
