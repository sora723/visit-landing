import type { ReservationItem } from "./types";
import {
  formatReservationName,
  LIVE_FEED_MAX_MINUTES,
} from "./live-reservation-feed";

export interface DemoSubmission {
  name: string;
  phone: string;
  submittedAt: number;
}

const store = new Map<string, number>();
const submissions: DemoSubmission[] = [];

export function recordDemoSubmission(name: string, phone: string) {
  const key = `${name.trim()}|${phone.replace(/\D/g, "")}`;
  store.set(key, Date.now());
  submissions.unshift({
    name: name.trim(),
    phone: phone.replace(/\D/g, ""),
    submittedAt: Date.now(),
  });
}

export function isDemoDuplicate(name: string, phone: string, blockMs: number) {
  const key = `${name.trim()}|${phone.replace(/\D/g, "")}`;
  const last = store.get(key);
  return last !== undefined && Date.now() - last < blockMs;
}

export function getDemoRecentSubmissions(limit: number): ReservationItem[] {
  const now = Date.now();
  return submissions.slice(0, limit).map((s) => {
    const name = formatReservationName(s.name);
    const minutesAgo = Math.max(0, Math.floor((now - s.submittedAt) / 60000));
    return {
      name,
      minutesAgo,
      isVirtual: false,
      type: "방문예약 신청",
      submittedAt: new Date(s.submittedAt).toISOString(),
    };
  }).filter((s) => s.minutesAgo <= LIVE_FEED_MAX_MINUTES);
}

export function getDemoSubmissionCount() {
  return submissions.length;
}

export function getDemoActiveConsultationCount(withinMinutes = 30) {
  const now = Date.now();
  return submissions.filter(
    (s) => now - s.submittedAt <= withinMinutes * 60 * 1000
  ).length;
}
