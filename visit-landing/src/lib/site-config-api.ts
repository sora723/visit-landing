/** Apps Script site.config API 응답 타입·파싱 */

import { normalizeImageUrl } from "./image-url";
import { parseFooterData } from "./footer-config";
import type { SiteConfig } from "./types";
import type { ContentExtendedData } from "./sheet-types";

export type VisitDateOption = { value: string; label: string };

export type SiteConfigApiSettings = SiteConfig["settings"];

export type SiteConfigApiOverview = SiteConfig["overview"];
export type SiteConfigApiPremium = SiteConfig["premium"];
export type SiteConfigApiLocation = SiteConfig["location"];
export type SiteConfigApiFooter = SiteConfig["footer"];
export type SiteConfigApiFutureValue = SiteConfig["futureValue"];
export type SiteConfigApiUnitTypes = SiteConfig["unitTypes"];
export type SiteConfigApiCommunity = SiteConfig["community"];

/** Apps Script getSiteLiveConfig() data 필드 (파싱 후) */
export type SiteConfigApiData = {
  siteCode: string;
  /** optional — Apps Script/시트에 컬럼이 생기면 전달 */
  rendererVersion?: string;
  siteName?: string;
  domain?: string;
  phone?: string;
  managerName?: string;
  notificationPhone?: string;
  settings?: SiteConfigApiSettings;
  stickyPromoText: string | null;
  noticeText?: string;
  unitTypeOptions: string[];
  visitDateDays: number;
  visitDateOptions: VisitDateOption[] | null;
  unitTypeEnabled: boolean;
  visitDateEnabled: boolean;
  mainColor?: string;
  subColor?: string;
  accentColor?: string;
  liveStatusTitleColor?: string;
  ctaSectionTitleColor?: string;
  sectionTitleColor?: string;
  locationTitleColor?: string;
  heroTitle?: string;
  heroSubTitle?: string;
  headerBrand?: string;
  headerSubBrand?: string;
  benefit1Title?: string;
  benefit1Value?: string;
  benefit2Title?: string;
  benefit2Value?: string;
  benefit3Title?: string;
  benefit3Value?: string;
  cardIcon1?: string;
  cardIcon2?: string;
  cardIcon3?: string;
  ctaText?: string;
  mobileHookText?: string;
  popupImage1?: string;
  popupImage2?: string;
  heroImage?: string;
  heroImagePc?: string;
  heroImageMobile?: string;
  heroVisualImage?: string;
  ctaPromoImage?: string;
  ctaPromoImagePc?: string;
  ctaPromoImageMobile?: string;
  ctaPromoBg?: string;
  floatingTodayReservations?: number;
  floatingActiveConsultations?: number;
  overview?: SiteConfigApiOverview;
  premium?: SiteConfigApiPremium;
  location?: SiteConfigApiLocation;
  futureValue?: SiteConfigApiFutureValue;
  unitTypes?: SiteConfigApiUnitTypes;
  community?: SiteConfigApiCommunity;
  footer?: SiteConfigApiFooter;
  extendedData?: ContentExtendedData;
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

function parseOptionalPositiveNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || value <= 0) return undefined;
  return value;
}

function parseSettings(value: unknown): SiteConfigApiSettings | undefined {
  if (!isRecord(value)) return undefined;
  return {
    popupEnabled: value.popupEnabled !== false,
    popupReservationEnabled: value.popupReservationEnabled !== false,
    liveStatusEnabled: value.liveStatusEnabled !== false,
    virtualReservationsEnabled: value.virtualReservationsEnabled !== false,
    duplicateBlockMinutes:
      typeof value.duplicateBlockMinutes === "number" && value.duplicateBlockMinutes > 0
        ? value.duplicateBlockMinutes
        : 120,
  };
}

function parseOverview(value: unknown): SiteConfigApiOverview | undefined {
  if (!isRecord(value)) return undefined;
  const specs = Array.isArray(value.specs)
    ? value.specs
        .map((item) => {
          if (!isRecord(item)) return null;
          const label = String(item.label ?? "").trim();
          const specValue = String(item.value ?? "").trim();
          if (!label && !specValue) return null;
          return { label, value: specValue };
        })
        .filter((item): item is { label: string; value: string } => item !== null)
    : [];
  return {
    title: String(value.title ?? "사업개요").trim() || "사업개요",
    image: String(value.image ?? "").trim(),
    imagePc: optionalString(value.imagePc),
    imageMobile: optionalString(value.imageMobile),
    specs,
  };
}

