/**
 * Home V2 분기·Published 결과 → 화면 선택 (순수, 테스트용).
 * page.tsx와 동일 규칙.
 */

import { resolveRendererVersion } from "@/lib/resolve-renderer-version";
import type { FetchV2PublishedPageResult } from "@/v2/server/types";

export type V2HomeBranch = "v1" | "v2";

/** blank / v1 / unknown → V1, 정확히 v2만 V2 loader 경로 */
export function resolveV2HomeBranch(rendererVersion: unknown): V2HomeBranch {
  return resolveRendererVersion(rendererVersion) === "v2" ? "v2" : "v1";
}

export type V2PublishedSurface = "shell" | "safe";

/** Published loader 결과 — 실패는 전부 safe (V1 fallback 없음) */
export function resolveV2PublishedSurface(
  result: FetchV2PublishedPageResult
): V2PublishedSurface {
  return result.ok ? "shell" : "safe";
}
