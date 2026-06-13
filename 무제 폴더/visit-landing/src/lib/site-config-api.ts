/** Apps Script site.config API 응답 타입·파싱 */

export type VisitDateOption = { value: string; label: string };

/** Apps Script getSiteLiveConfig() data 필드 (파싱 후) */
export type SiteConfigApiData = {
  siteCode: string;
  stickyPromoText: string | null;
  unitTypeOptions: string[];
  visitDateDays: number;
  visitDateOptions: VisitDateOption[] | null;
  unitTypeEnabled: boolean;
  visitDateEnabled: boolean;
  mainColor?: string;
  subColor?: string;
  accentColor?: string;
  conversionTracking?: Record<string, unknown>;
  ownershipVerification?: Record<string, unknown>;
  updatedAt?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function parseVisitDateOptions(value: unknown): VisitDateOption[] | null {
  if (!Array.isArray(value)) return null;

  const options = value
    .map((item): VisitDateOption | null => {
      if (!isRecord(item)) return null;
      const optionValue = String(item.value ?? "").trim();
      if (!optionValue) return null;
      return {
        value: optionValue,
        label: String(item.label ?? item.value ?? "").trim(),
      };
    })
    .filter((item): item is VisitDateOption => item !== null);

  return options.length > 0 ? options : null;
}

function parsePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && value > 0 ? value : fallback;
}

/** JSON 본문 → site.config data. 실패 시 null */
export function parseSiteConfigApiResponse(
  json: unknown,
  fallbackSiteCode: string
): SiteConfigApiData | null {
  if (!isRecord(json) || json.success !== true || !isRecord(json.data)) {
    return null;
  }

  const data = json.data;
  const rawPromo = data.stickyPromoText;

  return {
    siteCode: String(data.siteCode ?? fallbackSiteCode),
    stickyPromoText:
      typeof rawPromo === "string" ? rawPromo.trim() || null : null,
    unitTypeOptions: parseStringArray(data.unitTypeOptions),
    visitDateDays: parsePositiveNumber(data.visitDateDays, 30),
    visitDateOptions: parseVisitDateOptions(data.visitDateOptions),
    unitTypeEnabled: data.unitTypeEnabled !== false,
    visitDateEnabled: data.visitDateEnabled !== false,
    mainColor: optionalString(data.mainColor),
    subColor: optionalString(data.subColor),
    accentColor: optionalString(data.accentColor),
    conversionTracking: isRecord(data.conversionTracking)
      ? data.conversionTracking
      : undefined,
    ownershipVerification: isRecord(data.ownershipVerification)
      ? data.ownershipVerification
      : undefined,
    updatedAt: optionalString(data.updatedAt),
  };
}
