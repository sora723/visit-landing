"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useSite } from "./SiteProvider";
import { scrollToReservation } from "@/lib/utils";

export function CtaSection() {
  const { site } = useSite();

  return (
    <section id="reservation-form" className="bg-navy py-20 pb-32">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-3 font-serif text-2xl font-semibold text-white sm:text-3xl">
            {site.cta.headline}
          </h2>
          <p className="mb-8 text-white/60">{site.cta.subtext}</p>
          <ReservationFormInline buttonText={site.cta.buttonText} />
        </motion.div>
      </div>
    </section>
  );
}

export function ReservationFormInline({ buttonText }: { buttonText: string }) {
  const { site, submit, submitting } = useSite();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!agreed) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    const result = await submit(name, phone, { redirect: true });
    if (!result.success) setError(result.message ?? "접수에 실패했습니다.");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 text-left">
      <input
        type="text"
        placeholder="이름"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/35 outline-none focus:border-gold/50"
        required
      />
      <input
        type="tel"
        placeholder="연락처"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
        className="w-full border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/35 outline-none focus:border-gold/50"
        required
      />
      <label className="flex items-start gap-2 text-xs text-white/60">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 accent-gold"
        />
        {site.contact.privacyConsentText}
      </label>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-gold py-4 text-sm font-semibold text-navy transition hover:bg-gold-light disabled:opacity-60"
      >
        {submitting ? "처리 중..." : buttonText}
      </button>
    </form>
  );
}

export function SiteFooter() {
  const { site } = useSite();
  const f = site.footer;
  const info = [
    { label: "시행사", value: f.developer },
    { label: "시공사", value: f.constructor },
    { label: "대표번호", value: f.phone },
    { label: "광고대행", value: f.agency },
    { label: "사업자등록번호", value: f.businessNumber },
    { label: "문의", value: f.contact },
  ].filter((i) => i.value);

  return (
    <footer className="border-t border-white/5 bg-[#0a1220] pb-28 pt-14 text-white/60">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 grid gap-8 lg:grid-cols-3">
          <div>
            <strong className="text-lg text-white">{f.siteName}</strong>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
            {info.map((i) => (
              <div key={i.label} className="grid grid-cols-[100px_1fr] gap-2 text-xs">
                <dt className="text-white/40">{i.label}</dt>
                <dd className="text-white/75">{i.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs leading-relaxed">{f.privacyPolicy}</p>
        <p className="mt-4 text-xs text-white/30">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  );
}

export function MobileFixedBar() {
  const { site } = useSite();
  const phone = site.footer.phone;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-navy/10 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
      <p className="bg-navy py-2 text-center text-xs font-medium text-gold">
        {site.mobileBar.hookText}
      </p>
      <div className="grid grid-cols-2">
        {site.flags.phoneButtonEnabled && phone && (
          <a
            href={`tel:${phone.replace(/\D/g, "")}`}
            className="flex items-center justify-center gap-2 py-4 text-sm font-semibold text-navy transition hover:bg-cream"
          >
            전화상담
          </a>
        )}
        <button
          type="button"
          onClick={scrollToReservation}
          className="flex items-center justify-center gap-2 bg-gold py-4 text-sm font-semibold text-navy transition hover:bg-gold-light"
        >
          방문예약
        </button>
      </div>
    </div>
  );
}
