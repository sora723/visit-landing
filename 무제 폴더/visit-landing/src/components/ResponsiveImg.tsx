"use client";

import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import type { ResponsiveImageFields } from "@/lib/responsive-image";

export function ResponsiveImg({
  source,
  alt,
  className,
}: {
  source: ResponsiveImageFields;
  alt: string;
  className?: string;
}) {
  const src = useResponsiveImage(source);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} />
  );
}
