"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSite } from "./SiteProvider";
import { scrollToReservation } from "@/lib/utils";

export function HeroSection() {
  const { site } = useSite();
  const benefits = site.hero.benefits.length
    ? site.hero.benefits
    : ["계약금 500만원", "중도금 무이자", "발코니 확장 무상"];
  const [activeBenefit, setActiveBenefit] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBenefit((prev) => (prev + 1) % benefits.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [benefits.length]);

  return (
    <section className="relative min-h-screen overflow-hidden bg-navy">
      {/* Ken Burns background */}
      <div className="absolute inset-0 overflow-hidden">
        {site.hero.image && (
          <motion.div
            className="absolute inset-[-8%] bg-cover bg-center"
            style={{ backgroundImage: `url(${site.hero.image})` }}
            animate={{ scale: [1, 1.1] }}
            transition={{ duration: 22, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/80 to-navy/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/30" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center gap-12 px-6 pb-32 pt-28 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10 lg:pb-24 lg:pt-32">
        {/* Left: copy + benefits */}
        <div className="flex-1 text-center lg:text-left">
          <motion.p
            className="mb-3 text-xs font-semibold tracking-[0.25em] text-gold"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            PREMIUM RESIDENCE
          </motion.p>
          <motion.p
            className="mb-2 text-sm text-white/60"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            {site.meta.siteName}
          </motion.p>
          <motion.h1
            className="mb-4 font-serif text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {site.hero.hook}
          </motion.h1>
          <motion.p
            className="mb-8 text-base text-white/75 sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
          >
            {site.hero.sub}
          </motion.p>

          <motion.div
            className="mb-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center lg:justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {benefits.map((benefit, i) => (
              <motion.div
                key={benefit}
                className="relative overflow-hidden rounded-sm border px-5 py-3.5 backdrop-blur-md transition-all duration-500"
                animate={{
                  y: activeBenefit === i ? -4 : 0,
                  borderColor:
                    activeBenefit === i
                      ? "rgba(201, 169, 98, 0.7)"
                      : "rgba(255,255,255,0.12)",
                  backgroundColor:
                    activeBenefit === i
                      ? "rgba(201, 169, 98, 0.12)"
                      : "rgba(255,255,255,0.06)",
                  boxShadow:
                    activeBenefit === i
                      ? "0 8px 32px rgba(201,169,98,0.2)"
                      : "0 0 0 rgba(0,0,0,0)",
                }}
              >
                {activeBenefit === i && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: 1.2, ease: "easeInOut" }}
                  />
                )}
                <span className="relative text-sm font-medium text-white">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.button
            type="button"
            onClick={scrollToReservation}
            className="bg-gold px-10 py-4 text-sm font-semibold text-navy transition hover:bg-gold-light"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            whileTap={{ scale: 0.98 }}
          >
            방문예약하기
          </motion.button>
        </div>

        {/* Right: building image glass card */}
        <motion.div
          className="w-full max-w-lg flex-shrink-0 lg:max-w-xl"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <div className="overflow-hidden rounded-sm border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
            {site.hero.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.hero.image}
                alt={site.meta.siteName}
                className="aspect-[4/5] w-full object-cover"
              />
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
