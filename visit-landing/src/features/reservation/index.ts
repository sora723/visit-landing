/**
 * 공용 예약 접수 엔진 public exports
 */

export { buildReservationPayload } from "./build-reservation-payload";
export type { ReservationTrackingContext } from "./build-reservation-payload";
export {
  submitReservationLead,
  type SubmitReservationResult,
} from "./submit-reservation-lead";
export { useReservationSubmit } from "./useReservationSubmit";
export type { UseReservationSubmitParams } from "./useReservationSubmit";
export type {
  ReservationSubmitInput,
  ReservationSubmitOptions,
  ReservationSubmitOutcome,
  SubmitPayload,
} from "./types";
