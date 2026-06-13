export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatMinutesAgo(minutes: number) {
  if (minutes < 1) return "방금 전";
  return `${minutes}분 전`;
}

export function formatPhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function scrollToReservation() {
  document.getElementById("reservation-form")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function popupSessionKey(siteCode: string) {
  return `vidad_popup_${siteCode}`;
}
