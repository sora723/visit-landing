"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useConfig } from "./ConfigProvider";
import { appendSiteCodeQuery } from "@/lib/resolve-site-code";

export function HeroFloatingBar() {
  const { config, siteCode } = useConfig();
  const stats = config.hero.floatingStats;
  const [todayCount, setTodayCount] = useState(stats.todayReservations);
  const [activeCount, setActiveCount] = useState(stats.activeConsultations);

  useEffect(() => {
    fetch(appendSiteCodeQuery("/api/reservations?limit=50", siteCode), {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) return;
        const realCount = json.data?.realCount ?? 0;
        const items: { minutesAgo: number; isVirtual: boolean }[] =
          json.data?.items ?? [];
        const recentActive = items.filter(
          (i) => !i.isVirtual && i.minutesAgo <= 30
        ).length;

        if (realCount > 0) {
          setTodayCount(stats.todayReservations + realCount);
        }
        if (recentActive > 0) {
          setActiveCount(Math.max(stats.activeConsultations, recentActive));
        }
      })
      .catch(() => {});
  }, [stats.todayReservations, stats.activeConsultations, siteCode]);

  return (
    <motion.div
      className="absolute inset-x-4 bottom-20 z-20 sm:inset-x-auto sm:left-1/2 sm:max-w-md sm:-translate-x-1/2 lg:bottom-16"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
    >
      <div className="flex items-center justify-between gap-4 rounded-full border border-white/12 bg-[#0f1a2e]/88 px-4 py-2 shadow-lg shadow-black/25 backdrop-blur-md sm:px-5">
        <p className="min-w-0 truncate text-[11px] text-white/55 sm:text-xs">
          {stats.todayLabel}{" "}
          <span className="stat-number ml-0.5 font-bold text-[#dfc88a]">
            [{todayCount}]
          </span>
        </p>
        <div className="h-3 w-px shrink-0 bg-white/12" />
        <p className="min-w-0 truncate text-[11px] text-white/55 sm:text-xs">
          {stats.activeLabel}{" "}
          <span className="stat-number ml-0.5 font-bold text-[#dfc88a]">
            [{activeCount}]
          </span>
        </p>
      </div>
    </motion.div>
  );
}
