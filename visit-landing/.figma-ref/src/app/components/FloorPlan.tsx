import { useState } from "react";

const plans = [
  {
    type: "84A형",
    area: { supply: "112.99㎡", exclusive: "84.75㎡" },
    rooms: "방 3개 + 화장실 2개",
    balcony: "전실 발코니 확장",
    desc: "3Bay 판상형 구조. 남향 위주 배치로 채광 및 통풍 최적화.",
    color: "#3b6ea5",
    badge: "인기",
  },
  {
    type: "84B형",
    area: { supply: "113.44㎡", exclusive: "84.95㎡" },
    rooms: "방 4개 + 화장실 2개",
    balcony: "전실 발코니 확장",
    desc: "4Bay 타워형 구조. 개방감과 수납 최적화 설계.",
    color: "#4a7c59",
    badge: null,
  },
  {
    type: "101형",
    area: { supply: "131.62㎡", exclusive: "101.28㎡" },
    rooms: "방 3개 + 화장실 2개 + 드레스룸",
    balcony: "전실 발코니 확장",
    desc: "넓은 거실과 주방 공간. 중대형 평형 특화 설계.",
    color: "#7a5c3a",
    badge: null,
  },
  {
    type: "112형",
    area: { supply: "146.38㎡", exclusive: "112.62㎡" },
    rooms: "방 4개 + 화장실 3개 + 드레스룸",
    balcony: "전실 발코니 확장 + 테라스",
    desc: "최상층 펜트하우스급 설계. 스카이라운지 뷰 전용.",
    color: "#8b2e2e",
    badge: "최고급",
  },
];

