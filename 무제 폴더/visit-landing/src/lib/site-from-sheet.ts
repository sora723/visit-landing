/**
 * Google Sheet rows → SiteConfig 변환
 * 현재 UI는 site.json 사용. 향후 getSiteConfig() 대신 이 함수로 교체 가능.
 */

import type { SiteConfig } from "./types";
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
  const siteLayout = parseJson(content.layoutData, {
    title: "단지배치도",
    items: [] as { title: string; description: string; image: string }[],
  });
  const community = parseJson(content.communityData, {
    title: "커뮤니티",
    items: [] as { title: string; description: string; image: string }[],
  });

  const ctaTexts = parseCtaTexts(content.ctaText);
  const floatingLabels = ext.hero?.floatingStats ?? {
    todayLabel: "오늘 방문예약",
    activeLabel: "실시간 상담",
  };

  return {
    siteCode: site.siteCode,
    siteName: site.siteName,
    phone: site.phone,
    managerName: site.managerName || undefined,
    notificationPhone: site.notifyPhone,
    stickyPromoText: resolveStickyPromoText(content, ext),
    settings: {
      popupEnabled: parseBool(site.popupEnabled, true),
      liveStatusEnabled: parseBool(site.liveStatusEnabled, true),
      virtualReservationsEnabled: parseBool(site.virtualReservationEnabled, true),
      duplicateBlockMinutes: parseNumber(site.duplicateBlockMinutes, 120),
    },
    popup: ext.popup ?? {
      title: "선착순 방문예약",
      completeMessage: "방문예약이 접수되었습니다.",
      privacyText: "개인정보 수집 및 이용에 동의합니다.",
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
        { title: content.benefit1Title, value: content.benefit1Value },
        { title: content.benefit2Title, value: content.benefit2Value },
        { title: content.benefit3Title, value: content.benefit3Value },
      ],
      floatingStats: {
        todayReservations: parseNumber(content.floatingTodayReservations, 27),
        activeConsultations: parseNumber(content.floatingActiveConsultations, 3),
        todayLabel: floatingLabels.todayLabel,
        activeLabel: floatingLabels.activeLabel,
      },
    },
    liveReservation: ext.liveReservation ?? {
      mobileVisibleCount: 3,
      mobileRotateSeconds: 5,
      pcVisibleCount: 12,
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
    siteLayout,
    community,
    cta: {
      texts: ctaTexts.length
        ? ctaTexts
        : [content.mobileHookText || "선착순 방문예약 진행중"],
      buttonText: ext.cta?.buttonText ?? "방문예약하기",
      privacyText: ext.cta?.privacyText ?? "개인정보 수집 및 이용에 동의합니다.",
    },
    mobileBar: { hookText: content.mobileHookText },
    footer: ext.footer ?? {
      developer: "",
      constructor: "",
      agency: "",
      businessNumber: "",
      contact: "",
      privacyPolicy: "",
    },
    seo: ext.seo ?? {
      title: site.siteName,
      description: "",
      ogImage: content.heroVisualImage || content.heroImage,
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
