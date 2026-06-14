"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Calendar,
  Car,
  Check,
  Coins,
  Diamond,
  Gift,
  Home,
  Leaf,
  MapPin,
  Percent,
  Phone,
  Receipt,
  Shield,
  Star,
  Tag,
  TrainFront,
  Trophy,
  Users,
} from "lucide-react";
import { useConfig } from "./ConfigProvider";
import { useIsMobile } from "@/hooks/useResponsiveImage";
import { normalizeHeroCardIconKey } from "@/lib/hero-card-icons";
import { resolveHeroImage } from "@/lib/responsive-image";
import { scrollToReservation } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  money: Receipt,
  percent: Percent,
  building: Building2,
  calendar: Calendar,
  gift: Gift,
  diamond: Diamond,
  shield: Shield,
  home: Home,
  train: TrainFront,
  users: Users,
  trophy: Trophy,
  star: Star,
  check: Check,
  chart: BarChart3,
  leaf: Leaf,
  coin: Coins,
  phone: Phone,
  location: MapPin,
  car: Car,
  tag: Tag,
};

function resolveBenefitIcon(iconKey?: string): LucideIcon {
  const key = normalizeHeroCardIconKey(iconKey);
  return (key && iconMap[key]) || Gift;
}

export function HeroSection() {
  const { config } = useConfig();
  const { hero, siteName } = config;
  const benefits = hero.benefits.filter((item) => item.title || item.value);
  const isMobile = useIsMobile();
  const heroImage = resolveHeroImage(hero, isMobile);
  const headline = hero.hook?.trim() || siteName;

  const cardGridCols =
    benefits.length >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : benefits.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : benefits.length === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1";

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

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col items-center px-6 pb-20 pt-[calc(var(--header-h)+1.75rem)] text-center">
        <h1 className="font-paperlogy text-[clamp(36px,6.5vw,72px)] font-bold leading-tight tracking-wide text-white">
          {headline}
        </h1>

        {hero.sub && (
          <p className="mt-4 max-w-2xl text-[clamp(15px,2.4vw,22px)] font-light tracking-wider text-white/75">
            {hero.sub}
          </p>
        )}

        {benefits.length > 0 && (
          <div className="hero-benefit-grid mt-10 flex w-full justify-center">
            <div
              className={`grid w-full max-w-[780px] justify-items-center gap-4 ${cardGridCols}`}
            >
              {benefits.map((item, i) => {
                const Icon = resolveBenefitIcon(item.iconKey);
                return (
                  <div
                    key={`${item.title}-${item.value}-${i}`}
                    className={`hero-benefit-card hero-benefit-card-${i % 3} flex w-full max-w-[240px] flex-col items-center rounded-sm border border-[var(--color-gold)]/35 border-t-2 border-t-[var(--color-gold)] bg-white/[0.06] px-4 py-6 backdrop-blur-sm`}
                  >
                    <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10">
                      <Icon className="h-5 w-5 text-[var(--color-gold)]" aria-hidden />
                    </div>
                    <div
                      className={`hero-benefit-label hero-benefit-label-${i % 3} mb-2.5 text-[13px] font-medium tracking-[0.18em] text-[var(--color-gold)]`}
                    >
                      {item.title}
                    </div>
                    <div
                      className={`hero-benefit-value hero-benefit-value-${i % 3} font-paperlogy text-[clamp(20px,3vw,28px)] leading-tight text-white`}
                    >
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
