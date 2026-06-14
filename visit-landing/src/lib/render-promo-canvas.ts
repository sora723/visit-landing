import {
  estimatePromoFontPx,
  getPromoMaxFontPx,
  isPromoMobileViewport,
  measurePromoCanvasWidth,
} from "@/lib/fit-promo-text";

const PROMO_FONT_FAMILY = '"Paperlogy", "Pretendard", sans-serif';
const SHIMMER_MS = 2400;

type PromoCanvasLayout = {
  containerWidth: number;
  cssHeight: number;
  fontSize: number;
  strokePx: number;
  dpr: number;
};

let fontsReady: Promise<void> | null = null;

function ensurePromoFont(): Promise<void> {
  if (!fontsReady) {
    fontsReady = Promise.all([
      document.fonts.load(`900 12px Paperlogy`),
      document.fonts.load(`900 12px Pretendard`),
    ])
      .then(() => document.fonts.ready)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}

function fitPromoCanvasFontSize(text: string, available: number): number {
  const maxPx = getPromoMaxFontPx();
  const minPx = 5;
  let best = estimatePromoFontPx(text, available, maxPx);

  while (best > minPx && measurePromoCanvasWidth(text, best) > available) {
    best -= 0.25;
  }

  return best;
}

function computeLayout(
  text: string,
  containerWidth: number
): PromoCanvasLayout | null {
  if (containerWidth <= 0 || !text) return null;

  const padX = 6;
  const available = Math.max(0, containerWidth - padX);
  const fontSize = fitPromoCanvasFontSize(text, available);
  const strokePx = Math.min(1.75, fontSize * 0.13);
  const cssHeight = Math.ceil(fontSize * 1.2 + strokePx * 2 + 2);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);

  return {
    containerWidth,
    cssHeight,
    fontSize,
    strokePx,
    dpr,
  };
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  layout: PromoCanvasLayout
): CanvasRenderingContext2D | null {
  canvas.width = Math.ceil(layout.containerWidth * layout.dpr);
  canvas.height = Math.ceil(layout.cssHeight * layout.dpr);
  canvas.style.width = `${layout.containerWidth}px`;
  canvas.style.height = `${layout.cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  return ctx;
}

/** CSS promo-shimmer-text 와 동일한 좌→우 하이라이트 */
function createShimmerGradient(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  fontSize: number,
  phase: number
): CanvasGradient {
  ctx.font = `900 ${fontSize}px ${PROMO_FONT_FAMILY}`;
  const textWidth = ctx.measureText(text).width;
  const bandWidth = textWidth * 2.2;
  const slide = (phase * 240 - 120) / 100;
  const startX = centerX - bandWidth * 0.5 + slide * textWidth;
  const endX = startX + bandWidth;

  const grad = ctx.createLinearGradient(startX, 0, endX, 0);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(0.36, "#ffffff");
  grad.addColorStop(0.48, "#00e5ff");
  grad.addColorStop(0.6, "#ffffff");
  grad.addColorStop(1, "#ffffff");
  return grad;
}

function drawPromoFrame(
  ctx: CanvasRenderingContext2D,
  text: string,
  layout: PromoCanvasLayout,
  phase: number
): void {
  const { containerWidth, cssHeight, fontSize, strokePx } = layout;
  const x = containerWidth / 2;
  const y = fontSize * 0.92;

  ctx.clearRect(0, 0, containerWidth, cssHeight);
  ctx.font = `900 ${fontSize}px ${PROMO_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = strokePx * 2;
  ctx.strokeText(text, x, y);

  ctx.fillStyle = createShimmerGradient(ctx, text, x, fontSize, phase);
  ctx.fillText(text, x, y);
}

/** 모바일 canvas 쉬머 루프 — 한 줄 유지, DOM 텍스트 미사용 */
export function startPromoCanvasAnimation(
  canvas: HTMLCanvasElement,
  text: string,
  containerWidth: number
): () => void {
  let rafId = 0;
  let layout = computeLayout(text, containerWidth);
  let ctx = layout ? resizeCanvas(canvas, layout) : null;
  let running = true;

  const tick = (now: number) => {
    if (!running || !layout || !ctx) return;
    const phase = (now % SHIMMER_MS) / SHIMMER_MS;
    drawPromoFrame(ctx, text, layout, phase);
    rafId = requestAnimationFrame(tick);
  };

  void ensurePromoFont().then(() => {
    if (!running) return;
    layout = computeLayout(text, containerWidth);
    ctx = layout ? resizeCanvas(canvas, layout) : null;
    if (ctx && layout) {
      drawPromoFrame(ctx, text, layout, 0);
      rafId = requestAnimationFrame(tick);
    }
  });

  return () => {
    running = false;
    cancelAnimationFrame(rafId);
  };
}

export function shouldRenderPromoAsCanvas(
  serverMobile: boolean | undefined
): boolean {
  if (typeof window === "undefined") return serverMobile ?? false;
  return isPromoMobileViewport() || serverMobile === true;
}
