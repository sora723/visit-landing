import { fetchSiteLiveConfigFromSheet } from "@/lib/fetch-site-live-config";

/**
 * 해당 siteCode 시트 파비콘만 사용.
 * 없으면 undefined — fileConfig·다른 현장·기본값으로 대체하지 않음.
 */
export async function resolveFaviconProxyUrl(
  siteCode?: string | null
): Promise<string | undefined> {
  const code = String(siteCode ?? "").trim();
  if (!code) return undefined;

  const live = await fetchSiteLiveConfigFromSheet(code);
  if (live.source !== "sheet" || !live.siteConfig) return undefined;

  const url =
    live.siteConfig.faviconUrl?.trim() ||
    live.siteConfig.seo.faviconUrl?.trim() ||
    "";
  return url || undefined;
}

function isImageContentType(contentType: string): boolean {
  const type = contentType.toLowerCase().split(";")[0]?.trim() || "";
  return type.startsWith("image/");
}

export async function fetchFaviconBytes(
  siteCode?: string | null
): Promise<{ body: ArrayBuffer; contentType: string } | null> {
  const faviconUrl = await resolveFaviconProxyUrl(siteCode);
  if (!faviconUrl) return null;

  const upstream = await fetch(faviconUrl, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });
  if (!upstream.ok) return null;

  const contentType =
    upstream.headers.get("content-type")?.split(";")[0]?.trim() || "";
  /** Drive 로그인 HTML 등 이미지가 아니면 없음으로 처리 (다른 아이콘 대체 없음) */
  if (!isImageContentType(contentType)) return null;

  return {
    body: await upstream.arrayBuffer(),
    contentType,
  };
}
