"use client";

import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { ReservationCard } from "./ReservationCard";
import { fetchRecentReservations } from "@/lib/api";
import {
  buildInitialFeedStack,
  createInjectionItemAtIndex,
  currentInjectionIndex,
  msUntilNextInjection,
} from "@/lib/deterministic-live-feed";
import { buildVirtualInquiryPool, inferSubmissionStatusLabel } from "@/lib/reservation-form-options";
import {
  LIVE_FEED_MAX_MINUTES,
  LIVE_FEED_MOBILE_MAX,
  LIVE_FEED_PC_MAX,
  anchorReservationTimes,
  calcMinutesAgo,
  clearLocalPendingIfSynced,
  clearPendingSubmission,
  createLocalSubmissionItem,
  feedItemKey,
  loadPendingSubmission,
  prependToFeedStack,
  savePendingSubmission,
  sortByRecency,
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

export function LiveReservationSection() {
  const { config, siteCode } = useConfig();
  const inquiryPool = useMemo(
    () => buildVirtualInquiryPool(config),
    [config]
  );
  const mobileMax =
    config.liveReservation?.mobileVisibleCount ?? LIVE_FEED_MOBILE_MAX;
  const pcMax = config.liveReservation?.pcVisibleCount ?? LIVE_FEED_PC_MAX;
  const buildMaxCount = pcMax;
  const title = config.liveStatus.title || "실시간 방문예약 현황";

  const dismissedRef = useRef<Set<string>>(new Set());
  const pendingLocalRef = useRef<ReservationItem | null>(
    typeof window !== "undefined" ? loadPendingSubmission() : null
  );

  const [items, setItems] = useState<ReservationItem[]>([]);
  const [insertAnimKeys, setInsertAnimKeys] = useState<Set<string>>(() => new Set());
  const [newestKey, setNewestKey] = useState<string | null>(null);
  const newestKeyRef = useRef<string | null>(null);
  const stackRef = useRef<ReservationItem[]>([]);
  const lastRawRef = useRef<ReservationItem[]>([]);
  const virtualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realPriorityUntilRef = useRef(0);
  const lastInjectionIndexRef = useRef(-1);
  const mountedRef = useRef(false);
  const clientReadyRef = useRef(false);
  const prevSiteCodeRef = useRef(siteCode);

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
      const prevTopKey = previous[0] ? feedItemKey(previous[0]) : null;
      const isNewTop = Boolean(topKey && topKey !== prevTopKey);

      if (isNewTop && topKey && opts?.animateTop) {
        markInsertAnimation(topKey);
      }

      if (topKey) {
        newestKeyRef.current = topKey;
        setNewestKey(topKey);
      } else {
        newestKeyRef.current = null;
        setNewestKey(null);
      }
    },
    [markInsertAnimation]
  );

  const commitStack = useCallback(
    (built: ReservationItem[], previous: ReservationItem[], opts?: { animateTop?: boolean }) => {
      syncNewestHighlight(built, previous, opts);
      stackRef.current = built;
      mountedRef.current = true;
      setItems(built);
    },
    [syncNewestHighlight]
  );

  const initializeStack = useCallback(
    (raw: ReservationItem[], animateTop = false) => {
      const previous = stackRef.current;
      const built = buildInitialFeedStack(raw, {
        siteCode,
        maxCount: buildMaxCount,
        virtualEnabled: config.settings.virtualReservationsEnabled,
        dismissed: dismissedRef.current,
        localPending: pendingLocalRef.current,
        inquiryPool,
      });
      lastInjectionIndexRef.current = currentInjectionIndex(siteCode);
      commitStack(built, previous, animateTop ? { animateTop: true } : undefined);
    },
    [
      siteCode,
      buildMaxCount,
      config.settings.virtualReservationsEnabled,
      inquiryPool,
      commitStack,
    ]
  );

  const prependIncoming = useCallback(
    (incoming: ReservationItem, animateTop = false) => {
      const previous = stackRef.current;
      const built = prependToFeedStack(
        previous,
        incoming,
        buildMaxCount,
        dismissedRef.current
      );
      commitStack(built, previous, animateTop ? { animateTop: true } : undefined);
    },
    [buildMaxCount, commitStack]
  );

  const mergeRealFromApi = useCallback(
    (raw: ReservationItem[]) => {
      const anchored = anchorReservationTimes(raw);
      lastRawRef.current = anchored;
      pendingLocalRef.current = clearLocalPendingIfSynced(
        pendingLocalRef.current,
        anchored
      );

      if (pendingLocalRef.current) {
        prependIncoming(pendingLocalRef.current, false);
      }

      const stackKeys = new Set(stackRef.current.map(feedItemKey));
      let changed = false;

      for (const item of sortByRecency(anchored.filter((i) => !i.isVirtual))) {
        const key = feedItemKey(item);
        if (stackKeys.has(key)) continue;
        stackKeys.add(key);
        const previous = stackRef.current;
        const built = prependToFeedStack(
          previous,
          item,
          buildMaxCount,
          dismissedRef.current
        );
        commitStack(built, previous);
        changed = true;
      }

      return changed;
    },
    [buildMaxCount, commitStack, prependIncoming]
  );

  const tickFeed = useCallback(() => {
    if (!config.settings.liveStatusEnabled) return;

    if (pendingLocalRef.current?.submittedAt) {
      const minutesAgo = calcMinutesAgo(pendingLocalRef.current.submittedAt);
      if (minutesAgo > LIVE_FEED_MAX_MINUTES) {
        pendingLocalRef.current = null;
        clearPendingSubmission();
      }
    }

    const previous = stackRef.current;
    const ticked = sortByRecency(
      tickReservationTimes(previous).filter(
        (item) => item.minutesAgo <= LIVE_FEED_MAX_MINUTES
      )
    );

    if (ticked.length !== previous.length) {
      commitStack(ticked, previous);
      return;
    }

    const timesChanged = ticked.some(
      (item, i) => item.minutesAgo !== previous[i]?.minutesAgo
    );
    if (timesChanged) {
      stackRef.current = ticked;
      setItems(ticked);
    }
  }, [commitStack, config.settings.liveStatusEnabled]);

  const loadItems = useCallback(() => {
    if (!config.settings.liveStatusEnabled) return;
    fetchRecentReservations(
      config.settings.virtualReservationsEnabled,
      pcMax,
      siteCode
    )
      .then((raw) => {
        mergeRealFromApi(raw);
      })
      .catch(() => {});
  }, [
    config.settings.liveStatusEnabled,
    config.settings.virtualReservationsEnabled,
    mergeRealFromApi,
    siteCode,
    pcMax,
  ]);

  const scheduleDeterministicInject = useCallback(() => {
    if (!config.settings.virtualReservationsEnabled) return;
    if (virtualTimerRef.current) clearTimeout(virtualTimerRef.current);

    const delay =
      Date.now() < realPriorityUntilRef.current
        ? REAL_PRIORITY_COOLDOWN_MS
        : msUntilNextInjection(siteCode);

    virtualTimerRef.current = setTimeout(() => {
      const idx = currentInjectionIndex(siteCode);
      if (idx > lastInjectionIndexRef.current) {
        lastInjectionIndexRef.current = idx;
        const item = createInjectionItemAtIndex(siteCode, idx, inquiryPool);
        prependIncoming(item, true);
      }
      scheduleDeterministicInject();
    }, delay);
  }, [
    config.settings.virtualReservationsEnabled,
    inquiryPool,
    prependIncoming,
    siteCode,
  ]);

  const deferVirtualForRealSubmission = useCallback(() => {
    realPriorityUntilRef.current = Date.now() + REAL_PRIORITY_COOLDOWN_MS;
    if (virtualTimerRef.current) clearTimeout(virtualTimerRef.current);
    scheduleDeterministicInject();
  }, [scheduleDeterministicInject]);

  useLayoutEffect(() => {
    if (clientReadyRef.current) return;
    clientReadyRef.current = true;
    pendingLocalRef.current = loadPendingSubmission();
    initializeStack([]);
  }, [initializeStack]);

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
    if (prevSiteCodeRef.current === siteCode) return;
    prevSiteCodeRef.current = siteCode;
    dismissedRef.current.clear();
    initializeStack(lastRawRef.current);
  }, [siteCode, initializeStack]);

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
      prependIncoming(pendingLocalRef.current, true);
      setTimeout(loadItems, 2000);
    };

    window.addEventListener("reservation-submitted", onSubmitted);
    return () =>
      window.removeEventListener("reservation-submitted", onSubmitted);
  }, [prependIncoming, loadItems, deferVirtualForRealSubmission, config]);

  const mobileItems = items.slice(0, mobileMax);
  const pcItems = items.slice(0, pcMax);

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
