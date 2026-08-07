/** 현장관리 시트 → 접수 완료 페이지 전환 추적 */

export type ConversionTrackingConfig = {
  metaPixelId?: string;
  metaConversionEvent?: string;
  /** tel: 클릭 시 Meta 이벤트 (예: Contact) */
  metaCallConversionEvent?: string;
  googleConversionId?: string;
  googleConversionLabel?: string;
  /** tel: 클릭 시 Google Ads 전환 Label (ID는 googleConversionId 공유) */
  googleCallConversionLabel?: string;
  /** 네이버 wcs wa 계정 또는 스크립트 본문 */
  naverConversionScript?: string;
  kakaoPixelId?: string;
  /** 시트 '전환코드' — HTML/스크립트 원본 (/complete) */
  conversionRawHtml?: string;
  /** Smartlog 계정 — UHPT-300862 또는 300862 (현장마다 다름) */
  smartlogAccount?: string;
  /** Smartlog 서버 — a300 (현장마다 다름) */
  smartlogServer?: string;
  /** 접수 전환 모드 — 비우면 메인만. q | order | join 명시 시 /complete 전환 */
  smartlogConversionMode?: string;
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
    metaCallConversionEvent: pick(raw.metaCallConversionEvent),
    googleConversionId: pick(raw.googleConversionId),
    googleConversionLabel: pick(raw.googleConversionLabel),
    googleCallConversionLabel: pick(raw.googleCallConversionLabel),
    naverConversionScript: pick(raw.naverConversionScript),
    kakaoPixelId: pick(raw.kakaoPixelId),
    conversionRawHtml: pick(raw.conversionRawHtml),
    smartlogAccount: pick(raw.smartlogAccount),
    smartlogServer: pick(raw.smartlogServer),
    smartlogConversionMode: pick(raw.smartlogConversionMode),
  };

  return hasAnyConversionTracking(config) ||
    hasCallClickTracking(config) ||
    hasSmartlogTracking(config)
    ? config
    : EMPTY_CONVERSION_TRACKING;
}

/** Smartlog 베이스 스크립트(전 페이지) 설치 여부 */
export function hasSmartlogTracking(
  config: ConversionTrackingConfig
): boolean {
  return Boolean(
    config.smartlogAccount?.trim() && config.smartlogServer?.trim()
  );
}

/**
 * Smartlog 접수 전환(hpt_trace_info) — smartlogConversionMode 를 명시한 경우만.
 * 계정·서버만 있으면 메인 스크립트만 설치 (전환 미실행).
 */
export function hasSmartlogConversion(
  config: ConversionTrackingConfig
): boolean {
  if (!hasSmartlogTracking(config)) return false;
  const mode = String(config.smartlogConversionMode ?? "")
    .trim()
    .toLowerCase();
  return (
    mode === "q" ||
    mode === "order" ||
    mode === "join" ||
    mode === "문의" ||
    mode === "주문" ||
    mode === "회원가입" ||
    mode === "가입"
  );
}

/** tel: 클릭 전환 설정 여부 */
export function hasCallClickTracking(
  config: ConversionTrackingConfig
): boolean {
  return Boolean(
    (config.googleConversionId && config.googleCallConversionLabel) ||
      (config.metaPixelId && config.metaCallConversionEvent)
  );
}

export function hasAnyConversionTracking(
  config: ConversionTrackingConfig
): boolean {
  return Boolean(
    config.metaPixelId ||
      config.googleConversionId ||
      config.naverConversionScript ||
      config.kakaoPixelId ||
      config.conversionRawHtml ||
      hasSmartlogConversion(config)
  );
}

export function normalizeGoogleAdsId(id: string): string {
  const trimmed = id.trim();
  return trimmed.startsWith("AW-") ? trimmed : `AW-${trimmed}`;
}
