/**
 * 생년월일 입력 정규화 → YYYY-MM-DD (월·일은 00 허용)
 * 예: 1990-00-00, 90-00-00, 930326, 19930326
 */

export type BirthDateParseResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function expandTwoDigitYear(yy: number, now = new Date()): number {
  const currentYear = now.getFullYear();
  let year = 2000 + yy;
  if (year > currentYear) year = 1900 + yy;
  return year;
}

function validateParts(
  year: number,
  month: number,
  day: number
): BirthDateParseResult {
  const currentYear = new Date().getFullYear();
  if (year < 1900 || year > currentYear) {
    return { ok: false, error: "생년월일 연도를 확인해주세요" };
  }
  if (month < 0 || month > 12) {
    return { ok: false, error: "생년월일 월을 확인해주세요" };
  }
  if (day < 0 || day > 31) {
    return { ok: false, error: "생년월일 일을 확인해주세요" };
  }
  if (month > 0 && day > 0) {
    const dt = new Date(year, month - 1, day);
    if (
      dt.getFullYear() !== year ||
      dt.getMonth() !== month - 1 ||
      dt.getDate() !== day
    ) {
      return { ok: false, error: "올바른 생년월일을 입력해주세요" };
    }
  }
  return {
    ok: true,
    value: `${year}-${pad2(month)}-${pad2(day)}`,
  };
}

/**
 * 자유 형식 생년월일 → YYYY-MM-DD
 * 빈 문자열은 ok + value "" (선택 필드)
 */
export function normalizeBirthDate(
  raw: string,
  now = new Date()
): BirthDateParseResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: true, value: "" };

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    return validateParts(year, month, day);
  }

  if (digits.length === 6) {
    const yy = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const day = Number(digits.slice(4, 6));
    return validateParts(expandTwoDigitYear(yy, now), month, day);
  }

  // 90-00-00 / 1990.00.00 / 1990/00/00
  const parts = trimmed.split(/[-./\s]+/).filter(Boolean);
  if (parts.length === 3) {
    let year = Number(parts[0].replace(/\D/g, ""));
    const month = Number(parts[1].replace(/\D/g, ""));
    const day = Number(parts[2].replace(/\D/g, ""));
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return { ok: false, error: "생년월일 형식을 확인해주세요" };
    }
    if (parts[0].replace(/\D/g, "").length <= 2) {
      year = expandTwoDigitYear(year, now);
    }
    return validateParts(year, month, day);
  }

  return {
    ok: false,
    error: "생년월일은 930326, 90-00-00, 1993-00-00 형식으로 입력해주세요",
  };
}
