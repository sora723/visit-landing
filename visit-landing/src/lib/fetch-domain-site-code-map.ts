/** Apps Script 현장관리.domain → siteCode (메모리 캐시 60초) */

const CACHE_TTL_MS = 60_000;

type DomainMapCache = {
  map: Record<string, string>;
  expiresAt: number;
};

let domainMapCache: DomainMapCache | null = null;

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

export async function fetchDomainSiteCodeMap(): Promise<Record<string, string>> {
  if (domainMapCache && Date.now() < domainMapCache.expiresAt) {
    return domainMapCache.map;
  }

  const appsScriptUrl = String(process.env.APPS_SCRIPT_URL ?? "").trim();
  if (!appsScriptUrl) {
    return domainMapCache?.map ?? {};
  }

  try {
    const res = await fetch(`${appsScriptUrl}?action=site.domains`, {
      cache: "no-store",
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
        domainMapCache = {
          map: domains,
          expiresAt: Date.now() + CACHE_TTL_MS,
        };
        return domains;
      }
    }
  } catch {
    // stale cache fallback
  }

  return domainMapCache?.map ?? {};
}

export function clearDomainSiteCodeMapCache(): void {
  domainMapCache = null;
}
