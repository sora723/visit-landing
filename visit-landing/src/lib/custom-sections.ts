import type { CustomImageSection } from "./types";

/** 커스텀 섹션 삽입 슬롯 (시트 position) */
export const CUSTOM_SECTION_POSITION = {
  AFTER_CTA: 1,
  AFTER_PREMIUM: 2,
  AFTER_OVERVIEW: 3,
  AFTER_LOCATION: 4,
  AFTER_FUTURE: 5,
  AFTER_UNITS: 6,
  AFTER_COMMUNITY: 7,
} as const;

export type CustomSectionPosition =
  (typeof CUSTOM_SECTION_POSITION)[keyof typeof CUSTOM_SECTION_POSITION];

const DEFAULT_POSITION = CUSTOM_SECTION_POSITION.AFTER_COMMUNITY;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseExtraImages(
  value: unknown
): NonNullable<CustomImageSection["extraImages"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const image = String(item.image ?? "").trim();
      if (!image) return null;
      return {
        image,
        imagePc: optionalString(item.imagePc),
        imageMobile: optionalString(item.imageMobile),
        alt: optionalString(item.alt),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function parseGallery(
  value: unknown
): NonNullable<NonNullable<CustomImageSection["items"]>[number]["gallery"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!isRecord(entry)) return null;
      const image = String(entry.image ?? "").trim();
      if (!image) return null;
      return {
        image,
        imagePc: optionalString(entry.imagePc),
        imageMobile: optionalString(entry.imageMobile),
        title: optionalString(entry.title),
        alt: optionalString(entry.alt),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function parseItems(
  value: unknown
): NonNullable<CustomImageSection["items"]> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!isRecord(item)) return null;
      const title = String(item.title ?? item.tab ?? "").trim();
      const tab = optionalString(item.tab);
      const image = optionalString(item.image) ?? "";
      const gallery = parseGallery(item.gallery ?? item.images);
      if (!title && !tab && !image && gallery.length === 0) return null;
      return {
        tab,
        title: title || tab || "",
        description: optionalString(item.description) ?? "",
        image,
        imagePc: optionalString(item.imagePc),
        imageMobile: optionalString(item.imageMobile),
        ...(gallery.length ? { gallery } : {}),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function normalizePosition(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;
  if (!Number.isFinite(n)) return DEFAULT_POSITION;
  const clamped = Math.round(n);
  if (clamped < 1) return 1;
  if (clamped > 7) return 7;
  return clamped;
}

function slugId(title: string, index: number): string {
  const base = title.trim().replace(/\s+/g, "-") || `custom-${index + 1}`;
  return base;
}

export function parseCustomSectionItem(
  value: unknown,
  index = 0
): CustomImageSection | null {
  if (!isRecord(value)) return null;
  const title = String(value.title ?? "").trim();
  const id = optionalString(value.id) || slugId(title || "custom", index);
  const image = optionalString(value.image);
  const items = parseItems(value.items);
  const extraImages = parseExtraImages(value.extraImages);
  const extraImagesAfter = parseExtraImages(value.extraImagesAfter);
  const layoutRaw = optionalString(value.layout)?.toLowerCase();
  const layout =
    layoutRaw === "tabs" || layoutRaw === "cards"
      ? (layoutRaw as "tabs" | "cards")
      : undefined;

  if (
    !title &&
    !image &&
    items.length === 0 &&
    extraImages.length === 0 &&
    extraImagesAfter.length === 0
  ) {
    return null;
  }

  const showInNav =
    value.showInNav === false || value.showInNav === "N" || value.showInNav === "n"
      ? false
      : value.showInNav === true ||
          value.showInNav === "Y" ||
          value.showInNav === "y"
        ? true
        : undefined;

  return {
    id,
    enabled: value.enabled === false || value.enabled === "N" ? false : true,
    label: optionalString(value.label),
    title: title || id,
    description: optionalString(value.description),
    image,
    imagePc: optionalString(value.imagePc),
    imageMobile: optionalString(value.imageMobile),
    href: optionalString(value.href),
    position: normalizePosition(value.position),
    showInNav,
    layout,
    ...(items.length ? { items } : {}),
    ...(extraImages.length ? { extraImages } : {}),
    ...(extraImagesAfter.length ? { extraImagesAfter } : {}),
  };
}

/** 배열·단일 객체·JSON 문자열 → CustomImageSection[] */
export function normalizeCustomSections(value: unknown): CustomImageSection[] {
  let raw: unknown = value;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      raw = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(raw) ? raw : isRecord(raw) ? [raw] : [];
  return list
    .map((item, index) => parseCustomSectionItem(item, index))
    .filter((item): item is CustomImageSection => item !== null);
}

function hasImage(img?: { image?: string } | null): boolean {
  return Boolean(img?.image?.trim());
}

export function isCustomSectionVisible(section: CustomImageSection): boolean {
  if (section.enabled === false) return false;
  const items = section.items ?? [];
  const extras = section.extraImages ?? [];
  const after = section.extraImagesAfter ?? [];
  return (
    Boolean(section.image?.trim()) ||
    items.some(
      (item) =>
        item.tab?.trim() ||
        item.title?.trim() ||
        item.image?.trim() ||
        (item.gallery?.length ?? 0) > 0
    ) ||
    extras.some(hasImage) ||
    after.some(hasImage)
  );
}

export function resolveCustomSectionLayout(
  section: CustomImageSection
): "cards" | "tabs" | "legacy" {
  const items = section.items ?? [];
  if (section.layout === "tabs" || section.layout === "cards") {
    return section.layout;
  }
  if (items.some((item) => item.tab?.trim())) return "tabs";
  if (items.length > 0) return "cards";
  if (section.image?.trim()) return "legacy";
  return "cards";
}

export function customSectionAnchorId(section: CustomImageSection): string {
  return (section.id || section.title || "custom").trim() || "custom";
}

export function customSectionsAtPosition(
  sections: CustomImageSection[] | undefined,
  position: number
): CustomImageSection[] {
  return (sections ?? [])
    .filter(isCustomSectionVisible)
    .filter(
      (section) => (section.position ?? DEFAULT_POSITION) === position
    );
}

export function customSectionNavItems(
  sections: CustomImageSection[] | undefined
): { label: string; href: string }[] {
  return (sections ?? [])
    .filter(isCustomSectionVisible)
    .filter((section) => section.showInNav !== false)
    .sort(
      (a, b) =>
        (a.position ?? DEFAULT_POSITION) - (b.position ?? DEFAULT_POSITION)
    )
    .map((section) => ({
      label: section.title,
      href: `#${customSectionAnchorId(section)}`,
    }));
}
