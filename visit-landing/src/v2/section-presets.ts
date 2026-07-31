/**
 * V2 섹션 preset allowlist — Sheet 값을 className/style에 그대로 넣지 않음.
 */

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function parseSafeHexColor(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!HEX.test(s)) return null;
  return s;
}

const PADDING: Record<string, string> = {
  none: "py-0",
  sm: "py-8 md:py-10",
  md: "py-12 md:py-16",
  lg: "py-16 md:py-24",
  xl: "py-20 md:py-28",
};

const THEME: Record<string, string> = {
  default: "bg-transparent text-[#1a1a1a]",
  light: "bg-[#f7f6f4] text-[#1a1a1a]",
  dark: "bg-[#0f1a2e] text-white",
  muted: "bg-[#ebe8e2] text-[#1a1a1a]",
};

const ANIMATION: Record<string, string> = {
  none: "",
  fade: "motion-safe:opacity-100 motion-reduce:transition-none",
};

export function mapPaddingPresetClass(preset: unknown): string {
  const key = String(preset ?? "")
    .trim()
    .toLowerCase();
  return PADDING[key] ?? PADDING.md;
}

export function mapThemeVariantClass(variant: unknown): string {
  const key = String(variant ?? "")
    .trim()
    .toLowerCase();
  return THEME[key] ?? THEME.default;
}

export function mapAnimationPresetClass(preset: unknown): string {
  const key = String(preset ?? "")
    .trim()
    .toLowerCase();
  return ANIMATION[key] ?? ANIMATION.none;
}

/** desktop/mobile visibility — 고정 Tailwind만 */
export function mapVisibilityClass(
  desktopVisible: boolean,
  mobileVisible: boolean
): string | null {
  if (!desktopVisible && !mobileVisible) return null;
  if (desktopVisible && mobileVisible) return "";
  if (desktopVisible && !mobileVisible) return "hidden md:block";
  return "md:hidden";
}
