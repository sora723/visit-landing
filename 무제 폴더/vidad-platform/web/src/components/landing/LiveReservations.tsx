"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSite } from "./SiteProvider";
import { fetchRecentReservations } from "@/lib/api";
import type { ReservationItem } from "@/lib/types";
import { formatMinutesAgo } from "@/lib/utils";

export function LiveReservations() {
  const { site } = useSite();
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [mobileIndex, setMobileIndex] = useState(0);

  useEffect(() => {
    if (!site.liveStatus.enabled) return;
    fetchRecentReservations(site.siteCode, 12).then(setItems);
    const refresh = setInterval(() => {
      fetchRecentReservations(site.siteCode, 12).then(setItems);
    }, 60000);
    return () => clearInterval(refresh);
  }, [site.liveStatus.enabled, site.siteCode]);

  useEffect(() => {
    if (items.length <= 3) return;
    const timer = setInterval(() => {
      setMobileIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (!site.liveStatus.enabled || items.length === 0) return null;

  const mobileVisible = [
    items[mobileIndex % items.length],
    items[(mobileIndex + 1) % items.length],
    items[(mobileIndex + 2) % items.length],
  ];

  return (
    <section className="border-y border-white/5 bg-[#0a1220] py-14">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mb-8 text-center">
          <h2 className="font-serif text-2xl font-semibold text-white">
            {site.liveStatus.title}
          </h2>
          <p className="mt-2 text-sm text-white/50">{site.liveStatus.subtitle}</p>
        </div>

        {/* Mobile: vertical rolling */}
        <div className="space-y-3 md:hidden">
          <AnimatePresence mode="wait">
            {mobileVisible.map((item, i) => (
              <motion.div
                key={`${item.name}-${item.minutesAgo}-${mobileIndex}-${i}`}
                className="flex items-center gap-3 rounded-sm border border-white/8 bg-white/4 px-4 py-3.5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                <span className="text-gold">✓</span>
                <span className="flex-1 text-sm text-white/85">
                  {item.name} 고객님 방문예약 접수
                </span>
                <span className="text-xs text-white/40">
                  {formatMinutesAgo(item.minutesAgo)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* PC: card grid */}
        <div className="hidden grid-cols-2 gap-3 md:grid lg:grid-cols-4">
          {items.slice(0, 12).map((item) => (
            <motion.div
              key={`${item.name}-${item.submittedAt}`}
              className="rounded-sm border border-white/8 bg-white/4 px-4 py-4 transition hover:-translate-y-0.5 hover:border-gold/20 hover:shadow-lg hover:shadow-gold/5"
              whileHover={{ y: -2 }}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-gold text-sm">✓</span>
                <span className="text-sm font-medium text-white">
                  {item.name} 고객님
                </span>
              </div>
              <p className="text-xs text-white/50">방문예약 접수</p>
              <p className="mt-1 text-xs text-white/35">
                {formatMinutesAgo(item.minutesAgo)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
