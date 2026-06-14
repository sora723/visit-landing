/** Apps Script site.config 응답 → SiteConfig 변환 */

import type { SiteConfig } from "./types";
import type { ContentExtendedData } from "./sheet-types";
import type { SiteConfigApiData } from "./site-config-api";
import { normalizeHeroCardIconKey } from "./hero-card-icons";
import { mergeSiteTheme } from "./site-theme";
import type { CtaPromoImageSection } from "./types";

function parseCtaTexts(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    /* pipe-separated fallback */
  }
  return raw
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function filterBenefits(
  items: { title: string; value: string; iconKey: string }[]
): { title: string; value: string; iconKey: string }[] {
  return items.filter((item) => item.title.trim() || item.value.trim());
}

function benefitFromApi(
  title?: string,
  value?: string,
  cardIcon?: string
): { title: string; value: string; iconKey: string } {
  return {
    title: title ?? "",
    value: value ?? "",
    iconKey: normalizeHeroCardIconKey(cardIcon) ?? "gift",
  };
}

function asExtendedData(raw: unknown): ContentExtendedData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as ContentExtendedData;
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

function buildCtaPromoImage(
  api: SiteConfigApiData,
  ext: ContentExtendedData,
  fallback?: CtaPromoImageSection
): CtaPromoImageSection | undefined {
  const extPromo = ext.ctaPromoImage;
  const image =
    api.ctaPromoImage?.trim() || extPromo?.image?.trim() || "";
  if (!image) return fallback;

  return {
    image,
    imagePc: api.ctaPromoImagePc?.trim() || extPromo?.imagePc?.trim(),
    imageMobile:
      api.ctaPromoImageMobile?.trim() || extPromo?.imageMobile?.trim(),
    backgroundColor: parseCtaPromoBg(
      api.ctaPromoBg || extPromo?.backgroundColor
    ),
  };
}

/** Sheet live API → 페이지 SiteConfig (fallback은 sheet 미연결 시에만 사용) */
export function buildSiteConfigFromApi(
  api: SiteConfigApiData,
  fallback: SiteConfig
): SiteConfig {
  const ext = asExtendedData(api.extendedData);
  const floatingLabels = ext.hero?.floatingStats ?? {
    todayLabel: "오늘 방문예약",
    activeLabel: "실시간 상담",
  };

  const benefits = filterBenefits([
    benefitFromApi(api.benefit1Title, api.benefit1Value, api.cardIcon1),
    benefitFromApi(api.benefit2Title, api.benefit2Value, api.cardIcon2),
    benefitFromApi(api.benefit3Title, api.benefit3Value, api.cardIcon3),
  ]);

  const ctaTexts = parseCtaTexts(api.ctaText);
  const heroImage = api.heroImage?.trim() || "";
  const heroVisualImage = api.heroVisualImage?.trim() || heroImage;

  return {
    siteCode: api.siteCode,
    siteName: api.siteName?.trim() || fallback.siteName,
    phone: api.phone?.trim() || fallback.phone,
    managerName: api.managerName?.trim() || fallback.managerName,
    notificationPhone: api.notificationPhone?.trim() || fallback.notificationPhone,
    stickyPromoText: api.stickyPromoText ?? undefined,
    headerBrand: api.headerBrand?.trim() || undefined,
    headerSubBrand: api.headerSubBrand?.trim() || undefined,
    settings: api.settings ?? fallback.settings,
    popup: {
      ...(ext.popup ?? fallback.popup),
      image1: api.popupImage1?.trim() || ext.popup?.image1?.trim() || undefined,
      image2: api.popupImage2?.trim() || ext.popup?.image2?.trim() || undefined,
    },
    hero: {
      hook: api.heroTitle?.trim() || api.siteName?.trim() || fallback.siteName,
      sub: api.heroSubTitle?.trim() || "",
      image: heroImage,
      visualImage: heroVisualImage,
      highlightDuration: ext.hero?.highlightDuration ?? 3500,
      benefits,
      floatingStats: {
        todayReservations: api.floatingTodayReservations ?? 0,
        activeConsultations: api.floatingActiveConsultations ?? 0,
        todayLabel: floatingLabels.todayLabel,
        activeLabel: floatingLabels.activeLabel,
      },
    },
    liveReservation: ext.liveReservation ?? fallback.liveReservation,
    liveStatus: ext.liveStatus ?? fallback.liveStatus,
    reservationGuide: ext.reservationGuide ?? fallback.reservationGuide,
    overview: api.overview ?? { title: "사업개요", image: "", specs: [] },
    premium: api.premium ?? { title: "프리미엄", items: [] },
    location: api.location ?? { title: "입지환경", mapImage: "", items: [] },
    futureValue: api.futureValue ?? { title: "미래가치", items: [] },
    unitTypes: api.unitTypes ?? fallback.unitTypes ?? { title: "세대안내", items: [] },
    community: api.community ?? { title: "커뮤니티", items: [] },
    cta: {
      texts: ctaTexts.length
        ? ctaTexts
        : api.mobileHookText?.trim()
          ? [api.mobileHookText.trim()]
          : fallback.cta.texts,
      title: fallback.cta.title,
      subtitle: fallback.cta.subtitle,
      buttonText: ext.cta?.buttonText ?? fallback.cta.buttonText,
      privacyText: ext.cta?.privacyText ?? fallback.cta.privacyText,
    },
    ctaPromoImage: buildCtaPromoImage(api, ext, fallback.ctaPromoImage),
    mobileBar: {
      hookText: api.mobileHookText?.trim() || fallback.mobileBar.hookText,
    },
    footer: ext.footer ?? fallback.footer,
    seo: ext.seo ?? {
      title: api.siteName?.trim() || fallback.seo.title,
      description: fallback.seo.description,
      ogImage: heroVisualImage || fallback.seo.ogImage,
    },
    customSections: ext.customSections ?? fallback.customSections ?? [],
    theme: mergeSiteTheme({
      mainColor: api.mainColor,
      subColor: api.subColor,
      accentColor: api.accentColor,
    }),
    reservationForm: {
      unitTypeOptions: api.unitTypeOptions.length
        ? api.unitTypeOptions
        : fallback.reservationForm?.unitTypeOptions ?? [],
      visitDateDays: api.visitDateDays,
      visitDateOptions: api.visitDateOptions ?? undefined,
      unitTypeEnabled: api.unitTypeEnabled,
      visitDateEnabled: api.visitDateEnabled,
    },
  };
}
