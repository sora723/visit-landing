import { cookies, headers } from "next/headers";
import {
  fetchDomainSiteCodeMap,
  resolveSiteCodeFromDomainMap,
} from "@/lib/fetch-domain-site-code-map";
import { isTenantHostname } from "@/lib/platform-hostname";
import { resolveSiteCodeInput } from "@/lib/resolve-site-code";

/** Server Component — searchParams → middleware header → domain(시트) → cookie → env */
export async function getServerSiteCode(
  searchParamsSiteCode?: string | null
): Promise<string> {
  const fromQuery = String(searchParamsSiteCode ?? "").trim();
  if (fromQuery) return fromQuery;

  const hdrs = await headers();
  if (hdrs.get("x-site-unresolved") === "1") {
    return "";
  }

  const headerSiteCode = hdrs.get("x-site-code")?.trim();
  if (headerSiteCode) return headerSiteCode;

  const hostname = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const tenantHost = isTenantHostname(hostname);
  const domainMap = await fetchDomainSiteCodeMap({
    waitIfCold: tenantHost,
  });
  const domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);

  if (tenantHost) {
    return domainSiteCode ?? "";
  }

  return resolveSiteCodeInput({
    querySiteCode: searchParamsSiteCode,
    headerSiteCode: hdrs.get("x-site-code"),
    domainSiteCode,
    cookieSiteCode: (await cookies()).get("siteCode")?.value,
  });
}
