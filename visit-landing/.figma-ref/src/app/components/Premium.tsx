const amenities = [
  {
    en: "FITNESS CENTER",
    title: "피트니스 센터",
    desc: "최첨단 기구로 구성된 프리미엄 피트니스 센터. 입주민 전용 헬스장으로 언제든 쾌적하게 운동하세요.",
    img: "https://images.unsplash.com/photo-1758957646695-ec8bce3df462?w=700&h=460&fit=crop&auto=format",
    tags: ["헬스장", "무산소·유산소"],
  },
  {
    en: "GX & GOLF",
    title: "GX룸·골프연습장",
    desc: "그룹 운동과 실내 골프를 한 공간에서. 단지 내에서 레저와 취미를 완결합니다.",
    img: "https://images.unsplash.com/photo-1550707227-6140ec0a5044?w=700&h=460&fit=crop&auto=format",
    tags: ["GX룸", "골프연습장", "필라테스"],
  },
  {
    en: "KIDS ROOM",
    title: "어린이집·키즈룸",
    desc: "단지 내 국공립 어린이집 및 전용 키즈룸. 아이와 부모 모두가 만족하는 안전한 보육 환경.",
    img: "https://images.unsplash.com/photo-1600880291319-1a7499c191e8?w=700&h=460&fit=crop&auto=format",
    tags: ["어린이집", "키즈카페", "놀이터"],
  },
  {
    en: "COMMUNITY LOUNGE",
    title: "커뮤니티 라운지",
    desc: "입주민 전용 독서실·파티룸·회의실을 갖춘 복합 커뮤니티 공간. 다양한 생활 문화를 누리세요.",
    img: "https://images.unsplash.com/photo-1721394747060-7cfc57104f88?w=700&h=460&fit=crop&auto=format",
    tags: ["라운지", "파티룸", "독서실"],
  },
  {
    en: "SKY LOUNGE",
    title: "스카이라운지",
    desc: "최상층 스카이라운지에서 원주의 탁 트인 전망을 감상하세요. 입주민 전용 프리미엄 공간.",
    img: "https://images.unsplash.com/photo-1758165532022-a68f291317ba?w=700&h=460&fit=crop&auto=format",
    tags: ["스카이라운지", "루프탑", "전망"],
  },
  {
    en: "GUEST ROOM",
    title: "게스트룸",
    desc: "멀리서 방문하는 가족과 지인을 위한 호텔급 게스트룸. 품격 있는 환대를 단지 내에서.",
    img: "https://images.unsplash.com/photo-1629140727571-9b5c6f6267b4?w=700&h=460&fit=crop&auto=format",
    tags: ["게스트룸", "호텔급", "숙박"],
  },
];

export function Premium() {
  return (
    <section
      id="프리미엄"
      style={{
        backgroundColor: "#f0ece4",
        padding: "80px 24px",
        scrollMarginTop: 100,
        position: "relative",
      }}
    >
      <span id="커뮤니티" style={{ position: "absolute", top: -100 }} />
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
            PREMIUM AMENITY
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 3.5vw, 34px)",
              color: "#0f1d3a",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 800,
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            프리미엄 커뮤니티
          </h2>
          <div
            style={{
              width: 40,
              height: 1,
              backgroundColor: "#caa85c",
              margin: "16px auto 0",
            }}
          />
          <p
            style={{
              marginTop: 14,
              fontSize: 14,
              color: "#7a7060",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            6가지 프리미엄 커뮤니티 — 단지 안에서 모든 것이 완결됩니다
          </p>
        </div>

        {/* 6-card Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 24,
          }}
          className="premium-grid"
        >
          {amenities.map((am, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                overflow: "hidden",
                boxShadow: "0 4px 24px rgba(15,29,58,0.08)",
                transition: "transform 0.25s, box-shadow 0.25s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(-6px)";
                el.style.boxShadow = "0 16px 48px rgba(15,29,58,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                el.style.transform = "translateY(0)";
                el.style.boxShadow = "0 4px 24px rgba(15,29,58,0.08)";
              }}
            >
              {/* Image */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  overflow: "hidden",
                  backgroundColor: "#e8e4dc",
                  position: "relative",
                }}
              >
                <img
                  src={am.img}
                  alt={am.title}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.4s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                />
                {/* EN label badge */}
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    padding: "4px 10px",
                    backgroundColor: "rgba(15,29,58,0.75)",
                    backdropFilter: "blur(4px)",
                    borderRadius: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      letterSpacing: "0.2em",
                      color: "#caa85c",
                      fontFamily: "'Noto Sans KR', sans-serif",
                    }}
                  >
                    {am.en}
                  </span>
                </div>
              </div>

              {/* Text */}
              <div style={{ padding: "20px 22px 22px" }}>
                <h3
                  style={{
                    fontSize: 18,
                    color: "#0f1d3a",
                    fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                    fontWeight: 800,
                    marginBottom: 10,
                  }}
                >
                  {am.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: "#7a7060",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    lineHeight: 1.75,
                    marginBottom: 14,
                  }}
                >
                  {am.desc}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {am.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        color: "#caa85c",
                        border: "1px solid rgba(202,168,92,0.4)",
                        borderRadius: 4,
                        fontFamily: "'Noto Sans KR', sans-serif",
                        backgroundColor: "rgba(202,168,92,0.05)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .premium-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
        }
        @media (max-width: 560px) {
          .premium-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
