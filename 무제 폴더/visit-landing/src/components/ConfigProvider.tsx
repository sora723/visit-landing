"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { ReservationSubmitInput, SiteConfig } from "@/lib/types";
import {
  getTrackingContext,
  notifyReservationSubmitted,
  submitReservation,
} from "@/lib/api";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { pickCtaText } from "@/lib/utils";
import { mergeSiteTheme } from "@/lib/site-theme";
import { SiteThemeProvider } from "@/components/SiteThemeProvider";

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
  ) => Promise<{ success: boolean; message?: string }>;
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
  children,
}: {
  config: SiteConfig;
  contentSource: ContentSource;
  siteCode: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState(initialConfig);
  const [contentSource, setContentSource] = useState(initialSource);

  useEffect(() => {
    let cancelled = false;
    fetch(appendSiteCodeQuery("/api/site-content", siteCode), {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success || !json.data) return;
        const liveConfig = parseLiveSiteConfig(json.data as Record<string, unknown>);
        if (!liveConfig) return;
        setConfig(liveConfig);
        setContentSource("sheet");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteCode]);

  const ctaText = useMemo(
    () => pickCtaText(config.cta.texts),
    [config.cta.texts]
  );

  const submit = useCallback(
    async (input: ReservationSubmitInput, options?: { redirect?: boolean }) => {
      setSubmitting(true);
      try {
        await submitReservation(
          {
            name: input.name.trim(),
            phone: input.phone.replace(/\D/g, ""),
            privacyAgreed: true,
            unitType: input.unitType,
            visitDate: input.visitDate,
            source: input.source,
            ...getTrackingContext(),
          },
          siteCode
        );

        notifyReservationSubmitted(input.name.trim(), {
          unitType: input.unitType,
          visitDate: input.visitDate,
        });

        if (options?.redirect !== false) {
          router.push(appendSiteCodeQuery("/complete", siteCode));
        }
        return { success: true };
      } catch (err) {
        return {
          success: false,
          message: err instanceof Error ? err.message : "접수에 실패했습니다",
        };
      } finally {
        setSubmitting(false);
      }
    },
    [router, siteCode]
  );

  return (
    <ConfigContext.Provider
      value={{ config, siteCode, contentSource, ctaText, submitting, submit }}
    >
      <SiteThemeProvider theme={mergeSiteTheme(config.theme)} />
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
