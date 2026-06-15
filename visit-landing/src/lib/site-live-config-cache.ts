/** Google Sheet site.config — 서버 메모리 캐시 (60s) */

import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";

const CACHE_TTL_MS = 60_000;

type Entry = {
  data: SiteLiveConfigData;
  expiresAt: number;
};

const cache = new Map<string, Entry>();

export function readSiteLiveConfigCache(siteCode: string): SiteLiveConfigData | null {
  const hit = cache.get(siteCode);
  if (!hit || Date.now() >= hit.expiresAt) return null;
  return hit.data;
}

export function writeSiteLiveConfigCache(
  siteCode: string,
  data: SiteLiveConfigData
): void {
  if (data.source !== "sheet" || !data.siteConfig) return;
  cache.set(siteCode, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function clearSiteLiveConfigCache(siteCode?: string): void {
  if (siteCode) {
    cache.delete(siteCode);
    return;
  }
  cache.clear();
}
