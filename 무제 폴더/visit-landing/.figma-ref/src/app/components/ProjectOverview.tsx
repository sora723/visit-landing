const BUILDING_IMG =
  "https://images.unsplash.com/photo-1760182042697-fd8d2e3139eb?w=900&h=700&fit=crop&auto=format";

const specs = [
  { label: "위치", value: "강원특별자치도 원주시 반곡동 일원" },
  { label: "규모", value: "지하 2층 / 지상 최고 29층" },
  { label: "동수 / 세대수", value: "12개동 / 총 1,236세대" },
  { label: "평형구성", value: "84A형, 84B형, 101형, 112형" },
  { label: "시행 / 시공", value: "한양건설 / 한양건설" },
  { label: "입주 예정", value: "2027년 상반기" },
  { label: "계약금", value: "분양가의 10%" },
  { label: "중도금", value: "무이자 (분양가의 60%)" },
  { label: "잔금", value: "30% (입주 시)" },
];

export function ProjectOverview() {
  return (
    <section
      id="사업개요"
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
            PROJECT OVERVIEW
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
            사업개요
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

        {/* Content */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 56,
            alignItems: "start",
          }}
          className="overview-grid"
        >
          {/* Image */}
          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              aspectRatio: "4/3",
              backgroundColor: "#e8e4dc",
            }}
          >
            <img
              src={BUILDING_IMG}
              alt="원주 한양립스 단지"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>

          {/* Specs Table */}
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(15,29,58,0.07)",
            }}
          >
            {/* Header */}
            <div
              style={{
                backgroundColor: "#0f1d3a",
                padding: "20px 28px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 20,
                  backgroundColor: "#caa85c",
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontSize: 15,
                  color: "white",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
              >
                원주 한양립스 사업개요
              </span>
            </div>

            {/* Rows */}
            {specs.map((spec, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  borderBottom:
                    i < specs.length - 1
                      ? "1px solid rgba(15,29,58,0.07)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 140,
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
                  {spec.label}
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    fontSize: 13,
                    color: "#0f1d3a",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    lineHeight: 1.6,
                  }}
                >
                  {spec.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </section>
  );
}
