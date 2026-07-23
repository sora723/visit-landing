/** 한국 휴대폰: 10xxxxxxxx → 010xxxxxxxx */
export function normalizeMobilePhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  if (/^010\d{8}$/.test(digits)) return digits;
  if (/^10\d{8}$/.test(digits)) return `0${digits}`;
  return "";
}
