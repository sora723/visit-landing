"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConfig } from "./ConfigProvider";
import { useFormSubmitSecurity } from "./FormSubmitSecurityProvider";
import { MarketingConsentModal } from "./MarketingConsentModal";
import { PrivacyModal } from "./PrivacyModal";
import { ScrollableSelect } from "./ScrollableSelect";
import { normalizeBirthDate } from "@/lib/birth-date";
import {
  isBirthDateFieldEnabled,
  isRegionFieldEnabled,
  resolveRegionOptions,
} from "@/lib/region-options";
import {
  isTypeFieldEnabled,
  isUnitTypeFieldEnabled,
  isVisitDateFieldEnabled,
  isVisitTimeFieldEnabled,
  resolveTypeOptions,
  resolveUnitTypeOptions,
  resolveVisitDateOptions,
  resolveVisitTimeOptions,
} from "@/lib/reservation-form-options";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";
import {
  isMarketingConsentEnabled,
  resolveMarketingAgreedForSubmit,
} from "@/lib/site-privacy";

export type ReservationFormVariant = "default" | "compact" | "sheet" | "inline";

const inputWhite =
  "w-full rounded border border-[var(--color-text)]/35 bg-white px-4 py-3.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-gold)]/70";
const inputSheet =
  "w-full rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-bg)] px-4 py-3.5 text-sm text-[var(--color-text)] outline-none focus:border-[var(--color-gold)]/70";
