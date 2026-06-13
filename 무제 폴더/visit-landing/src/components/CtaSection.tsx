"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { useConfig } from "./ConfigProvider";
import { ReservationForm } from "./ReservationForm";

export function CtaSection({
  sectionId = "reservation",
  compact = false,
}: {
  sectionId?: string;
  compact?: boolean;
}) {
  const { config } = useConfig();
  const title = config.cta.title ?? "방문예약 신청";
  const subtitle =
    config.cta.subtitle ??
    "방문예약 신청 후 전담 상담사가 확인 연락드립니다";
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });

  if (compact) {
    return (
      <section
        id={sectionId}
        className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-navy)] section-py-tight"
      >
        <div className="mx-auto max-w-md px-6">
          <h2 className="mb-2 text-center text-lg font-bold text-white">{title}</h2>
          <ReservationForm
            buttonText={config.cta.buttonText}
            redirect={false}
            variant="compact"
            source="cta_compact"
          />
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id={sectionId}
      className="relative scroll-mt-[var(--site-top-offset)] overflow-hidden bg-[var(--color-navy)] px-6 py-20 sm:pb-24"
    >
      <div className="cta-grid-pattern pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto max-w-[720px]">
        <motion.div
          className="mb-10 text-center sm:mb-12"
          initial={{ opacity: 0, y: -24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="mb-2 block text-[11px] tracking-[0.3em] text-[var(--color-gold)]">
            VISIT RESERVATION
          </span>
          <h2 className="text-[clamp(26px,4vw,42px)] font-bold tracking-wide text-white">
            {title}
          </h2>
          <div className="mx-auto mt-4 h-0.5 w-[60px] bg-[var(--color-gold)]" />
          <p className="mt-3.5 text-sm text-white/60">{subtitle}</p>

          <div className="mt-6 flex justify-center gap-8 border-y border-[var(--color-gold)]/20 py-4">
            {[
              { num: "무료", label: "방문 상담" },
              { num: "당일", label: "예약 가능" },
              { num: "1:1", label: "전담 상담사" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xl font-black text-[var(--color-gold)]">{s.num}</div>
                <div className="mt-0.5 text-[11px] text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="reservation-form-card rounded-2xl bg-white p-8 shadow-[0_8px_48px_rgba(15,29,58,0.25)] sm:p-12"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
        >
          <ReservationForm
            buttonText={config.cta.buttonText}
            redirect={false}
            source="cta_main"
          />
        </motion.div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const { config } = useConfig();
  const f = config.footer;

  const info = [
    { label: "시행사", value: f.developer },
    { label: "시공사", value: f.constructor },
    { label: "대표번호", value: config.phone },
    { label: "광고대행", value: f.agency },
    { label: "사업자등록번호", value: f.businessNumber },
    { label: "문의", value: f.contact },
  ].filter((i) => i.value);

  return (
    <footer className="site-footer border-t border-white/8 bg-[var(--color-navy)] pt-8 text-white/55 sm:pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 grid gap-5 lg:grid-cols-3">
          <strong className="text-base text-white sm:text-lg">
            {config.siteName}
          </strong>
          <dl className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
            {info.map((i) => (
              <div
                key={i.label}
                className="grid grid-cols-[88px_1fr] gap-2 text-xs"
              >
                <dt className="text-white/38">{i.label}</dt>
                <dd className="text-white/72">{i.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs leading-relaxed">{f.privacyPolicy}</p>
        <p className="mt-2 pb-6 text-xs text-white/28">
          © {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    </footer>
  );
}
