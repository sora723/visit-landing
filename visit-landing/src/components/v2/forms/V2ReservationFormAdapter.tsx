"use client";

/**
 * Security provider + site runtime → 공용 useReservationSubmit 입력 변환.
 * 동의 게이트·필드 조립은 순수 함수로 분리 (검증 스크립트에서 import).
 */

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFormSubmitSecurity } from "@/components/FormSubmitSecurityProvider";
import { useReservationSubmit } from "@/features/reservation/useReservationSubmit";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import type { ReservationSubmitInput } from "@/lib/types";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import {
  V2ReservationForm,
  type V2ReservationFormValues,
} from "@/components/v2/forms/V2ReservationForm";

export const V2_PRIVACY_CONSENT_ERROR =
  "개인정보 수집 및 이용에 동의해주세요.";

type Props = {
  sectionId: string;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
  buttonText: string;
  source?: string;
};

/** 동의 미체크 시 제출 차단 — buildReservationPayload 호출 전 */
export function guardV2PrivacyConsent(
  values: Pick<V2ReservationFormValues, "agreed">
): string | null {
  if (!values.agreed) return V2_PRIVACY_CONSENT_ERROR;
  return null;
}

/** UI 값 + security extras → 공용 ReservationSubmitInput */
export function buildV2ReservationSubmitInput(
  values: V2ReservationFormValues,
  site: V2RuntimeSiteContext,
  extras: Record<string, string | number | null | undefined>,
  source: string
): ReservationSubmitInput {
  const showUnit =
    site.unitTypeEnabled && site.unitTypeOptions.length > 0;
  const showVisit =
    site.visitDateEnabled && site.visitDateOptions.length > 0;

  return {
    name: values.name,
    phone: values.phone,
    unitType: showUnit ? values.unitType || undefined : undefined,
    visitDate: showVisit ? values.visitDate || undefined : undefined,
    source,
    company: values.company,
    ...extras,
  };
}

export function V2ReservationFormAdapter({
  sectionId,
  site,
  conversionTracking,
  buttonText,
  source = "v2_form",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const security = useFormSubmitSecurity();
  const [error, setError] = useState("");

  const navigate = useCallback(
    (url: string) => {
      router.push(url);
    },
    [router]
  );

  const { submit, submitting } = useReservationSubmit({
    siteCode: site.siteCode,
    conversionTracking,
    navigate,
    returnPath: pathname || "/",
  });

  const privacyHref = appendSiteCodeQuery("/privacy", site.siteCode);

  async function handleSubmit(values: V2ReservationFormValues) {
    setError("");
    const consentError = guardV2PrivacyConsent(values);
    if (consentError) {
      setError(consentError);
      return;
    }

    const result = await submit(
      buildV2ReservationSubmitInput(
        values,
        site,
        security?.buildSubmitExtras() ?? {},
        source
      ),
      { redirect: true }
    );

    if (!result.success) {
      setError(result.message ?? "접수에 실패했습니다.");
    }
  }

  return (
    <V2ReservationForm
      sectionId={sectionId}
      site={site}
      privacyHref={privacyHref}
      buttonText={buttonText}
      submitting={submitting}
      error={error}
      onSubmit={handleSubmit}
      formRootRef={(el) => security?.registerFormRoot(el)}
    />
  );
}