const labelBase = "mb-1.5 block text-[13px] font-medium tracking-wide text-[var(--color-text)]";

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
  const [consultType, setConsultType] = useState("");
  const [unitType, setUnitType] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [region, setRegion] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(false);
  const [error, setError] = useState("");

  const visitDates = useMemo(() => resolveVisitDateOptions(config), [config]);
  const visitTimes = useMemo(() => resolveVisitTimeOptions(config), [config]);
  const unitOptions = useMemo(
    () => resolveUnitTypeOptions(config),
    [config]
  );
  const typeOptions = useMemo(() => resolveTypeOptions(config), [config]);
  const regionOptions = useMemo(() => resolveRegionOptions(config), [config]);
  const showType = isTypeFieldEnabled(config);
  const showUnitType = isUnitTypeFieldEnabled(config);
  const showVisitDate = isVisitDateFieldEnabled(config);
  const showVisitTime = isVisitTimeFieldEnabled(config);
  const showBirthDate = isBirthDateFieldEnabled(config);
  const showRegion = isRegionFieldEnabled(config);
  const showMarketing = isMarketingConsentEnabled(config);
  const privacyPolicyHref =
    config.privacy?.privacyPolicyUrl?.trim() ||
    appendSiteCodeQuery("/privacy", config.siteCode ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("개인정보 수집·이용에 동의해주세요.");
      return;
    }
    const marketingAgreedForSubmit = resolveMarketingAgreedForSubmit(
      config,
      marketingAgreed
    );
    let normalizedBirth = "";
    if (showBirthDate && birthDate.trim()) {
      const parsed = normalizeBirthDate(birthDate);
      if (!parsed.ok) {
        setError(parsed.error);
        return;
      }
      normalizedBirth = parsed.value;
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
        marketingAgreed: marketingAgreedForSubmit,
        consultType: showType ? consultType || undefined : undefined,
        unitType: showUnitType ? unitType || undefined : undefined,
        visitDate: showVisitDate ? visitDate || undefined : undefined,
        visitTime: showVisitTime ? visitTime || undefined : undefined,
        birthDate: showBirthDate ? normalizedBirth || undefined : undefined,
        region: showRegion ? region || undefined : undefined,
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
    setConsultType("");
    setUnitType("");
    setVisitDate("");
    setVisitTime("");
    setBirthDate("");
    setRegion("");
    setAgreed(false);
    /**
     * 네이버 lead 등은 /complete 에서 완료메시지+전환 동시 노출.
     * 랜딩 팝업·푸터 완료 UI를 먼저 띄우면 GFA가 lead 없이 완료만 보고 검수실패 함.
     */
    if (!result.navigatedToComplete) {
      onSuccess?.();
    }
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
          className="h-9 w-[52px] shrink-0 rounded border border-[var(--color-text)]/35 bg-white px-1.5 text-xs text-[var(--color-text)] outline-none md:h-10 md:w-[64px] md:px-2 lg:w-[76px] lg:text-[13px] xl:w-[88px] xl:px-3 2xl:w-[90px]"
        />
        <input
          type="tel"
          placeholder="010-0000-0000"
          value={phone}
          onChange={(e) =>
            setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
          }
          required
          className="h-9 w-[108px] shrink-0 rounded border border-[var(--color-text)]/35 bg-white px-1.5 text-xs text-[var(--color-text)] outline-none md:h-10 md:w-[120px] md:px-2 lg:w-[132px] lg:text-[13px] xl:w-[148px] xl:px-3"
        />
        {showType && (
          <ScrollableSelect
            value={consultType}
            onChange={setConsultType}
            options={typeOptions}
            placeholder="유형(선택)"
            className="h-9 min-w-0 w-[7rem] shrink md:h-10 lg:w-[8rem] xl:w-[9rem]"
            listMaxHeight={180}
            dropUp
            compact
          />
        )}
        {showBirthDate && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="생년월일(선택)"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="h-9 w-[7.5rem] shrink-0 rounded border border-[var(--color-text)]/35 bg-white px-1.5 text-xs text-[var(--color-text)] outline-none md:h-10 md:w-[8rem] md:px-2 lg:w-[8.5rem] lg:text-[13px] xl:w-[9rem]"
            aria-label="생년월일 (선택)"
          />
        )}
        {showRegion && (
          <ScrollableSelect
            value={region}
            onChange={setRegion}
            options={regionOptions}
            placeholder="지역(선택)"
            className="h-9 min-w-0 w-[7rem] shrink md:h-10 lg:w-[8rem] xl:w-[9rem]"
            listMaxHeight={180}
            dropUp
            compact
          />
        )}
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
          onViewPrivacy={() => setPrivacyOpen(true)}
          marketingAgreed={marketingAgreed}
          onMarketingAgreedChange={setMarketingAgreed}
          onViewMarketing={() => setMarketingOpen(true)}
          showMarketing={showMarketing}
          privacyPolicyHref={privacyPolicyHref}
          variant="inline"
        />
        <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
        <MarketingConsentModal
          open={marketingOpen}
          onClose={() => setMarketingOpen(false)}
        />
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
          {submitting ? "접수 중..." : buttonText}
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
        {showType && (
          <div className={isCompact ? undefined : "sm:col-span-2"}>
            <label className={labelBase}>
              유형 <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <ScrollableSelect
              value={consultType}
              onChange={setConsultType}
              options={typeOptions}
              placeholder="유형 선택"
              className="w-full"
              listMaxHeight={200}
              dropUp={variant === "sheet"}
            />
          </div>
        )}
        {showBirthDate && (
          <div>
            <label className={labelBase}>
              생년월일{" "}
              <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="예: 930326, 90-00-00"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className={inputClass}
              aria-label="생년월일 (선택)"
            />
          </div>
        )}
        {showRegion && (
          <div>
            <label className={labelBase}>
              지역 <span className="font-normal text-[#b0a898]">(선택)</span>
            </label>
            <ScrollableSelect
              value={region}
              onChange={setRegion}
              options={regionOptions}
              placeholder="시 선택"
              className="w-full"
              listMaxHeight={200}
              dropUp={variant === "sheet"}
            />
          </div>
        )}
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
        onViewPrivacy={() => setPrivacyOpen(true)}
        marketingAgreed={marketingAgreed}
        onMarketingAgreedChange={setMarketingAgreed}
        onViewMarketing={() => setMarketingOpen(true)}
        showMarketing={showMarketing}
        privacyPolicyHref={privacyPolicyHref}
        variant={variant}
      />
      <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <MarketingConsentModal
        open={marketingOpen}
        onClose={() => setMarketingOpen(false)}
      />

      {error && <p className="text-center text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className={
          variant === "sheet"
            ? "w-full rounded-[10px] bg-[var(--color-text)] py-4 text-[15px] font-medium tracking-[0.08em] text-white disabled:opacity-60"
            : "reservation-submit-btn cta-primary min-h-14 w-full text-base disabled:opacity-60"
        }
      >
        {submitting ? "접수 중..." : buttonText}
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
  onViewPrivacy,
  marketingAgreed,
  onMarketingAgreedChange,
  onViewMarketing,
  showMarketing,
  privacyPolicyHref,
  variant,
}: {
  agreed: boolean;
  onAgreedChange: (v: boolean) => void;
  onViewPrivacy: () => void;
  marketingAgreed: boolean;
  onMarketingAgreedChange: (v: boolean) => void;
  onViewMarketing: () => void;
  showMarketing: boolean;
  privacyPolicyHref: string;
  variant: ReservationFormVariant;
}) {
  const isInline = variant === "inline";
  const allChecked = showMarketing ? agreed && marketingAgreed : agreed;
  const setAll = (v: boolean) => {
    onAgreedChange(v);
    if (showMarketing) onMarketingAgreedChange(v);
  };
  const rowClass =
    variant === "sheet"
      ? "flex items-center gap-2 rounded-lg bg-[var(--color-bg)] px-3.5 py-3"
      : "flex items-center gap-2 rounded-md bg-[var(--color-bg)] px-5 py-4";
  const checkClass = isInline
    ? "h-3.5 w-3.5 shrink-0 cursor-pointer accent-[var(--color-gold)]"
    : "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-gold)]";
  const linkClass = isInline
    ? "shrink-0 text-[10px] font-semibold text-[var(--color-gold)] underline lg:text-[11px]"
    : "shrink-0 text-xs font-semibold text-[var(--color-gold)] underline";

  if (isInline) {
    return (
      <div className="flex shrink-0 flex-col gap-1">
        {showMarketing && (
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={(e) => setAll(e.target.checked)}
              className={checkClass}
            />
            <span className="text-on-dark-50 shrink-0 whitespace-nowrap text-[10px] lg:text-[11px]">
              전체 동의
            </span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className={checkClass}
          />
          <span className="text-on-dark-50 shrink-0 whitespace-nowrap text-[10px] lg:text-[11px]">
            <span className="xl:hidden">동의</span>
            <span className="hidden xl:inline">개인정보 동의</span>
          </span>
          <button type="button" onClick={onViewPrivacy} className={linkClass}>
            [내용보기]
          </button>
        </div>
        {showMarketing && (
          <div className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={marketingAgreed}
              onChange={(e) => onMarketingAgreedChange(e.target.checked)}
              className={checkClass}
            />
            <span className="text-on-dark-50 shrink-0 whitespace-nowrap text-[10px] lg:text-[11px]">
              마케팅(선택)
            </span>
            <button type="button" onClick={onViewMarketing} className={linkClass}>
              [내용보기]
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showMarketing && (
        <div className={rowClass}>
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => setAll(e.target.checked)}
            className={checkClass}
          />
          <span className="flex-1 text-[13px] font-medium text-[var(--color-text)]">
            전체 동의
          </span>
        </div>
      )}
      <div className={rowClass}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className={checkClass}
        />
        <span className="flex-1 text-[13px] text-[#7a7060]">
          <span className="font-medium text-[var(--color-text)]">[필수]</span>{" "}
          개인정보 수집·이용 동의
        </span>
        <button type="button" onClick={onViewPrivacy} className={linkClass}>
          [내용보기]
        </button>
      </div>
      {showMarketing && (
        <div className={rowClass}>
          <input
            type="checkbox"
            checked={marketingAgreed}
            onChange={(e) => onMarketingAgreedChange(e.target.checked)}
            className={checkClass}
          />
          <span className="flex-1 text-[13px] text-[#7a7060]">
            <span className="font-medium text-[var(--color-text)]">[선택]</span>{" "}
            추가 광고·마케팅 정보 수신 동의
          </span>
          <button type="button" onClick={onViewMarketing} className={linkClass}>
            [내용보기]
          </button>
        </div>
      )}
      <p className="px-1 text-center text-[12px] text-[#7a7060]">
        <Link
          href={privacyPolicyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          개인정보 처리방침 [보기]
        </Link>
      </p>
    </div>
  );
}
