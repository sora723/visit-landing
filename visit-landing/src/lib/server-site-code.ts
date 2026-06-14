import { cookies, headers } from "next/headers";
import {
  fetchDomainSiteCodeMap,
  resolveSiteCodeFromDomainMap,
} from "@/lib/fetch-domain-site-code-map";
import { resolveSiteCodeInput } from "@/lib/resolve-site-code";

/** Server Component — searchParams → middleware header → domain(시트) → cookie → env */
export async function getServerSiteCode(
  searchParamsSiteCode?: string | null
): Promise<string> {
  const hdrs = await headers();
  const hostname = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
  const domainMap = await fetchDomainSiteCodeMap();
  const domainSiteCode = resolveSiteCodeFromDomainMap(hostname, domainMap);

  return resolveSiteCodeInput({
    querySiteCode: searchParamsSiteCode,
    headerSiteCode: hdrs.get("x-site-code"),
    domainSiteCode,
    cookieSiteCode: (await cookies()).get("siteCode")?.value,
  });
}
