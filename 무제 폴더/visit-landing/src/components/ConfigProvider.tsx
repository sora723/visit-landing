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
import { pickCtaText } from "@/lib/utils";
import { DEFAULT_UNIT_TYPE_OPTIONS } from "@/lib/reservation-form-options";
import { mergeSiteTheme } from "@/lib/site-theme";
import { SiteThemeProvider } from "@/components/SiteThemeProvider";

interface ConfigContextValue {
  config: SiteConfig;
  ctaText: string;
  submitting: boolean;
  submit: (
    input: ReservationSubmitInput,
    options?: { redirect?: boolean }
  ) => Promise<{ success: boolean; message?: string }>;
}

const ConfigContext = createContext<ConfigContextValue | null>(null);

function mergeLiveConfig(base: SiteConfig, live: Partial<SiteConfig>): SiteConfig {
  const unitTypeOptions =
    live.reservationForm?.unitTypeOptions?.length
      ? live.reservationForm.unitTypeOptions
      : base.reservationForm?.unitTypeOptions?.length
        ? base.reservationForm.unitTypeOptions
        : DEFAULT_UNIT_TYPE_OPTIONS;

  return {
    ...base,
    stickyPromoText: live.stickyPromoText ?? base.stickyPromoText,
    theme: mergeSiteTheme(live.theme ?? base.theme),
    reservationForm: {
      unitTypeOptions,
      visitDateDays:
        live.reservationForm?.visitDateDays ??
        base.reservationForm?.visitDateDays ??
        30,
      visitDateOptions:
        live.reservationForm?.visitDateOptions ??
        base.reservationForm?.visitDateOptions,
      unitTypeEnabled:
        live.reservationForm?.unitTypeEnabled ??
        base.reservationForm?.unitTypeEnabled ??
        true,
      visitDateEnabled:
        live.reservationForm?.visitDateEnabled ??
        base.reservationForm?.visitDateEnabled ??
        true,
    },
  };
}

export function ConfigProvider({
  config: baseConfig,
  children,
}: {
  config: SiteConfig;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [livePatch, setLivePatch] = useState<Partial<SiteConfig>>({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site-content", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (cancelled || !json.success || !json.data) return;
        const d = json.data;
        setLivePatch({
          stickyPromoText: d.stickyPromoText ?? undefined,
          theme: mergeSiteTheme({
            mainColor: d.mainColor,
            subColor: d.subColor,
            accentColor: d.accentColor,
          }),
          reservationForm: {
            unitTypeOptions: Array.isArray(d.unitTypeOptions)
              ? d.unitTypeOptions
              : undefined,
            visitDateDays:
              typeof d.visitDateDays === "number" ? d.visitDateDays : undefined,
            visitDateOptions: Array.isArray(d.visitDateOptions)
              ? d.visitDateOptions
              : undefined,
            unitTypeEnabled:
              typeof d.unitTypeEnabled === "boolean" ? d.unitTypeEnabled : undefined,
            visitDateEnabled:
              typeof d.visitDateEnabled === "boolean" ? d.visitDateEnabled : undefined,
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const config = useMemo(
    () => mergeLiveConfig(baseConfig, livePatch),
    [baseConfig, livePatch]
  );

  const ctaText = useMemo(
    () => pickCtaText(config.cta.texts),
    [config.cta.texts]
  );

  const submit = useCallback(
    async (input: ReservationSubmitInput, options?: { redirect?: boolean }) => {
      setSubmitting(true);
      try {
        await submitReservation({
          name: input.name.trim(),
          phone: input.phone.replace(/\D/g, ""),
          privacyAgreed: true,
          unitType: input.unitType,
          visitDate: input.visitDate,
          source: input.source,
          ...getTrackingContext(),
        });

        notifyReservationSubmitted(input.name.trim(), {
          unitType: input.unitType,
          visitDate: input.visitDate,
        });

        if (options?.redirect !== false) {
          router.push("/complete");
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
    [router]
  );

  return (
    <ConfigContext.Provider value={{ config, ctaText, submitting, submit }}>
      <SiteThemeProvider theme={config.theme ?? mergeSiteTheme()} />
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within ConfigProvider");
  return ctx;
}
