/** API Route Cache-Control */

/**
 * site-content는 현장별(siteCode) 데이터인데 Netlify Durable/Edge 캐시가
 * query=siteCode 를 vary 키에 넣지 않아 현장 응답이 섞일 수 있음.
 * → CDN 캐시 금지 (서버 메모리 캐시 site-live-config-cache 60s 는 유지).
 */
export const SITE_CONTENT_CACHE_CONTROL =
  "private, no-store, no-cache, must-revalidate, max-age=0";

export const API_NO_STORE_CACHE_CONTROL =
  "no-store, no-cache, must-revalidate, max-age=0";
