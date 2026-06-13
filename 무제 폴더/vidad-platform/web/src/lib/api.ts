import type { ReservationItem, SiteData, SubmitPayload, SubmitResult } from "./types";
import { getDemoSiteData, getDemoReservations } from "./demo-data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export function isDemoMode() {
  return !API_BASE || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function fetchSite(siteCode: string): Promise<SiteData> {
  if (isDemoMode()) return getDemoSiteData(siteCode);

  const res = await fetch(
    `${API_BASE}?action=site.get&siteCode=${encodeURIComponent(siteCode)}`,
    { next: { revalidate: 180 } }
  );
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? "현장 정보를 불러올 수 없습니다");
  }
  return json.data as SiteData;
}

export async function fetchRecentReservations(
  siteCode: string,
  limit = 12
): Promise<ReservationItem[]> {
  if (isDemoMode()) return getDemoReservations(limit);

  const res = await fetch(
    `${API_BASE}?action=reservations.recent&siteCode=${encodeURIComponent(siteCode)}&limit=${limit}`,
    { cache: "no-store" }
  );
  const json = await res.json();
  if (!json.success || !json.data) return getDemoReservations(limit);
  return json.data.items as ReservationItem[];
}

export async function submitReservation(
  payload: SubmitPayload
): Promise<SubmitResult> {
  if (isDemoMode()) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      submissionId: `demo-${Date.now()}`,
      redirectUrl: `/${payload.siteCode}/complete`,
    };
  }

  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "submit", ...payload }),
  });
  const json = await res.json();
  if (!json.success || !json.data) {
    throw new Error(json.error?.message ?? "접수에 실패했습니다");
  }
  return json.data as SubmitResult;
}

export function kakaoRedirectUrl(siteCode: string) {
  if (!API_BASE) return "#";
  return `${API_BASE}?action=kakao.redirect&siteCode=${encodeURIComponent(siteCode)}`;
}

export function getUtmParams(): Pick<
  SubmitPayload,
  "utmSource" | "utmMedium" | "utmCampaign"
> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

export function getTrackingContext(): Pick<
  SubmitPayload,
  "sourceUrl" | "referer" | "device"
> {
  if (typeof window === "undefined") return {};
  return {
    sourceUrl: window.location.href,
    referer: document.referrer || undefined,
    device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop",
  };
}
