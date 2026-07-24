"use client";

/**
 * V2 예약 폼 UI — ConfigProvider 미사용.
 * 공용 useReservationSubmit은 Adapter에서 연결.
 * V1은 type=date 대신 ScrollableSelect — 동일 정책 유지.
 * 그리드 overflow: min-w-0 / max-w-full 적용.
 */

import { useId, useState } from "react";
import Link from "next/link";
import { ScrollableSelect } from "@/components/ScrollableSelect";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";

export type V2ReservationFormValues = {
  name: string;
  phone: string;
  unitType: string;
  visitDate: string;
  company: string;
  agreed: boolean;
};

type Props = {
  sectionId: string;
  site: V2RuntimeSiteContext;
  privacyHref: string;
  buttonText: string;
  submitting: boolean;
  error: string;
  onSubmit: (values: V2ReservationFormValues) => void | Promise<void>;
  formRootRef?: (el: HTMLElement | null) => void;
};

const inputClass =
  "box-border min-w-0 w-full max-w-full rounded-lg border border-[#0f1a2e]/20 bg-white px-4 py-3.5 text-sm text-[#0f1a2e] outline-none focus:border-[#0f1a2e]/50";

export function V2ReservationForm({
  sectionId,
  site,
  privacyHref,
  buttonText,
  submitting,
  error,
  onSubmit,
  formRootRef,
}: Props) {
  const uid = useId();
  const id = (name: string) =>
    `v2-${sectionId}-${name}-${uid.replace(/:/g, "")}`;

  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitType, setUnitType] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [agreed, setAgreed] = useState(false);

  const showUnit = site.unitTypeEnabled && site.unitTypeOptions.length > 0;
  const showVisit = site.visitDateEnabled && site.visitDateOptions.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit({
      name,
      phone,
      unitType,
      visitDate,
      company,
      agreed,
    });
  }

  return (
    <form
      ref={formRootRef}
      onSubmit={handleSubmit}
      className="relative space-y-4 text-left"
    >
      <input
        type="text"
        name="company"
        id={id("company")}
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden={true}
        className="absolute left-[-9999px] h-px w-px opacity-0"
      />

      <div className="grid min-w-0 grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2">
        <div className="min-w-0 max-w-full">
          <label
            htmlFor={id("name")}
            className="mb-1.5 block text-[13px] font-medium text-[#0f1a2e]"
          >
            성함 <span className="text-[#c4a35a]">*</span>
          </label>
          <input
            id={id("name")}
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="이름을 입력해주세요"
          />
        </div>
        <div className="min-w-0 max-w-full">
          <label
            htmlFor={id("phone")}
            className="mb-1.5 block text-[13px] font-medium text-[#0f1a2e]"
          >
            연락처 <span className="text-[#c4a35a]">*</span>
          </label>
          <input
            id={id("phone")}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))
            }
            className={inputClass}
            placeholder="010-0000-0000"
          />
        </div>
        {showUnit ? (
          <div className="min-w-0 max-w-full">
            <label className="mb-1.5 block text-[13px] font-medium text-[#0f1a2e]">
              관심평형{" "}
              <span className="font-normal text-[#7a7060]">(선택)</span>
            </label>
            <ScrollableSelect
              value={unitType}
              onChange={setUnitType}
              options={site.unitTypeOptions}
              placeholder="평형 선택"
              className="w-full min-w-0 max-w-full"
              listMaxHeight={200}
            />
          </div>
        ) : null}
        {showVisit ? (
          <div className="min-w-0 max-w-full overflow-hidden">
            <label className="mb-1.5 block text-[13px] font-medium text-[#0f1a2e]">
              방문예약 일자{" "}
              <span className="font-normal text-[#7a7060]">(선택)</span>
            </label>
            {/* V1과 동일 ScrollableSelect — type=date 미사용. overflow 방지용 min-w-0 */}
            <div className="min-w-0 w-full max-w-full">
              <ScrollableSelect
                value={visitDate}
                onChange={setVisitDate}
                options={site.visitDateOptions}
                placeholder="일자 선택"
                className="w-full min-w-0 max-w-full"
                listMaxHeight={200}
              />
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-[#f7f6f4] px-4 py-3">
        <input
          id={id("privacy")}
          name="privacyAgreed"
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          required
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#c4a35a]"
        />
        <label
          htmlFor={id("privacy")}
          className="flex-1 text-[13px] text-[#7a7060] text-pretty"
        >
          <span className="font-medium text-[#0f1a2e]">[필수]</span>{" "}
          {site.privacyText}
        </label>
        <Link
          href={privacyHref}
          className="shrink-0 text-xs font-semibold text-[#c4a35a] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          [보기]
        </Link>
      </div>

      {error ? (
        <p
          className="text-center text-sm text-red-500"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        aria-disabled={submitting}
        className="min-h-14 w-full touch-manipulation rounded-lg bg-[#0f1a2e] py-4 text-base font-medium text-white disabled:opacity-60"
      >
        {submitting ? "처리 중..." : buttonText}
      </button>
    </form>
  );
}
