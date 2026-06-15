"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { ReservationCard } from "./ReservationCard";
import { fetchRecentReservations } from "@/lib/api";
import {
  buildDeterministicLiveFeed,
  msUntilNextInjection,
} from "@/lib/deterministic-live-feed";
import { buildVirtualInquiryPool, inferSubmissionStatusLabel } from "@/lib/reservation-form-options";
import {
  LIVE_FEED_MAX_MINUTES,
  LIVE_FEED_MOBILE_MAX,
  LIVE_FEED_PC_MAX,
  anchorReservationTimes,
  calcMinutesAgo,
  collectDismissed,
  createLocalSubmissionItem,
  clearLocalPendingIfSynced,
  clearPendingSubmission,
  feedItemKey,
  loadPendingSubmission,
  savePendingSubmission,
  tickReservationTimes,
} from "@/lib/live-reservation-feed";
import type { ReservationItem } from "@/lib/types";

const TICK_MS = 30_000;
const INSERT_ANIM_MS = 520;
const REAL_PRIORITY_COOLDOWN_MS = 8_000;

function LiveSectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-10 text-center md:mb-12">
      <span className="mb-2 block text-[11px] font-normal tracking-[0.3em] text-[var(--color-gold)]">
        REAL-TIME RESERVATION
      </span>
      <h2 className="text-[clamp(22px,3.5vw,34px)] font-semibold tracking-wide text-white">
        {title}
      </h2>
      <div className="mx-auto mt-4 h-px w-10 bg-[var(--color-gold)]" />
      <div className="mt-3.5 inline-flex items-center gap-1.5">
        <span className="live-dot-pulse h-2 w-2 rounded-full bg-red-500" aria-hidden />
        <span className="live-text-pulse text-[11px] font-bold tracking-[0.25em] text-red-500">
          LIVE
        </span>
        <span className="text-xs tracking-wide text-white/45">
          · 지금 이 시간에도 예약이 진행 중입니다
        </span>
      </div>
    </div>
  );
}

