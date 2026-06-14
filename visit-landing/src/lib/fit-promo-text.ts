/** stickyPromoText — 줄바꿈·특수 공백 제거 후 한 줄 문자열 */
export function sanitizePromoText(raw: string | null | undefined): string | null {
  const cleaned = String(raw ?? "")
    .replace(/[\r\n\u2028\u2029\u000b\u000c]+/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

export function isAndroidDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Android/i.test(ua) || /SamsungBrowser/i.test(ua);
}

export function isPromoMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function shouldUseAndroidPromoRender(): boolean {
  return isAndroidDevice() && isPromoMobileViewport();
}

/** 모바일은 canvas 측정 (320px 등 좁은 화면 포함) */
export function shouldUseCanvasPromoFit(): boolean {
  return isPromoMobileViewport();
}

export function getPromoMaxFontPx(): number {
  if (typeof window === "undefined") return 32;
  if (isPromoMobileViewport()) return 28;
  return 48;
}

export function getPromoMinFontPx(): number {
  return isPromoMobileViewport() ? 5 : 6;
}

function getPromoStrokePx(fontSizePx: number): number {
  if (!isPromoMobileViewport()) return 2.5;
  return shouldUseAndroidPromoRender()
    ? Math.min(1.5, fontSizePx * 0.12)
    : Math.min(1.75, fontSizePx * 0.14);
}

function getAvailableWidth(container: HTMLElement): number {
  const styles = window.getComputedStyle(container);
  const padX =
    parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
  const fromContainer = Math.max(0, container.clientWidth - padX);
  const fromViewport = Math.max(
    0,
    (window.visualViewport?.width ?? window.innerWidth) - padX
  );
  const isMobile = isPromoMobileViewport();
  const base = isMobile ? Math.min(fromContainer, fromViewport) : fromContainer;
  const safety = isMobile ? 6 : 4;
  return Math.max(0, base - safety);
}

const PROMO_FONT_FAMILY = '"Paperlogy", "Pretendard", sans-serif';

let canvasCtx: CanvasRenderingContext2D | null = null;

function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!canvasCtx) {
    canvasCtx = document.createElement("canvas").getContext("2d");
  }
  return canvasCtx;
}

export function measurePromoCanvasWidth(text: string, fontSizePx: number): number {
  const ctx = getCanvasContext();
  if (!ctx) return text.length * fontSizePx * 0.92;
  ctx.font = `900 ${fontSizePx}px ${PROMO_FONT_FAMILY}`;
  const strokePx = getPromoStrokePx(fontSizePx);
  return ctx.measureText(text).width + strokePx * 2 + 2;
}

function measurePromoTextWidth(span: HTMLElement): number {
  return Math.ceil(
    Math.max(span.scrollWidth, span.getBoundingClientRect().width)
  );
}

function isPromoWrapped(span: HTMLElement, fontSizePx: number): boolean {
  return span.getBoundingClientRect().height > fontSizePx * 1.35;
}

export function estimatePromoFontPx(
  text: string,
  available: number,
  maxPx: number
): number {
  if (available <= 0) return getPromoMinFontPx();
  const lo = getPromoMinFontPx();
  let best = lo;
  for (let size = maxPx; size >= lo; size -= 0.5) {
    if (measurePromoCanvasWidth(text, size) <= available) {
      best = size;
      break;
    }
  }
  return best;
}

function applyPromoSpanStyles(span: HTMLElement): void {
  span.style.transform = "none";
  span.style.transformOrigin = "center bottom";
  span.style.width = "max-content";
  span.style.maxWidth = "none";
  span.style.whiteSpace = "nowrap";
  span.style.wordBreak = "keep-all";
  span.style.overflowWrap = "normal";
  span.style.display = "inline-block";
  span.style.lineHeight = "1";
}

function binarySearchPromoFontSize(
  text: string,
  available: number,
  maxPx: number,
  minPx: number,
  measure: (fontSizePx: number) => number
): number {
  let lo = minPx;
  let hi = maxPx;
  let best = estimatePromoFontPx(text, available, maxPx);

  if (measure(best) <= available) {
    lo = best;
  } else {
    hi = best;
    best = minPx;
  }

  while (lo <= hi) {
    const mid = Math.round(((lo + hi) / 2) * 4) / 4;
    if (measure(mid) <= available) {
      best = mid;
      lo = mid + 0.25;
    } else {
      hi = mid - 0.25;
    }
  }

  while (best > minPx && measure(best) > available) {
    best -= 0.25;
  }

  return best;
}

function applyScaleFallback(span: HTMLElement, available: number): void {
  const width = measurePromoTextWidth(span);
  if (width <= available || available <= 0) return;
  const scale = Math.max(0.5, available / width);
  span.style.transform = `scale(${scale})`;
  span.style.transformOrigin = "center bottom";
}

function fitPromoTextCanvas(
  span: HTMLElement,
  text: string,
  available: number
): number {
  const maxPx = getPromoMaxFontPx();
  const minPx = getPromoMinFontPx();
  applyPromoSpanStyles(span);

  const best = binarySearchPromoFontSize(
    text,
    available,
    maxPx,
    minPx,
    (size) => measurePromoCanvasWidth(text, size)
  );

  span.style.fontSize = `${best}px`;

  let current = best;
  while (
    current > minPx &&
    (measurePromoCanvasWidth(text, current) > available ||
      isPromoWrapped(span, current))
  ) {
    current -= 0.25;
    span.style.fontSize = `${current}px`;
  }

  applyScaleFallback(span, available);
  return current;
}

function fitPromoTextDefault(
  span: HTMLElement,
  text: string,
  available: number
): number {
  const maxPx = getPromoMaxFontPx();
  const minPx = getPromoMinFontPx();
  applyPromoSpanStyles(span);

  let best = binarySearchPromoFontSize(
    text,
    available,
    maxPx,
    minPx,
    (size) => {
      span.style.fontSize = `${size}px`;
      return measurePromoTextWidth(span);
    }
  );

  span.style.fontSize = `${best}px`;

  while (
    best > minPx &&
    (measurePromoTextWidth(span) > available || isPromoWrapped(span, best))
  ) {
    best -= 0.25;
    span.style.fontSize = `${best}px`;
  }

  applyScaleFallback(span, available);
  return best;
}

export function fitPromoTextToContainer(
  container: HTMLElement,
  span: HTMLElement,
  text: string
): number {
  const available = getAvailableWidth(container);
  if (available <= 0) return 0;

  if (span.textContent !== text) {
    span.textContent = text;
  }

  const best = shouldUseCanvasPromoFit()
    ? fitPromoTextCanvas(span, text, available)
    : fitPromoTextDefault(span, text, available);

  span.dataset.promoFitted = "true";
  return best;
}

/** 모바일 첫 페인트 — canvas 로 320px 포함 추정 */
export function getPromoInitialFontPx(text: string): number | null {
  if (!isPromoMobileViewport()) return null;
  const padX = window.innerWidth <= 360 ? 8 : 16;
  const available = Math.max(
    0,
    (window.visualViewport?.width ?? window.innerWidth) - padX - 6
  );
  return estimatePromoFontPx(text, available, getPromoMaxFontPx());
}

/** @deprecated use getPromoInitialFontPx */
export function getAndroidPromoInitialFontPx(text: string): number | null {
  return getPromoInitialFontPx(text);
}
