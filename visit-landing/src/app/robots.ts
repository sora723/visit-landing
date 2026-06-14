import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import {
  buildAbsoluteSiteUrl,
  readSiteOriginFromHeaders,
} from "@/lib/site-request-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const hdrs = await headers();
  const origin = readSiteOriginFromHeaders(hdrs);

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: buildAbsoluteSiteUrl("/sitemap.xml", origin),
  };
}
