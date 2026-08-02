/** API Route Cache-Control */

/**
 * site-content 성공 응답 — 브라우저는 매번 재검증, CDN만 짧게 캐시.
 * 캐시 키는 URL path (/api/site-content/L010) — 쿼리 vary에 의존하지 않음.
 */
export const SITE_CONTENT_BROWSER_CACHE_CONTROL =
  "public, max-age=0, s-maxage=60, stale-while-revalidate=30";

export const SITE_CONTENT_CDN_CACHE_CONTROL =
  "public, s-maxage=60, stale-while-revalidate=30";

export const SITE_CONTENT_NETLIFY_CDN_CACHE_CONTROL =
  "public, s-maxage=60, durable=60";

/** @deprecated 경로형 CDN 캐시로 대체. 레거시 import 호환용 */
export const SITE_CONTENT_CACHE_CONTROL =
  "private, no-store, no-cache, must-revalidate, max-age=0";

export const API_NO_STORE_CACHE_CONTROL =
  "no-store, no-cache, must-revalidate, max-age=0";
