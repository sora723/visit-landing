"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useConfig } from "./ConfigProvider";
import { ReservationForm } from "./ReservationForm";
import { useIsMobile } from "@/hooks/useResponsiveImage";
import { getImageFallbackUrl } from "@/lib/image-url";
import { resolvePopupImageUrl, resolvePopupZoomUrl } from "@/lib/popup-image";
import {
  markPopupDismissed,
  shouldShowPopup,
} from "@/lib/utils";
import {
  ZoomExpandHint,
  ZoomLightboxImageFrame,
  useZoomExpandClick,
  useZoomExpandHint,
} from "./ZoomExpandHint";

function ImageZoomModal({
  src,
  onClose,
}: {
  src: string | null;
  onClose: () => void;
}) {
  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[350] flex items-center justify-center bg-black/90 p-4"
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
      <ZoomLightboxImageFrame>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          className="max-h-[92vh] max-w-full object-contain"
          loading="lazy"
          decoding="async"
          onClick={(e) => e.stopPropagation()}
        />
      </ZoomLightboxImageFrame>
    </div>
  );
}

function EventImagePanel({
  src,
  onZoom,
  className,
}: {
  src: string;
  onZoom: () => void;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const { hintVisible, hintFading, dismissHint } = useZoomExpandHint();
  const { handleZoomClick } = useZoomExpandClick(onZoom, dismissHint);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <button
      type="button"
      onClick={handleZoomClick}
      className={`group relative touch-manipulation overflow-hidden rounded-sm border border-white/10 bg-white shadow-2xl ${className ?? ""}`}
      aria-label="이벤트 이미지 확대"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={currentSrc}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full cursor-zoom-in object-contain bg-[#f5f3ef] transition-transform duration-300 group-hover:scale-[1.01]"
        onError={() => setCurrentSrc(getImageFallbackUrl(src, "popup-pc"))}
      />
      <ZoomExpandHint visible={hintVisible} fading={hintFading} compact />
    </button>
  );
}

function ReservationPopupPanel({
  complete,
  onComplete,
  onClose,
  className,
}: {
  complete: boolean;
  onComplete: () => void;
  onClose: () => void;
  className?: string;
}) {
  const { config } = useConfig();

  return (
    <div
      className={`relative flex max-h-[90dvh] flex-col overflow-y-auto rounded-sm border border-white/10 bg-white p-6 shadow-2xl sm:p-7 ${className ?? ""}`}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 text-[#7a7060] hover:text-[var(--color-navy)]"
        onClick={onClose}
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
            onSuccess={onComplete}
          />
        </>
      )}
    </div>
  );
}

export function ReservationPopup() {
  const { config, siteCode } = useConfig();
  const isMobile = useIsMobile();
  const resolvedSiteCode = siteCode || config.siteCode;
  const reservationEnabled = config.settings.popupReservationEnabled !== false;
  const mobileImageSrc = resolvePopupImageUrl(config.popup, "image1", true);
  const pcImage1Src = resolvePopupImageUrl(config.popup, "image1", false);
  const pcImage2Src = resolvePopupImageUrl(config.popup, "image2", false);
  const pcImages = !isMobile
    ? [pcImage1Src, pcImage2Src].filter(Boolean)
    : [];
  const showMobileImage = isMobile && !!mobileImageSrc;
  const hasImages = showMobileImage || pcImages.length > 0;
  const canShowPopup =
    config.settings.popupEnabled && (reservationEnabled || hasImages);
  const popupPanelClass = "w-full max-w-md shrink-0";

  const [visible, setVisible] = useState(false);
  const [mobilePhase, setMobilePhase] = useState<"image" | "reservation">(
    showMobileImage ? "image" : "reservation"
  );
  const [complete, setComplete] = useState(false);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [mobileImgSrc, setMobileImgSrc] = useState(mobileImageSrc);

  useEffect(() => {
    setMobileImgSrc(mobileImageSrc);
  }, [mobileImageSrc]);

  const finishPopup = useCallback(() => {
    setVisible(false);
    markPopupDismissed(resolvedSiteCode);
  }, [resolvedSiteCode]);

  const handleReservationComplete = useCallback(() => {
    setComplete(true);
    setTimeout(() => finishPopup(), 2400);
  }, [finishPopup]);

  useEffect(() => {
    if (!canShowPopup) return;
    if (!shouldShowPopup(resolvedSiteCode)) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [canShowPopup, resolvedSiteCode]);

  useEffect(() => {
    if (!visible) return;
    setMobilePhase(showMobileImage ? "image" : "reservation");
  }, [visible, showMobileImage]);

  if (!canShowPopup || !visible) return null;

  const openReservationFromImage = () => {
    if (reservationEnabled) {
      setMobilePhase("reservation");
      return;
    }
    finishPopup();
  };

  const panelHeightClass = "h-[min(90dvh,560px)] min-h-[420px]";

  return (
    <>
      <AnimatePresence mode="wait">
        {isMobile && mobilePhase === "image" && mobileImageSrc ? (
          <motion.div
            key="mobile-event-image"
            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={openReservationFromImage}
          >
            <motion.div
              className={`relative overflow-hidden rounded-sm border border-white/10 bg-white shadow-2xl ${popupPanelClass}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-sm text-white"
                onClick={openReservationFromImage}
                aria-label="닫기"
              >
                ✕
              </button>
              <button
                type="button"
                onClick={() =>
                  setZoomSrc(resolvePopupZoomUrl(config.popup, "image1", true))
                }
                className="block w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mobileImgSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="max-h-[75dvh] w-full object-contain"
                  onError={() =>
                    setMobileImgSrc(getImageFallbackUrl(mobileImageSrc, "popup-mobile"))
                  }
                />
              </button>
            </motion.div>
          </motion.div>
        ) : reservationEnabled || pcImages.length > 0 ? (
          <motion.div
            key="reservation-popup"
            className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={finishPopup}
          >
            <motion.div
              className={`flex w-full items-stretch gap-3 sm:gap-4 ${
                isMobile ? "max-w-md flex-col" : "flex-row justify-center"
              }`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {pcImages.map((src, index) => (
                <EventImagePanel
                  key={`${src}-${index}`}
                  src={src}
                  onZoom={() =>
                    setZoomSrc(
                      resolvePopupZoomUrl(
                        config.popup,
                        index === 0 ? "image1" : "image2",
                        false
                      )
                    )
                  }
                  className={`hidden md:block ${popupPanelClass} ${panelHeightClass}`}
                />
              ))}

              {reservationEnabled && (
                <ReservationPopupPanel
                  complete={complete}
                  onComplete={handleReservationComplete}
                  onClose={finishPopup}
                  className={`${popupPanelClass} ${!isMobile && pcImages.length ? panelHeightClass : ""}`}
                />
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </>
  );
}
