import type { NextRequest } from "next/server";
import { normalizeHostname } from "@/lib/fetch-domain-site-code-map";

function firstHeaderValue(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

/** Host / x-forwarded-host → 소문자 hostname (포트·www 제거) */
export function readHostnameFromHeaders(hdrs: Headers): string {
  const raw =
    firstHeaderValue(hdrs.get("x-forwarded-host")) ||
    firstHeaderValue(hdrs.get("host"));
  return normalizeHostname(raw);
}

export function readHostnameFromRequest(request: NextRequest): string {
  return readHostnameFromHeaders(request.headers);
}

export function readProtocolFromHeaders(hdrs: Headers): "http" | "https" {
  const proto = firstHeaderValue(hdrs.get("x-forwarded-proto")).toLowerCase();
  if (proto === "http" || proto === "https") return proto;

  const host = readHostnameFromHeaders(hdrs);
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.startsWith("127.0.0.1")
  ) {
    return "http";
  }
  return "https";
}

/** 요청 hostname 기준 origin — siteCode 쿼리 미포함 */
export function readSiteOriginFromHeaders(hdrs: Headers): string {
  const host = readHostnameFromHeaders(hdrs);
  if (!host) {
    const fallback =
      process.env.URL ??
      process.env.DEPLOY_PRIME_URL ??
      process.env.NEXT_PUBLIC_SITE_URL;
    if (fallback) return fallback.replace(/\/$/, "");
    return "http://localhost:3000";
  }
  return `${readProtocolFromHeaders(hdrs)}://${host}`;
}

/** pathname 기준 절대 URL — siteCode 파라미터 없음 */
export function buildAbsoluteSiteUrl(pathname: string, origin: string): string {
  const base = origin.replace(/\/$/, "");
  if (!pathname || pathname === "/") return base;
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}
