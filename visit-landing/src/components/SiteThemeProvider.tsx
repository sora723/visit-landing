"use client";

import { useEffect } from "react";
import type { SiteTheme } from "@/lib/site-theme";
import { applySiteThemeToDocument } from "@/lib/site-theme";

/** Sheet·site.json 테마 → :root CSS 변수 */
export function SiteThemeProvider({ theme }: { theme: SiteTheme }) {
  useEffect(() => {
    applySiteThemeToDocument(theme);
  }, [theme]);

  return null;
}
