/** 현장관리 시트 → 사이트 소유 확인 (head meta / script) */

export type OwnershipVerificationConfig = {
  /** Meta facebook-domain-verification */
  metaOwnershipCode?: string;
  /** Google Search Console */
  googleOwnershipCode?: string;
  /** Naver Search Advisor */
  naverOwnershipCode?: string;
  kakaoOwnershipCode?: string;
  /** 시트 '소유확인코드' — meta/script 원본 */
  ownershipRawHtml?: string;
};

export const EMPTY_OWNERSHIP_VERIFICATION: OwnershipVerificationConfig = {};

function pick(raw: unknown): string | undefined {
  const s = String(raw ?? "").trim();
  return s || undefined;
}

export function parseOwnershipVerification(
  raw: Record<string, unknown> | null | undefined
): OwnershipVerificationConfig {
  if (!raw) return EMPTY_OWNERSHIP_VERIFICATION;

  const config: OwnershipVerificationConfig = {
    metaOwnershipCode: pick(raw.metaOwnershipCode),
    googleOwnershipCode: pick(raw.googleOwnershipCode),
    naverOwnershipCode: pick(raw.naverOwnershipCode),
    kakaoOwnershipCode: pick(raw.kakaoOwnershipCode),
    ownershipRawHtml: pick(raw.ownershipRawHtml),
  };

  return hasAnyOwnershipVerification(config)
    ? config
    : EMPTY_OWNERSHIP_VERIFICATION;
}

export function hasAnyOwnershipVerification(
  config: OwnershipVerificationConfig
): boolean {
  return Boolean(
    config.metaOwnershipCode ||
      config.googleOwnershipCode ||
      config.naverOwnershipCode ||
      config.kakaoOwnershipCode ||
      config.ownershipRawHtml
  );
}
