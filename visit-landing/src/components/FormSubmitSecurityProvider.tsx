"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";

const AD_STORAGE_PREFIX = "vl_ad_";

type BehaviorStats = {
  inputFocusCount: number;
  inputChangeCount: number;
  clickCount: number;
  scrollDepth: number;
  firstInputAt: number | null;
  lastInputAt: number | null;
};

type AdContext = {
  napm?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  referrer?: string;
  landingUrl?: string;
};

type FormSubmitSecurityContextValue = {
  formToken: string;
  pageLoadedAt: number;
  buildSubmitExtras: () => Record<string, string | number | null | undefined>;
  registerFormRoot: (el: HTMLElement | null) => void;
};

const FormSubmitSecurityContext =
  createContext<FormSubmitSecurityContextValue | null>(null);

function readAdContext(): AdContext {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string, storageKey: string) => {
    const fromUrl = params.get(key);
    if (fromUrl) {
      sessionStorage.setItem(storageKey, fromUrl);
      return fromUrl;
    }
    return sessionStorage.getItem(storageKey) ?? undefined;
  };

  return {
    napm: pick("NaPm", `${AD_STORAGE_PREFIX}napm`) ?? pick("napm", `${AD_STORAGE_PREFIX}napm`),
    utmSource: pick("utm_source", `${AD_STORAGE_PREFIX}utm_source`),
    utmMedium: pick("utm_medium", `${AD_STORAGE_PREFIX}utm_medium`),
    utmCampaign: pick("utm_campaign", `${AD_STORAGE_PREFIX}utm_campaign`),
    utmContent: pick("utm_content", `${AD_STORAGE_PREFIX}utm_content`),
    referrer: document.referrer || undefined,
    landingUrl: window.location.href,
  };
}

export function FormSubmitSecurityProvider({
  siteCode,
  children,
}: {
  siteCode: string;
  children: ReactNode;
}) {
  const pageLoadedAt = useRef(Date.now());
  const [formToken, setFormToken] = useState("");
  const adContext = useRef<AdContext>(readAdContext());
  const statsRef = useRef<BehaviorStats>({
    inputFocusCount: 0,
    inputChangeCount: 0,
    clickCount: 0,
    scrollDepth: 0,
    firstInputAt: null,
    lastInputAt: null,
  });
  const formRootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    adContext.current = readAdContext();
    let cancelled = false;
    fetch(appendSiteCodeQuery("/api/form-token", siteCode), { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && json.data?.formToken) {
          setFormToken(String(json.data.formToken));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteCode]);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max <= 0) {
        statsRef.current.scrollDepth = 100;
        return;
      }
      const depth = Math.round((window.scrollY / max) * 100);
      statsRef.current.scrollDepth = Math.max(statsRef.current.scrollDepth, depth);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const registerFormRoot = useCallback((el: HTMLElement | null) => {
    formRootRef.current = el;
  }, []);

  useEffect(() => {
    const root = formRootRef.current;
    if (!root) return;

    const markInput = () => {
      const now = Date.now();
      if (statsRef.current.firstInputAt == null) {
        statsRef.current.firstInputAt = now;
      }
      statsRef.current.lastInputAt = now;
    };

    const onFocus = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        return;
      }
      statsRef.current.inputFocusCount += 1;
    };

    const onChange = (e: Event) => {
      if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        return;
      }
      if ((e.target as HTMLInputElement).name === "company") return;
      statsRef.current.inputChangeCount += 1;
      markInput();
    };

    const onClick = () => {
      statsRef.current.clickCount += 1;
    };

    root.addEventListener("focusin", onFocus);
    root.addEventListener("change", onChange);
    root.addEventListener("input", onChange);
    root.addEventListener("click", onClick);
    return () => {
      root.removeEventListener("focusin", onFocus);
      root.removeEventListener("change", onChange);
      root.removeEventListener("input", onChange);
      root.removeEventListener("click", onClick);
    };
  }, []);

  const buildSubmitExtras = useCallback(() => {
    const stats = statsRef.current;
    const ad = adContext.current;
    return {
      formToken,
      pageLoadedAt: pageLoadedAt.current,
      napm: ad.napm,
      utmSource: ad.utmSource,
      utmMedium: ad.utmMedium,
      utmCampaign: ad.utmCampaign,
      utmContent: ad.utmContent,
      landingUrl: ad.landingUrl,
      referer: ad.referrer,
      inputFocusCount: stats.inputFocusCount,
      inputChangeCount: stats.inputChangeCount,
      clickCount: stats.clickCount,
      scrollDepth: stats.scrollDepth,
      firstInputAt: stats.firstInputAt,
      lastInputAt: stats.lastInputAt,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      screenWidth: typeof window !== "undefined" ? window.screen.width : undefined,
      screenHeight: typeof window !== "undefined" ? window.screen.height : undefined,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: typeof navigator !== "undefined" ? navigator.language : undefined,
    };
  }, [formToken]);

  const value = useMemo(
    () => ({
      formToken,
      pageLoadedAt: pageLoadedAt.current,
      buildSubmitExtras,
      registerFormRoot,
    }),
    [formToken, buildSubmitExtras, registerFormRoot]
  );

  return (
    <FormSubmitSecurityContext.Provider value={value}>
      {children}
    </FormSubmitSecurityContext.Provider>
  );
}

export function useFormSubmitSecurity() {
  return useContext(FormSubmitSecurityContext);
}
