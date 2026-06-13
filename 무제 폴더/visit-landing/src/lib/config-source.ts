/**
 * SiteConfig 공급원 추상화
 *
 * 현재: file (config/site.json)
 * 향후: sheet (VisitLanding_Master — 현장관리 + 콘텐츠관리)
 *
 * UI/컴포넌트는 SiteConfig 타입만 참조. 공급원 교체 시 이 모듈만 변경.
 */

import siteJson from "../../config/site.json";
import type { SiteConfig } from "./types";
import { buildSiteConfigFromSheet } from "./site-from-sheet";
import type { ContentManagementRow, SiteManagementRow } from "./sheet-types";

export type SiteConfigSource = "file" | "sheet";

export function getConfigSource(): SiteConfigSource {
  const src = process.env.SITE_CONFIG_SOURCE?.toLowerCase();
  return src === "sheet" ? "sheet" : "file";
}

/** 현재 운영 — site.json */
export function getSiteConfigFromFile(): SiteConfig {
  return siteJson as SiteConfig;
}

/** 향후 운영 — Sheet 2행(현장+콘텐츠) → SiteConfig */
export function getSiteConfigFromSheet(
  siteRow: SiteManagementRow,
  contentRow: ContentManagementRow
): SiteConfig {
  return buildSiteConfigFromSheet(siteRow, contentRow);
}

/** 단일 진입점 — UI는 ConfigProvider → getSiteConfig()만 사용 */
export function getSiteConfig(): SiteConfig {
  return getSiteConfigFromFile();
}
