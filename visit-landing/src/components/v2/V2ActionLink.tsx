import React from "react";
import { resolveV2ActionHref } from "@/v2/safe-url";

type Props = {
  actionType?: string;
  actionLabel?: string;
  actionValue?: string;
  className?: string;
};

export function V2ActionLink({
  actionType,
  actionLabel,
  actionValue,
  className = "",
}: Props) {
  const label = String(actionLabel || "").trim();
  if (!label) return null;
  const href = resolveV2ActionHref(actionType, actionValue);
  if (!href) return null;

  const isTel = href.startsWith("tel:");
  return (
    <a
      href={href}
      className={
        className ||
        "inline-flex min-h-11 items-center justify-center rounded-md bg-[#0f1a2e] px-5 text-sm font-semibold text-white touch-manipulation"
      }
      {...(isTel
        ? {}
        : href.startsWith("http")
          ? { rel: "noopener noreferrer", target: "_blank" as const }
          : {})}
    >
      {label}
    </a>
  );
}
