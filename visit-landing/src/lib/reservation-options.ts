/** 관심평형 · 방문일자 선택 옵션 (전체 방문예약 폼 공통) */

export const UNIT_TYPE_OPTIONS = ["84A형", "84B형", "101형", "112형", "59A형", "59형", "미정"];

/** 로컬 달력 기준 yyyy-MM-dd — toISOString()은 UTC라 KST에서 하루 전으로 어긋남 */
export function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 오늘 포함 향후 N일 — 방문예약 일자 드롭다운 */
export function buildVisitDateOptions(days = 30): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = formatLocalYmd(d);
    const label = d.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    options.push({ value, label });
  }
  return options;
}
