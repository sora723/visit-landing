/**
 * 공용 예약 제출 hook — loading / 성공·실패 / 전환 / 완료 이동.
 * ConfigProvider·ReservationForm UI에 의존하지 않음.
 * 동작은 기존 ConfigProvider.submit과 동일.
 */

"use client";

import { useCallback, useState } from "react";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import { hasAnyConversionTracking } from "@/lib/conversion-tracking";
import { prefersCompletePageConversion } from "@/lib/conversion-once";
import { runConversionAfterSubmit } from "@/lib/run-conversion-tracking";
import { getTrackingContext, notifyReservationSubmitted } from "@/lib/api";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import { buildReservationPayload } from "@/features/reservation/build-reservation-payload";
import { submitReservationLead } from "@/features/reservation/submit-reservation-lead";
import type {
  ReservationSubmitInput,
  ReservationSubmitOptions,
  ReservationSubmitOutcome,
} from "@/features/reservation/types";

export type UseReservationSubmitParams = {
  siteCode: string;
  conversionTracking: ConversionTrackingConfig;
  navigate: (url: string) => void;
  returnPath: string;
};

export function useReservationSubmit({
  siteCode,
  conversionTracking,
  navigate,
  returnPath,
}: UseReservationSubmitParams) {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(
    async (
      input: ReservationSubmitInput,
      options?: ReservationSubmitOptions
    ): Promise<ReservationSubmitOutcome> => {
      setSubmitting(true);
      try {
        const payload = buildReservationPayload(input, getTrackingContext());
        const result = await submitReservationLead(payload, siteCode);

        const allowConversion = result.allowConversion === true;
        notifyReservationSubmitted(input.name.trim(), {
          unitType: input.unitType,
          visitDate: input.visitDate,
          isDuplicate: result.isDuplicate,
          includeInLiveFeed: result.includeInLiveFeed === true,
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
              navigate,
              returnPath,
            });
          }

          if (options?.redirect !== false && !conversionOnComplete) {
            const verified = allowConversion ? "1" : "0";
            const completeUrl =
              appendSiteCodeQuery("/complete", siteCode) +
              `&submissionId=${encodeURIComponent(result.submissionId)}` +
              `&verified=${verified}`;
            navigate(completeUrl);
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
    [siteCode, conversionTracking, navigate, returnPath]
  );

  return { submit, submitting };
}
