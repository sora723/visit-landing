import { useConfig } from "@/components/ConfigProvider";
import { mergeSiteTheme, type SiteTheme } from "@/lib/site-theme";

/** Sheet·site.json 테마 — 제목 색 등 UI에서 직접 사용 */
export function useSiteTheme(): SiteTheme {
  const { config } = useConfig();
  return mergeSiteTheme(config.theme);
}
