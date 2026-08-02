import type { SiteConfig } from "./types";
import { buildVisitDateOptions } from "./reservation-options";

export const DEFAULT_UNIT_TYPE_OPTIONS = [
  "84A형",
  "84B형",
  "101형",
  "112형",
  "59A형",
  "59형",
  "미정",
];

export function resolveUnitTypeOptions(config: SiteConfig): { value: string; label: string }[] {
  const list = config.reservationForm?.unitTypeOptions?.length
    ? config.reservationForm.unitTypeOptions
    : DEFAULT_UNIT_TYPE_OPTIONS;
  return list.map((t) => ({ value: t, label: t }));
}

export function resolveVisitDateOptions(
  config: SiteConfig
): { value: string; label: string }[] {
  const explicit = config.reservationForm?.visitDateOptions;
  if (explicit?.length) return explicit;
  const days = config.reservationForm?.visitDateDays ?? 30;
  return buildVisitDateOptions(days);
}

export function isUnitTypeFieldEnabled(config: SiteConfig): boolean {
  return config.reservationForm?.unitTypeEnabled !== false;
}

export function isVisitDateFieldEnabled(config: SiteConfig): boolean {
  return config.reservationForm?.visitDateEnabled !== false;
}

/** 10:00 ~ 19:00, 30분 간격 */
export function buildVisitTimeOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  for (let minutes = 10 * 60; minutes <= 19 * 60; minutes += 30) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    options.push({ value, label: value });
  }
  return options;
}

export function resolveVisitTimeOptions(
  _config?: SiteConfig
): { value: string; label: string }[] {
  return buildVisitTimeOptions();
}

/** 기본 N — 컬럼 비어 있으면 숨김 (기존 현장 폼 유지 유지) */
export function isVisitTimeFieldEnabled(config: SiteConfig): boolean {
  return config.reservationForm?.visitTimeEnabled === true;
}

/** 평형 코드 → "84A형 문의" */
export function formatUnitInquiryLabel(unit: string): string {
  const t = unit.trim();
  if (!t || t === "미정") return "관심고객 등록";
  if (t.includes("문의")) return t;
  return t.includes("형") ? `${t} 문의` : `${t}형 문의`;
}

/** 현장 폼 설정에 따른 가상·실시간 카드 문구 풀 */
export function buildVirtualInquiryPool(config: SiteConfig): string[] {
  const showUnit = isUnitTypeFieldEnabled(config);
  const showVisit = isVisitDateFieldEnabled(config);
  const showVisitTime = isVisitTimeFieldEnabled(config);
  const pool: string[] = [];

  if (showUnit) {
    for (const { value } of resolveUnitTypeOptions(config)) {
      if (value === "미정") continue;
      pool.push(formatUnitInquiryLabel(value));
    }
  }
  if (showVisit || showVisitTime) pool.push("방문예약 신청");

  if (!showUnit && !showVisit && !showVisitTime) return ["관심고객 등록"];
  if (pool.length === 0) return ["관심고객 등록"];

  if (showUnit || showVisit || showVisitTime) pool.push("관심고객 등록");
  return [...new Set(pool)];
}

/** 접수 데이터 → 카드 부가 문구 */
export function inferSubmissionStatusLabel(
  input: { unitType?: string; visitDate?: string; visitTime?: string },
  config: SiteConfig
): string {
  const showUnit = isUnitTypeFieldEnabled(config);
  const showVisit = isVisitDateFieldEnabled(config);
  const showVisitTime = isVisitTimeFieldEnabled(config);
  const unit = input.unitType?.trim();
  const visit = input.visitDate?.trim();
  const visitTime = input.visitTime?.trim();

  if (showUnit && unit) return formatUnitInquiryLabel(unit);
  if ((showVisit && visit) || (showVisitTime && visitTime)) {
    return "방문예약 신청";
  }
  if (!showUnit && !showVisit && !showVisitTime) return "관심고객 등록";
  if (showVisit || showVisitTime) return "방문예약 신청";
  return "관심고객 등록";
}

/** API·가상·실제 공통 — 현장 설정에 맞게 카드 하단 문구 정규화 */
export function formatLiveStatusLabel(
  raw: string | null | undefined,
  config: SiteConfig
): string {
  const trimmed = String(raw ?? "").trim();
  const showUnit = isUnitTypeFieldEnabled(config);
  const showVisit = isVisitDateFieldEnabled(config);
  const showVisitTime = isVisitTimeFieldEnabled(config);

  if (trimmed.includes("형") && trimmed.includes("문의")) {
    return showUnit
      ? trimmed
      : showVisit || showVisitTime
        ? "방문예약 신청"
        : "관심고객 등록";
  }
  if (trimmed.includes("방문예약")) {
    return showVisit || showVisitTime ? "방문예약 신청" : "관심고객 등록";
  }
  if (trimmed.includes("관심")) return "관심고객 등록";

  if (trimmed && showUnit) return formatUnitInquiryLabel(trimmed);
  if (trimmed && (showVisit || showVisitTime)) return "방문예약 신청";

  return inferSubmissionStatusLabel({}, config);
}
