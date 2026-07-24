/**
 * 현장 설정 rendererVersion → 렌더러 선택.
 * 정확히 "v2"만 V2. 그 외(빈값·미지·오타)는 모두 V1 — 운영 중단 방지.
 */

export type ResolvedRendererVersion = "v1" | "v2";

/**
 * Source of Truth 우선순위 (확정 계약):
 * 1. 현장관리.rendererVersion (비어 있지 않으면 항상 우선)
 * 2. 현장관리가 빈칸일 때만 extendedData.rendererVersion
 * 3. 둘 다 없으면 undefined → 호출측 fallback / V1
 */
export function pickRendererVersionFromSources(
  siteManagementRendererVersion: unknown,
  extendedData: unknown
): string | undefined {
  const fromSite = String(siteManagementRendererVersion ?? "").trim();
  if (fromSite) return fromSite;

  if (
    extendedData &&
    typeof extendedData === "object" &&
    !Array.isArray(extendedData)
  ) {
    const raw = (extendedData as Record<string, unknown>).rendererVersion;
    const fromExt = String(raw ?? "").trim();
    if (fromExt) return fromExt;
  }

  return undefined;
}

/**
 * @param value 현장관리/API/site.json의 rendererVersion (optional)
 */
export function resolveRendererVersion(
  value: unknown
): ResolvedRendererVersion {
  if (typeof value !== "string") return "v1";
  const normalized = value.trim().toLowerCase();
  if (normalized === "v2") return "v2";
  return "v1";
}

/**
 * Home `generateMetadata`용 robots.
 * v2 placeholder만 noindex/nofollow. V1은 null → metadata 미덮어씀.
 */
export function resolveHomeRobotsMetadata(
  rendererVersion: unknown
): { index: false; follow: false } | null {
  if (resolveRendererVersion(rendererVersion) === "v2") {
    return { index: false, follow: false };
  }
  return null;
}