function FeedList({
  items,
  insertAnimKeys,
  newestKey,
  className,
}: {
  items: ReservationItem[];
  insertAnimKeys: Set<string>;
  newestKey: string | null;
  className?: string;
}) {
  return (
    <motion.ul layout className={className ?? "flex flex-col gap-2.5"}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => {
          const key = feedItemKey(item);
          const isNewest = newestKey !== null && key === newestKey;
          return (
            <ReservationCard
              key={key}
              item={item}
              showNewBadge={isNewest}
              isTopCard={isNewest}
              animateInsert={insertAnimKeys.has(key)}
            />
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}

/** 재빌드 시 가상 카드 submittedAt 앵커 유지 — 경과 시간·키 안정 */
function preserveVirtualAnchors(
  previous: ReservationItem[],
  next: ReservationItem[],
  now = Date.now()
): ReservationItem[] {
  const anchorBySlot = new Map<string, string>();
  for (const item of previous) {
    if (item.virtualSlotId && item.submittedAt) {
      anchorBySlot.set(item.virtualSlotId, item.submittedAt);
    }
  }

  return next.map((item) => {
    if (!item.virtualSlotId) return item;
    const anchored = anchorBySlot.get(item.virtualSlotId);
    if (!anchored) return item;
    return {
      ...item,
      submittedAt: anchored,
      minutesAgo: calcMinutesAgo(anchored, now),
    };
  });
}

export function LiveReservationSection() {
  const { config, siteCode } = useConfig();
  const inquiryPool = useMemo(
    () => buildVirtualInquiryPool(config),
    [config]
  );
  const buildMaxCount = LIVE_FEED_PC_MAX;
  const title = config.liveStatus.title || "실시간 방문예약 현황";

  const dismissedRef = useRef<Set<string>>(new Set());
  const pendingLocalRef = useRef<ReservationItem | null>(
    typeof window !== "undefined" ? loadPendingSubmission() : null
  );

  const [items, setItems] = useState<ReservationItem[]>([]);
  const [insertAnimKeys, setInsertAnimKeys] = useState<Set<string>>(() => new Set());
  const [newestKey, setNewestKey] = useState<string | null>(null);
  const newestKeyRef = useRef<string | null>(null);
  const prevItemsRef = useRef<ReservationItem[]>([]);
  const lastRawRef = useRef<ReservationItem[]>([]);
  const virtualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realPriorityUntilRef = useRef(0);
  const mountedRef = useRef(false);
  const clientReadyRef = useRef(false);

  const markInsertAnimation = useCallback((key: string) => {
    setInsertAnimKeys((prev) => new Set(prev).add(key));
    window.setTimeout(() => {
      setInsertAnimKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, INSERT_ANIM_MS);
  }, []);

  const syncNewestHighlight = useCallback(
    (
      built: ReservationItem[],
      previous: ReservationItem[],
      opts?: { animateTop?: boolean }
    ) => {
      const topKey = built[0] ? feedItemKey(built[0]) : null;
      const prevFeedKeys = new Set(previous.map(feedItemKey));
      const incomingAtTop = Boolean(topKey && !prevFeedKeys.has(topKey));

      if (opts?.animateTop && topKey) {
        markInsertAnimation(topKey);
        newestKeyRef.current = topKey;
        setNewestKey(topKey);
        return;
      }

      if (!mountedRef.current) return;

      if (incomingAtTop && topKey) {
        newestKeyRef.current = topKey;
        setNewestKey(topKey);
        return;
      }

      const current = newestKeyRef.current;
      if (!current) return;

      const highlightedIdx = built.findIndex((i) => feedItemKey(i) === current);
      if (highlightedIdx === -1) {
        newestKeyRef.current = null;
        setNewestKey(null);
        return;
      }

      if (highlightedIdx > 0 && topKey && topKey !== current) {
        newestKeyRef.current = topKey;
        setNewestKey(topKey);
      }
    },
    [markInsertAnimation]
  );

  const buildFeed = useCallback(
    (raw: ReservationItem[], now = Date.now()) => {
      const built = buildDeterministicLiveFeed(raw, {
        siteCode,
        maxCount: buildMaxCount,
        virtualEnabled: config.settings.virtualReservationsEnabled,
        dismissed: dismissedRef.current,
        localPending: pendingLocalRef.current,
        inquiryPool,
        now,
      });
      return preserveVirtualAnchors(prevItemsRef.current, built, now);
    },
    [
      siteCode,
      buildMaxCount,
      config.settings.virtualReservationsEnabled,
      inquiryPool,
    ]
  );

  const applyFeed = useCallback(
    (raw: ReservationItem[], opts?: { animateTop?: boolean }) => {
      const built = buildFeed(raw);
      const previous = prevItemsRef.current;

      dismissedRef.current = collectDismissed(
        previous,
        built,
        dismissedRef.current
      );

      syncNewestHighlight(built, previous, opts);
      prevItemsRef.current = built;
      mountedRef.current = true;
      setItems(built);
    },
    [buildFeed, syncNewestHighlight]
  );

  const tickFeed = useCallback(() => {
    if (!config.settings.liveStatusEnabled) return;

    lastRawRef.current = tickReservationTimes(lastRawRef.current);

    if (pendingLocalRef.current?.submittedAt) {
      const minutesAgo = calcMinutesAgo(pendingLocalRef.current.submittedAt);
      if (minutesAgo > LIVE_FEED_MAX_MINUTES) {
        pendingLocalRef.current = null;
        clearPendingSubmission();
      } else {
        pendingLocalRef.current = {
          ...pendingLocalRef.current,
          minutesAgo,
        };
      }
    }

    const ticked = tickReservationTimes(prevItemsRef.current).filter(
      (item) => item.minutesAgo <= LIVE_FEED_MAX_MINUTES
    );

    if (ticked.length < buildMaxCount && config.settings.virtualReservationsEnabled) {
      applyFeed(lastRawRef.current);
      return;
    }

    prevItemsRef.current = ticked;
    setItems(ticked);
  }, [
    applyFeed,
    buildMaxCount,
    config.settings.liveStatusEnabled,
    config.settings.virtualReservationsEnabled,
  ]);

  const loadItems = useCallback(() => {
    if (!config.settings.liveStatusEnabled) return;
    fetchRecentReservations(
      config.settings.virtualReservationsEnabled,
      LIVE_FEED_PC_MAX,
      siteCode
    )
      .then((raw) => {
        lastRawRef.current = anchorReservationTimes(raw);
        pendingLocalRef.current = clearLocalPendingIfSynced(
          pendingLocalRef.current,
          lastRawRef.current
        );
        applyFeed(lastRawRef.current);
      })
      .catch(() => {});
  }, [
    config.settings.liveStatusEnabled,
    config.settings.virtualReservationsEnabled,
    applyFeed,
    siteCode,
  ]);

  const scheduleDeterministicInject = useCallback(() => {
    if (!config.settings.virtualReservationsEnabled) return;
    if (virtualTimerRef.current) clearTimeout(virtualTimerRef.current);

    const delay =
      Date.now() < realPriorityUntilRef.current
        ? REAL_PRIORITY_COOLDOWN_MS
        : msUntilNextInjection(siteCode);

    virtualTimerRef.current = setTimeout(() => {
      applyFeed(lastRawRef.current, { animateTop: true });
      scheduleDeterministicInject();
    }, delay);
  }, [applyFeed, config.settings.virtualReservationsEnabled, siteCode]);

  const deferVirtualForRealSubmission = useCallback(() => {
    realPriorityUntilRef.current = Date.now() + REAL_PRIORITY_COOLDOWN_MS;
    if (virtualTimerRef.current) clearTimeout(virtualTimerRef.current);
    scheduleDeterministicInject();
  }, [scheduleDeterministicInject]);

  useLayoutEffect(() => {
    if (clientReadyRef.current) return;
    clientReadyRef.current = true;
    pendingLocalRef.current = loadPendingSubmission();
    const built = buildFeed([]);
    prevItemsRef.current = built;
    setItems(built);
  }, [buildFeed]);

  useEffect(() => {
    loadItems();
    const refresh = setInterval(loadItems, 45000);
    return () => clearInterval(refresh);
  }, [loadItems]);

  useEffect(() => {
    scheduleDeterministicInject();
    return () => {
      if (virtualTimerRef.current) clearTimeout(virtualTimerRef.current);
    };
  }, [scheduleDeterministicInject]);

  useEffect(() => {
    const tick = setInterval(tickFeed, TICK_MS);
    return () => clearInterval(tick);
  }, [tickFeed]);

  useEffect(() => {
    dismissedRef.current.clear();
    applyFeed(lastRawRef.current);
  }, [inquiryPool, siteCode, applyFeed]);

  useEffect(() => {
    const onSubmitted = (event: Event) => {
      const detail = (event as CustomEvent<{
        name: string;
        unitType?: string;
        visitDate?: string;
      }>).detail;
      const name = detail?.name?.trim();
      if (!name) return;

      const statusLabel = inferSubmissionStatusLabel(
        { unitType: detail.unitType, visitDate: detail.visitDate },
        config
      );
      pendingLocalRef.current = createLocalSubmissionItem(
        name,
        new Date().toISOString(),
        statusLabel
      );
      savePendingSubmission(name);
      deferVirtualForRealSubmission();
      applyFeed(lastRawRef.current, { animateTop: true });
      setTimeout(loadItems, 2000);
    };

    window.addEventListener("reservation-submitted", onSubmitted);
    return () =>
      window.removeEventListener("reservation-submitted", onSubmitted);
  }, [applyFeed, loadItems, deferVirtualForRealSubmission, config]);

  const mobileItems = items.slice(0, LIVE_FEED_MOBILE_MAX);
  const pcItems = items.slice(0, LIVE_FEED_PC_MAX);

  if (!config.settings.liveStatusEnabled) return null;

  return (
    <section
      id="live-reservations"
      className="scroll-mt-[var(--site-top-offset)] bg-[var(--color-navy)] px-6 py-[72px]"
    >
      <div className="mx-auto w-full max-w-[1100px]">
        <LiveSectionHeader title={title} />

        <div className="md:hidden">
          <LayoutGroup id="live-reservation-list-mobile">
            <FeedList
              items={mobileItems}
              insertAnimKeys={insertAnimKeys}
              newestKey={newestKey}
            />
          </LayoutGroup>
        </div>

        <div className="hidden md:grid md:grid-cols-2 md:gap-3">
          <LayoutGroup id="live-reservation-list-desktop">
            <FeedList
              items={pcItems}
              insertAnimKeys={insertAnimKeys}
              newestKey={newestKey}
              className="contents"
            />
          </LayoutGroup>
        </div>
      </div>
    </section>
  );
}
