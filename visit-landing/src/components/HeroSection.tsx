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
import { normalizeHeroCardIconKey } from "@/lib/hero-card-icons";
import { getImageFallbackUrl } from "@/lib/image-url";
import { resolveHeroImageSources } from "@/lib/responsive-image";
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

type BenefitItem = {
  title: string;
  value: string;
  iconKey?: string;
};

function HeroBenefitCards({
  benefits,
  variant,
}: {
  benefits: BenefitItem[];
  variant: "mobile" | "desktop";
}) {
  if (!benefits.length) return null;

  if (variant === "mobile") {
    return (
      <div className="hero-benefit-grid flex w-full gap-1.5">
        {benefits.map((item, i) => {
          const Icon = resolveBenefitIcon(item.iconKey);
          return (
            <div
              key={`${item.title}-${item.value}-${i}`}
              className={`hero-benefit-card hero-benefit-card-${i % 3} flex min-w-0 flex-1 flex-col items-center rounded-sm border border-[var(--color-gold)]/35 border-t-2 border-t-[var(--color-gold)] bg-white/[0.08] px-2 py-2.5 backdrop-blur-sm`}
            >
              <div className="mb-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10">
                <Icon className="h-4 w-4 text-[var(--color-gold)]" aria-hidden />
              </div>
              <div
                className={`hero-benefit-label hero-benefit-label-${i % 3} mb-0.5 w-full truncate text-center text-[11px] font-medium tracking-[0.12em] text-[var(--color-gold)]`}
              >
                {item.title}
              </div>
              <div
                className={`hero-benefit-value hero-benefit-value-${i % 3} font-paperlogy w-full truncate text-center text-[clamp(14px,3.8vw,16px)] leading-tight text-white`}
              >
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const cardGridCols =
    benefits.length >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : benefits.length === 3
        ? "grid-cols-1 sm:grid-cols-3"
        : benefits.length === 2
          ? "grid-cols-1 sm:grid-cols-2"
          : "grid-cols-1";

  return (
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
  );
}

function HeroCtaButton({ className }: { className?: string }) {
  const { config } = useConfig();

  return (
    <motion.button
      type="button"
      onClick={scrollToReservation}
      className={`cta-primary shadow-[0_8px_32px_rgba(202,168,92,0.4)] ${className ?? ""}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {config.cta.buttonText || "방문예약 신청하기"}
    </motion.button>
  );
}

function HeroScrollHint({ compact }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center ${compact ? "gap-0.5" : "gap-1.5"}`}
    >
      <span
        className={`tracking-[0.2em] text-white/50 ${compact ? "text-[9px]" : "text-[10px]"}`}
      >
        SCROLL
      </span>
      <div
        className={`w-px bg-gradient-to-b from-[var(--color-gold)]/80 to-transparent ${compact ? "h-8" : "h-14"}`}
      />
    </div>
  );
}

export function HeroSection() {
  const { config } = useConfig();
  const { hero, siteName, mobileBar } = config;
  /**
   * benefitsEnabled=N → 히어로 제목/부제·혜택카드·방문예약 버튼·훅문구·오버레이 숨김
   * (헤더 siteName / logo 는 그대로)
   */
  const showBenefitsCta = hero.benefitsEnabled !== false;
  const benefits = showBenefitsCta
    ? hero.benefits.filter((item) => item.title || item.value)
    : [];
  const heroSources = resolveHeroImageSources(hero);
  /** heroTitle → 없으면 siteName (헤더와 동일 소스 가능, 표시만 히어로/헤더 분리) */
  const headline = hero.hook?.trim() || siteName;

  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-[var(--color-navy)] md:min-h-[100svh]"
    >
      {/* 모바일: 9:18 고정 비율 / PC: 뷰포트 풀블리드 */}
      <div className="relative aspect-[9/18] w-full md:absolute md:inset-0 md:aspect-auto md:h-full">
        {(heroSources.mobile || heroSources.desktop) && (
          <picture>
            <source media="(max-width: 767px)" srcSet={heroSources.mobile} />
            <source media="(min-width: 768px)" srcSet={heroSources.desktop} />
            <img
              src={heroSources.desktop || heroSources.mobile}
              alt=""
              fetchPriority="high"
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
              onError={(e) => {
                const img = e.currentTarget;
                const fallback = getImageFallbackUrl(
                  heroSources.desktop || heroSources.mobile,
                  "hero"
                );
                if (img.src !== fallback) img.src = fallback;
              }}
            />
          </picture>
        )}
        {showBenefitsCta ? (
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-navy)]/38 via-[var(--color-navy)]/18 to-[var(--color-navy)]/48 md:from-[var(--color-navy)]/42 md:via-[var(--color-navy)]/22 md:to-[var(--color-navy)]/52" />
        ) : null}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-5 pt-[calc(var(--header-h)+0.5rem)] pb-8 text-center md:hidden">
          {showBenefitsCta ? (
            <>
              <h1
                className="font-paperlogy text-[clamp(28px,8vw,44px)] font-bold leading-tight tracking-wide"
                style={{ color: "var(--color-hero-title)" }}
              >
                {headline}
              </h1>
              {hero.sub ? (
                <p className="mt-3 max-w-sm text-[14px] font-light tracking-wider text-white/75">
                  {hero.sub}
                </p>
              ) : null}
            </>
          ) : (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <HeroScrollHint compact />
            </div>
          )}
        </div>
      </div>

      {showBenefitsCta ? (
        <div className="relative z-10 flex flex-col items-center gap-2 bg-[var(--color-navy)] px-4 pb-4 pt-3 md:hidden">
          <HeroBenefitCards benefits={benefits} variant="mobile" />
          <HeroCtaButton className="mt-1 w-full max-w-[320px] px-8 py-3 text-[14px] font-medium tracking-[0.12em]" />
          {mobileBar.hookText ? (
            <p className="text-[11px] tracking-wide text-white/50">
              {mobileBar.hookText}
            </p>
          ) : null}
          <HeroScrollHint compact />
        </div>
      ) : null}

      <div className="relative z-10 mx-auto hidden min-h-[100svh] w-full max-w-[1100px] flex-col items-center justify-center px-6 pb-24 pt-[var(--header-h)] text-center md:flex">
        {showBenefitsCta ? (
          <>
            <h1
              className="font-paperlogy text-[clamp(36px,6.5vw,72px)] font-bold leading-tight tracking-wide"
              style={{ color: "var(--color-hero-title)" }}
            >
              {headline}
            </h1>
            {hero.sub ? (
              <p className="mt-4 max-w-2xl text-[clamp(15px,2.4vw,22px)] font-light tracking-wider text-white/75">
                {hero.sub}
              </p>
            ) : null}
            <HeroBenefitCards benefits={benefits} variant="desktop" />
            <HeroCtaButton className="mt-10 px-14 py-[18px] text-[15px] font-medium tracking-[0.15em]" />
            {mobileBar.hookText ? (
              <p className="mt-4 text-xs tracking-wide text-white/50">
                {mobileBar.hookText}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="absolute bottom-1.5 left-1/2 z-10 hidden -translate-x-1/2 md:flex">
        <HeroScrollHint />
      </div>
    </section>
  );
}
