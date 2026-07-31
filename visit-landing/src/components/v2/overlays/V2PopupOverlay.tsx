"use client";

/**
 * V2 popup overlay — V1 ReservationPopup UX, Sheet 자유형 content.
 * Preview: 폼 제출 차단 (V2ReservationFormAdapter isPreview).
 */

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ConversionTrackingConfig } from "@/lib/conversion-tracking";
import type { ValidatedV2Block } from "@/v2/types";
import type { V2RuntimeSiteContext } from "@/v2/v2-runtime-site-context";
import { useIsMobile } from "@/hooks/useResponsiveImage";
import { getImageFallbackUrl } from "@/lib/image-url";
import {
  markPopupDismissed,
  shouldShowPopup,
} from "@/lib/utils";
import {
  ZoomExpandHint,
  ZoomLightboxImageFrame,
  useZoomExpandClick,
} from "@/components/ZoomExpandHint";
import { PinchZoomImage } from "@/components/PinchZoomImage";
import { FormSubmitSecurityProvider } from "@/components/FormSubmitSecurityProvider";
import { V2ReservationFormAdapter } from "@/components/v2/forms/V2ReservationFormAdapter";
import {
  resolveV2PopupButtonText,
  resolveV2PopupCanShow,
  resolveV2PopupCompleteMessage,
  resolveV2PopupImageSrcs,
  resolveV2PopupShowsForm,
  resolveV2PopupTitle,
} from "@/components/v2/popup/v2-popup-config";

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
        <PinchZoomImage
          src={src}
          alt=""
          imgClassName="max-h-[92vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </ZoomLightboxImageFrame>
    </div>
  );
}

function EventImagePanel({
  src,
  onZoom,
  onClose,
  className,
}: {
  src: string;
  onZoom: () => void;
  onClose: () => void;
  className?: string;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const { handleZoomClick } = useZoomExpandClick(onZoom);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <div
      className={`relative overflow-hidden rounded-sm border border-white/10 bg-white shadow-2xl ${className ?? ""}`}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-sm text-white hover:bg-black/60"
        onClick={onClose}
        aria-label="닫기"
      >
        ✕
      </button>
      <button
        type="button"
        onClick={handleZoomClick}
        className="group relative block h-full w-full touch-manipulation"
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
        <ZoomExpandHint compact />
      </button>
    </div>
  );
}

function PopupFormPanel({
  block,
  site,
  conversionTracking,
  isPreview,
  complete,
  onComplete,
  onClose,
  className,
}: {
  block: ValidatedV2Block;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
  isPreview: boolean;
  complete: boolean;
  onComplete: () => void;
  onClose: () => void;
  className?: string;
}) {
  const title = resolveV2PopupTitle(block) || "방문예약";
  const completeMessage = resolveV2PopupCompleteMessage(block);
  const buttonText = resolveV2PopupButtonText(block, site.formButtonText);

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
            {completeMessage}
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-6 text-center text-xl font-semibold text-[var(--color-navy)] sm:text-2xl">
            {title}
          </h2>
          {isPreview ? (
            <V2ReservationFormAdapter
              sectionId={block.sectionId}
              site={site}
              conversionTracking={conversionTracking}
              buttonText={buttonText}
              source="popup"
              isPreview
            />
          ) : (
            <FormSubmitSecurityProvider siteCode={site.siteCode}>
              <V2ReservationFormAdapter
                sectionId={block.sectionId}
                site={site}
                conversionTracking={conversionTracking}
                buttonText={buttonText}
                source="popup"
                redirect={false}
                onSuccess={onComplete}
              />
            </FormSubmitSecurityProvider>
          )}
        </>
      )}
    </div>
  );
}

type Props = {
  block: ValidatedV2Block;
  site: V2RuntimeSiteContext;
  conversionTracking: ConversionTrackingConfig;
  isPreview?: boolean;
};

export function V2PopupOverlay({
  block,
  site,
  conversionTracking,
  isPreview = false,
}: Props) {
  const isMobile = useIsMobile();
  const showForm = resolveV2PopupShowsForm(block);
  const { mobile: mobileImageSrc, pc: pcImages } = resolveV2PopupImageSrcs(block);
  const showMobileImage = isMobile && !!mobileImageSrc;
  const canShow = resolveV2PopupCanShow(block, isMobile);
  const popupPanelClass = "w-full max-w-md shrink-0";
  const resolvedSiteCode = site.siteCode;

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
    if (!canShow) return;
    if (!shouldShowPopup(resolvedSiteCode)) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [canShow, resolvedSiteCode]);

  useEffect(() => {
    if (!visible) return;
    setMobilePhase(showMobileImage ? "image" : "reservation");
  }, [visible, showMobileImage]);

  if (block.componentType !== "popup") return null;
  if (!canShow || !visible) return null;

  const openReservationFromImage = () => {
    if (showForm) {
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
                onClick={() => setZoomSrc(mobileImageSrc)}
                className="relative block w-full touch-manipulation"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mobileImgSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="max-h-[75dvh] w-full cursor-zoom-in object-contain"
                  onError={() =>
                    setMobileImgSrc(
                      getImageFallbackUrl(mobileImageSrc, "popup-mobile")
                    )
                  }
                />
                <ZoomExpandHint compact />
              </button>
            </motion.div>
          </motion.div>
        ) : showForm || pcImages.length > 0 ? (
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
                  onClose={finishPopup}
                  onZoom={() => setZoomSrc(src)}
                  className={`hidden md:block ${popupPanelClass} ${panelHeightClass}`}
                />
              ))}

              {showForm ? (
                <PopupFormPanel
                  block={block}
                  site={site}
                  conversionTracking={conversionTracking}
                  isPreview={isPreview}
                  complete={complete}
                  onComplete={handleReservationComplete}
                  onClose={finishPopup}
                  className={`${popupPanelClass} ${!isMobile && pcImages.length ? panelHeightClass : ""}`}
                />
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ImageZoomModal src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </>
  );
}
