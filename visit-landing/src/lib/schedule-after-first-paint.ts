/**
 * 첫 페인트 직후·idle에 비필수 작업 실행.
 * 네트워크 경쟁(site-content / 이미지)을 줄이기 위함.
 */

export type ScheduleAfterFirstPaintOptions = {
  /** requestIdleCallback timeout (기본 2500ms) */
  timeoutMs?: number;
  /** idle 전에 최소 대기 (기본 0) */
  minDelayMs?: number;
};

export function scheduleAfterFirstPaint(
  fn: () => void,
  options?: ScheduleAfterFirstPaintOptions
): () => void {
  let cancelled = false;
  let idleHandle: number | undefined;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let minDelayTimer: ReturnType<typeof setTimeout> | undefined;

  const run = () => {
    if (cancelled) return;
    cancelled = true;
    fn();
  };

  const armIdle = () => {
    if (cancelled) return;
    const timeoutMs = options?.timeoutMs ?? 2500;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleHandle = window.requestIdleCallback(() => run(), { timeout: timeoutMs });
    } else {
      fallbackTimer = setTimeout(run, Math.min(timeoutMs, 800));
    }
  };

  const afterFrames = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(armIdle);
    });
  };

  const minDelay = options?.minDelayMs ?? 0;
  if (minDelay > 0) {
    minDelayTimer = setTimeout(afterFrames, minDelay);
  } else {
    afterFrames();
  }

  return () => {
    cancelled = true;
    if (minDelayTimer) clearTimeout(minDelayTimer);
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (
      idleHandle != null &&
      typeof window !== "undefined" &&
      "cancelIdleCallback" in window
    ) {
      window.cancelIdleCallback(idleHandle);
    }
  };
}
