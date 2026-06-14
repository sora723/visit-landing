#!/usr/bin/env node
/**
 * site.json → 콘텐츠관리 CSV 1행 출력 (운영 동기화용)
 * Usage: node scripts/export-content-row.mjs [siteCode]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const site = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../config/site.json"), "utf8")
);

const ext = {
  popup: site.popup,
  liveStatus: site.liveStatus,
  reservationGuide: site.reservationGuide,
  liveReservation: site.liveReservation,
  hero: {
    highlightDuration: site.hero.highlightDuration,
    floatingStats: {
      todayLabel: site.hero.floatingStats.todayLabel,
      activeLabel: site.hero.floatingStats.activeLabel,
    },
  },
  cta: {
    buttonText: site.cta.buttonText,
    privacyText: site.cta.privacyText,
  },
  footer: site.footer,
  seo: site.seo,
};

const row = {
  siteCode: process.argv[2] || site.siteCode || "L001",
  heroTitle: site.hero.hook,
  heroSubTitle: site.hero.sub,
  benefit1Title: site.hero.benefits[0]?.title ?? "",
  benefit1Value: site.hero.benefits[0]?.value ?? "",
  benefit2Title: site.hero.benefits[1]?.title ?? "",
  benefit2Value: site.hero.benefits[1]?.value ?? "",
  benefit3Title: site.hero.benefits[2]?.title ?? "",
  benefit3Value: site.hero.benefits[2]?.value ?? "",
  cardIcon1: site.hero.benefits[0]?.iconKey ?? "",
  cardIcon2: site.hero.benefits[1]?.iconKey ?? "",
  cardIcon3: site.hero.benefits[2]?.iconKey ?? "",
  ctaText: JSON.stringify(site.cta.texts),
  mobileHookText: site.mobileBar.hookText,
  stickyPromoText: site.stickyPromoText ?? "",
  heroImage: site.hero.image,
  heroImagePc: site.hero.imagePc ?? "",
  heroImageMobile: site.hero.imageMobile ?? "",
  heroVisualImage: site.hero.visualImage,
  overviewData: JSON.stringify(site.overview),
  premiumData: JSON.stringify(site.premium),
  locationData: JSON.stringify(site.location),
  futureData: JSON.stringify(site.futureValue),
  layoutData: JSON.stringify(site.unitTypes),
  unitTypesData: JSON.stringify(site.unitTypes),
  communityData: JSON.stringify(site.community),
  floatingTodayReservations: site.hero.floatingStats.todayReservations,
  floatingActiveConsultations: site.hero.floatingStats.activeConsultations,
  footerDeveloper: site.footer.developer,
  footerConstructor: site.footer.constructor,
  footerAgency: site.footer.agency,
  footerBusinessNumber: site.footer.businessNumber,
  footerContact: site.footer.contact,
  footerPrivacyPolicy: site.footer.privacyPolicy,
  extendedData: JSON.stringify(ext),
};

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
console.log(Object.keys(row).join(","));
console.log(Object.keys(row).map((k) => esc(row[k])).join(","));
