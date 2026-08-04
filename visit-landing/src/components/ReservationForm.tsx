"use client";

import { useMemo, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { useFormSubmitSecurity } from "./FormSubmitSecurityProvider";
import { PrivacyModal } from "./PrivacyModal";
import { ScrollableSelect } from "./ScrollableSelect";
import {
  isUnitTypeFieldEnabled,
  isVisitDateFieldEnabled,
  isVisitTimeFieldEnabled,
  resolveUnitTypeOptions,
  resolveVisitDateOptions,
  resolveVisitTimeOptions,
} from "@/lib/reservation-form-options";

export type ReservationFormVariant = "default" | "compact" | "sheet" | "inline";

const inputWhite =
  "w-full rounded border border-[var(--color-navy)]/20 bg-white px-4 py-3.5 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-gold)]/60";
const inputSheet =
  "w-full rounded-lg border border-[var(--color-navy)]/15 bg-[var(--color-bg)] px-4 py-3.5 text-sm text-[var(--color-navy)] outline-none focus:border-[var(--color-gold)]/60";
const labelBase = "mb-1.5 block text-[13px] font-medium tracking-wide text-[var(--color-navy)]";

export function ReservationForm({
  buttonText,
  redirect = true,
  variant = "default",
  source = "reservation_form",
  onSuccess,
  className,
}: {
  buttonText: string;
  redirect?: boolean;
  variant?: ReservationFormVariant;
  source?: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const { submit, submitting, config } = useConfig();
  const security = useFormSubmitSecurity();
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitType, setUnitType] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [error, setError] = useState("");

  const visitDates = useMemo(() => resolveVisitDateOptions(config), [config]);
  const visitTimes = useMemo(() => resolveVisitTimeOptions(config), [config]);
  const unitOptions = useMemo(
    () => resolveUnitTypeOptions(config),
    [config]
  );
  const showUnitType = isUnitTypeFieldEnabled(config);
  const showVisitDate = isVisitDateFieldEnabled(config);
  const showVisitTime = isVisitTimeFieldEnabled(config);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    let submitExtras = {};
    try {
      submitExtras = security ? await security.buildSubmitExtras() : {};
    } catch {
      setError("접수 보안 확인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const result = await submit(
      {
        name,
        phone,
        unitType: showUnitType ? unitType || undefined : undefined,
        visitDate: showVisitDate ? visitDate || undefined : undefined,
        visitTime: showVisitTime ? visitTime || undefined : undefined,
        source,
        company,
        ...submitExtras,
      },
      { redirect }
    );
    if (!result.success) {
      setError(result.message ?? "접수에 실패했습니다.");
      return;
    }
    setName("");
    setPhone("");
    setUnitType("");
    setVisitDate("");
    setVisitTime("");
    setAgreed(false);
    onSuccess?.();
  }

  if (variant === "inline") {
    return (
      <form
        ref={(el) => security?.registerFormRoot(el)}
        onSubmit={handleSubmit}
        className={`relative flex w-auto max-w-full flex-nowrap items-center gap-1 md:gap-1.5 lg:gap-2 ${className ?? ""}`}
      >
        <HoneypotField value={company} onChange={setCompany} />
        <input
          type="text"
          placeholder="성함"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-9 w-[52px] shrink-0 rounded border border-[var(--color-navy)]/15 bg-white px-1.5 text-xs text-[var(--color-navy)] outline-none md:h-10 md:w-[64px] md:px-2 lg:w-[76px] lg:text-[13px] xl:w-[88px] xl:px-3 2xl:w-[90px]"
        />
        <input
          type="tel"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          required
          className="h-9 w-[108px] shrink-0 rounded border border-[var(--color-navy)]/15 bg-white px-1.5 text-xs text-[var(--color-navy)] outline-none md:h-10 md:w-[120px] md:px-2 lg:w-[132px] lg:text-[13px] xl:w-[148px] xl:px-3"
        />
        {showUnitType && (
          <ScrollableSelect
            value={unitType}
            onChange={setUnitType}
            options={unitOptions}
            placeholder="관심평형(선택)"
            className="h-9 min-w-0 w-[7.5rem] shrink md:h-10 lg:w-[8.5rem] xl:w-[9.5rem]"
            listMaxHeight={160}
            dropUp
            compact
          />
        )}
        {showVisitDate && (
          <ScrollableSelect
            value={visitDate}
            onChange={setVisitDate}
            options={visitDates.map((d) => ({
              value: d.value,
              label: d.label.replace(/\s/g, ""),
            }))}
            placeholder="방문일자(선택)"
            className="h-9 min-w-0 w-[7rem] shrink md:h-10 lg:w-[8rem] xl:w-[9rem]"
            listMaxHeight={180}
            dropUp
            compact
          />
        )}
        {showVisitTime && (
          <ScrollableSelect
            value={visitTime}
            onChange={setVisitTime}
            options={visitTimes}
            placeholder="방문시간(선택)"
            className="h-9 min-w-0 w-[7rem] shrink md:h-10 lg:w-[8rem] xl:w-[9rem]"
            listMaxHeight={180}
            dropUp
            compact
          />
        )}
        <PrivacyAgreement
          agreed={agreed}
          onAgreedChange={setAgreed}
          onView={() => setPrivacyOpen(true)}
          variant="inline"
        />
        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        {error && (
          <p className="pointer-events-none absolute bottom-[calc(100%+4px)] left-0 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[11px] text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-9 shrink-0 rounded bg-[var(--color-gold)] px-3 text-xs font-medium text-white disabled:opacity-60 md:h-10 md:px-3.5 lg:px-4 lg:text-[13px] xl:px-5"
        >
          {submitting ? "처리 중..." : buttonText}
        </button>
      </form>
    );
  }

  const inputClass = variant === "sheet" ? inputSheet : inputWhite;
  const isCompact = variant === "compact";
  /** 5필드(성함·연락처·평형·일자·시간)일 때 평형만 한 줄 풀폭(2칸) */
  const unitSpansFullRow =
    !isCompact && showUnitType && showVisitDate && showVisitTime;

  return (
    <form
      ref={(el) => security?.registerFormRoot(el)}
      onSubmit={handleSubmit}
      className={`space-y-4 text-left ${className ?? ""}`}
    >
      <HoneypotField value={company} onChange={setCompany} />
      <div className={isCompact ? "space-y-4" : "grid gap-5 sm:grid-cols-2"}>
        <div>
          <label className={labelBase}>
            성함 <span className="text-[var(--color-gold)]">*</span>
          </label>
          <input
            type="text"
            placeholder={variant === "sheet" ? "홍길동" : "이름을 입력해주세요"}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelBase}>
            연락처 <span className="text-[var(--color-gold)]">*</span>
          </label>
          <input
            type="tel"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            className={inputClass}
            required
          />
        </div>
        {showUnitType && (
          <div className={unitSpansFullRow ? "sm:col-span-2" : undefined}>
            <label className={labelBase}>
              관심평형 <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <ScrollableSelect
              value={unitType}
              onChange={setUnitType}
              options={unitOptions}
              placeholder="평형 선택"
              className="w-full"
              listMaxHeight={200}
              dropUp={variant === "sheet"}
            />
          </div>
        )}
        {showVisitDate && (
          <div>
            <label className={labelBase}>
              방문예약 일자 <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <ScrollableSelect
              value={visitDate}
              onChange={setVisitDate}
              options={visitDates}
              placeholder="일자 선택"
              className="w-full"
              listMaxHeight={200}
              dropUp={variant === "sheet"}
            />
          </div>
        )}
        {showVisitTime && (
          <div>
            <label className={labelBase}>
              방문예약 시간 <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <ScrollableSelect
              value={visitTime}
              onChange={setVisitTime}
              options={visitTimes}
              placeholder="시간 선택"
              className="w-full"
              listMaxHeight={200}
              dropUp={variant === "sheet"}
            />
          </div>
        )}
      </div>

      <PrivacyAgreement
        agreed={agreed}
        onAgreedChange={setAgreed}
        onView={() => setPrivacyOpen(true)}
        variant={variant}
      />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className={
          variant === "sheet"
            ? "w-full rounded-[10px] bg-[var(--color-navy)] py-4 text-[15px] font-medium tracking-[0.08em] text-white disabled:opacity-60"
            : "reservation-submit-btn cta-primary min-h-14 w-full text-base disabled:opacity-60"
        }
      >
        {submitting ? "처리 중..." : buttonText}
      </button>
    </form>
  );
}

function HoneypotField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      name="company"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete="off"
      tabIndex={-1}
      aria-hidden
      className="absolute left-[-9999px] h-px w-px opacity-0"
    />
  );
}

