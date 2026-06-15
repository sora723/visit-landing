"use client";

import { useEffect, useState } from "react";
import { useResponsiveImage } from "@/hooks/useResponsiveImage";
import {
  getImageFallbackUrl,
  type ImageSizePreset,
} from "@/lib/image-url";
import type { ResponsiveImageFields } from "@/lib/responsive-image";

export function ResponsiveImg({
  source,
  alt,
  className,
  priority = false,
  sizePreset = "section",
}: {
  source: ResponsiveImageFields;
  alt: string;
  className?: string;
  /** Hero 등 LCP 이미지만 true */
  priority?: boolean;
  sizePreset?: ImageSizePreset;
}) {
  const src = useResponsiveImage(source, sizePreset);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [fallbackStage, setFallbackStage] = useState(0);

  useEffect(() => {
    setCurrentSrc(src);
    setFallbackStage(0);
  }, [src]);

  const handleError = () => {
    if (fallbackStage > 0) return;
    setFallbackStage(1);
    setCurrentSrc(getImageFallbackUrl(src, sizePreset));
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      onError={handleError}
    />
  );
}
