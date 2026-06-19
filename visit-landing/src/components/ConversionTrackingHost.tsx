"use client";

import { useEffect, useState } from "react";
import { ConversionTracking } from "@/components/ConversionTracking";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";

type Pending = {
  submissionId: string;
  tracking: ConversionTrackingConfig;
};

/** 랜딩 — 접수 성공 후 inline 전환 (1 submissionId = 1 fire) */
export function ConversionTrackingHost() {
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    const onConversion = (event: Event) => {
      const detail = (event as CustomEvent<Pending>).detail;
      if (!detail?.submissionId) return;
      setPending(detail);
    };

    window.addEventListener("reservation-conversion", onConversion);
    return () => window.removeEventListener("reservation-conversion", onConversion);
  }, []);

  if (!pending) return null;

  return (
    <ConversionTracking
      key={pending.submissionId}
      submissionId={pending.submissionId}
      tracking={pending.tracking}
    />
  );
}
