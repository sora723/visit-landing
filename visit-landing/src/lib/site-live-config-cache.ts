/** Google Sheet site.config — 서버 메모리 캐시 + stale-while-revalidate */

import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";

const CACHE_TTL_MS = 5 * 60_000;
/** 만료 후에도 stale 설정으로 HTML을 바로 내려주고 백그라운드 갱신 */
const STALE_TTL_MS = 30 * 60_000;

type Entry = {
  data: SiteLiveConfigData;
  expiresAt: number;
  staleUntil: number;
};

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<SiteLiveConfigData>>();

export function readSiteLiveConfigCache(siteCode: string): SiteLiveConfigData | null {
  const hit = cache.get(siteCode);
  if (!hit) return null;
  if (Date.now() >= hit.expiresAt) return null;
  return hit.data;
}

/** fresh 만료 후에도 staleUntil 이전이면 반환 (SWR용) */
export function readSiteLiveConfigStaleCache(
  siteCode: string
): SiteLiveConfigData | null {
  const hit = cache.get(siteCode);
  if (!hit) return null;
  if (Date.now() >= hit.staleUntil) return null;
  return hit.data;
}

export function writeSiteLiveConfigCache(
  siteCode: string,
  data: SiteLiveConfigData
): void {
  if (data.source !== "sheet" || !data.siteConfig) return;
  const now = Date.now();
  cache.set(siteCode, {
    data,
    expiresAt: now + CACHE_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
  });
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
  const fresh = readSiteLiveConfigCache(siteCode);
  if (fresh) return Promise.resolve(fresh);

  const stale = readSiteLiveConfigStaleCache(siteCode);
  if (stale) {
    if (!inFlight.has(siteCode)) {
      const refresh = fetcher()
        .then((data) => {
          writeSiteLiveConfigCache(siteCode, data);
          return data;
        })
        .finally(() => {
          inFlight.delete(siteCode);
        });
      inFlight.set(siteCode, refresh);
    }
    return Promise.resolve(stale);
  }

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
