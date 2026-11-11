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
  /** 검수(postProcess)용 — 클라이언트 픽셀 전환과 분리 */
  allowConversion?: boolean;
  savedToVerificationLog?: boolean;
  savedToSubmissions?: boolean;
  includeInLiveFeed?: boolean;
  validationStatus?: string;
  /** false면 허니팟/토큰 등 조기 차단 — 픽셀 전환 금지 */
  needsPostProcess?: boolean;
  siteCode?: string;
};

export class SubmitBusyError extends Error {
  code = "BACKEND_BUSY";
  submissionId?: string;
  submittedAt?: string;
  constructor(
    message: string,
    meta?: { submissionId?: string; submittedAt?: string }
  ) {
    super(message);
    this.name = "SubmitBusyError";
    this.submissionId = meta?.submissionId;
    this.submittedAt = meta?.submittedAt;
  }
}

export async function submitReservation(
  payload: SubmitPayload,
  siteCode: string
): Promise<SubmitReservationResult> {
  const body = JSON.stringify({ ...payload, siteCode });
  const res = await fetch(appendSiteCodeQuery("/api/submit", siteCode), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    /** 페이지 이탈 직후에도 가능하면 요청 유지 (소용량 POST) */
    keepalive: true,
  });

  const json = await res.json();

  if (!json.success) {
    const code = String(json.error?.code || "");
    const message = json.error?.message ?? "접수에 실패했습니다";
    if (code === "BACKEND_BUSY") {
      throw new SubmitBusyError(message, {
        submissionId: json.data?.submissionId,
        submittedAt: json.data?.submittedAt,
      });
    }
    throw new Error(message);
  }

  const data = json.data as SubmitReservationResult | undefined;
  // Sheet-first: _검증로그 성공만 완료 UI. Blobs-only 는 success 로 취급 금지.
  if (!data?.savedToVerificationLog) {
    throw new SubmitBusyError(
      "일시적으로 접수가 지연되고 있습니다. 같은 내용으로 다시 시도해주세요.",
      {
        submissionId: data?.submissionId,
        submittedAt: undefined,
      }
    );
  }

  return data;
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

/** 접수 성공 후 실시간 현황·토스트 — includeInLiveFeed=false면 피드 제외 */
export function notifyReservationSubmitted(
  name: string,
  extra?: {
    unitType?: string;
    visitDate?: string;
    visitTime?: string;
    isDuplicate?: boolean;
    includeInLiveFeed?: boolean;
  }
) {
  if (typeof window === "undefined") return;
  const showInFeed = extra?.includeInLiveFeed !== false && !extra?.isDuplicate;
  if (showInFeed) {
    savePendingSubmission(name);
  }
  window.dispatchEvent(
    new CustomEvent("reservation-submitted", {
      detail: {
        name,
        unitType: extra?.unitType,
        visitDate: extra?.visitDate,
        visitTime: extra?.visitTime,
        isDuplicate: extra?.isDuplicate === true,
      },
    })
  );
}
