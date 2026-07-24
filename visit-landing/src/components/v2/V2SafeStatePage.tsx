/**
 * V2 미발행·오류 안전 화면.
 * ReservationForm / ConfigProvider / 전환·popup·polling 없음.
 * 기술 코드·revisionId·URL·stack 미노출.
 */

import React from "react";

type Props = {
  siteName?: string;
  phone?: string;
};

function telDigits(phone: string | undefined): string {
  return String(phone || "").replace(/\D/g, "");
}

export function V2SafeStatePage({ siteName, phone }: Props) {
  const name = String(siteName || "").trim();
  const tel = telDigits(phone);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#0f1a2e] px-6 py-16 text-center text-white">
      <div className="max-w-md space-y-5">
        {name ? (
          <p className="text-lg font-semibold tracking-wide text-white/95">
            {name}
          </p>
        ) : null}
        <p className="text-base font-medium tracking-wide">
          페이지를 준비 중입니다.
        </p>
        {tel ? (
          <p>
            <a
              href={`tel:${tel}`}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-[#0f1a2e] touch-manipulation"
            >
              전화 문의
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
