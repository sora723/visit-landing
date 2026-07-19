"use client";

import { useConfig } from "./ConfigProvider";
import { IconX } from "./icons";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";

export function PrivacyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { config } = useConfig();
  if (!open) return null;

  const managerName =
    config.managerName?.trim() ||
    `${config.siteName} 분양사무소`;

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
        aria-labelledby="privacy-modal-title"
        className="fixed left-1/2 top-1/2 z-[1001] flex max-h-[80vh] w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-navy)]/8 px-6 py-5">
          <div>
            <p className="mb-1 text-[10px] tracking-[0.25em] text-[var(--color-gold)]">
              PRIVACY POLICY
            </p>
            <h3
              id="privacy-modal-title"
              className="text-[17px] font-extrabold text-[var(--color-navy)]"
            >
              개인정보 수집 및 이용 동의
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
          <PrivacyPolicyContent managerName={managerName} phone={config.phone} />
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
