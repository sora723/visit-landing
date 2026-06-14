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
  const { footer } = config;
  const items = footer.items.filter((item) => item.title || item.content);

  return (
    <footer className="site-footer border-t border-white/8 bg-[var(--color-navy)] pt-8 text-white/55 sm:pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-5">
          <strong className="block text-base text-white sm:text-lg">
            {config.siteName}
          </strong>
          {items.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={`${item.title}-${item.content}-${index}`}
                  className="grid grid-cols-[88px_1fr] gap-2 text-xs"
                >
                  <dt className="text-white/38">{item.title}</dt>
                  <dd className="text-white/72">{item.content}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        {footer.bottomText && (
          <p className="text-xs leading-relaxed">{footer.bottomText}</p>
        )}
        <p className="mt-2 pb-6 text-xs text-white/28">
          © {new Date().getFullYear()} All rights reserved. - 다비드 제작
        </p>
      </div>
    </footer>
  );
}
