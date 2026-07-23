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
import { hasAnyConversionTracking } from "@/lib/conversion-tracking";
import { prefersCompletePageConversion } from "@/lib/conversion-once";
import { runConversionAfterSubmit } from "@/lib/run-conversion-tracking";
import type { ReservationSubmitInput, SiteConfig } from "@/lib/types";
import {
  getTrackingContext,
  notifyReservationSubmitted,
  submitReservation,
} from "@/lib/api";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { normalizeMobilePhone } from "@/lib/phone";
import { buildSitePageTitle } from "@/lib/site-page-title";
import { pickCtaText } from "@/lib/utils";
import { mergeSiteTheme } from "@/lib/site-theme";
import { SiteThemeProvider } from "@/components/SiteThemeProvider";
import { CallClickTracking } from "@/components/CallClickTracking";

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
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState(initialConfig);
  const [contentSource, setContentSource] = useState(initialSource);

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

  const submit = useCallback(
    async (input: ReservationSubmitInput, options?: { redirect?: boolean }) => {
      setSubmitting(true);
      try {
        const result = await submitReservation(
          {
            name: input.name.trim(),
            phone: normalizeMobilePhone(input.phone),
            privacyAgreed: true,
            unitType: input.unitType,
            visitDate: input.visitDate,
            source: input.source,
            company: input.company,
            formToken: input.formToken,
            pageLoadedAt: input.pageLoadedAt,
            napm: input.napm,
            utmContent: input.utmContent,
            landingUrl: input.landingUrl,
            inputFocusCount: input.inputFocusCount,
            inputChangeCount: input.inputChangeCount,
            clickCount: input.clickCount,
            scrollDepth: input.scrollDepth,
            firstInputAt: input.firstInputAt,
            lastInputAt: input.lastInputAt,
            userAgent: input.userAgent,
            screenWidth: input.screenWidth,
            screenHeight: input.screenHeight,
            timezone: input.timezone,
            language: input.language,
            ...getTrackingContext(),
          },
          siteCode
        );

        const allowConversion = result.allowConversion !== false;
        notifyReservationSubmitted(input.name.trim(), {
          unitType: input.unitType,
          visitDate: input.visitDate,
          isDuplicate: result.isDuplicate,
          includeInLiveFeed: result.includeInLiveFeed !== false,
        });

        if (result.submissionId) {
          const conversionOnComplete =
            allowConversion &&
            hasAnyConversionTracking(conversionTracking) &&
            prefersCompletePageConversion(conversionTracking);

          if (allowConversion) {
            runConversionAfterSubmit({
              siteCode,
              submissionId: result.submissionId,
              tracking: conversionTracking,
              navigate: (url) => router.push(url),
              returnPath: pathname || "/",
            });
          }

          if (options?.redirect !== false && !conversionOnComplete) {
            const verified = allowConversion ? "1" : "0";
            const completeUrl =
              appendSiteCodeQuery("/complete", siteCode) +
              `&submissionId=${encodeURIComponent(result.submissionId)}` +
              `&verified=${verified}`;
            router.push(completeUrl);
          }
        }

        return { success: true, isDuplicate: result.isDuplicate === true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "접수에 실패했습니다",
        };
      } finally {
        setSubmitting(false);
      }
    },
    [router, siteCode, conversionTracking, pathname]
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
