"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSite } from "./SiteProvider";
import { popupSessionKey } from "@/lib/utils";

export function ReservationPopup() {
  const { site, submit, submitting } = useSite();
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (!site.popup.enabled) return;
    const key = popupSessionKey(site.siteCode);
    if (sessionStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(key, "1");
    }, 1500);
    return () => clearTimeout(timer);
  }, [site.popup.enabled, site.siteCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || !phone.trim()) {
      setError("이름과 연락처를 입력해주세요.");
      return;
    }
    if (!agreed) {
      setError("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }
    const result = await submit(name, phone, { redirect: false });
    if (result.success) {
      setComplete(true);
      setTimeout(() => setVisible(false), 2200);
    } else {
      setError(result.message ?? "접수에 실패했습니다.");
    }
  }

  if (!site.popup.enabled) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && setVisible(false)}
        >
          <motion.div
            className="relative w-full max-w-md rounded-sm border border-white/10 bg-[#0f1a2e] p-8 shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-4 top-4 text-white/40 transition hover:text-white"
              onClick={() => setVisible(false)}
              aria-label="닫기"
            >
              ✕
            </button>

            {complete ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                  ✓
                </div>
                <p className="whitespace-pre-line text-sm leading-relaxed text-white/80">
                  {site.popup.completeMessage}
                </p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-center font-serif text-2xl font-semibold text-white">
                  {site.popup.title}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/35 outline-none transition focus:border-gold/50"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="연락처"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className="w-full border border-white/15 bg-white/5 px-4 py-3.5 text-white placeholder:text-white/35 outline-none transition focus:border-gold/50"
                    required
                  />
                  <label className="flex items-start gap-2 text-xs leading-relaxed text-white/60">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-0.5 accent-gold"
                    />
                    <span className="whitespace-pre-line">{site.popup.privacyText}</span>
                  </label>
                  {error && <p className="text-center text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gold py-4 text-sm font-semibold text-navy transition hover:bg-gold-light disabled:opacity-60"
                  >
                    {submitting ? "처리 중..." : "방문예약하기"}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
