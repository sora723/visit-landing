"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { useSiteTheme } from "@/hooks/useSiteTheme";
import { ReservationForm } from "./ReservationForm";

export function FooterReservationSection() {
  const { config } = useConfig();
  const theme = useSiteTheme();
  const title = config.cta.title ?? "홍보관 방문예약";
  const subtitle =
    config.cta.subtitle ?? "방문예약 후 전문 상담사의 안내를 받아보세요.";
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const [submitted, setSubmitted] = useState(false);

  return (
    <section
      ref={sectionRef}
      id="홍보관-방문예약"
      className="relative scroll-mt-[var(--site-top-offset)] overflow-hidden bg-[var(--color-navy)] px-6 py-20"
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
          <h2
            className="text-[clamp(26px,4vw,42px)] font-extrabold tracking-wide"
            style={{ color: theme.ctaSectionTitleColor }}
          >
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

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-white px-10 py-16 text-center shadow-[0_8px_64px_rgba(15,29,58,0.3)]"
          >
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-3xl text-[var(--color-gold)]">
              ✓
            </div>
            <h3 className="mb-3 text-[22px] font-semibold text-[var(--color-navy)]">
              예약이 접수되었습니다
            </h3>
            <p className="text-sm leading-relaxed text-[#7a7060]">
              담당 상담사가 빠른 시간 내 연락드리겠습니다.
              <br />
              {config.siteName}을 선택해 주셔서 감사합니다.
            </p>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-8 rounded bg-[var(--color-navy)] px-8 py-3 text-sm text-white"
            >
              추가 예약하기
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="reservation-form-card rounded-2xl bg-white p-8 shadow-[0_8px_48px_rgba(15,29,58,0.25)] sm:p-12"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            <ReservationForm
              buttonText={`${config.cta.buttonText || "방문예약하기"} →`}
              redirect={false}
              variant="default"
              source="footer_reservation"
              onSuccess={() => setSubmitted(true)}
            />
          </motion.div>
        )}
      </div>
    </section>
  );
}
