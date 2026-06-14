import {
  estimatePromoFontPx,
  getPromoMaxFontPx,
  isPromoMobileViewport,
  measurePromoCanvasWidth,
} from "@/lib/fit-promo-text";

const PROMO_FONT_FAMILY = '"Paperlogy", "Pretendard", sans-serif';

export type PromoCanvasImage = {
  src: string;
  width: number;
  height: number;
};

async function ensurePromoFont(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load(`900 12px Paperlogy`),
      document.fonts.load(`900 12px Pretendard`),
    ]);
    await document.fonts.ready;
  } catch {
    /* 시스템 폰트 fallback */
  }
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

function drawPromoLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  strokePx: number
): void {
  ctx.font = `900 ${fontSize}px ${PROMO_FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = strokePx * 2;
  ctx.strokeText(text, x, y);

  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x, y);
}

/** offscreen canvas 에 한 줄 그린 뒤 PNG data URL 반환 */
export async function renderPromoCanvasToImage(
  text: string,
  containerWidth: number
): Promise<PromoCanvasImage | null> {
  if (containerWidth <= 0 || !text) return null;

  await ensurePromoFont();

  const padX = 6;
  const available = Math.max(0, containerWidth - padX);
  const fontSize = fitPromoCanvasFontSize(text, available);
  const strokePx = Math.min(1.75, fontSize * 0.13);
  const cssHeight = Math.ceil(fontSize * 1.2 + strokePx * 2 + 2);

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.ceil(containerWidth * dpr);
  canvas.height = Math.ceil(cssHeight * dpr);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, containerWidth, cssHeight);

  drawPromoLine(ctx, text, containerWidth / 2, fontSize * 0.92, fontSize, strokePx);

  return {
    src: canvas.toDataURL("image/png"),
    width: containerWidth,
    height: cssHeight,
  };
}

/** @deprecated use renderPromoCanvasToImage */
export async function renderPromoCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  containerWidth: number
): Promise<number> {
  const img = await renderPromoCanvasToImage(text, containerWidth);
  if (!img) return 0;

  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.ceil(containerWidth * dpr);
  canvas.height = Math.ceil(img.height * dpr);
  canvas.style.width = `${containerWidth}px`;
  canvas.style.height = `${img.height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("promo canvas image load failed"));
    image.src = img.src;
  });

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, containerWidth, img.height);
  ctx.drawImage(image, 0, 0, containerWidth, img.height);

  return img.height;
}

export function shouldRenderPromoAsImage(
  serverMobile: boolean | undefined
): boolean {
  if (typeof window === "undefined") return serverMobile ?? false;
  return isPromoMobileViewport() || serverMobile === true;
}
