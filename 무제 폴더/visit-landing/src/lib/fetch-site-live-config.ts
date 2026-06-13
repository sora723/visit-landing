/** Google Sheet 콘텐츠관리 — 실시간 UI 설정 (site.config) */

import {
  DEFAULT_SITE_THEME,
  mergeSiteTheme,
  type SiteTheme,
} from "@/lib/site-theme";

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL?.replace(/\/$/, "");
const SHEET_SITE_CODE = process.env.SHEET_SITE_CODE ?? "L001";

export type VisitDateOption = { value: string; label: string };

export type SiteLiveConfigData = {
  siteCode: string;
  stickyPromoText: string | null;
  unitTypeOptions: string[];
  visitDateDays: number;
  visitDateOptions: VisitDateOption[] | null;
  unitTypeEnabled: boolean;
  visitDateEnabled: boolean;
  theme: SiteTheme;
  updatedAt?: string;
  source: "sheet" | "unavailable";
};

export async function fetchSiteLiveConfigFromSheet(): Promise<SiteLiveConfigData> {
  const unavailable: SiteLiveConfigData = {
    siteCode: SHEET_SITE_CODE,
    stickyPromoText: null,
    unitTypeOptions: [],
    visitDateDays: 30,
    visitDateOptions: null,
    unitTypeEnabled: true,
    visitDateEnabled: true,
    theme: DEFAULT_SITE_THEME,
    source: "unavailable",
  };

  if (!APPS_SCRIPT_URL) return unavailable;

  try {
    const url =
      `${APPS_SCRIPT_URL}?action=site.config` +
      `&siteCode=${encodeURIComponent(SHEET_SITE_CODE)}`;

    const res = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();

    if (json.success && json.data) {
      const d = json.data;
      const rawPromo = d.stickyPromoText;
      const unitTypeOptions = Array.isArray(d.unitTypeOptions)
        ? d.unitTypeOptions.map((v: unknown) => String(v).trim()).filter(Boolean)
        : [];
      const visitDateDays =
        typeof d.visitDateDays === "number" && d.visitDateDays > 0
          ? d.visitDateDays
          : 30;
      const visitDateOptions = Array.isArray(d.visitDateOptions)
        ? d.visitDateOptions
            .map((o: { value?: string; label?: string }) => ({
              value: String(o?.value ?? "").trim(),
              label: String(o?.label ?? o?.value ?? "").trim(),
            }))
            .filter((o: VisitDateOption) => o.value)
        : null;

      return {
        siteCode: String(d.siteCode ?? SHEET_SITE_CODE),
        stickyPromoText:
          typeof rawPromo === "string" ? rawPromo.trim() || null : null,
        unitTypeOptions,
        visitDateDays,
        visitDateOptions: visitDateOptions?.length ? visitDateOptions : null,
        unitTypeEnabled: d.unitTypeEnabled !== false,
        visitDateEnabled: d.visitDateEnabled !== false,
        theme: mergeSiteTheme({
          mainColor: d.mainColor,
          subColor: d.subColor,
          accentColor: d.accentColor,
        }),
        updatedAt: d.updatedAt,
        source: "sheet",
      };
    }
  } catch {
    /* Sheet unavailable */
  }

  return unavailable;
}

/** @deprecated fetchSiteLiveConfigFromSheet 사용 */
export async function fetchStickyPromoFromSheet() {
  const data = await fetchSiteLiveConfigFromSheet();
  return {
    siteCode: data.siteCode,
    stickyPromoText: data.stickyPromoText,
    updatedAt: data.updatedAt,
    source: data.source,
  };
}
