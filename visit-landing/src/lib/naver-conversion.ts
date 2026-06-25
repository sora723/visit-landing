/** 네이버 wcs 전환 — WA ID 또는 HTML 스크립트 */

export function isNaverWaId(script: string): boolean {
  const trimmed = script.trim();
  return Boolean(trimmed) && !trimmed.includes("<");
}

type WcsApi = {
  inflow?: () => void;
  do?: () => void;
  trans?: (payload: Record<string, unknown>) => void;
};

/** wcslog 로드 후 전환 1회 시도 — 성공 시 true */
export function fireNaverConversion(): boolean {
  if (typeof window === "undefined") return false;

  const w = window as Window & {
    wcs_do?: () => void;
    wcs?: WcsApi;
  };

  if (typeof w.wcs_do === "function") {
    w.wcs_do();
    return true;
  }

  const wcs = w.wcs;
  if (wcs && typeof wcs.trans === "function") {
    wcs.trans({ type: "lead" });
    return true;
  }

  if (wcs && typeof wcs.do === "function") {
    wcs.do();
    return true;
  }

  return false;
}
