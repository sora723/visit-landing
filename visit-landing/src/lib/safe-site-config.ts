import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";
import { normalizeSiteCode } from "@/lib/resolve-site-code";
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
  const code = normalizeSiteCode(siteCode);
  if (!code) return null;

  if (live.source === "sheet" && live.siteConfig) {
    const liveCode = normalizeSiteCode(live.siteConfig.siteCode);
    if (!liveCode || liveCode === code) {
      return { ...live.siteConfig, siteCode: code };
    }
    return null;
  }

  if (normalizeSiteCode(fileConfig.siteCode) === code) {
    return { ...fileConfig, siteCode: code };
  }

  return null;
}
