/**
 * 공용 예약 접수 엔진 타입.
 * /api/submit · SubmitPayload 계약과 동일 — 필드 추가·삭제·이름 변경 금지.
 */

export type {
  ReservationSubmitInput,
  SubmitPayload,
} from "@/lib/types";

export type { SubmitReservationResult } from "@/lib/api";

export type ReservationSubmitOptions = {
  redirect?: boolean;
};

export type ReservationSubmitOutcome = {
  success: boolean;
  message?: string;
  isDuplicate?: boolean;
};
