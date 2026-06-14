export function formatMinutesAgo(minutes: number) {
  if (minutes < 1) return "방금 전";
  return `${minutes}분 전`;
}

/** headerBrand · headerSubBrand (둘 중 하나만 있어도 표시) */
export function formatHeaderTagline(
  headerBrand?: string,
  headerSubBrand?: string
): string {
  return [headerBrand?.trim(), headerSubBrand?.trim()].filter(Boolean).join(" · ");
}

/** 페이지 로드 시 CTA A/B 문구 1개 선택 */
export function pickCtaText(texts: string[]): string {
  if (!texts.length) return "";
  return texts[Math.floor(Math.random() * texts.length)]!;
}

/** 항목별 고정 상태값 (랜덤처럼 보이되 리렌더 시 유지) */
export function pickReservationStatus(
  name: string,
  minutesAgo: number,
  labels: string[]
): string {
  if (!labels.length) return "접수완료";
  const seed = name.charCodeAt(0) + minutesAgo * 7;
  return labels[seed % labels.length]!;
}

export function scrollToReservation() {
  document.getElementById("방문예약")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/** 팝업 닫기 후 재노출 대기 — ms (10분) */
export const POPUP_COOLDOWN_MS = 10 * 60 * 1000;

export const POPUP_SESSION_KEY_PREFIX = "visit_landing_popup_v2";

export function getPopupSessionKey(siteCode?: string): string {
  const code = siteCode?.trim() || "default";
  return `${POPUP_SESSION_KEY_PREFIX}_${code}`;
}

export function markPopupDismissed(siteCode?: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getPopupSessionKey(siteCode), String(Date.now()));
}

/** 닫은 지 10분 지났거나 기록 없으면 true */
export function shouldShowPopup(siteCode?: string): boolean {
  if (typeof window === "undefined") return false;
  const raw = sessionStorage.getItem(getPopupSessionKey(siteCode));
  if (!raw) return true;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return true;
  return Date.now() - dismissedAt >= POPUP_COOLDOWN_MS;
}
