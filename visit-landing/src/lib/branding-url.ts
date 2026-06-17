import type { ContentExtendedData } from "./sheet-types";
import { normalizeImageUrl } from "./image-url";

/** extendedData → 파비콘·헤더 로고 URL */
export function resolveBrandingFromExtended(ext: ContentExtendedData): {
  faviconUrl?: string;
  headerLogoUrl?: string;
} {
  const faviconUrl = ext.seo?.faviconUrl?.trim()
    ? normalizeImageUrl(ext.seo.faviconUrl.trim(), "favicon")
    : undefined;
  const headerLogoUrl = ext.headerLogoUrl?.trim()
    ? normalizeImageUrl(ext.headerLogoUrl.trim(), "logo")
    : undefined;
  return { faviconUrl, headerLogoUrl };
}
