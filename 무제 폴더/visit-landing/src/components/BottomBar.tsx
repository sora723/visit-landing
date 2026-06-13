"use client";

import { useState } from "react";
import { useConfig } from "./ConfigProvider";
import { ReservationForm } from "./ReservationForm";
import { IconCalendar, IconMessageCircle, IconPhone, IconX } from "./icons";

function BottomSheet({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[400] bg-black/55"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-x-0 bottom-0 z-[401] animate-[sheetUp_0.28s_cubic-bezier(0.32,0.72,0,1)_forwards] rounded-t-[20px] bg-white pb-10 shadow-[0_-8px_48px_rgba(0,0,0,0.2)]">
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-sm bg-[#e0dcd4]" />
        </div>

        <div className="flex items-center justify-between border-b border-[var(--color-navy)]/7 px-6 pb-5 pt-3">
          <div>
            <p className="mb-1 text-[11px] tracking-[0.25em] text-[var(--color-gold)]">
              HANYANG LIPS · WONJU
            </p>
            <p className="text-lg font-semibold text-[var(--color-navy)]">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-[#7a7060]" aria-label="닫기">
            <IconX className="h-[22px] w-[22px]" />
          </button>
        </div>

        <div className="px-6 pt-6">
          {submitted ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[var(--color-gold)]/15">
                <span className="text-2xl">✓</span>
              </div>
              <p className="mb-2 text-base font-semibold text-[var(--color-navy)]">접수 완료</p>
              <p className="text-[13px] leading-relaxed text-[#7a7060]">
                담당자가 빠른 시간 내 연락드리겠습니다.
              </p>
            </div>
          ) : (
            <>
              <ReservationForm
                buttonText="신청하기"
                redirect={false}
                variant="sheet"
                source="bottom_bar"
                onSuccess={() => {
                  setSubmitted(true);
                  setTimeout(() => {
                    setSubmitted(false);
                    onClose();
                  }, 2500);
                }}
              />
              <TelLink className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--color-navy)]/20 py-[15px] text-sm font-medium text-[var(--color-navy)] no-underline" />
            </>
          )}
        </div>
      </div>
    </>
  );
}

function TelLink({ className }: { className?: string }) {
  const { config } = useConfig();
  const tel = config.phone.replace(/\D/g, "");
  return (
    <a href={`tel:${tel}`} className={className}>
      <IconPhone className="h-4 w-4 text-[var(--color-gold)]" />
      전화로 문의하기 · {config.phone}
    </a>
  );
}

export function BottomBar() {
  const { config, submitting } = useConfig();
  const tel = config.phone.replace(/\D/g, "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pcSubmitted, setPcSubmitted] = useState(false);

  return (
    <>
      {/* PC — Figma bottom-bar-pc */}
      <div className="bottom-bar-pc fixed inset-x-0 bottom-0 z-[200] hidden border-t-2 border-[var(--color-gold)] bg-[var(--color-navy)] shadow-[0_-4px_24px_rgba(0,0,0,0.25)] md:block">
        <div className="mx-auto max-w-[1100px] px-6 py-[11px]">
          {pcSubmitted ? (
            <div className="flex h-10 items-center justify-center">
              <span className="text-[13px] font-medium text-[var(--color-gold)]">
                ✓ 관심 등록이 완료되었습니다. 담당자가 연락드리겠습니다.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex shrink-0 items-center gap-1.5">
                <IconMessageCircle className="h-3.5 w-3.5 text-[var(--color-gold)]" />
                <span className="whitespace-nowrap text-xs font-semibold tracking-[0.1em] text-[var(--color-gold)]">
                  관심등록
                </span>
              </div>
              <ReservationForm
                buttonText="신청하기"
                redirect={false}
                variant="inline"
                source="pc_bottom_bar"
                onSuccess={() => {
                  setPcSubmitted(true);
                  setTimeout(() => setPcSubmitted(false), 3000);
                }}
              />
              <div className="h-7 w-px shrink-0 bg-white/12" />
              <a
                href={`tel:${tel}`}
                className="flex shrink-0 items-center gap-2.5 no-underline"
              >
                <IconPhone className="h-7 w-7 text-[var(--color-gold)]" />
                <span className="whitespace-nowrap text-[26px] font-semibold leading-none text-white/85">
                  {config.phone}
                </span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Mobile — Figma bottom-bar-mobile */}
      <div className="bottom-bar-mobile fixed inset-x-0 bottom-0 z-[200] border-t-2 border-[var(--color-gold)] bg-[var(--color-navy)] shadow-[0_-4px_24px_rgba(0,0,0,0.25)] md:hidden">
        <div className="flex h-[58px]">
          <a
            href={`tel:${tel}`}
            className="flex flex-1 items-center justify-center gap-1.5 border-r border-white/12 no-underline"
          >
            <IconPhone className="h-[18px] w-[18px] text-white/75" />
            <span className="text-[15px] tracking-wide text-white">전화문의</span>
          </a>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1.5 border-none bg-[var(--color-gold)]"
          >
            <IconCalendar className="h-[18px] w-[18px] text-white" />
            <span className="text-[15px] tracking-wide text-white">문의/방문예약</span>
          </button>
        </div>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="방문예약 신청"
      />
    </>
  );
}
