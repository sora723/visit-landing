"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import { hasAnyConversionTracking } from "@/lib/conversion-tracking";
import {
  prefersCompletePageConversion,
  shouldFireClientConversion,
} from "@/lib/conversion-once";
import { runConversionAfterSubmit } from "@/lib/run-conversion-tracking";
import type { ReservationSubmitInput, SiteConfig } from "@/lib/types";
import {
  getTrackingContext,
  notifyReservationSubmitted,
  SubmitBusyError,
} from "@/lib/api";
import {
  BUSY_WAIT_TIMEOUT_MESSAGE,
  submitReservationWithBusyWait,
} from "@/lib/submit-busy-wait";
import { appendSiteCodeQuery, siteContentApiPath } from "@/lib/resolve-site-code";
import { normalizeMobilePhone } from "@/lib/phone";
import { buildSitePageTitle } from "@/lib/site-page-title";
import { pickCtaText } from "@/lib/utils";
import { mergeSiteTheme } from "@/lib/site-theme";
import { SiteThemeProvider } from "@/components/SiteThemeProvider";
import { CallClickTracking } from "@/components/CallClickTracking";

/** GAS 동시 실행 완화 — 15s → 60s */
/** Master 시트 동시호출 완화 — 60s→90s */
const POLL_MS = 90_000;

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
  ) => Promise<{
    success: boolean;
    message?: string;
    isDuplicate?: boolean;
    /** /complete 로 이동해 완료메시지+lead 동시 노출 (랜딩 완료 UI 스킵) */
    navigatedToComplete?: boolean;
  }>;
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
  /** React state보다 먼저 잠금 — 연타로 UUID·카톡 N건 방지 */
  const submittingLockRef = useRef(false);
  const [config, setConfig] = useState(initialConfig);
  const [contentSource, setContentSource] = useState(initialSource);

  useEffect(() => {
    setConfig(initialConfig);
    setContentSource(initialSource);
  }, [initialConfig, initialSource, siteCode]);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      fetch(siteContentApiPath(siteCode))
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

    // SSR 예산 초과로 파일 폴백된 경우 즉시, 시트 SSR이어도 짧게 한 번 더 맞춤
    const bootDelay = initialSource !== "sheet" ? 0 : 400;
    const boot = window.setTimeout(refresh, bootDelay);
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(boot);
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
      if (submittingLockRef.current) {
        return { success: false, message: "이미 접수 처리 중입니다" };
      }
      submittingLockRef.current = true;
      setSubmitting(true);
      try {
        const basePayload = {
          name: input.name.trim(),
          phone: normalizeMobilePhone(input.phone),
          privacyAgreed: true as const,
          unitType: input.unitType,
          visitDate: input.visitDate,
          visitTime: input.visitTime,
          birthDate: input.birthDate,
          region: input.region,
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
          ...(input.utmSource ? { utmSource: input.utmSource } : {}),
          ...(input.utmMedium ? { utmMedium: input.utmMedium } : {}),
          ...(input.utmCampaign ? { utmCampaign: input.utmCampaign } : {}),
          ...(input.utmContent ? { utmContent: input.utmContent } : {}),
          ...(input.landingUrl ? { landingUrl: input.landingUrl } : {}),
          ...(input.referer ? { referer: input.referer } : {}),
        };

        /** BUSY/일시오류: 실패 UI 없이 「접수 중...」 유지, 동일 submissionId 최대 10초 재시도.
         * 성공 UI·/complete 는 _검증로그(savedToVerificationLog) 성공 시에만. */
        const result = await submitReservationWithBusyWait(
          basePayload,
          siteCode
        );

        const fireClientConversion = shouldFireClientConversion(result);
        notifyReservationSubmitted(input.name.trim(), {
          unitType: input.unitType,
          visitDate: input.visitDate,
          visitTime: input.visitTime,
          isDuplicate: result.isDuplicate,
          includeInLiveFeed: result.includeInLiveFeed === true,
        });

        let navigatedToComplete = false;

        if (result.submissionId) {
          const conversionOnComplete =
            fireClientConversion &&
            hasAnyConversionTracking(conversionTracking) &&
            prefersCompletePageConversion(conversionTracking);

          if (fireClientConversion) {
            runConversionAfterSubmit({
              siteCode,
              submissionId: result.submissionId,
              tracking: conversionTracking,
              navigate: (url) => router.push(url),
              returnPath: pathname || "/",
            });
            if (conversionOnComplete) navigatedToComplete = true;
          }

          if (options?.redirect !== false && !conversionOnComplete) {
            const verified = fireClientConversion ? "1" : "0";
            const completeUrl =
              appendSiteCodeQuery("/complete", siteCode) +
              `&submissionId=${encodeURIComponent(result.submissionId)}` +
              `&verified=${verified}`;
            router.push(completeUrl);
            navigatedToComplete = true;
          }
        }

        return {
          success: true,
          isDuplicate: result.isDuplicate === true,
          navigatedToComplete,
        };
      } catch (err) {
        const message =
          err instanceof SubmitBusyError
            ? BUSY_WAIT_TIMEOUT_MESSAGE
            : err instanceof Error
              ? err.message
              : "접수에 실패했습니다";
        return {
          success: false,
          message,
        };
      } finally {
        submittingLockRef.current = false;
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