function parseImageItems(
  value: unknown,
  fallbackTitle: string
): { title: string; items: SiteConfig["premium"]["items"] } | undefined {
  if (!isRecord(value)) return undefined;
  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => {
          if (!isRecord(item)) return null;
          const title = String(item.title ?? "").trim();
          if (!title) return null;
          return {
            title,
            description: String(item.description ?? "").trim(),
            image: String(item.image ?? "").trim(),
            imagePc: optionalString(item.imagePc),
            imageMobile: optionalString(item.imageMobile),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  return {
    title: String(value.title ?? fallbackTitle).trim() || fallbackTitle,
    items,
  };
}

function parseCommunityGalleryImages(
  value: unknown
): NonNullable<SiteConfigApiCommunity>["galleryImages"] {
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

function parseCommunity(value: unknown): SiteConfigApiCommunity | undefined {
  if (!isRecord(value)) return undefined;
  const base = parseImageItems(value, "커뮤니티");
  if (!base) return undefined;
  return {
    ...base,
    galleryImages: parseCommunityGalleryImages(value.galleryImages),
  };
}

function optionalNormalizedImage(value: unknown): string | undefined {
  const url = optionalString(value);
  return url ? normalizeImageUrl(url) : undefined;
}

function parseFooter(value: unknown): SiteConfigApiFooter | undefined {
  if (!isRecord(value)) return undefined;
  return parseFooterData(value);
}

function parseLocation(value: unknown): SiteConfigApiLocation | undefined {
  if (!isRecord(value)) return undefined;
  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => {
          if (!isRecord(item)) return null;
          const category = String(item.category ?? "").trim();
          const title = String(item.title ?? "").trim();
          const description = String(item.description ?? "").trim();
          if (!title && !description) return null;
          return {
            category,
            title,
            description,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  return {
    title: String(value.title ?? "입지환경").trim() || "입지환경",
    mapImage: normalizeImageUrl(String(value.mapImage ?? "").trim()),
    mapImagePc: optionalNormalizedImage(value.mapImagePc),
    mapImageMobile: optionalNormalizedImage(value.mapImageMobile),
    items,
  };
}

function parseUnitTypes(value: unknown): SiteConfigApiUnitTypes | undefined {
  if (!isRecord(value)) return undefined;
  const items = Array.isArray(value.items)
    ? value.items
        .map((item) => {
          if (!isRecord(item)) return null;
          const tab = String(item.tab ?? item.title ?? "").trim();
          const title = String(item.title ?? tab).trim();
          const image = String(item.image ?? "").trim();
          if (!tab && !title && !image) return null;
          const resolvedTab = tab || title;
          return {
            tab: resolvedTab,
            title: title || resolvedTab,
            description: String(item.description ?? "").trim(),
            image,
            imagePc: optionalString(item.imagePc),
            imageMobile: optionalString(item.imageMobile),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : [];
  return {
    title: String(value.title ?? "세대안내").trim() || "세대안내",
    items,
  };
}

function parseExtendedData(value: unknown): ContentExtendedData | undefined {
  if (!isRecord(value)) return undefined;
  return value as ContentExtendedData;
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
    rendererVersion: optionalString(data.rendererVersion),
    siteName: optionalString(data.siteName),
    domain: optionalString(data.domain),
    phone: optionalString(data.phone),
    managerName: optionalString(data.managerName),
    notificationPhone: optionalString(data.notificationPhone),
    settings: parseSettings(data.settings),
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
    liveStatusTitleColor: optionalString(data.liveStatusTitleColor),
    ctaSectionTitleColor: optionalString(data.ctaSectionTitleColor),
    sectionTitleColor: optionalString(data.sectionTitleColor),
    locationTitleColor: optionalString(data.locationTitleColor),
    heroTitle: optionalString(data.heroTitle),
    heroSubTitle: optionalString(data.heroSubTitle),
    headerBrand: optionalString(data.headerBrand),
    headerSubBrand: optionalString(data.headerSubBrand),
    benefit1Title: optionalString(data.benefit1Title),
    benefit1Value: optionalString(data.benefit1Value),
    benefit2Title: optionalString(data.benefit2Title),
    benefit2Value: optionalString(data.benefit2Value),
    benefit3Title: optionalString(data.benefit3Title),
    benefit3Value: optionalString(data.benefit3Value),
    cardIcon1: optionalString(data.cardIcon1),
    cardIcon2: optionalString(data.cardIcon2),
    cardIcon3: optionalString(data.cardIcon3),
    ctaText: optionalString(data.ctaText),
    mobileHookText: optionalString(data.mobileHookText),
    noticeText: optionalString(data.noticeText),
    popupImage1: optionalString(data.popupImage1),
    popupImage2: optionalString(data.popupImage2),
    heroImage: optionalString(data.heroImage),
    heroImagePc: optionalString(data.heroImagePc),
    heroImageMobile: optionalString(data.heroImageMobile),
    heroVisualImage: optionalString(data.heroVisualImage),
    ctaPromoImage: optionalString(data.ctaPromoImage),
    ctaPromoImagePc: optionalString(data.ctaPromoImagePc),
    ctaPromoImageMobile: optionalString(data.ctaPromoImageMobile),
    ctaPromoBg: optionalString(data.ctaPromoBg),
    floatingTodayReservations: parseOptionalPositiveNumber(
      data.floatingTodayReservations
    ),
    floatingActiveConsultations: parseOptionalPositiveNumber(
      data.floatingActiveConsultations
    ),
    overview: parseOverview(data.overview),
    premium: parseImageItems(data.premium, "프리미엄"),
    location: parseLocation(data.location),
    futureValue: parseImageItems(data.futureValue, "미래가치"),
    unitTypes: parseUnitTypes(data.unitTypes),
    community: parseCommunity(data.community),
    footer: parseFooter(data.footer),
    extendedData: parseExtendedData(data.extendedData),
    conversionTracking: isRecord(data.conversionTracking)
      ? data.conversionTracking
      : undefined,
    ownershipVerification: isRecord(data.ownershipVerification)
      ? data.ownershipVerification
      : undefined,
    updatedAt: optionalString(data.updatedAt),
  };
}
