"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecentReservations } from "@/lib/api";
import {
  formatReservationName,
  formatReservationType,
  surnameAvatarChar,
  tickReservationTimes,
  sortByRecency,
  LIVE_FEED_MAX_MINUTES,
} from "@/lib/live-reservation-feed";
import { formatMinutesAgo } from "@/lib/utils";
import type { ReservationItem } from "@/lib/types";
import {
  V2_LIVE_FEED_EMPTY_MESSAGE,
  V2_LIVE_FEED_ERROR_MESSAGE,
  V2_LIVE_FEED_LOADING_MESSAGE,
  V2_LIVE_FEED_POLL_INTERVAL_MS,
  V2_LIVE_FEED_PREVIEW_MESSAGE,
  v2LiveFeedFetchLimit,
  v2LiveFeedVisibleLimit,
  type V2LiveFeedDisplayCopy,
} from "@/components/v2/live-feed/v2-live-feed-config";

export type V2LiveFeedClientProps = {
  siteCode: string;
  isPreview?: boolean;
  copy: V2LiveFeedDisplayCopy;
};

type LoadState = "loading" | "ready" | "empty" | "error";

function sanitizeDisplayItems(items: ReservationItem[]): ReservationItem[] {
  return sortByRecency(
    tickReservationTimes(items).filter(
      (item) =>
        !item.isVirtual &&
        item.minutesAgo <= LIVE_FEED_MAX_MINUTES &&
        Boolean(formatReservationName(item.name))
    )
  ).map((item) => ({
    name: formatReservationName(item.name),
    minutesAgo: item.minutesAgo,
    isVirtual: false,
    type: formatReservationType(item.type),
    submittedAt: item.submittedAt,
  }));
}

function FeedRow({ item }: { item: ReservationItem }) {
  const name = formatReservationName(item.name);
  const typeLabel = formatReservationType(item.type);
  const timeLabel = formatMinutesAgo(item.minutesAgo);
  const avatar = surnameAvatarChar(item.name);

  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-sm font-semibold text-black/70"
          aria-hidden
        >
          {avatar}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-black/90">
            <span className="font-semibold">{name}</span>
            <span className="font-normal"> 고객님</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-black/50">{typeLabel}</p>
        </div>
      </div>
      <span className="shrink-0 text-[11px] text-black/45">{timeLabel}</span>
    </li>
  );
}

export function V2LiveFeedClient({
  siteCode,
  isPreview = false,
  copy,
}: V2LiveFeedClientProps) {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [state, setState] = useState<LoadState>(
    isPreview ? "ready" : "loading"
  );
  const [isMobile, setIsMobile] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inViewRef = useRef(false);
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const code = String(siteCode || "").trim();

  const clearPoll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    if (isPreview || !code) return;
    if (typeof document !== "undefined" && document.hidden) return;
    if (!inViewRef.current) return;
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      const raw = await fetchRecentReservations(
        false,
        v2LiveFeedFetchLimit(),
        code
      );
      if (!mountedRef.current) return;
      const next = sanitizeDisplayItems(raw);
      setItems(next);
      setState(next.length === 0 ? "empty" : "ready");
    } catch {
      if (!mountedRef.current) return;
      setState((prev) => (prev === "ready" || prev === "empty" ? prev : "error"));
    } finally {
      inFlightRef.current = false;
    }
  }, [code, isPreview]);

  const ensurePoll = useCallback(() => {
    if (isPreview || !code) return;
    if (typeof document !== "undefined" && document.hidden) {
      clearPoll();
      return;
    }
    if (!inViewRef.current) {
      clearPoll();
      return;
    }
    if (timerRef.current) return;
    void load();
    timerRef.current = setInterval(() => {
      void load();
    }, V2_LIVE_FEED_POLL_INTERVAL_MS);
  }, [clearPoll, code, isPreview, load]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearPoll();
    };
  }, [clearPoll]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isPreview || !code) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      inViewRef.current = true;
      ensurePoll();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        inViewRef.current = visible;
        if (visible) ensurePoll();
        else clearPoll();
      },
      { root: null, threshold: 0.05 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearPoll();
    };
  }, [clearPoll, code, ensurePoll, isPreview]);

  useEffect(() => {
    if (isPreview || !code) return;
    const onVisibility = () => {
      if (document.hidden) clearPoll();
      else ensurePoll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [clearPoll, code, ensurePoll, isPreview]);

  const visible = items.slice(0, v2LiveFeedVisibleLimit(isMobile));

  return (
    <div ref={rootRef} className="w-full">
      {copy.eyebrow ? (
        <p className="mb-1 text-sm font-medium tracking-wide text-black/55">
          {copy.eyebrow}
        </p>
      ) : null}
      {copy.badge ? (
        <p className="mb-2 text-xs font-semibold uppercase text-[#0f1a2e]">
          {copy.badge}
        </p>
      ) : null}
      {copy.title ? (
        <h2 className="text-2xl font-semibold tracking-tight text-pretty">
          {copy.title}
        </h2>
      ) : null}
      {copy.subtitle ? (
        <p className="mt-2 text-base text-black/70 text-pretty">{copy.subtitle}</p>
      ) : null}
      {copy.description ? (
        <p className="mt-2 text-sm text-black/65 text-pretty">{copy.description}</p>
      ) : null}

      <div className="mt-6">
        {isPreview ? (
          <p
            className="rounded-xl border border-dashed border-black/15 bg-black/[0.03] px-4 py-6 text-center text-sm text-black/60"
            role="status"
          >
            {V2_LIVE_FEED_PREVIEW_MESSAGE}
          </p>
        ) : state === "loading" ? (
          <p className="px-1 py-4 text-sm text-black/50" role="status">
            {V2_LIVE_FEED_LOADING_MESSAGE}
          </p>
        ) : state === "error" && items.length === 0 ? (
          <p className="px-1 py-4 text-sm text-black/50" role="status">
            {V2_LIVE_FEED_ERROR_MESSAGE}
          </p>
        ) : state === "empty" || visible.length === 0 ? (
          <p className="px-1 py-4 text-sm text-black/50" role="status">
            {V2_LIVE_FEED_EMPTY_MESSAGE}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {visible.map((item, index) => (
              <FeedRow
                key={`${item.name}|${item.submittedAt ?? item.minutesAgo}|${index}`}
                item={item}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
