"use client";

import { useMemo, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { useFormSubmitSecurity } from "./FormSubmitSecurityProvider";
import { PrivacyModal } from "./PrivacyModal";
import { ScrollableSelect } from "./ScrollableSelect";
import {
  isUnitTypeFieldEnabled,
  isVisitDateFieldEnabled,
  resolveUnitTypeOptions,
  resolveVisitDateOptions,
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
  const [agreed, setAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [error, setError] = useState("");

  const visitDates = useMemo(() => resolveVisitDateOptions(config), [config]);
  const unitOptions = useMemo(
    () => resolveUnitTypeOptions(config),
    [config]
  );
  const showUnitType = isUnitTypeFieldEnabled(config);
  const showVisitDate = isVisitDateFieldEnabled(config);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    const result = await submit(
      {
        name,
        phone,
        unitType: showUnitType ? unitType || undefined : undefined,
        visitDate: showVisitDate ? visitDate || undefined : undefined,
        source,
        company,
        ...(security?.buildSubmitExtras() ?? {}),
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
    setAgreed(false);
    onSuccess?.();
  }

  if (variant === "inline") {
    return (
      <form
        ref={(el) => security?.registerFormRoot(el)}
        onSubmit={handleSubmit}
        className={`flex flex-wrap items-center gap-2.5 ${className ?? ""}`}
      >
        <HoneypotField value={company} onChange={setCompany} />
        <input
          type="text"
          placeholder="성함"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="h-10 w-[90px] rounded border border-[var(--color-navy)]/15 bg-white px-3 text-[13px] text-[var(--color-navy)] outline-none"
        />
        <input
          type="tel"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          required
          className="h-10 w-[148px] rounded border border-[var(--color-navy)]/15 bg-white px-3 text-[13px] text-[var(--color-navy)] outline-none"
        />
        {showUnitType && (
          <ScrollableSelect
            value={unitType}
            onChange={setUnitType}
            options={unitOptions}
            placeholder="평형(선택)"
            className="h-10 w-[100px]"
            listMaxHeight={160}
            dropUp
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
            placeholder="일자(선택)"
            className="h-10 w-[110px]"
            listMaxHeight={180}
            dropUp
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
          <p className="w-full text-center text-xs text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="h-10 shrink-0 rounded bg-[var(--color-gold)] px-5 text-[13px] font-medium text-white disabled:opacity-60"
        >
          {submitting ? "처리 중..." : "신청하기"}
        </button>
      </form>
    );
  }

  const inputClass = variant === "sheet" ? inputSheet : inputWhite;
  const isCompact = variant === "compact";

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
          <div>
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
      className={`flex items-center gap-2 ${
        isInline
          ? "shrink-0"
          : variant === "sheet"
            ? "rounded-lg bg-[var(--color-bg)] px-3.5 py-3"
            : "rounded-md bg-[var(--color-bg)] px-5 py-4"
      }`}
    >
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => onAgreedChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-gold)]"
      />
      <span
        className={`flex-1 ${isInline ? "whitespace-nowrap text-[11px] text-white/50" : "text-[13px] text-[#7a7060]"}`}
      >
        {!isInline && <span className="font-medium text-[var(--color-navy)]">[필수]</span>}{" "}
        {isInline ? "개인정보 동의" : "개인정보 수집 및 이용에 동의합니다."}
      </span>
      <button
        type="button"
        onClick={onView}
        className={`shrink-0 font-semibold text-[var(--color-gold)] underline ${
          isInline ? "text-[11px]" : "text-xs"
        }`}
      >
        [보기]
      </button>
    </div>
  );
}
