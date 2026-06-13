const HERO_BG =
  "https://images.unsplash.com/photo-1702738684590-b4399327e0ef?w=1920&h=1080&fit=crop&auto=format";

const highlights = [
  {
    label: "계약금",
    value: "분양가의 10%",
    sub: "중도금 무이자 60%",
  },
  {
    label: "입주예정",
    value: "2027년 상반기",
    sub: "잔금 30% 입주 시",
  },
  {
    label: "무상혜택",
    value: "3종 풀패키지",
    sub: "시스템에어컨 · 빌트인 · 발코니확장",
  },
];

export function Hero() {
  const handleReserve = () => {
    const el = document.getElementById("방문예약");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      style={{
        position: "relative",
        minHeight: "95vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        backgroundColor: "#0f1d3a",
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${HERO_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(15,29,58,0.72) 0%, rgba(15,29,58,0.55) 50%, rgba(15,29,58,0.85) 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "100px 24px 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 18px",
            border: "1px solid rgba(202,168,92,0.6)",
            borderRadius: 1,
            marginBottom: 28,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#caa85c",
              display: "inline-block",
            }}
          />
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
              fontWeight: 400,
            }}
          >
            HANYANG LIPS · WONJU · 원주혁신도시
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(40px, 7vw, 80px)",
            color: "white",
            fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.05em",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          원주 한양립스
        </h1>

        {/* Gold divider */}
        <div
          style={{
            width: 60,
            height: 2,
            backgroundColor: "#caa85c",
            marginBottom: 20,
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            fontSize: "clamp(15px, 2.5vw, 20px)",
            color: "rgba(255,255,255,0.8)",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontWeight: 300,
            letterSpacing: "0.08em",
            marginBottom: 48,
          }}
        >
          강원특별자치도 원주시 &nbsp;|&nbsp; 지상 29층 12개동 총 1,236세대
        </p>

        {/* Highlight Cards */}
        <style>{`
          @keyframes heroPulse {
            0%, 55%, 100% {
              background-color: rgba(255,255,255,0.06);
              border-color: rgba(202,168,92,0.35);
              box-shadow: none;
            }
            20%, 38% {
              background-color: rgba(202,168,92,0.38);
              border-color: #caa85c;
              box-shadow: 0 0 40px rgba(202,168,92,0.55), 0 0 12px rgba(202,168,92,0.3);
            }
          }
          @keyframes heroPulseValue {
            0%, 55%, 100% { color: white; }
            20%, 38% { color: #0f1d3a; }
          }
          @keyframes heroPulseLabel {
            0%, 55%, 100% { color: #caa85c; }
            20%, 38% { color: rgba(15,29,58,0.85); }
          }
          @keyframes heroPulseSub {
            0%, 55%, 100% { color: rgba(255,255,255,0.6); }
            20%, 38% { color: rgba(15,29,58,0.65); }
          }
          .hero-card-0 { animation: heroPulse 3s ease-in-out 0s infinite; }
          .hero-card-1 { animation: heroPulse 3s ease-in-out 1s infinite; }
          .hero-card-2 { animation: heroPulse 3s ease-in-out 2s infinite; }
          .hero-card-0 .hc-label { animation: heroPulseLabel 3s ease-in-out 0s infinite; }
          .hero-card-1 .hc-label { animation: heroPulseLabel 3s ease-in-out 1s infinite; }
          .hero-card-2 .hc-label { animation: heroPulseLabel 3s ease-in-out 2s infinite; }
          .hero-card-0 .hc-value { animation: heroPulseValue 3s ease-in-out 0s infinite; }
          .hero-card-1 .hc-value { animation: heroPulseValue 3s ease-in-out 1s infinite; }
          .hero-card-2 .hc-value { animation: heroPulseValue 3s ease-in-out 2s infinite; }
          .hero-card-0 .hc-sub { animation: heroPulseSub 3s ease-in-out 0s infinite; }
          .hero-card-1 .hc-sub { animation: heroPulseSub 3s ease-in-out 1s infinite; }
          .hero-card-2 .hc-sub { animation: heroPulseSub 3s ease-in-out 2s infinite; }
        `}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
            width: "100%",
            maxWidth: 780,
            marginBottom: 48,
          }}
          className="hero-cards"
        >
          {highlights.map((item, i) => (
            <div
              key={item.label}
              className={`hero-card-${i}`}
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(202,168,92,0.35)",
                borderTop: "2px solid #caa85c",
                padding: "24px 16px",
                backdropFilter: "blur(8px)",
                borderRadius: 2,
              }}
            >
              <div
                className="hc-label"
                style={{
                  fontSize: 13,
                  letterSpacing: "0.18em",
                  color: "#caa85c",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                  marginBottom: 10,
                }}
              >
                {item.label}
              </div>
              <div
                className="hc-value"
                style={{
                  fontSize: "clamp(22px, 3.2vw, 30px)",
                  color: "white",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  marginBottom: 8,
                  lineHeight: 1.25,
                }}
              >
                {item.value}
              </div>
              <div
                className="hc-sub"
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleReserve}
          style={{
            padding: "18px 56px",
            fontSize: 15,
            color: "white",
            backgroundColor: "#caa85c",
            border: "none",
            borderRadius: 2,
            cursor: "pointer",
            fontFamily: "'Noto Sans KR', sans-serif",
            fontWeight: 500,
            letterSpacing: "0.15em",
            transition: "all 0.3s",
            boxShadow: "0 8px 32px rgba(202,168,92,0.4)",
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
          방문예약 신청하기
        </button>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Noto Sans KR', sans-serif",
            letterSpacing: "0.05em",
          }}
        >
          무료 방문 상담 · 당일 예약 가능
        </p>
      </div>

      {/* Bottom scroll indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          zIndex: 2,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Noto Sans KR', sans-serif",
          }}
        >
          SCROLL
        </span>
        <div
          style={{
            width: 1,
            height: 56,
            background: "linear-gradient(to bottom, rgba(202,168,92,0.8), transparent)",
          }}
        />
      </div>

      <style>{`
        @media (max-width: 640px) {
          .hero-cards {
            grid-template-columns: 1fr !important;
            max-width: 320px !important;
          }
        }
      `}</style>
    </section>
  );
}
