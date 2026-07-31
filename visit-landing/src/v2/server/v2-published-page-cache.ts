/** V2 Published 공개 페이지 — 서버 메모리 캐시 (60s). V1 site.config 캐시와 키 분리. */

import type { FetchV2PublishedPageSuccess } from "@/v2/server/types";

const CACHE_TTL_MS = 60_000;
const KEY_PREFIX = "v2-published:";

type Entry = {
  data: FetchV2PublishedPageSuccess;
  expiresAt: number;
};

const cache = new Map<string, Entry>();
const inFlight = new Map<string, Promise<FetchV2PublishedPageSuccess>>();

function cacheKey(siteCode: string): string {
  return KEY_PREFIX + siteCode.trim();
}

export function readV2PublishedPageCache(
  siteCode: string
): FetchV2PublishedPageSuccess | null {
  const hit = cache.get(cacheKey(siteCode));
  if (!hit || Date.now() >= hit.expiresAt) return null;
  return hit.data;
}

export function writeV2PublishedPageCache(
  siteCode: string,
  data: FetchV2PublishedPageSuccess
): void {
  cache.set(cacheKey(siteCode), {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

export function clearV2PublishedPageCache(siteCode?: string): void {
  if (siteCode) {
    const key = cacheKey(siteCode);
    cache.delete(key);
    inFlight.delete(key);
    return;
  }
  cache.clear();
  inFlight.clear();
}

/** 성공 응답만 캐시·dedupe. 실패는 캐시하지 않음. Preview와 공유하지 않음. */
export function dedupeV2PublishedPageFetch(
  siteCode: string,
  fetcher: () => Promise<FetchV2PublishedPageSuccess>
): Promise<FetchV2PublishedPageSuccess> {
  const key = cacheKey(siteCode);
  const cached = readV2PublishedPageCache(siteCode);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = fetcher()
    .then((data) => {
      writeV2PublishedPageCache(siteCode, data);
      return data;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
