"use client";

import { motion } from "framer-motion";
import { useConfig } from "./ConfigProvider";
import { useIsMobile } from "@/hooks/useResponsiveImage";
import { resolveHeroImage } from "@/lib/responsive-image";
import { scrollToReservation } from "@/lib/utils";

export function HeroSection() {
  const { config } = useConfig();
  const { hero, siteName } = config;
  const benefits = hero.benefits.filter((item) => item.title || item.value);
  const isMobile = useIsMobile();
  const heroImage = resolveHeroImage(hero, isMobile);
  const headline = hero.hook?.trim() || siteName;

  return (
    <section
      id="hero"
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-[var(--color-navy)]"
    >
      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy)]/72 via-[var(--color-navy)]/55 to-[var(--color-navy)]/85" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 pb-16 pt-[calc(var(--header-h)+3rem)] text-center">
        <div className="hero-benefit-grid mb-10 grid w-full max-w-[780px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item, i) => (
            <div
              key={`${item.title}-${item.value}`}
              className={`hero-benefit-card hero-benefit-card-${i % 3} rounded-sm border border-[var(--color-gold)]/35 border-t-2 border-t-[var(--color-gold)] bg-white/[0.06] px-4 py-6 backdrop-blur-sm`}
            >
              <div
                className={`hero-benefit-label hero-benefit-label-${i % 3} mb-2.5 text-[13px] font-medium tracking-[0.18em] text-[var(--color-gold)]`}
              >
                {item.title}
              </div>
              <div
                className={`hero-benefit-value hero-benefit-value-${i % 3} font-paperlogy text-[clamp(22px,3.2vw,30px)] leading-tight text-white`}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <h1 className="font-paperlogy text-[clamp(28px,5vw,48px)] tracking-wide text-white/95">
          {headline}
        </h1>

        {hero.sub && (
          <p className="mt-3 max-w-2xl text-[clamp(14px,2vw,18px)] font-light tracking-wider text-white/70">
            {hero.sub}
          </p>
        )}

        <motion.button
          type="button"
          onClick={scrollToReservation}
          className="cta-primary mt-10 px-14 py-[18px] text-[15px] font-medium tracking-[0.15em] shadow-[0_8px_32px_rgba(202,168,92,0.4)]"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {config.cta.buttonText || "방문예약 신청하기"}
        </motion.button>

        {config.mobileBar.hookText && (
          <p className="mt-4 text-xs tracking-wide text-white/50">
            {config.mobileBar.hookText}
          </p>
        )}
      </div>

      <div className="absolute bottom-1.5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5">
        <span className="text-[10px] tracking-[0.2em] text-white/50">SCROLL</span>
        <div className="h-14 w-px bg-gradient-to-b from-[var(--color-gold)]/80 to-transparent" />
      </div>
    </section>
  );
}
