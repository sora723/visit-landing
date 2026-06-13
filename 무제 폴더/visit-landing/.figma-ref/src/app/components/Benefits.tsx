import { Gift, Zap, Home, Thermometer, UtensilsCrossed, Expand } from "lucide-react";

const benefits = [
  {
    icon: Thermometer,
    title: "시스템 에어컨",
    subtitle: "전실 기본 제공",
    desc: "거실·안방·모든 방에 시스템 에어컨 기본 설치. 추가 비용 없는 완벽한 냉난방 시스템.",
    value: "約 600만원 상당",
  },
  {
    icon: UtensilsCrossed,
    title: "빌트인 가전",
    subtitle: "풀패키지 제공",
    desc: "냉장고·세탁기·건조기·식기세척기 풀패키지. 최신 빌트인 가전으로 입주 즉시 편리한 생활.",
    value: "約 1,200만원 상당",
  },
  {
    icon: Expand,
    title: "발코니 확장",
    subtitle: "무상 확장",
    desc: "전실 발코니 확장을 무상으로 제공. 넓어진 실내 공간으로 쾌적한 주거환경을 선물합니다.",
    value: "約 1,000만원 상당",
  },
  {
    icon: Home,
    title: "중도금 무이자",
    subtitle: "60% 무이자",
    desc: "분양가의 60%에 해당하는 중도금 전액 무이자 혜택. 이자 부담 없이 내 집 마련의 꿈을 실현.",
    value: "이자 부담 ZERO",
  },
  {
    icon: Zap,
    title: "스마트홈 시스템",
    subtitle: "기본 탑재",
    desc: "원격 현관 출입, 스마트 보안, 에너지 모니터링. 최신 IoT 기반 스마트홈 시스템 기본 제공.",
    value: "프리미엄 패키지",
  },
  {
    icon: Gift,
    title: "입주혜택",
    subtitle: "이사 지원",
    desc: "이사 비용 지원 및 입주 초기 AS 전담 서비스. 편안한 시작을 위한 한양건설의 약속.",
    value: "프리미엄 서비스",
  },
];

export function Benefits() {
  return (
    <section
      id="혜택안내"
      style={{
        backgroundColor: "#0f1d3a",
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
            SPECIAL BENEFITS
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
            혜택안내
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
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            원주 한양립스만의 특별한 혜택을 확인하세요
          </p>
        </div>

        {/* Total Value Banner */}
        <div
          style={{
            backgroundColor: "rgba(202,168,92,0.12)",
            border: "1px solid rgba(202,168,92,0.4)",
            borderRadius: 12,
            padding: "24px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            marginBottom: 48,
            flexWrap: "wrap",
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.7)",
              fontFamily: "'Noto Sans KR', sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            무상혜택 총 금액
          </span>
          <span
            style={{
              fontSize: "clamp(22px, 4vw, 36px)",
              color: "#caa85c",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 700,
            }}
          >
            約 2,800만원 상당
          </span>
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            (평형별 상이, 부가세 포함)
          </span>
        </div>

        {/* Benefits Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
          className="benefits-grid"
        >
          {benefits.map((b, i) => {
            const Icon = b.icon;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "28px 24px",
                  transition: "all 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.backgroundColor = "rgba(202,168,92,0.08)";
                  el.style.borderColor = "rgba(202,168,92,0.35)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.backgroundColor = "rgba(255,255,255,0.04)";
                  el.style.borderColor = "rgba(255,255,255,0.08)";
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "rgba(202,168,92,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={22} style={{ color: "#caa85c" }} />
                </div>
                <h3
                  style={{
                    fontSize: 16,
                    color: "white",
                    fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: "#caa85c",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    marginBottom: 12,
                    letterSpacing: "0.05em",
                  }}
                >
                  {b.subtitle}
                </p>
                <p
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.6)",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    lineHeight: 1.7,
                    marginBottom: 16,
                  }}
                >
                  {b.desc}
                </p>
                <div
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "rgba(202,168,92,0.15)",
                    borderRadius: 4,
                    display: "inline-block",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#caa85c",
                      fontFamily: "'Noto Sans KR', sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    {b.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .benefits-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 560px) {
          .benefits-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
