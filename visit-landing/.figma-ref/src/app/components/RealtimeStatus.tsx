import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const SURNAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "전", "홍"];
const WEIGHTS = [30, 20, 12, 8, 7, 5, 4, 3, 3, 2, 1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5];
const UNIT_TYPES = ["84A형", "84B형", "101형", "112형"];
const VISIT_TIMES = ["오전 10시", "오전 11시", "오후 1시", "오후 2시", "오후 3시", "오후 4시", "오후 5시"];

function getWeightedSurname() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SURNAMES.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SURNAMES[i];
  }
  return SURNAMES[0];
}

function maskPhone() {
  const end = String(Math.floor(Math.random() * 9000) + 1000);
  return `010-****-${end}`;
}

interface Entry {
  id: number;
  surname: string;
  phone: string;
  unitType: string;
  visitTime: string;
  timestamp: number;
  isNew: boolean;
}

let idCounter = 100;

function createEntry(isNew = false): Entry {
  idCounter++;
  return {
    id: idCounter,
    surname: getWeightedSurname(),
    phone: maskPhone(),
    unitType: UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)],
    visitTime: VISIT_TIMES[Math.floor(Math.random() * VISIT_TIMES.length)],
    timestamp: Date.now(),
    isNew,
  };
}

function generateInitial(): Entry[] {
  const now = Date.now();
  const entries: Entry[] = [];
  for (let i = 0; i < 18; i++) {
    const minutesAgo = Math.random() * 19.5;
    const e = createEntry(false);
    e.timestamp = now - minutesAgo * 60000;
    e.isNew = false;
    entries.push(e);
  }
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

function getTimeAgo(timestamp: number): string | null {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(diff / 60000);
  if (secs < 60) return "방금 전";
  if (mins < 20) return `${mins}분 전`;
  return null;
}

export function RealtimeStatus() {
  const [entries, setEntries] = useState<Entry[]>(generateInitial);
  const [newestId, setNewestId] = useState<number | null>(null);
  const [, forceUpdate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clockTimer = setInterval(() => forceUpdate((n) => n + 1), 30000);
    return () => clearInterval(clockTimer);
  }, []);

  // 실제 접수 발생 시 목록에 즉시 추가
  useEffect(() => {
    const handler = (e: Event) => {
      const { surname, phone } = (e as CustomEvent<{ surname: string; phone: string }>).detail;
      const newEntry: Entry = {
        id: ++idCounter,
        surname,
        phone,
        unitType: UNIT_TYPES[Math.floor(Math.random() * UNIT_TYPES.length)],
        visitTime: VISIT_TIMES[Math.floor(Math.random() * VISIT_TIMES.length)],
        timestamp: Date.now(),
        isNew: true,
      };
      setNewestId(newEntry.id);
      setEntries((prev) => {
        const now = Date.now();
        const filtered = prev.filter((en) => now - en.timestamp < 20 * 60000);
        return [newEntry, ...filtered];
      });
      setTimeout(() => {
        setEntries((prev) =>
          prev.map((en) => (en.id === newEntry.id ? { ...en, isNew: false } : en))
        );
      }, 5000);
    };
    window.addEventListener("newReservation", handler);
    return () => window.removeEventListener("newReservation", handler);
  }, []);

  useEffect(() => {
    const schedule = () => {
      const delay = Math.floor(Math.random() * (240000 - 60000) + 60000);
      timerRef.current = setTimeout(() => {
        const newEntry = createEntry(true);
        setNewestId(newEntry.id);
        setEntries((prev) => {
          const now = Date.now();
          const filtered = prev.filter((e) => now - e.timestamp < 20 * 60000);
          return [newEntry, ...filtered];
        });
        setTimeout(() => {
          setEntries((prev) =>
            prev.map((e) => (e.id === newEntry.id ? { ...e, isNew: false } : e))
          );
        }, 5000);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const valid = entries.filter((e) => getTimeAgo(e.timestamp) !== null);
  const pcEntries = valid.slice(0, 10);
  const mobileEntries = valid.slice(0, 5);

  return (
    <section
      id="실시간현황"
      style={{
        backgroundColor: "#0f1d3a",
        padding: "72px 24px",
        scrollMarginTop: 100,
      }}
    >
      <style>{`
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(0.7); }
        }
        @keyframes liveText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes cardGlow {
          0%, 100% {
            border-color: rgba(202,168,92,0.45);
            box-shadow: 0 0 0px rgba(202,168,92,0);
          }
          50% {
            border-color: rgba(202,168,92,0.95);
            box-shadow: 0 0 18px rgba(202,168,92,0.25), inset 0 0 10px rgba(202,168,92,0.05);
          }
        }
        @keyframes badgeBlink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
        .realtime-newest-card {
          animation: cardGlow 1.2s ease-in-out infinite;
          background-color: rgba(202,168,92,0.07) !important;
        }
        .realtime-pc-grid {
          display: none;
        }
        .realtime-mobile-list {
          display: flex;
        }
        @media (min-width: 768px) {
          .realtime-pc-grid {
            display: grid;
          }
          .realtime-mobile-list {
            display: none;
          }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontWeight: 400,
            }}
          >
            REAL-TIME RESERVATION
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 3.5vw, 34px)",
              color: "white",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            실시간 방문예약 현황
          </h2>
          <div
            style={{
              width: 40,
              height: 1,
              backgroundColor: "#caa85c",
              margin: "16px auto 0",
            }}
          />

          {/* LIVE indicator */}
          <div
            style={{
              marginTop: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                display: "inline-block",
                animation: "liveDot 1s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                color: "#ef4444",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontWeight: 700,
                animation: "liveText 1s ease-in-out infinite",
              }}
            >
              LIVE
            </span>
            <span
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'Noto Sans KR', sans-serif",
                letterSpacing: "0.03em",
              }}
            >
              · 지금 이 시간에도 예약이 진행 중입니다
            </span>
          </div>
        </div>

        {/* PC Grid - 10 items, 5×2 */}
        <div
          className="realtime-pc-grid"
          style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}
        >
          <AnimatePresence initial={false}>
            {pcEntries.map((entry, index) => (
              <EntryCard key={`pc-${entry.id}`} entry={entry} index={index} newestId={newestId} />
            ))}
          </AnimatePresence>
        </div>

        {/* Mobile List - 5 items */}
        <div
          className="realtime-mobile-list"
          style={{ flexDirection: "column", gap: 10 }}
        >
          <AnimatePresence initial={false}>
            {mobileEntries.map((entry, index) => (
              <EntryCard key={`mob-${entry.id}`} entry={entry} index={index} newestId={newestId} />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function EntryCard({
  entry,
  index,
  newestId,
}: {
  entry: Entry;
  index: number;
  newestId: number | null;
}) {
  const timeAgo = getTimeAgo(entry.timestamp);
  const isNewest = entry.id === newestId;

  return (
    <motion.div
      layout
      initial={entry.isNew ? { y: -28, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={isNewest ? "realtime-newest-card" : ""}
      style={{
        backgroundColor: isNewest ? "rgba(202,168,92,0.07)" : "rgba(255,255,255,0.05)",
        border: isNewest
          ? "1px solid rgba(202,168,92,0.45)"
          : "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        {/* Avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            backgroundColor: isNewest ? "rgba(202,168,92,0.25)" : "rgba(255,255,255,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 14,
              color: isNewest ? "#caa85c" : "rgba(255,255,255,0.7)",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
            }}
          >
            {entry.surname}
          </span>
        </div>

        {/* Info */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "white",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.surname}** &nbsp;
            <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 300 }}>
              {entry.phone}
            </span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Noto Sans KR', sans-serif",
              marginTop: 2,
            }}
          >
            {entry.unitType} · {entry.visitTime}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        {/* NEW badge — shows on newest card until next arrival */}
        {isNewest ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "#caa85c",
              backgroundColor: "rgba(202,168,92,0.18)",
              padding: "3px 8px",
              borderRadius: 2,
              fontFamily: "'Noto Sans KR', sans-serif",
              display: "inline-block",
              animation: "badgeBlink 1.2s ease-in-out infinite",
            }}
          >
            NEW
          </span>
        ) : null}
        <span
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          {timeAgo}
        </span>
      </div>
    </motion.div>
  );
}
