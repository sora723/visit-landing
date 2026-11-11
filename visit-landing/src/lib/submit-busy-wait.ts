/**
 * Sheet-first 클라이언트 BUSY 대기.
 * Blobs-only(awaiting_sheet) 응답으로는 성공 UI 금지.
 * 동일 submissionId 로 재시도(idempotent).
 */

import {
  SubmitBusyError,
  submitReservation,
  type SubmitReservationResult,
} from "@/lib/api";
import type { SubmitPayload } from "@/lib/types";

/** 짧은 네트워크/순간 실패 재시도 */
export const NETWORK_RETRY_DELAYS_MS = [400, 800] as const;

/** BUSY 대기 상한 — 「접수 중...」 유지 */
export const BUSY_WAIT_MAX_MS = 10_000;

/** BUSY 재요청 간격 */
export const BUSY_WAIT_GAP_MS = [600, 800, 1_000, 1_200] as const;

export const BUSY_WAIT_TIMEOUT_MESSAGE = "잠시 후 다시 시도해 주세요.";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isSheetFirstSuccess(
  result: SubmitReservationResult | null | undefined
): boolean {
  return Boolean(
    result?.submissionId && result.savedToVerificationLog === true
  );
}

export function isRetryableSubmitError(err: unknown): boolean {
  if (err instanceof SubmitBusyError) return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message || "";
  // fetch 실패·일시 네트워크
  if (err.name === "TypeError") return true;
  if (/network|fetch|timeout|failed to fetch|aborted/i.test(msg)) return true;
  return false;
}

type BusyMeta = { submissionId?: string; submittedAt?: string };

function mergeBusyMeta(err: unknown, prev: BusyMeta): BusyMeta {
  if (err instanceof SubmitBusyError) {
    return {
      submissionId: err.submissionId || prev.submissionId,
      submittedAt: err.submittedAt || prev.submittedAt,
    };
  }
  return prev;
}

/**
 * Sheet(_검증로그) 성공할 때까지 동일 submissionId 재요청.
 * 10초 초과 시 BUSY_WAIT_TIMEOUT_MESSAGE.
 */
export async function submitReservationWithBusyWait(
  basePayload: SubmitPayload,
  siteCode: string,
  options?: {
    now?: () => number;
    submitFn?: typeof submitReservation;
  }
): Promise<SubmitReservationResult> {
  const submitFn = options?.submitFn ?? submitReservation;
  const now = options?.now ?? Date.now;
  const startedAt = now();

  let meta: BusyMeta = {
    submissionId: basePayload.submissionId,
    submittedAt: basePayload.submittedAt,
  };

  const attempt = async (): Promise<SubmitReservationResult> => {
    const payload: SubmitPayload = {
      ...basePayload,
      ...(meta.submissionId ? { submissionId: meta.submissionId } : {}),
      ...(meta.submittedAt ? { submittedAt: meta.submittedAt } : {}),
    };
    const result = await submitFn(payload, siteCode);
    if (!isSheetFirstSuccess(result)) {
      // Blobs-only·불완전 성공 가드
      throw new SubmitBusyError(BUSY_WAIT_TIMEOUT_MESSAGE, {
        submissionId: result.submissionId || meta.submissionId,
        submittedAt: meta.submittedAt,
      });
    }
    return result;
  };

  let lastError: unknown;
  try {
    return await attempt();
  } catch (err) {
    if (!isRetryableSubmitError(err)) throw err;
    meta = mergeBusyMeta(err, meta);
    lastError = err;
  }

  for (const delayMs of NETWORK_RETRY_DELAYS_MS) {
    if (now() - startedAt >= BUSY_WAIT_MAX_MS) break;
    await sleep(delayMs);
    try {
      return await attempt();
    } catch (err) {
      if (!isRetryableSubmitError(err)) throw err;
      meta = mergeBusyMeta(err, meta);
      lastError = err;
    }
  }

  let gapIndex = 0;
  while (now() - startedAt < BUSY_WAIT_MAX_MS) {
    const gap = BUSY_WAIT_GAP_MS[Math.min(gapIndex, BUSY_WAIT_GAP_MS.length - 1)];
    gapIndex += 1;
    const remaining = BUSY_WAIT_MAX_MS - (now() - startedAt);
    if (remaining <= 0) break;
    await sleep(Math.min(gap, remaining));
    if (now() - startedAt >= BUSY_WAIT_MAX_MS) break;
    try {
      return await attempt();
    } catch (err) {
      if (!isRetryableSubmitError(err)) throw err;
      meta = mergeBusyMeta(err, meta);
      lastError = err;
    }
  }

  throw new SubmitBusyError(BUSY_WAIT_TIMEOUT_MESSAGE, {
    submissionId: meta.submissionId,
    submittedAt: meta.submittedAt,
    ...(lastError instanceof SubmitBusyError
      ? {}
      : {}),
  });
}
