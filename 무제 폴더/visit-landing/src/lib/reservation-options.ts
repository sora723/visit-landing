/** 관심평형 · 방문일자 선택 옵션 (전체 방문예약 폼 공통) */

export const UNIT_TYPE_OPTIONS = ["84A형", "84B형", "101형", "112형", "59A형", "59형", "미정"];

/** 오늘 포함 향후 N일 — 방문예약 일자 드롭다운 */
export function buildVisitDateOptions(days = 30): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    options.push({ value, label });
  }
  return options;
}
