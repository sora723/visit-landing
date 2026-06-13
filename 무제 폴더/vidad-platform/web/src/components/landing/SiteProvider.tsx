"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteData } from "@/lib/types";
import {
  getTrackingContext,
  getUtmParams,
  submitReservation,
} from "@/lib/api";

interface SiteContextValue {
  site: SiteData;
  submitting: boolean;
  submit: (
    name: string,
    phone: string,
    options?: { redirect?: boolean }
  ) => Promise<{ success: boolean; message?: string }>;
  openReservation: () => void;
  reservationFormOpen: boolean;
  setReservationFormOpen: (open: boolean) => void;
}

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({
  site,
  children,
}: {
  site: SiteData;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [reservationFormOpen, setReservationFormOpen] = useState(false);

  const submit = useCallback(
    async (name: string, phone: string, options?: { redirect?: boolean }) => {
      setSubmitting(true);
      try {
        await submitReservation({
          siteCode: site.siteCode,
          name: name.trim(),
          phone: phone.replace(/\D/g, ""),
          privacyAgreed: true,
          ...getUtmParams(),
          ...getTrackingContext(),
        });
        if (options?.redirect !== false) {
          router.push(`/${site.siteCode}/complete`);
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
    [router, site.siteCode]
  );

  const openReservation = useCallback(() => {
    setReservationFormOpen(true);
    document.getElementById("reservation-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  return (
    <SiteContext.Provider
      value={{
        site,
        submitting,
        submit,
        openReservation,
        reservationFormOpen,
        setReservationFormOpen,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}
