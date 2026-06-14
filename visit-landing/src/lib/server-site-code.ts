import { cookies, headers } from "next/headers";
import { resolveSiteCode } from "@/lib/resolve-site-code";

/** Server Component — searchParams → middleware header → cookie → env */
export async function getServerSiteCode(
  searchParamsSiteCode?: string | null
): Promise<string> {
  if (searchParamsSiteCode?.trim()) {
    return resolveSiteCode(searchParamsSiteCode);
  }
  const hdrs = await headers();
  const fromHeader = hdrs.get("x-site-code");
  if (fromHeader?.trim()) {
    return resolveSiteCode(fromHeader);
  }
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("siteCode")?.value;
  return resolveSiteCode(fromCookie);
}
