/**
 * /api/submit 호출 — 기존 submitReservation과 동일 계약.
 */

import {
  submitReservation,
  type SubmitReservationResult,
} from "@/lib/api";
import type { SubmitPayload } from "@/lib/types";

export type { SubmitReservationResult };

/**
 * POST /api/submit?siteCode=…
 * Content-Type: application/json
 * 성공: json.data (SubmitReservationResult)
 * 실패: throw Error(서버 message 또는 기본 문구)
 */
export async function submitReservationLead(
  payload: SubmitPayload,
  siteCode: string
): Promise<SubmitReservationResult> {
  return submitReservation(payload, siteCode);
}
