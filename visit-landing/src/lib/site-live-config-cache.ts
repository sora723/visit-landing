/** Google Sheet site.config — 서버 메모리 캐시 + stale-while-revalidate + SSR 예산 */

import {
  EMPTY_CONVERSION_TRACKING,
} from "@/lib/conversion-tracking";
import type { SiteLiveConfigData } from "@/lib/fetch-site-live-config";
import { EMPTY_OWNERSHIP_VERIFICATION } from "@/lib/ownership-verification";

const CACHE_TTL_MS = 5 * 60_000;
/** 만료 후에도 staleUntil 이전이면 즉시 반환하며 백그라운드 갱신 */
const STALE_TTL_MS = 30 * 60_000;
/**
 * 첫 HTML이 GAS를 끝없이 기다리지 않도록.
 * 예산 초과 시 unavailable(파일 폴백)로 화면을 먼저 열고, 실제 fetch는 캐시를 채운다.
 */
const SSR_FETCH_BUDGET_MS = 1_200;

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

function ssrBudgetUnavailable(siteCode: string): SiteLiveConfigData {
  return {
    source: "unavailable",
    siteConfig: null,
    conversionTracking: EMPTY_CONVERSION_TRACKING,
    ownershipVerification: EMPTY_OWNERSHIP_VERIFICATION,
    debug: {
      reason: "FETCH_ERROR",
      appsScriptUrlConfigured: true,
      appsScriptUrlLength: 0,
      deploymentId: null,
      siteCode,
      responseSnippet: `SSR_BUDGET_${SSR_FETCH_BUDGET_MS}ms`,
    },
  };
}

/** 동시 요청( metadata + layout + page ) — Apps Script 1회 + SSR 예산 */
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
  if (pending) {
    return Promise.race([
      pending,
      new Promise<SiteLiveConfigData>((resolve) => {
        setTimeout(
          () => resolve(ssrBudgetUnavailable(siteCode)),
          SSR_FETCH_BUDGET_MS
        );
      }),
    ]);
  }

  const full = fetcher()
    .then((data) => {
      writeSiteLiveConfigCache(siteCode, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(siteCode);
    });

  inFlight.set(siteCode, full);

  return Promise.race([
    full,
    new Promise<SiteLiveConfigData>((resolve) => {
      setTimeout(
        () => resolve(ssrBudgetUnavailable(siteCode)),
        SSR_FETCH_BUDGET_MS
      );
    }),
  ]);
}
