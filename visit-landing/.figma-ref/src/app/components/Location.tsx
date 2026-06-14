const locationPoints = [
  { cat: "교통", items: ["KTX 원주역 도보 5분", "남원주역 인접", "서울까지 KTX 54분", "수도권 전철 직접 연결"] },
  { cat: "교육", items: ["원주대, 상지대, 한라대 인접", "원주교육지원청 관할", "혁신도시 내 초·중학교"] },
  { cat: "의료", items: ["원주세브란스기독병원 (연세대)", "원주의료원 인접", "대형병원 5분 이내"] },
  { cat: "생활", items: ["롯데마트, 이마트 인접", "원주기업도시 중심상권", "원주천 자전거도로"] },
];

export function Location() {
  return (
    <section
      id="입지환경"
      style={{
        backgroundColor: "#0f1d3a",
        padding: "80px 24px",
        scrollMarginTop: 100,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Section Title */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            LOCATION ENVIRONMENT
          </span>
          <h2
            style={{
              fontSize: "clamp(22px, 3.5vw, 34px)",
              color: "white",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 800,
              marginTop: 8,
              letterSpacing: "0.05em",
            }}
          >
            입지환경
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

        {/* 입지 이미지 */}
        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 40,
            position: "relative",
            height: "clamp(380px, 50vw, 540px)",
            backgroundColor: "#1a2e5a",
          }}
        >
          <img
            src="https://images.unsplash.com/photo-1777551105702-c45e42dd945d?w=1920&h=700&fit=crop&auto=format"
            alt="원주 혁신도시 전경"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
          {/* 하단 그라데이션 오버레이 */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, transparent 40%, rgba(15,29,58,0.75) 100%)",
            }}
          />
          {/* 왼쪽 하단 라벨 */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 24,
            }}
          >
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.25em",
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                marginBottom: 6,
              }}
            >
              WONJU INNOVATION CITY
            </p>
            <p
              style={{
                fontSize: 22,
                color: "white",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 800,
              }}
            >
              원주혁신도시 프리미엄 입지
            </p>
          </div>
          {/* 우측 하단 — 위치 태그 */}
          <div
            style={{
              position: "absolute",
              bottom: 24,
              right: 24,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >
            {["KTX 도보 5분", "혁신도시 중심", "수도권 54분"].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  color: "white",
                  backgroundColor: "rgba(202,168,92,0.3)",
                  backdropFilter: "blur(6px)",
                  border: "1px solid rgba(202,168,92,0.5)",
                  borderRadius: 4,
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Location Points Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}
          className="location-grid"
        >
          {locationPoints.map((point) => (
            <div
              key={point.cat}
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: "22px 18px",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: "#caa85c",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  fontWeight: 700,
                  marginBottom: 14,
                  paddingBottom: 12,
                  borderBottom: "1px solid rgba(202,168,92,0.25)",
                }}
              >
                {point.cat}
              </div>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {point.items.map((item) => (
                  <li
                    key={item}
                    style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.75)",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    <span
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: "#caa85c",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .location-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 500px) {
          .location-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
