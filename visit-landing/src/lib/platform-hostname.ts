import { normalizeHostname } from "@/lib/fetch-domain-site-code-map";

/**
 * 공유 앱 호스트 — ?siteCode= / cookie 로 현장 구분.
 * 그 외 호스트는 현장관리.domain 전용(다른 현장 폴백 금지).
 */
const PLATFORM_HOSTS = new Set([
  "david-ad.kr",
  "www.david-ad.kr",
  "smodelhouse.netlify.app",
  "localhost",
  "127.0.0.1",
]);

export function isPlatformHostname(hostname?: string | null): boolean {
  const host = normalizeHostname(hostname);
  if (!host) return true;
  if (PLATFORM_HOSTS.has(host)) return true;
  if (host.endsWith(".netlify.app")) return true;
  if (host.endsWith(".localhost")) return true;
  return false;
}

/** 연동 커스텀 도메인 — Host 만으로 siteCode 결정 */
export function isTenantHostname(hostname?: string | null): boolean {
  return !isPlatformHostname(hostname);
}
