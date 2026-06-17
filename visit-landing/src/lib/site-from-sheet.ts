/**
 * Google Sheet rows → SiteConfig 변환
 * 현재 UI는 site.json 사용. 향후 getSiteConfig() 대신 이 함수로 교체 가능.
 */

import { buildSitePageTitle } from "@/lib/site-page-title";
import { resolveBrandingFromExtended } from "./branding-url";
import { normalizeFooter } from "./footer-config";
import type { SiteConfig } from "./types";
import type { CtaPromoImageSection } from "./types";
import type {
  ContentExtendedData,
  ContentManagementRow,
  SiteManagementRow,
} from "./sheet-types";

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw?.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseBool(value: boolean | string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  const v = String(value).trim().toUpperCase();
  return v === "Y" || v === "TRUE" || v === "1" || v === "YES";
}

function parseNumber(value: number | string | undefined, defaultValue: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function parseCtaTexts(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  const parsed = parseJson<string[]>(raw, []);
  if (Array.isArray(parsed) && parsed.length) return parsed;
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCtaPromoBg(raw?: string): CtaPromoImageSection["backgroundColor"] {
  const v = raw?.trim().toLowerCase() ?? "";
  if (
    v === "beige" ||
    v === "베이지" ||
    v === "bg" ||
    v === "#f8f6f2" ||
    v === "var(--color-bg)"
  ) {
    return "beige";
  }
  return "white";
}

function resolveCtaPromoImageFromContent(
  content: ContentManagementRow,
  ext: ContentExtendedData
): CtaPromoImageSection | undefined {
  const extPromo = ext.ctaPromoImage;
  const image = content.ctaPromoImage?.trim() || extPromo?.image?.trim() || "";
  if (!image) return undefined;

  return {
    image,
    imagePc: content.ctaPromoImagePc?.trim() || extPromo?.imagePc?.trim(),
    imageMobile:
      content.ctaPromoImageMobile?.trim() || extPromo?.imageMobile?.trim(),
    backgroundColor: parseCtaPromoBg(
      content.ctaPromoBg || extPromo?.backgroundColor
    ),
  };
}

function resolveUnitTypesFromContent(
  content: ContentManagementRow
): SiteConfig["unitTypes"] {
  type UnitItem = SiteConfig["unitTypes"]["items"][number];
  type LegacyItem = {
    tab?: string;
    title?: string;
    description?: string;
    image?: string;
    imagePc?: string;
    imageMobile?: string;
  };

  const normalizeItems = (items: LegacyItem[]): UnitItem[] => {
    const result: UnitItem[] = [];
    for (const item of items) {
      const tab = item.tab?.trim() || item.title?.trim() || "";
      const title = item.title?.trim() || tab;
      const image = item.image?.trim() || "";
      if (!tab && !title && !image) continue;
      const resolvedTab = tab || title;
      result.push({
        tab: resolvedTab,
        title: title || resolvedTab,
        description: item.description?.trim() || "",
        image,
        imagePc: item.imagePc?.trim(),
        imageMobile: item.imageMobile?.trim(),
      });
    }
    return result;
  };

  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const unitTypesRaw =
    row.unitTypesData?.trim() ||
    row.unitTypes?.trim() ||
    content.unitTypesData?.trim();

  if (unitTypesRaw) {
    const parsed = parseJson<{ title?: string; items?: LegacyItem[] }>(
      unitTypesRaw,
      {}
    );
    const items = normalizeItems(parsed.items ?? []);
    if (items.length) {
      return {
        title: parsed.title?.trim() || "세대안내",
        items,
      };
    }
  }

  const legacy = parseJson<{ title?: string; items?: LegacyItem[] }>(
    content.layoutData,
    { title: "세대안내", items: [] }
  );
  const legacyItems = normalizeItems(legacy.items ?? []);
  return {
    title: "세대안내",
    items: legacyItems,
  };
}

function resolveStickyPromoText(
  content: ContentManagementRow,
  ext: ContentExtendedData
): string | undefined {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const fromColumn = [
    row.stickyPromoText,
    row["스티키프로모텍스트"],
    row["하단프로모문구"],
  ]
    .map((v) => String(v ?? "").trim())
    .find(Boolean);
  if (fromColumn) return fromColumn;
  const fromExt = String(ext.stickyPromoText ?? "").trim();
  return fromExt || undefined;
}

function parsePipeList(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[|,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveUnitTypeOptionsFromSheet(
  content: ContentManagementRow,
  ext: ContentExtendedData
): string[] {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const fromColumn = parsePipeList(
    [row.unitTypeOptions, row["관심평형옵션"], row["평형옵션"]]
      .map((v) => String(v ?? "").trim())
      .find(Boolean)
  );
  if (fromColumn.length) return fromColumn;

  const fromExt = ext.reservationForm?.unitTypeOptions;
  if (Array.isArray(fromExt) && fromExt.length) return fromExt.map(String);
  if (typeof fromExt === "string" && fromExt.trim()) return parsePipeList(fromExt);

  return [];
}

function resolveUnitTypeEnabledFromSheet(
  content: ContentManagementRow,
  ext: ContentExtendedData
): boolean {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const raw = [row.unitTypeEnabled, row["관심평형노출"], row["평형노출"]]
    .map((v) => (v === undefined || v === null ? "" : v))
    .find((v) => String(v).trim() !== "");
  if (raw !== undefined && String(raw).trim() !== "") {
    return parseBool(raw as string | boolean, true);
  }
  if (ext.reservationForm?.unitTypeEnabled !== undefined) {
    return parseBool(ext.reservationForm.unitTypeEnabled, true);
  }
  return true;
}

function resolveVisitDateEnabledFromSheet(
  content: ContentManagementRow,
  ext: ContentExtendedData
): boolean {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const raw = [row.visitDateEnabled, row["방문일자노출"], row["방문예약일자노출"]]
    .map((v) => (v === undefined || v === null ? "" : v))
    .find((v) => String(v).trim() !== "");
  if (raw !== undefined && String(raw).trim() !== "") {
    return parseBool(raw as string | boolean, true);
  }
  if (ext.reservationForm?.visitDateEnabled !== undefined) {
    return parseBool(ext.reservationForm.visitDateEnabled, true);
  }
  return true;
}

function resolveVisitDateDaysFromSheet(
  content: ContentManagementRow,
  ext: ContentExtendedData
): number {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const raw = [row.visitDateDays, row["방문일자일수"], row["방문예약일수"]]
    .map((v) => String(v ?? "").trim())
    .find(Boolean);
  const n = Number(raw ?? ext.reservationForm?.visitDateDays);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 30;
}

function resolveVisitDateOptionsFromSheet(
  content: ContentManagementRow,
  ext: ContentExtendedData
): { value: string; label: string }[] | undefined {
  const row = content as ContentManagementRow & Record<string, string | undefined>;
  const explicit = parsePipeList(
    [row.visitDateOptions, row["방문일자옵션"], row["방문예약일자옵션"]]
      .map((v) => String(v ?? "").trim())
      .find(Boolean)
  );
  const fromExt = ext.reservationForm?.visitDateOptions;
  const extList = Array.isArray(fromExt)
    ? fromExt.map(String)
    : typeof fromExt === "string"
      ? parsePipeList(fromExt)
      : [];
  const dates = explicit.length ? explicit : extList;
  if (!dates.length) return undefined;

  return dates.map((value) => ({
    value,
    label: formatVisitDateLabel(value),
  }));
}

function formatVisitDateLabel(dateStr: string): string {
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function buildSiteConfigFromSheet(
  site: SiteManagementRow,
  content: ContentManagementRow
): SiteConfig {
  const ext = parseJson<ContentExtendedData>(content.extendedData, {});

  const overview = parseJson(content.overviewData, {
    title: "사업개요",
    image: "",
    specs: [] as { label: string; value: string }[],
  });
  const premium = parseJson(content.premiumData, {
    title: "프리미엄",
    items: [] as { title: string; description: string; image: string }[],
  });
  const location = parseJson(content.locationData, {
    title: "입지환경",
    mapImage: "",
    items: [] as { category: string; title: string; description: string }[],
  });
  const futureValue = parseJson(content.futureData, {
    title: "미래가치",
    items: [] as { title: string; description: string; image: string }[],
  });
  const unitTypes = resolveUnitTypesFromContent(content);
  const community = parseJson(content.communityData, {
    title: "커뮤니티",
    items: [] as { title: string; description: string; image: string }[],
  });

  const ctaTexts = parseCtaTexts(content.ctaText);
  const footer = normalizeFooter(
    content.footerData ? parseJson(content.footerData, null) : null,
    ext.footer
  );
  const floatingLabels = ext.hero?.floatingStats ?? {
    todayLabel: "오늘 방문예약",
    activeLabel: "실시간 상담",
  };
  const { faviconUrl, headerLogoUrl } = resolveBrandingFromExtended(ext);

  return {
    siteCode: site.siteCode,
    siteName: site.siteName,
    phone: site.phone,
    managerName: site.managerName || undefined,
    notificationPhone: site.notifyPhone,
    stickyPromoText: resolveStickyPromoText(content, ext),
    headerBrand: content.headerBrand?.trim() || undefined,
    headerSubBrand: content.headerSubBrand?.trim() || undefined,
    faviconUrl,
    headerLogoUrl,
    settings: {
      popupEnabled: parseBool(site.popupEnabled, true),
      liveStatusEnabled: parseBool(site.liveStatusEnabled, true),
      virtualReservationsEnabled: parseBool(site.virtualReservationEnabled, true),
      duplicateBlockMinutes: parseNumber(site.duplicateBlockMinutes, 120),
    },
    popup: {
      ...(ext.popup ?? {
        title: "선착순 방문예약",
        completeMessage: "방문예약이 접수되었습니다.",
        privacyText: "개인정보 수집 및 이용에 동의합니다.",
      }),
      image1: content.popupImage1?.trim() || ext.popup?.image1?.trim(),
      image2: content.popupImage2?.trim() || ext.popup?.image2?.trim(),
    },
    hero: {
      hook: content.heroTitle,
      sub: content.heroSubTitle,
      image: content.heroImage,
      imagePc: content.heroImagePc,
      imageMobile: content.heroImageMobile,
      visualImage: content.heroVisualImage || content.heroImage,
      visualImagePc: content.heroVisualImagePc,
      visualImageMobile: content.heroVisualImageMobile,
      highlightDuration: ext.hero?.highlightDuration ?? 3500,
      benefits: [
        {
          title: content.benefit1Title,
          value: content.benefit1Value,
          iconKey: content.cardIcon1,
        },
        {
          title: content.benefit2Title,
          value: content.benefit2Value,
          iconKey: content.cardIcon2,
        },
        {
          title: content.benefit3Title,
          value: content.benefit3Value,
          iconKey: content.cardIcon3,
        },
      ],
      floatingStats: {
        todayReservations: parseNumber(content.floatingTodayReservations, 27),
        activeConsultations: parseNumber(content.floatingActiveConsultations, 3),
        todayLabel: floatingLabels.todayLabel,
        activeLabel: floatingLabels.activeLabel,
      },
    },
    liveReservation: ext.liveReservation ?? {
      mobileVisibleCount: 5,
      mobileRotateSeconds: 5,
      pcVisibleCount: 10,
      statusLabels: ["접수완료", "예약확정", "상담예정"],
    },
    liveStatus: ext.liveStatus ?? {
      title: "실시간 방문예약 현황",
      subtitle: "홍보관 방문예약 접수 진행중",
    },
    reservationGuide: ext.reservationGuide ?? {
      title: "방문예약 안내",
      steps: [],
    },
    overview,
    premium,
    location,
    futureValue,
    unitTypes,
    community,
    cta: {
      texts: ctaTexts.length
        ? ctaTexts
        : [content.mobileHookText || "선착순 방문예약 진행중"],
      buttonText: ext.cta?.buttonText ?? "방문예약하기",
      privacyText: ext.cta?.privacyText ?? "개인정보 수집 및 이용에 동의합니다.",
    },
    ctaPromoImage: resolveCtaPromoImageFromContent(content, ext),
    mobileBar: { hookText: content.mobileHookText },
    footer,
    seo: {
      title: buildSitePageTitle(site.siteName, ext.seo?.title),
      description: ext.seo?.description?.trim() ?? "",
      ogImage:
        ext.seo?.ogImage?.trim() ||
        content.heroVisualImage ||
        content.heroImage,
      faviconUrl,
    },
    customSections: ext.customSections ?? [],
    reservationForm: {
      unitTypeOptions: resolveUnitTypeOptionsFromSheet(content, ext),
      visitDateDays: resolveVisitDateDaysFromSheet(content, ext),
      visitDateOptions: resolveVisitDateOptionsFromSheet(content, ext),
      unitTypeEnabled: resolveUnitTypeEnabledFromSheet(content, ext),
      visitDateEnabled: resolveVisitDateEnabledFromSheet(content, ext),
    },
  };
}
