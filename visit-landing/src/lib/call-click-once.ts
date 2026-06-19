/** 전화(tel:) 클릭 전환 — 2초 내 중복 클릭 방지 */

const DEBOUNCE_MS = 2000;

function debounceKey(siteCode: string): string {
  return `vl_call_click_ts:${siteCode}`;
}

export function shouldFireCallClick(siteCode: string): boolean {
  if (typeof sessionStorage === "undefined") return true;
  const key = debounceKey(siteCode);
  const last = Number(sessionStorage.getItem(key) || 0);
  const now = Date.now();
  if (now - last < DEBOUNCE_MS) return false;
  sessionStorage.setItem(key, String(now));
  return true;
}
