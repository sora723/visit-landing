import { useState } from "react";
import { Play, X } from "lucide-react";

interface VideoCtaSectionProps {
  variant?: "dark" | "gold";
  headline: string;
  sub: string;
  youtubeId?: string;
  bgImage?: string;
}

export function VideoCtaSection({
  variant = "dark",
  headline,
  sub,
  youtubeId,
  bgImage = "https://images.unsplash.com/photo-1777551105702-c45e42dd945d?w=1920&h=800&fit=crop&auto=format",
}: VideoCtaSectionProps) {
  const [playing, setPlaying] = useState(false);

  const scrollToReserve = () => {
    const el = document.getElementById("방문예약");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const isDark = variant === "dark";

  return (
    <section
      style={{
        position: "relative",
        minHeight: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: isDark ? "#0a1526" : "#0f1d3a",
      }}
    >
      {/* BG Image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.28,
        }}
      />
      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isDark
            ? "linear-gradient(135deg, rgba(15,29,58,0.95) 0%, rgba(15,29,58,0.7) 100%)"
            : "linear-gradient(135deg, rgba(202,168,92,0.18) 0%, rgba(15,29,58,0.92) 100%)",
        }}
      />

      {/* Gold accent line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: "linear-gradient(to bottom, transparent, #caa85c, transparent)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 800,
          margin: "0 auto",
          padding: "64px 32px",
          textAlign: "center",
        }}
      >
        {/* Gold label */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <div style={{ width: 24, height: 1, backgroundColor: "#caa85c" }} />
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.35em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            VISIT RESERVATION
          </span>
          <div style={{ width: 24, height: 1, backgroundColor: "#caa85c" }} />
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: "clamp(26px, 4.5vw, 46px)",
            color: "white",
            fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
            fontWeight: 800,
            lineHeight: 1.3,
            marginBottom: 16,
            letterSpacing: "0.02em",
          }}
        >
          {headline}
        </h2>

        {/* Sub */}
        <p
          style={{
            fontSize: "clamp(14px, 2vw, 18px)",
            color: "rgba(255,255,255,0.65)",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontWeight: 300,
            lineHeight: 1.7,
            marginBottom: 36,
          }}
        >
          {sub}
        </p>

        {/* CTA Buttons */}
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* 방문예약 버튼 */}
          <button
            onClick={scrollToReserve}
            style={{
              padding: "16px 40px",
              fontSize: 16,
              color: "white",
              backgroundColor: "#caa85c",
              border: "none",
              borderRadius: 2,
              cursor: "pointer",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 800,
              letterSpacing: "0.08em",
              transition: "all 0.25s",
              boxShadow: "0 6px 24px rgba(202,168,92,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#b8945a";
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#caa85c";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            지금 방문예약 신청하기
          </button>

          {/* 영상 보기 버튼 (youtubeId 있을 때만) */}
          {youtubeId && (
            <button
              onClick={() => setPlaying(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "15px 28px",
                fontSize: 15,
                color: "white",
                backgroundColor: "transparent",
                border: "1px solid rgba(255,255,255,0.35)",
                borderRadius: 2,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "rgba(202,168,92,0.7)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)")
              }
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "rgba(202,168,92,0.2)",
                  border: "1px solid rgba(202,168,92,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Play size={14} style={{ color: "#caa85c", marginLeft: 2 }} />
              </span>
              단지 홍보영상 보기
            </button>
          )}
        </div>

        {/* Phone CTA */}
        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.45)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            전화 상담
          </span>
          <a
            href="tel:15440000"
            style={{
              fontSize: 22,
              color: "white",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#caa85c")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "white")}
          >
            1544-0000
          </a>
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.4)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            평일·주말 10:00~18:00
          </span>
        </div>
      </div>

      {/* YouTube Modal */}
      {playing && youtubeId && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.88)",
            zIndex: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setPlaying(false)}
        >
          <button
            onClick={() => setPlaying(false)}
            style={{
              position: "absolute",
              top: 20,
              right: 24,
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
            }}
          >
            <X size={32} />
          </button>
          <div
            style={{ width: "100%", maxWidth: 900, aspectRatio: "16/9" }}
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title="단지 홍보영상"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ borderRadius: 8 }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
