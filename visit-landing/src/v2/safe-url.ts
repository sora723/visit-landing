/**
 * V2 공개 액션·미디어 URL 안전 파서.
 * 실패 시 null — 호출부에서 버튼/미디어 생략 (오류 문구 비노출).
 */

export function parseSafeHttpsUrl(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("blob:") ||
    lower.startsWith("file:") ||
    lower.startsWith("vbscript:")
  ) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  return url.href;
}

/** tel: — 숫자와 선행 + 만 허용 */
export function parseSafePhoneHref(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const withoutScheme = s.replace(/^tel:/i, "").trim();
  const cleaned = withoutScheme.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  const plusCount = (cleaned.match(/\+/g) || []).length;
  if (plusCount > 1) return null;
  if (plusCount === 1 && !cleaned.startsWith("+")) return null;
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `tel:${cleaned}`;
}

/** scroll → #sectionId (영문·숫자·-·_ 만) */
export function parseSafeSectionTarget(raw: unknown): string | null {
  const s = String(raw ?? "")
    .trim()
    .replace(/^#/, "");
  if (!s) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  return `#${s}`;
}

export function resolveV2ActionHref(
  actionType: unknown,
  actionValue: unknown
): string | null {
  const type = String(actionType ?? "")
    .trim()
    .toLowerCase();
  if (type === "phone") return parseSafePhoneHref(actionValue);
  if (type === "link") return parseSafeHttpsUrl(actionValue);
  if (type === "scroll") return parseSafeSectionTarget(actionValue);
  return null;
}
