import { Train, Building2, TreePine, Star } from "lucide-react";

const features = [
  {
    icon: Train,
    en: "DOUBLE STATION",
    title: "더블 역세권",
    desc: "KTX 원주역 도보 5분, 남원주역 인접. 서울까지 단 54분, 수도권 직접 연결의 교통 핵심 거점.",
    highlight: "KTX 54분",
  },
  {
    icon: Building2,
    en: "INNOVATION CITY",
    title: "혁신도시 중심",
    desc: "원주기업도시 중심상권과 인접. 대형 쇼핑몰·백화점·의료시설이 집중된 생활 인프라의 중심.",
    highlight: "원주 중심상권",
  },
  {
    icon: TreePine,
    en: "NATURE & PARK",
    title: "자연친화 환경",
    desc: "치악산 국립공원과 섬강이 어우러진 수려한 자연환경. 사계절 녹음이 가득한 쾌적한 주거공간.",
    highlight: "치악산 조망",
  },
  {
    icon: Star,
    en: "PREMIUM SCALE",
    title: "대단지 프리미엄",
    desc: "지상 29층 12개동 총 1,236세대의 대단지. 단지 내 특화 커뮤니티와 조경으로 품격을 높이다.",
    highlight: "1,236세대",
  },
];

export function Features() {
  return (
    <section
      id="특장점"
      style={{
        backgroundColor: "#f8f6f2",
        padding: "80px 24px",
        scrollMarginTop: 100,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section Title */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            SITE ADVANTAGES
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 3.5vw, 34px)",
              color: "#0f1d3a",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 600,
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            현장 특장점
          </h2>
          <div
            style={{
              width: 40,
              height: 1,
              backgroundColor: "#caa85c",
              margin: "16px auto 0",
            }}
          />
        </div>

        {/* Feature Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 24,
          }}
          className="feature-grid"
        >
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: "white",
                  borderRadius: 16,
                  padding: "40px 36px",
                  boxShadow: "0 4px 24px rgba(15,29,58,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  border: "1px solid rgba(15,29,58,0.06)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 40px rgba(15,29,58,0.12)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(15,29,58,0.06)";
                }}
              >
                {/* Icon + En label */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 12,
                      backgroundColor: "rgba(202,168,92,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} style={{ color: "#caa85c" }} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.2em",
                      color: "#caa85c",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 400,
                    }}
                  >
                    {feat.en}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3
                    style={{
                      fontSize: "clamp(20px, 2.5vw, 26px)",
                      color: "#0f1d3a",
                      fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    {feat.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: "#7a7060",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      lineHeight: 1.8,
                    }}
                  >
                    {feat.desc}
                  </p>
                </div>

                {/* Highlight badge */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    backgroundColor: "#0f1d3a",
                    borderRadius: 4,
                    alignSelf: "flex-start",
                  }}
                >
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      backgroundColor: "#caa85c",
                      display: "inline-block",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      color: "#caa85c",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 500,
                      letterSpacing: "0.08em",
                    }}
                  >
                    {feat.highlight}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .feature-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
