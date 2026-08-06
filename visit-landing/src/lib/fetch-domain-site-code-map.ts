/** Apps Script 현장관리.domain → siteCode (메모리 캐시 + stale-while-revalidate) */

const CACHE_TTL_MS = 10 * 60_000;
/** 만료 후에도 이 시간까지는 stale 맵을 즉시 반환하며 백그라운드 갱신 */
const STALE_TTL_MS = 30 * 60_000;

type DomainMapCache = {
  map: Record<string, string>;
  expiresAt: number;
  staleUntil: number;
};

let domainMapCache: DomainMapCache | null = null;
let domainMapInFlight: Promise<Record<string, string>> | null = null;

export function normalizeHostname(hostname?: string | null): string {
  let host = String(hostname ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0];

  if (host.startsWith("www.")) {
    host = host.slice(4);
  }
  return host;
}

export function resolveSiteCodeFromDomainMap(
  hostname: string | null | undefined,
  map: Record<string, string>
): string | null {
  const host = normalizeHostname(hostname);
  if (!host) return null;
  return map[host] ?? map[`www.${host}`] ?? null;
}

function rememberDomainMap(map: Record<string, string>): Record<string, string> {
  const now = Date.now();
  domainMapCache = {
    map,
    expiresAt: now + CACHE_TTL_MS,
    staleUntil: now + STALE_TTL_MS,
  };
  return map;
}

async function fetchDomainSiteCodeMapUncached(): Promise<Record<string, string>> {
  const appsScriptUrl = String(process.env.APPS_SCRIPT_URL ?? "").trim();
  if (!appsScriptUrl) {
    return domainMapCache?.map ?? {};
  }

  try {
    const res = await fetch(`${appsScriptUrl}?action=site.domains`, {
      next: { revalidate: 60 },
      redirect: "follow",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return domainMapCache?.map ?? {};
    }

    const json: unknown = await res.json();
    if (
      typeof json === "object" &&
      json !== null &&
      "success" in json &&
      (json as { success: boolean }).success === true &&
      "data" in json &&
      typeof (json as { data: unknown }).data === "object" &&
      (json as { data: { domains?: unknown } }).data !== null
    ) {
      const domains = (json as { data: { domains?: Record<string, string> } })
        .data.domains;
      if (domains && typeof domains === "object") {
        return rememberDomainMap(domains);
      }
    }
  } catch {
    // stale cache fallback
  }

  return domainMapCache?.map ?? {};
}

function refreshDomainMapInBackground(): void {
  if (domainMapInFlight) return;
  domainMapInFlight = fetchDomainSiteCodeMapUncached().finally(() => {
    domainMapInFlight = null;
  });
}

export type FetchDomainMapOptions = {
  /**
   * 콜드 캐시일 때 GAS를 기다릴지.
   * 커스텀 도메인은 true — 빈 맵으로 L001 폴백하면 다른 현장이 잠깐 노출됨.
   */
  waitIfCold?: boolean;
};

export async function fetchDomainSiteCodeMap(
  options: FetchDomainMapOptions = {}
): Promise<Record<string, string>> {
  const waitIfCold = options.waitIfCold === true;
  const now = Date.now();
  if (domainMapCache && now < domainMapCache.expiresAt) {
    return domainMapCache.map;
  }

  // 만료됐지만 stale 구간이면 즉시 반환 + 백그라운드 갱신 (TTFB 블로킹 제거)
  if (domainMapCache && now < domainMapCache.staleUntil) {
    refreshDomainMapInBackground();
    return domainMapCache.map;
  }

  if (domainMapInFlight) {
    if (waitIfCold) {
      return domainMapInFlight;
    }
    return domainMapCache?.map ?? {};
  }

  domainMapInFlight = fetchDomainSiteCodeMapUncached().finally(() => {
    domainMapInFlight = null;
  });

  // 커스텀 도메인 등: 빈 맵으로 다른 현장(L001)에 떨어지지 않도록 await
  if (waitIfCold) {
    return domainMapInFlight;
  }

  // 공유 호스트 광고 경로: 콜드여도 HTML을 막지 않음 (백그라운드 채움)
  return domainMapCache?.map ?? {};
}

export function clearDomainSiteCodeMapCache(): void {
  domainMapCache = null;
  domainMapInFlight = null;
}
