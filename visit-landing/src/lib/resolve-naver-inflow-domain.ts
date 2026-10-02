import { normalizeHostname } from "@/lib/fetch-domain-site-code-map";
import { normalizeNaverInflowDomain } from "@/lib/naver-conversion";
import { isPlatformHostname } from "@/lib/platform-hostname";

/** 네이버 wcs.inflow — 시트 domain 우선, 없으면 커스텀 도메인 Host */
export function resolveNaverInflowDomain(
  sheetDomain: string | undefined,
  requestHost: string
): string {
  const fromSheet = normalizeNaverInflowDomain(sheetDomain ?? "");
  if (fromSheet && !isPlatformHostname(fromSheet)) return fromSheet;

  const fromHost = normalizeHostname(requestHost);
  if (fromHost && !isPlatformHostname(fromHost)) return fromHost;

  return fromSheet || fromHost;
}
