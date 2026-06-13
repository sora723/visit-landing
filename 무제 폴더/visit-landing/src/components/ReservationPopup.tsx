"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConfig } from "./ConfigProvider";
import { ReservationForm } from "./ReservationForm";
import { POPUP_SESSION_KEY } from "@/lib/utils";

export function ReservationPopup() {
  const { config } = useConfig();
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!config.settings.popupEnabled) return;
    if (sessionStorage.getItem(POPUP_SESSION_KEY)) return;
    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(POPUP_SESSION_KEY, "1");
    }, 1500);
    return () => clearTimeout(timer);
  }, [config.settings.popupEnabled]);

  if (!config.settings.popupEnabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setVisible(false)}
        >
          <motion.div
            className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-sm border border-white/10 bg-white p-6 shadow-2xl sm:p-7"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-[#7a7060] hover:text-[var(--color-navy)]"
              onClick={() => setVisible(false)}
              aria-label="닫기"
            >
              ✕
            </button>

            {complete ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-2xl text-[var(--color-gold)]">
                  ✓
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-[#7a7060]">
                  {config.popup.completeMessage}
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-center text-xl font-semibold text-[var(--color-navy)] sm:text-2xl">
                  {config.popup.title}
                </h2>
                <ReservationForm
                  buttonText="방문예약하기"
                  redirect={false}
                  variant="compact"
                  source="popup"
                  onSuccess={() => {
                    setComplete(true);
                    setTimeout(() => setVisible(false), 2400);
                  }}
                />
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
