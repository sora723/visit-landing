export function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "#070f1f",
        padding: "56px 24px 32px",
        paddingBottom: "calc(80px + 32px)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Top */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 40,
            marginBottom: 48,
          }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                marginBottom: 8,
              }}
            >
              HANYANG LIPS · WONJU
            </p>
            <p
              style={{
                fontSize: 20,
                color: "white",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                letterSpacing: "0.06em",
                marginBottom: 16,
              }}
            >
              원주 한양립스
            </p>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'Noto Sans KR', sans-serif",
                lineHeight: 1.8,
              }}
            >
              강원특별자치도 원주시 반곡동 일원<br />
              분양문의 : 1544-0000
            </p>
          </div>

          {/* 분양정보 */}
          <div>
            <p
              style={{
                fontSize: 13,
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}
            >
              분양정보
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {["사업개요", "평형안내", "입지환경", "프리미엄", "혜택안내"].map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    const el = document.getElementById(
                      item === "평형안내" ? "단지배치도" : item
                    );
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    textAlign: "left",
                    padding: 0,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.45)",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    cursor: "pointer",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.8)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* 상담안내 */}
          <div>
            <p
              style={{
                fontSize: 13,
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                fontWeight: 500,
                letterSpacing: "0.1em",
                marginBottom: 16,
              }}
            >
              상담안내
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.45)",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  lineHeight: 1.8,
                }}
              >
                분양 홍보관 운영시간<br />
                <span style={{ color: "rgba(255,255,255,0.7)" }}>
                  평일 / 주말 10:00 ~ 18:00
                </span>
              </p>
              <p
                style={{
                  fontSize: 22,
                  color: "white",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  marginTop: 8,
                }}
              >
                1544-0000
              </p>
              <button
                onClick={() => {
                  const el = document.getElementById("방문예약");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                style={{
                  marginTop: 8,
                  padding: "10px 20px",
                  fontSize: 13,
                  color: "white",
                  backgroundColor: "#caa85c",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                  alignSelf: "flex-start",
                }}
              >
                방문예약 신청 →
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 28 }} />

        {/* Disclaimer */}
        <p
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "'Noto Sans KR', sans-serif",
            lineHeight: 1.8,
            marginBottom: 20,
          }}
        >
          본 홈페이지의 조감도, 평면도, 각종 정보는 소비자의 이해를 돕기 위한 이미지로 실제와 다를 수 있으며,
          관련 법령에 의거 청약 및 분양계약에 있어 법적 효력이 없습니다. 실내 가구 및 집기류는 모두 제외됩니다.
          최종 확인은 분양공고문을 반드시 확인하시기 바랍니다.
        </p>

        {/* Bottom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.25)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            © 2025 한양건설 원주 한양립스. All rights reserved.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.25)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
          >
            개인정보처리방침
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
        }
      `}</style>
    </footer>
  );
}
