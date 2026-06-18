/** 현장별 브랜드 컬러 — Sheet / site.json → CSS 변수 */

import type { CSSProperties } from "react";

export type SiteTheme = {
  /** 메인 (네이비·다크 배경) */
  mainColor: string;
  /** 서브 (밝은 강조·그라데이션) */
  subColor: string;
  /** 강조 (CTA·골드 포인트) */
  accentColor: string;
  /** 실시간 방문예약 현황 섹션 제목 */
  liveStatusTitleColor: string;
  /** 홍보관 방문예약(CTA) 섹션 제목 */
  ctaSectionTitleColor: string;
  /** 사업개요·프리미엄 등 밝은 배경 섹션 제목 */
  sectionTitleColor: string;
  /** 입지환경 — 네이비 배경 섹션 제목 */
  locationTitleColor: string;
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  mainColor: "#0f1d3a",
  subColor: "#d7b56d",
  accentColor: "#caa85c",
  liveStatusTitleColor: "#ffffff",
  ctaSectionTitleColor: "#ffffff",
  sectionTitleColor: "#0f1d3a",
  locationTitleColor: "#ffffff",
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHexColor(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s.startsWith("#")) s = `#${s}`;
  if (HEX_RE.test(s)) {
    if (s.length === 4) {
      const r = s[1]!;
      const g = s[2]!;
      const b = s[3]!;
      return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
    }
    return s.toLowerCase();
  }
  return null;
}

export function mergeSiteTheme(partial?: Partial<SiteTheme> | null): SiteTheme {
  const mainColor =
    normalizeHexColor(partial?.mainColor) ?? DEFAULT_SITE_THEME.mainColor;

  return {
    mainColor,
    subColor:
      normalizeHexColor(partial?.subColor) ?? DEFAULT_SITE_THEME.subColor,
    accentColor:
      normalizeHexColor(partial?.accentColor) ?? DEFAULT_SITE_THEME.accentColor,
    liveStatusTitleColor:
      normalizeHexColor(partial?.liveStatusTitleColor) ??
      DEFAULT_SITE_THEME.liveStatusTitleColor,
    ctaSectionTitleColor:
      normalizeHexColor(partial?.ctaSectionTitleColor) ??
      DEFAULT_SITE_THEME.ctaSectionTitleColor,
    sectionTitleColor:
      normalizeHexColor(partial?.sectionTitleColor) ?? mainColor,
    locationTitleColor:
      normalizeHexColor(partial?.locationTitleColor) ??
      DEFAULT_SITE_THEME.locationTitleColor,
  };
}

function hexToRgbParts(hex: string): [number, number, number] | null {
  const n = normalizeHexColor(hex);
  if (!n) return null;
  const h = n.slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** layout SSR + 클라이언트 동기 적용 */
export function themeToCssProperties(theme: SiteTheme): Record<string, string> {
  const mainRgb = hexToRgbParts(theme.mainColor);
  const accentRgb = hexToRgbParts(theme.accentColor);

  return {
    "--color-navy": theme.mainColor,
    "--color-main": theme.mainColor,
    "--color-gold": theme.accentColor,
    "--color-accent": theme.accentColor,
    "--color-gold-light": theme.subColor,
    "--color-sub": theme.subColor,
    "--color-live-status-title": theme.liveStatusTitleColor,
    "--color-cta-section-title": theme.ctaSectionTitleColor,
    "--color-section-title": theme.sectionTitleColor,
    "--color-location-title": theme.locationTitleColor,
    ...(mainRgb ? { "--color-navy-rgb": mainRgb.join(", ") } : {}),
    ...(accentRgb ? { "--color-gold-rgb": accentRgb.join(", ") } : {}),
  };
}

export function applySiteThemeToDocument(theme: SiteTheme) {
  if (typeof document === "undefined") return;
  const props = themeToCssProperties(theme);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(props)) {
    root.style.setProperty(key, value);
  }
}

export function themeStyleObject(theme: SiteTheme): CSSProperties {
  return themeToCssProperties(theme) as CSSProperties;
}