function FloorPlanSVG({ type }: { type: string }) {
  const plan = plans.find((p) => p.type === type);
  const c = plan?.color ?? "#0f1d3a";

  return (
    <svg
      viewBox="0 0 400 300"
      style={{ width: "100%", height: "100%", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="400" height="300" fill="#f8f6f0" />
      {/* Outer wall */}
      <rect x="20" y="20" width="360" height="260" fill="none" stroke={c} strokeWidth="4" />
      {/* Living room */}
      <rect x="20" y="20" width="200" height="140" fill="rgba(202,168,92,0.08)" stroke={c} strokeWidth="2" />
      <text x="120" y="95" textAnchor="middle" fill={c} style={{ fontSize: 12, fontFamily: "sans-serif" }}>거실</text>
      {/* Kitchen */}
      <rect x="220" y="20" width="160" height="100" fill="rgba(202,168,92,0.05)" stroke={c} strokeWidth="2" />
      <text x="300" y="75" textAnchor="middle" fill={c} style={{ fontSize: 12, fontFamily: "sans-serif" }}>주방/식당</text>
      {/* Master bedroom */}
      <rect x="20" y="160" width="130" height="120" fill="rgba(59,110,165,0.07)" stroke={c} strokeWidth="2" />
      <text x="85" y="225" textAnchor="middle" fill={c} style={{ fontSize: 11, fontFamily: "sans-serif" }}>안방</text>
      {/* Room 2 */}
      <rect x="150" y="160" width="110" height="120" fill="rgba(74,124,89,0.07)" stroke={c} strokeWidth="2" />
      <text x="205" y="225" textAnchor="middle" fill={c} style={{ fontSize: 11, fontFamily: "sans-serif" }}>방 2</text>
      {/* Room 3 / bath */}
      <rect x="260" y="120" width="120" height="80" fill="rgba(122,92,58,0.07)" stroke={c} strokeWidth="2" />
      <text x="320" y="165" textAnchor="middle" fill={c} style={{ fontSize: 11, fontFamily: "sans-serif" }}>방 3</text>
      {/* Bathroom */}
      <rect x="260" y="200" width="60" height="80" fill="rgba(15,29,58,0.05)" stroke={c} strokeWidth="2" />
      <text x="290" y="245" textAnchor="middle" fill={c} style={{ fontSize: 10, fontFamily: "sans-serif" }}>욕실</text>
      {/* Balcony */}
      <rect x="20" y="0" width="200" height="20" fill="rgba(202,168,92,0.2)" stroke={c} strokeWidth="1" strokeDasharray="4,2" />
      <text x="120" y="14" textAnchor="middle" fill={c} style={{ fontSize: 9, fontFamily: "sans-serif" }}>발코니</text>
      {/* Type label */}
      <text x="380" y="295" textAnchor="end" fill={c} style={{ fontSize: 11, fontFamily: "sans-serif", fontWeight: "bold" }}>{type}</text>
    </svg>
  );
}

export function FloorPlan() {
  const [active, setActive] = useState(0);
  const plan = plans[active];

  return (
    <section
      id="단지배치도"
      style={{
        backgroundColor: "#f8f6f2",
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
            FLOOR PLAN
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
            단지 안내 · 평면도
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

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          {plans.map((p, i) => (
            <button
              key={p.type}
              onClick={() => setActive(i)}
              style={{
                padding: "10px 28px",
                fontSize: 14,
                borderRadius: 4,
                border: `1px solid ${active === i ? "#0f1d3a" : "rgba(15,29,58,0.2)"}`,
                backgroundColor: active === i ? "#0f1d3a" : "white",
                color: active === i ? "white" : "#0f1d3a",
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontWeight: active === i ? 500 : 400,
                transition: "all 0.2s",
                position: "relative",
              }}
            >
              {p.badge && (
                <span
                  style={{
                    position: "absolute",
                    top: -8,
                    right: -4,
                    fontSize: 9,
                    padding: "2px 6px",
                    backgroundColor: "#caa85c",
                    color: "white",
                    borderRadius: 2,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {p.badge}
                </span>
              )}
              {p.type}
            </button>
          ))}
        </div>

        {/* Floor Plan Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 40,
            alignItems: "start",
          }}
          className="plan-grid"
        >
          {/* SVG Plan */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 4px 24px rgba(15,29,58,0.08)",
              aspectRatio: "4/3",
            }}
          >
            <FloorPlanSVG type={plan.type} />
          </div>

          {/* Spec Info */}
          <div>
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#0f1d3a",
                  padding: "6px 16px",
                  borderRadius: 4,
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    color: "#caa85c",
                    fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {plan.type}
                </span>
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "#7a7060",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  lineHeight: 1.8,
                }}
              >
                {plan.desc}
              </p>
            </div>

            {/* Spec Items */}
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 2px 16px rgba(15,29,58,0.07)",
              }}
            >
              {[
                { label: "공급면적", value: plan.area.supply },
                { label: "전용면적", value: plan.area.exclusive },
                { label: "구조", value: plan.rooms },
                { label: "발코니", value: plan.balcony },
              ].map((row, i, arr) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    borderBottom:
                      i < arr.length - 1
                        ? "1px solid rgba(15,29,58,0.07)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 120,
                      padding: "16px 20px",
                      backgroundColor: "#f8f6f2",
                      fontSize: 13,
                      color: "#7a7060",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 500,
                      flexShrink: 0,
                      borderRight: "1px solid rgba(15,29,58,0.07)",
                    }}
                  >
                    {row.label}
                  </div>
                  <div
                    style={{
                      padding: "16px 20px",
                      fontSize: 13,
                      color: "#0f1d3a",
                      fontFamily: "'Noto Sans KR', sans-serif",
                    }}
                  >
                    {row.value}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                marginTop: 16,
                fontSize: 11,
                color: "#b0a898",
                fontFamily: "'Noto Sans KR', sans-serif",
                lineHeight: 1.6,
              }}
            >
              * 상기 평면도는 계획 단계의 이미지로 실제와 다를 수 있습니다.<br />
              * 면적은 인허가 과정에서 변경될 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .plan-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </section>
  );
}
