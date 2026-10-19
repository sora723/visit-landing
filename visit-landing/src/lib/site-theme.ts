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
  /** 히어로 메인 제목 — 시트 `heroTitleColor`, 기본 #ffffff */
  heroTitleColor: string;
  /**
   * mainColor 배경 위 글자색 (입지·실시간·CTA·푸터·하단바 전화)
   * 시트 `textColor` — 대비 부족/미설정 시 배경에 맞춰 #fff 또는 #0f1d3a 자동 보정
   */
  onDarkTextColor: string;
  /**
   * 밝은 면 UI 글자색 (스크롤 헤더, 폼, 히어로 강조 카드 등)
   * 시트 `textColor` — 미설정 시 mainColor
   */
  textColor: string;
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  mainColor: "#0f1d3a",
  subColor: "#d7b56d",
  accentColor: "#caa85c",
  liveStatusTitleColor: "#ffffff",
  ctaSectionTitleColor: "#ffffff",
  sectionTitleColor: "#0f1d3a",
  locationTitleColor: "#ffffff",
  heroTitleColor: "#ffffff",
  onDarkTextColor: "#ffffff",
  textColor: "#0f1d3a",
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FALLBACK_ON_LIGHT = "#0f1d3a";
const FALLBACK_ON_DARK = "#ffffff";
/** WCAG 대비율 하한 — 하단바·네이비 섹션 본문 가독성 */
const MIN_CONTRAST_RATIO = 3;

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

function relativeLuminance(hex: string): number {
  const rgb = hexToRgbParts(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.55;
}

/**
 * mainColor(네이비 바·입지 등) 위 글자색.
 * 시트 textColor가 대비 충분하면 사용, 아니면 밝은 배경→다크 / 어두운 배경→화이트.
 */
export function resolveOnMainTextColor(
  mainColor: string,
  preferred: string | null | undefined
): string {
  const bg = normalizeHexColor(mainColor) ?? DEFAULT_SITE_THEME.mainColor;
  const want = normalizeHexColor(preferred ?? null);
  if (want && contrastRatio(bg, want) >= MIN_CONTRAST_RATIO) return want;
  return isLightColor(bg) ? FALLBACK_ON_LIGHT : FALLBACK_ON_DARK;
}

export function mergeSiteTheme(partial?: Partial<SiteTheme> | null): SiteTheme {
  const mainColor =
    normalizeHexColor(partial?.mainColor) ?? DEFAULT_SITE_THEME.mainColor;
  /** 시트 textColor → onDarkTextColor 로 유입 */
  const sheetText = normalizeHexColor(partial?.onDarkTextColor);

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
    heroTitleColor:
      normalizeHexColor(partial?.heroTitleColor) ??
      DEFAULT_SITE_THEME.heroTitleColor,
    onDarkTextColor: resolveOnMainTextColor(mainColor, sheetText),
    /** 이미 merge된 theme 재적용 시 textColor 유지 · 미설정 시 시트값 · 그다음 mainColor */
    textColor:
      normalizeHexColor(partial?.textColor) ?? sheetText ?? mainColor,
  };
}

/** layout SSR + 클라이언트 동기 적용 */
export function themeToCssProperties(theme: SiteTheme): Record<string, string> {
  const mainRgb = hexToRgbParts(theme.mainColor);
  const accentRgb = hexToRgbParts(theme.accentColor);
  const onDarkRgb = hexToRgbParts(theme.onDarkTextColor);
  const textRgb = hexToRgbParts(theme.textColor);

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
    "--color-hero-title": theme.heroTitleColor,
    "--color-on-dark-text": theme.onDarkTextColor,
    "--color-text": theme.textColor,
    ...(mainRgb ? { "--color-navy-rgb": mainRgb.join(", ") } : {}),
    ...(accentRgb ? { "--color-gold-rgb": accentRgb.join(", ") } : {}),
    ...(onDarkRgb
      ? { "--color-on-dark-text-rgb": onDarkRgb.join(" ") }
      : {}),
    ...(textRgb
      ? {
          "--color-text-rgb": textRgb.join(", "),
          "--color-text-rgb-space": textRgb.join(" "),
        }
      : {}),
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
