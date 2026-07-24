import React from "react";
import { parseSafeHttpsUrl } from "@/v2/safe-url";

type Props = {
  imagePc?: string;
  imageMobile?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
};

export function V2ResponsiveImage({
  imagePc,
  imageMobile,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover",
}: Props) {
  const pc = parseSafeHttpsUrl(imagePc);
  const mobile = parseSafeHttpsUrl(imageMobile) || pc;
  if (!pc && !mobile) return null;

  return (
    <div className={["overflow-hidden", className].filter(Boolean).join(" ")}>
      <picture>
        {mobile && pc && mobile !== pc ? (
          <source media="(max-width: 767px)" srcSet={mobile} />
        ) : null}
        <img
          src={pc || mobile || ""}
          alt={alt}
          className={imgClassName}
          loading="lazy"
        />
      </picture>
    </div>
  );
}
