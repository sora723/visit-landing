"use client";

import { useEffect, useState } from "react";
import {
  LIVE_FEED_DESKTOP_BREAKPOINT,
  MOBILE_BREAKPOINT,
  resolveResponsiveImage,
  type ResponsiveImageFields,
} from "@/lib/responsive-image";

export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function useIsDesktopFeed() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      `(min-width: ${LIVE_FEED_DESKTOP_BREAKPOINT}px)`
    );
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function useResponsiveImage(source: ResponsiveImageFields): string {
  const isMobile = useIsMobile();
  return resolveResponsiveImage(source, isMobile);
}
