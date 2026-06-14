"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useConfig } from "./ConfigProvider";
import { ResponsiveImg } from "./ResponsiveImg";

function FigmaSectionTitle({
  en,
  title,
  subtitle,
  dark = false,
}: {
  en: string;
  title: string;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="mb-10 text-center md:mb-14">
      <span className="mb-2 block text-[11px] tracking-[0.3em] text-[var(--color-gold)]">{en}</span>
      <h2
        className={`text-[clamp(22px,3.5vw,34px)] font-semibold tracking-wide ${
          dark ? "text-white" : "text-[var(--color-navy)]"
        }`}
      >
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-10 bg-[var(--color-gold)]" />
      {subtitle && (
        <p className={`mt-3.5 text-sm ${dark ? "text-white/60" : "text-[#7a7060]"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function OverviewSection() {
  const { config } = useConfig();
  const { overview, siteName } = config;
  if (!overview.image && !overview.specs.length) return null;

  return (
    <section id="사업개요" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="PROJECT OVERVIEW" title={overview.title} />
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-14">
          {overview.image && (
            <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#e8e4dc]">
              <ResponsiveImg
                source={overview}
                alt={`${siteName} 단지`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.07)]">
            <div className="flex items-center gap-3 bg-[var(--color-navy)] px-7 py-5">
              <div className="h-5 w-[3px] rounded-sm bg-[var(--color-gold)]" />
              <span className="text-[15px] font-semibold tracking-wide text-white">
                {siteName} 사업개요
              </span>
            </div>
            {overview.specs.map((spec, i) => (
              <div
                key={spec.label}
                className={`flex ${
                  i < overview.specs.length - 1 ? "border-b border-[var(--color-navy)]/7" : ""
                }`}
              >
                <div className="w-[140px] shrink-0 border-r border-[var(--color-navy)]/7 bg-[var(--color-bg)] px-5 py-4 text-[13px] font-medium text-[#7a7060]">
                  {spec.label}
                </div>
                <div className="px-5 py-4 text-[13px] leading-relaxed text-[var(--color-navy)]">
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PremiumSection() {
  const { config } = useConfig();
  const { premium } = config;
  if (!premium.items.length) return null;

  return (
    <section id="프리미엄" className="scroll-mt-[var(--site-top-offset)] bg-[#f0ece4] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="PREMIUM AMENITY" title={premium.title} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {premium.items.map((item, i) => (
            <motion.article
              key={item.title}
              className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.08)] transition-transform duration-250 hover:-translate-y-1.5 hover:shadow-[0_16px_48px_rgba(15,29,58,0.14)]"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
            >
              {item.image && (
                <div className="relative aspect-video overflow-hidden bg-[#e8e4dc]">
                  <ResponsiveImg
                    source={item}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-400 hover:scale-105"
                  />
                  <div className="absolute left-3 top-3 rounded bg-[var(--color-navy)]/75 px-2.5 py-1 backdrop-blur-sm">
                    <span className="text-[9px] tracking-[0.2em] text-[var(--color-gold)]">
                      PREMIUM {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                </div>
              )}
              <div className="px-[22px] py-5">
                <h3 className="text-lg font-extrabold text-[var(--color-navy)]">{item.title}</h3>
                <p className="mt-2.5 text-[13px] leading-[1.75] text-[#7a7060]">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LocationSection() {
  const { config } = useConfig();
  const { location } = config;
  const mapSrc =
    location.mapImage?.trim() ||
    location.mapImagePc?.trim() ||
    location.mapImageMobile?.trim() ||
    "";

  if (!mapSrc && !location.items.length) return null;

  const groups = location.items.reduce<
    { cat: string; items: string[] }[]
  >((acc, item) => {
    const existing = acc.find((g) => g.cat === item.category);
    const line = item.description
      ? `${item.title} — ${item.description}`
      : item.title;
    if (existing) existing.items.push(line);
    else acc.push({ cat: item.category, items: [line] });
    return acc;
  }, []);

  return (
    <section id="입지환경" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-navy)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="LOCATION ENVIRONMENT" title={location.title} dark />
        <div className="relative mb-10 h-[clamp(380px,50vw,540px)] overflow-hidden rounded-2xl bg-[#1a2e5a]">
          {mapSrc && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mapSrc} alt="입지 지도" className="h-full w-full object-cover object-center" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--color-navy)]/75" />
            </>
          )}
          {location.title && (
            <div className="absolute bottom-6 left-6">
              <p className="text-[22px] font-extrabold text-white">{location.title}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {groups.map((point) => (
            <div
              key={point.cat}
              className="rounded-xl border border-white/10 bg-white/[0.05] px-[18px] py-[22px]"
            >
              <div className="mb-3.5 border-b border-[var(--color-gold)]/25 pb-3 text-sm font-bold text-[var(--color-gold)]">
                {point.cat}
              </div>
              <ul className="flex flex-col gap-2">
                {point.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-[13px] leading-snug text-white/75"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-gold)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FutureValueSection() {
  const { config } = useConfig();
  const { futureValue } = config;
  if (!futureValue.items.length) return null;

  return (
    <section id="미래가치" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="FUTURE VALUE" title={futureValue.title} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {futureValue.items.map((item, i) => (
            <motion.article
              key={item.title}
              className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.06)]"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              {item.image && (
                <ResponsiveImg source={item} alt={item.title} className="aspect-video w-full object-cover" />
              )}
              <div className="p-5">
                <h3 className="text-base font-bold text-[var(--color-navy)]">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#7a7060]">{item.description}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ImageLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-[calc(var(--site-top-offset)+12px)] rounded-sm bg-white/10 px-3 py-1.5 text-sm text-white"
      >
        닫기
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function SitePlanSection() {
  const { config } = useConfig();
  const section = config.siteLayout;
  const [lightbox, setLightbox] = useState(false);
  if (!section.items.length) return null;
  const item = section.items[0]!;
  const imgSrc = item.imagePc || item.imageMobile || item.image;

  return (
    <section id="단지배치도" className="scroll-mt-[var(--site-top-offset)] bg-white px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="SITE PLAN" title={section.title} />
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="group relative block w-full overflow-hidden rounded-xl"
        >
          <ResponsiveImg
            source={item}
            alt={item.title}
            className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] sm:aspect-[21/9]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-navy)]/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 text-left sm:p-8">
            <h3 className="text-lg font-semibold text-white sm:text-xl">{item.title}</h3>
            <p className="mt-1 text-sm text-white/75">{item.description}</p>
            <span className="mt-3 inline-block text-xs tracking-wide text-[var(--color-gold)]">
              클릭하여 확대
            </span>
          </div>
        </button>
        <ImageLightbox src={imgSrc} alt={item.title} open={lightbox} onClose={() => setLightbox(false)} />
      </div>
    </section>
  );
}

export function CommunitySection() {
  const { config } = useConfig();
  const section = config.community;
  if (!section.items.length) return null;

  return (
    <section id="커뮤니티" className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-bg)] px-6 py-20">
      <div className="mx-auto max-w-[1100px]">
        <FigmaSectionTitle en="COMMUNITY" title={section.title} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {section.items.map((item, i) => (
            <motion.article
              key={item.title}
              className="overflow-hidden rounded-xl bg-white shadow-[0_4px_24px_rgba(15,29,58,0.06)]"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <ResponsiveImg source={item} alt={item.title} className="aspect-square w-full object-cover" />
              <div className="p-3 sm:p-4">
                <h3 className="text-sm font-semibold text-[var(--color-navy)]">{item.title}</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#7a7060] sm:text-xs">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
