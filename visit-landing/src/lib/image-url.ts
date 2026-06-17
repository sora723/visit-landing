/** Google Drive 공유 링크 → img 태그용 직접 URL (용도별 크기) */

export type ImageSizePreset =
  | "hero"
  | "hero-mobile"
  | "popup-pc"
  | "popup-mobile"
  | "section"
  | "lightbox"
  | "favicon"
  | "logo";

const DRIVE_THUMB_WIDTH: Record<ImageSizePreset, number> = {
  hero: 1920,
  "hero-mobile": 960,
  "popup-pc": 1280,
  "popup-mobile": 720,
  section: 1200,
  lightbox: 2560,
  favicon: 96,
  logo: 256,
};

const PLACEHOLDER_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect fill="#e8e4dc" width="800" height="450"/><text x="50%" y="50%" fill="#7a7060" font-size="18" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif">Image unavailable</text></svg>'
  );

function extractDriveFileId(url: string): string | null {
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function driveThumbnailUrl(fileId: string, width: number): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

export function normalizeImageUrl(
  url: string,
  preset: ImageSizePreset = "section"
): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    return driveThumbnailUrl(fileId, DRIVE_THUMB_WIDTH[preset]);
  }

  return trimmed;
}

/** seo.ogImage — Drive 공유 링크 → 썸네일, 비어 있으면 fallback 순서대로 */
export function resolveOgImageUrl(
  primary: string | undefined,
  ...fallbacks: (string | undefined)[]
): string | undefined {
  for (const raw of [primary, ...fallbacks]) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    return normalizeImageUrl(trimmed, "section");
  }
  return undefined;
}

/** Drive 로드 실패 시 더 작은 썸네일 → placeholder */
export function getImageFallbackUrl(
  url: string,
  preset: ImageSizePreset = "section"
): string {
  const trimmed = url.trim();
  if (!trimmed) return PLACEHOLDER_SVG;

  const fileId = extractDriveFileId(trimmed);
  if (fileId) {
    if (preset === "lightbox") {
      return driveThumbnailUrl(fileId, DRIVE_THUMB_WIDTH.section);
    }
    const current = DRIVE_THUMB_WIDTH[preset];
    const smaller = Math.max(480, Math.round(current * 0.55));
    if (smaller < current) {
      return driveThumbnailUrl(fileId, smaller);
    }
    return PLACEHOLDER_SVG;
  }

  return PLACEHOLDER_SVG;
}

export function getImagePlaceholderUrl(): string {
  return PLACEHOLDER_SVG;
}
