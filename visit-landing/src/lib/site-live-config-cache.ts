/** Google Sheet site.config — 서버 메모리 캐시 (60s) */

import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";

const CACHE_TTL_MS = 60_000;

type Entry = {
  data: SiteLiveConfigData;
  expiresAt: number;
};

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<SiteLiveConfigData>>();

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
    inFlight.delete(siteCode);
    return;
  }
  cache.clear();
  inFlight.clear();
}

/** 동시 요청( metadata + layout + page ) — Apps Script 1회만 호출 */
export function dedupeSiteLiveConfigFetch(
  siteCode: string,
  fetcher: () => Promise<SiteLiveConfigData>
): Promise<SiteLiveConfigData> {
  const cached = readSiteLiveConfigCache(siteCode);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(siteCode);
  if (pending) return pending;

  const promise = fetcher()
    .then((data) => {
      writeSiteLiveConfigCache(siteCode, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(siteCode);
    });

  inFlight.set(siteCode, promise);
  return promise;
}
