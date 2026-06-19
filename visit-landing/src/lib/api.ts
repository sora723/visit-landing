import type { ReservationItem, SubmitPayload } from "./types";
import {
  filterRealReservationsOnly,
  savePendingSubmission,
} from "./live-reservation-feed";
import { appendSiteCodeQuery } from "./resolve-site-code";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/** 실제 접수만 조회 — 가상 보충은 LiveReservations/buildLiveFeed(클라이언트) 전용 */
export async function fetchRecentReservations(
  _virtualEnabled: boolean,
  limit: number,
  siteCode: string
): Promise<ReservationItem[]> {
  try {
    const url = appendSiteCodeQuery(`/api/reservations?limit=${limit}`, siteCode);
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.success && json.data?.items) {
      return filterRealReservationsOnly(json.data.items as ReservationItem[]);
    }

    return [];
  } catch {
    return [];
  }
}

export type SubmitReservationResult = {
  submissionId: string;
  isDuplicate?: boolean;
  notificationSent?: boolean;
  demo?: boolean;
};

export async function submitReservation(
  payload: SubmitPayload,
  siteCode: string
): Promise<SubmitReservationResult> {
  const res = await fetch(appendSiteCodeQuery("/api/submit", siteCode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, siteCode }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error?.message ?? "접수에 실패했습니다");
  }

  return json.data;
}

export function getTrackingContext(): Pick<
  SubmitPayload,
  "sourceUrl" | "referer" | "device" | "utmSource" | "utmMedium" | "utmCampaign"
> {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    sourceUrl: window.location.href,
    referer: document.referrer || undefined,
    device: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
      ? "mobile"
      : "desktop",
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
  };
}

/** 접수 성공 후 실시간 현황·토스트 (UI 전용) */
export function notifyReservationSubmitted(
  name: string,
  extra?: {
    unitType?: string;
    visitDate?: string;
    isDuplicate?: boolean;
  }
) {
  if (typeof window === "undefined") return;
  if (!extra?.isDuplicate) {
    savePendingSubmission(name);
  }
  window.dispatchEvent(
    new CustomEvent("reservation-submitted", {
      detail: {
        name,
        unitType: extra?.unitType,
        visitDate: extra?.visitDate,
        isDuplicate: extra?.isDuplicate === true,
      },
    })
  );
}
