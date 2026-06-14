import { headers } from "next/headers";
import { resolveSiteCode } from "@/lib/resolve-site-code";

/** Server Component — searchParams → middleware x-site-code → env fallback */
export async function getServerSiteCode(
  searchParamsSiteCode?: string | null
): Promise<string> {
  if (searchParamsSiteCode?.trim()) {
    return resolveSiteCode(searchParamsSiteCode);
  }
  const hdrs = await headers();
  return resolveSiteCode(hdrs.get("x-site-code"));
}
