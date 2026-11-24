"use client";

import { useConfig } from "./ConfigProvider";
import { IconX } from "./icons";
import {
  resolvePrivacyDisplayValue,
} from "@/lib/site-privacy";

const REFUSAL_NOTICE =
  "동의하지 않아도 관심등록 및 상담신청이 가능합니다.";

/**
 * 선택 마케팅 동의 내용보기 (enableMarketingConsent=true 현장만).
 * - 광고주 현장별 마케팅용. 비드애드 고객 광고 발송 아님.
 * - 솔라피 담당자 접수 알림과 구분.
 * - 내부 필드명은 UI에 노출하지 않음.
 */
export function MarketingConsentModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config } = useConfig();
  if (!open) return null;

  const siteCode = config.siteCode;
  const p = config.privacy;
  const controller = resolvePrivacyDisplayValue(
    p?.marketingControllerName,
    "marketingControllerName",
    siteCode
  );
  const purpose = resolvePrivacyDisplayValue(
    p?.marketingPurpose,
    "marketingPurpose",
    siteCode
  );
  const items = resolvePrivacyDisplayValue(
    p?.marketingItems,
    "marketingItems",
    siteCode
  );
  const channels = resolvePrivacyDisplayValue(
    p?.marketingChannels,
    "marketingChannels",
    siteCode
  );
  const retention = resolvePrivacyDisplayValue(
    p?.marketingRetentionPeriod,
    "marketingRetentionPeriod",
    siteCode
  );
  const contact = resolvePrivacyDisplayValue(
    p?.marketingContact,
    "marketingContact",
    siteCode
  );

  const rows: { label: string; value: string }[] = [
    { label: "광고 발송 주체", value: controller },
    { label: "이용 목적", value: purpose },
    { label: "이용 항목", value: items },
    { label: "수신 방법", value: channels },
    { label: "보유·이용 기간", value: retention },
    { label: "수신 거부·철회", value: contact },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[1000] bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="marketing-consent-title"
        className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[80vh] w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-navy)]/8 px-6 py-5">
          <div>
            <p className="mb-1 text-[10px] tracking-[0.25em] text-[var(--color-gold)]">
              MARKETING
            </p>
            <h3
              id="marketing-consent-title"
              className="text-[17px] font-extrabold text-[var(--color-navy)]"
            >
              추가 광고·마케팅 정보 수신 동의 (선택)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#7a7060]"
            aria-label="닫기"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.label}
                className="flex gap-3 rounded-lg border border-[var(--color-navy)]/8 px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-[var(--color-navy)]">
                    {row.label}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#5a5a5a]">
                    {row.value}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 rounded-lg bg-[var(--color-bg)] p-4 text-[13px] leading-relaxed text-[#5a5a5a]">
            {REFUSAL_NOTICE}
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--color-navy)]/8 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--color-navy)] py-3.5 text-sm font-bold text-white"
          >
            확인
          </button>
        </div>
      </div>
    </>
  );
}
