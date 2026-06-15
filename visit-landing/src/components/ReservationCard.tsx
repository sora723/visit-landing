"use client";

import { motion } from "framer-motion";
import {
  formatReservationName,
  surnameAvatarChar,
} from "@/lib/live-reservation-feed";
import { formatLiveStatusLabel } from "@/lib/reservation-form-options";
import type { ReservationItem } from "@/lib/types";
import { formatMinutesAgo } from "@/lib/utils";
import { useConfig } from "./ConfigProvider";

const insertTransition = {
  layout: { duration: 0.48, ease: [0, 0, 0.2, 1] as const },
  opacity: { duration: 0.5, ease: "easeOut" as const },
  y: { duration: 0.5, ease: "easeOut" as const },
};

const exitTransition = {
  opacity: { duration: 0.22, ease: "easeOut" as const },
  layout: { duration: 0.35, ease: [0, 0, 0.2, 1] as const },
};

export function ReservationCard({
  item,
  showNewBadge,
  animateInsert,
  isTopCard,
}: {
  item: ReservationItem;
  showNewBadge: boolean;
  animateInsert: boolean;
  isTopCard?: boolean;
}) {
  const { config } = useConfig();
  const name = formatReservationName(item.name);
  const typeLabel = formatLiveStatusLabel(item.type, config);
  const timeLabel = formatMinutesAgo(item.minutesAgo);
  const avatarChar = surnameAvatarChar(item.name);

  return (
    <motion.li
      layout
      initial={animateInsert ? { opacity: 0, y: -28 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={animateInsert ? insertTransition : exitTransition}
      className={`live-feed-row overflow-hidden ${animateInsert ? "relative z-10" : ""}`}
    >
      <div
        className={`live-reservation-card flex items-center justify-between gap-3 rounded-2xl border px-[18px] py-3.5 md:px-5 md:py-4 ${
          isTopCard && showNewBadge
            ? "live-reservation-card-top live-reservation-card-new border-[var(--color-gold)]/45 bg-[var(--color-gold)]/[0.07]"
            : "border-white/[0.08] bg-white/[0.05]"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              isTopCard ? "bg-[var(--color-gold)]/25" : "bg-white/10"
            }`}
          >
            <span
              className={`text-sm font-semibold ${
                isTopCard ? "text-[var(--color-gold)]" : "text-white/70"
              }`}
            >
              {avatarChar}
            </span>
          </div>

          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">
              <span className="font-semibold">{name}</span>
              <span className="font-normal"> 고객님</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-white/50">{typeLabel}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {showNewBadge && (
            <span className="live-new-badge rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-[0.15em]">
              NEW
            </span>
          )}
          <span key={timeLabel} className="live-time-tick text-[11px] text-white/45">
            {timeLabel}
          </span>
        </div>
      </div>
    </motion.li>
  );
}
