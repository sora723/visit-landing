"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { ReservationSubmitInput, SiteConfig } from "@/lib/types";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { buildSitePageTitle } from "@/lib/site-page-title";
import { pickCtaText } from "@/lib/utils";
import { mergeSiteTheme } from "@/lib/site-theme";
import { SiteThemeProvider } from "@/components/SiteThemeProvider";
import { CallClickTracking } from "@/components/CallClickTracking";
import { useReservationSubmit } from "@/features/reservation/useReservationSubmit";

const POLL_MS = 15_000;

export type ContentSource = "sheet" | "unavailable";

interface ConfigContextValue {
  config: SiteConfig;
  siteCode: string;
  contentSource: ContentSource;
  ctaText: string;
  submitting: boolean;
  submit: (
    input: ReservationSubmitInput,
    options?: { redirect?: boolean }
  ) => Promise<{ success: boolean; message?: string; isDuplicate?: boolean }>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

function parseLiveSiteConfig(data: Record<string, unknown>): SiteConfig | null {
  if (data.source !== "sheet") return null;
  const rest = { ...data };
  delete rest.source;
  delete rest.updatedAt;
  delete rest._apiVersion;
  return rest as unknown as SiteConfig;
}

export function ConfigProvider({
  config: initialConfig,
  contentSource: initialSource,
  siteCode,
  conversionTracking,
  children,
}: {
  config: SiteConfig;
  contentSource: ContentSource;
  siteCode: string;
  conversionTracking: ConversionTrackingConfig;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState(initialConfig);
  const [contentSource, setContentSource] = useState(initialSource);

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
    },
    [router]
  );

  const { submit, submitting } = useReservationSubmit({
    siteCode,
    conversionTracking,
    navigate,
    returnPath: pathname || "/",
  });

  useEffect(() => {
    setConfig(initialConfig);
    setContentSource(initialSource);
  }, [initialConfig, initialSource, siteCode]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch(appendSiteCodeQuery("/api/site-content", siteCode), {
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((json) => {
          if (cancelled || !json.success || !json.data) return;
          const returnedSiteCode = String(
            (json.data as { siteCode?: string; _requestedSiteCode?: string })
              .siteCode ??
              (json.data as { _requestedSiteCode?: string })._requestedSiteCode ??
              ""
          ).trim();
          if (returnedSiteCode && returnedSiteCode !== siteCode) return;
          const liveConfig = parseLiveSiteConfig(
            json.data as Record<string, unknown>
          );
          if (!liveConfig || liveConfig.siteCode !== siteCode) return;
          setConfig(liveConfig);
          setContentSource("sheet");
        })
        .catch(() => {});
    };

    if (initialSource !== "sheet") {
      refresh();
    }

    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [siteCode, initialSource]);

  useEffect(() => {
    document.title = buildSitePageTitle(config.siteName, config.seo.title);
  }, [config.siteName, config.seo.title]);

  const ctaText = useMemo(
    () => pickCtaText(config.cta.texts),
    [config.cta.texts]
  );

  return (
    <ConfigContext.Provider
      value={{ config, siteCode, contentSource, ctaText, submitting, submit }}
    >
      <SiteThemeProvider theme={mergeSiteTheme(config.theme)} />
      <CallClickTracking siteCode={siteCode} tracking={conversionTracking} />
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
