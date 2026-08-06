import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";
import type { SiteConfig } from "@/lib/types";

/**
 * 요청 siteCode 와 다른 현장의 site.json/시트 설정을 화면에 쓰지 않는다.
 * 시트가 아직 없으면 null → 중립 부트 UI.
 */
export function resolveRenderableSiteConfig(
  siteCode: string,
  live: SiteLiveConfigData,
  fileConfig: SiteConfig
): SiteConfig | null {
  const code = String(siteCode || "").trim();
  if (!code) return null;

  if (live.source === "sheet" && live.siteConfig) {
    const liveCode = String(live.siteConfig.siteCode || "").trim();
    if (!liveCode || liveCode === code) {
      return { ...live.siteConfig, siteCode: code };
    }
    return null;
  }

  if (String(fileConfig.siteCode || "").trim() === code) {
    return fileConfig;
  }

  return null;
}
