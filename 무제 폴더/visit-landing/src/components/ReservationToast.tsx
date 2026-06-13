"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

const TOAST_MS = 3000;

export function ReservationToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => {
      setVisible(true);
      window.setTimeout(() => setVisible(false), TOAST_MS);
    };

    window.addEventListener("reservation-submitted", show);
    return () => window.removeEventListener("reservation-submitted", show);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, x: 24, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="fixed right-4 top-[calc(var(--site-top-offset)+12px)] z-[200] max-w-[min(320px,calc(100vw-32px))] rounded-sm border border-[var(--color-gold)]/35 bg-white px-4 py-3.5 shadow-[0_8px_32px_rgba(15,29,58,0.18)] sm:right-6"
        >
          <p className="text-sm font-bold text-[var(--color-navy)]">방문예약이 접수되었습니다.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#6b7280]">
            담당자가 순차적으로 연락드립니다.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
