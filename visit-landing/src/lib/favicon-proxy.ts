import sharp from "sharp";
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

/**
 * Drive WebP/JPEG 등을 탭 아이콘용 PNG로 변환.
 * metadata `type: image/png` 과 맞추고, Safari 등 WebP 파비콘 미지원을 피함.
 */
async function toFaviconPng(body: ArrayBuffer): Promise<Buffer | null> {
  try {
    return await sharp(Buffer.from(body))
      .resize(64, 64, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function fetchFaviconBytes(
  siteCode?: string | null
): Promise<{ body: Buffer; contentType: string } | null> {
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

  const raw = await upstream.arrayBuffer();
  const png = await toFaviconPng(raw);
  if (!png) return null;

  return {
    body: png,
    contentType: "image/png",
  };
}
