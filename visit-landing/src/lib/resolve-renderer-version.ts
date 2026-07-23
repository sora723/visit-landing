/**
 * 현장 설정 rendererVersion → 렌더러 선택.
 * 정확히 "v2"만 V2. 그 외(빈값·미지·오타)는 모두 V1 — 운영 중단 방지.
 */

export type ResolvedRendererVersion = "v1" | "v2";

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
