import type { SiteConfig } from "./types";

export type SiteFooterConfig = SiteConfig["footer"];

type LegacyFooter = {
  developer?: string;
  constructor?: string;
  agency?: string;
  businessNumber?: string;
  contact?: string;
  privacyPolicy?: string;
  items?: unknown;
  bottomText?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** footerData.bottomText — 시트 JSON의 \\n 리터럴·실제 줄바꿈 유지 */
export function formatFooterBottomText(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const text = String(raw).replace(/\\n/g, "\n").trim();
  return text || undefined;
}

function parseFooterItems(value: unknown): SiteFooterConfig["items"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): SiteFooterConfig["items"][number] | null => {
      if (!isRecord(item)) return null;
      const title = String(item.title ?? item.label ?? "").trim();
      const content = String(item.content ?? item.value ?? "").trim();
      if (!title && !content) return null;
      return { title, content };
    })
    .filter((item): item is SiteFooterConfig["items"][number] => item !== null);
}

function migrateLegacyFooter(legacy: LegacyFooter | undefined): SiteFooterConfig {
  if (!legacy) return { items: [] };

  const fromItems = parseFooterItems(legacy.items);
  if (fromItems.length) {
    return {
      items: fromItems,
      bottomText:
        formatFooterBottomText(legacy.bottomText ?? legacy.privacyPolicy),
    };
  }

  const pairs: { title: string; key: keyof LegacyFooter }[] = [
    { title: "시행사", key: "developer" },
    { title: "시공사", key: "constructor" },
    { title: "광고대행", key: "agency" },
    { title: "사업자등록번호", key: "businessNumber" },
    { title: "문의", key: "contact" },
  ];

  const items = pairs
    .map(({ title, key }) => {
      const content = String(legacy[key] ?? "").trim();
      return content ? { title, content } : null;
    })
    .filter((item): item is SiteFooterConfig["items"][number] => item !== null);

  return {
    items,
    bottomText: formatFooterBottomText(
      legacy.privacyPolicy ?? legacy.bottomText
    ),
  };
}

export function parseFooterData(value: unknown): SiteFooterConfig {
  if (!isRecord(value)) return { items: [] };

  const items = parseFooterItems(value.items);
  const bottomText = formatFooterBottomText(
    value.bottomText ?? value.privacyPolicy ?? value.note
  );

  if (items.length || bottomText) {
    return {
      items,
      bottomText,
    };
  }

  return migrateLegacyFooter(value as LegacyFooter);
}

export function normalizeFooter(
  primary?: unknown,
  legacy?: unknown,
  fallback?: SiteFooterConfig
): SiteFooterConfig {
  const parsed = parseFooterData(primary);
  if (parsed.items.length || parsed.bottomText) return parsed;

  const fromLegacy = parseFooterData(legacy);
  if (fromLegacy.items.length || fromLegacy.bottomText) return fromLegacy;

  return fallback ?? { items: [] };
}
