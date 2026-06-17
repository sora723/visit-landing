import { getSiteConfigFromFile } from "@/lib/config-source";
import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";
import { getServerSiteCode } from "@/lib/server-site-code";

/** 시트 extendedData.seo.faviconUrl → 프록시용 절대 URL */
export async function resolveFaviconProxyUrl(
  siteCodeOverride?: string | null
): Promise<string | undefined> {
  const siteCode = await getServerSiteCode(siteCodeOverride);
  const live = await fetchSiteLiveConfigFromSheet(siteCode);
  const fileConfig = getSiteConfigFromFile();
  const config =
    live.source === "sheet" && live.siteConfig ? live.siteConfig : fileConfig;
  return config.faviconUrl ?? config.seo.faviconUrl;
}

export async function fetchFaviconBytes(
  siteCodeOverride?: string | null
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const faviconUrl = await resolveFaviconProxyUrl(siteCodeOverride);
  if (!faviconUrl?.trim()) return null;

  const upstream = await fetch(faviconUrl.trim(), {
    next: { revalidate: 300 },
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!upstream.ok) return null;

  return {
    body: await upstream.arrayBuffer(),
    contentType: upstream.headers.get("content-type")?.split(";")[0] || "image/png",
  };
}