function PrivacyAgreement({
  agreed,
  onAgreedChange,
  onView,
  variant,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  onView: () => void;
  variant: ReservationFormVariant;
}) {
  const isInline = variant === "inline";

  return (
    <div
      className={`flex items-center ${
        isInline
          ? "shrink-0 gap-1"
          : variant === "sheet"
            ? "gap-2 rounded-lg bg-[var(--color-bg)] px-3.5 py-3"
            : "gap-2 rounded-md bg-[var(--color-bg)] px-5 py-4"
      }`}
    >
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => onAgreedChange(e.target.checked)}
        className={`shrink-0 cursor-pointer accent-[var(--color-gold)] ${
          isInline ? "h-3.5 w-3.5" : "mt-0.5 h-4 w-4"
        }`}
      />
      <span
        className={`${isInline ? "shrink-0 whitespace-nowrap text-[10px] text-white/50 lg:text-[11px]" : "flex-1 text-[13px] text-[#7a7060]"}`}
      >
        {!isInline && <span className="font-medium text-[var(--color-navy)]">[필수]</span>}{" "}
        {isInline ? (
          <>
            <span className="xl:hidden">동의</span>
            <span className="hidden xl:inline">개인정보 동의</span>
          </>
        ) : (
          "개인정보 수집 및 이용에 동의합니다."
        )}
      </span>
      <button
        type="button"
        onClick={onView}
        className={`shrink-0 font-semibold text-[var(--color-gold)] underline ${
          isInline ? "text-[10px] lg:text-[11px]" : "text-xs"
        }`}
      >
        [보기]
      </button>
    </div>
  );
}
