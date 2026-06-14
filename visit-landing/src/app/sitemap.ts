import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  buildAbsoluteSiteUrl,
  readSiteOriginFromHeaders,
} from "@/lib/site-request-url";

export const dynamic = "force-dynamic";

const PUBLIC_PATHS = ["/", "/complete"] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hdrs = await headers();
  const origin = readSiteOriginFromHeaders(hdrs);
  const lastModified = new Date();

  return PUBLIC_PATHS.map((pathname) => ({
    url: buildAbsoluteSiteUrl(pathname, origin),
    lastModified,
  }));
}
