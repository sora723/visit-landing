import { X } from "lucide-react";

// 수집주체 관리자명 — 자동 기입
export const SITE_MANAGER_NAME = "원주 한양립스 분양사무소 (한양건설(주))";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1001,
          backgroundColor: "white",
          borderRadius: 12,
          width: "min(92vw, 540px)",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 24px 16px",
            borderBottom: "1px solid rgba(15,29,58,0.08)",
            flexShrink: 0,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 10,
                letterSpacing: "0.25em",
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                marginBottom: 4,
              }}
            >
              PRIVACY POLICY
            </p>
            <h3
              style={{
                fontSize: 17,
                color: "#0f1d3a",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 800,
              }}
            >
              개인정보 수집 및 이용 동의
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#7a7060",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            overflowY: "auto",
            padding: "20px 24px 28px",
          }}
        >
          {/* 수집주체 — 관리자명 자동 기입 */}
          <Section title="■ 수집주체 (관리자명)">
            <p>{SITE_MANAGER_NAME}</p>
          </Section>

          <Section title="■ 수집 항목">
            <Row label="필수" value="성명, 연락처(휴대폰번호)" />
            <Row label="선택" value="관심평형, 방문희망일시" />
          </Section>

          <Section title="■ 수집 목적">
            <p>분양 상담 및 방문예약 확인 연락, 알림톡(카카오 비즈메시지) 발송</p>
          </Section>

          <Section title="■ 보유 및 이용기간">
            <p>동의 철회 요청 시 또는 분양 상담 목적 달성 후 지체 없이 파기합니다.</p>
            <p style={{ marginTop: 6 }}>
              단, 계약 체결 시에는 관련 법령(전자상거래 등에서의 소비자보호에 관한 법률 등)에
              따라 일정 기간 보관될 수 있습니다.
            </p>
          </Section>

          <Section title="■ 제3자 제공">
            <p>수집된 개인정보는 원칙적으로 외부에 제공하지 않습니다.</p>
            <p style={{ marginTop: 6 }}>
              단, 알림톡 발송을 위해 카카오 비즈메시지 서비스 제공자(Solapi)에
              연락처를 최소한으로 제공할 수 있으며, 해당 업체는 법령에 의한 의무 외의 목적으로
              사용하지 않습니다.
            </p>
          </Section>

          <Section title="■ 동의 거부 권리 및 불이익">
            <p>
              귀하는 개인정보 수집·이용에 동의를 거부할 권리가 있습니다.
              단, 거부하실 경우 분양 상담 및 방문예약 서비스 이용이 제한될 수 있습니다.
            </p>
          </Section>

          <Section title="■ 문의">
            <p>개인정보 관련 문의: {SITE_MANAGER_NAME}</p>
            <p style={{ marginTop: 4 }}>대표번호: 1544-0000</p>
          </Section>

          <div
            style={{
              marginTop: 20,
              padding: "14px 16px",
              backgroundColor: "#f8f6f2",
              borderRadius: 8,
              fontSize: 12,
              color: "#7a7060",
              fontFamily: "'Noto Sans KR', sans-serif",
              lineHeight: 1.7,
            }}
          >
            본 개인정보 처리방침은 개인정보보호법 제30조에 의거하여 작성되었으며,
            관련 법령의 변경 또는 서비스 정책 변경에 따라 내용이 수정될 수 있습니다.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(15,29,58,0.08)",
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "13px",
              fontSize: 14,
              color: "white",
              backgroundColor: "#0f1d3a",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 700,
            }}
          >
            확인
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#0f1d3a",
          fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
          marginBottom: 8,
        }}
      >
        {title}
      </p>
      <div
        style={{
          fontSize: 13,
          color: "#5a5a5a",
          fontFamily: "'Noto Sans KR', sans-serif",
          lineHeight: 1.75,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
      <span
        style={{
          fontSize: 12,
          color: label === "필수" ? "#caa85c" : "#7a7060",
          fontWeight: 600,
          fontFamily: "'Noto Sans KR', sans-serif",
          flexShrink: 0,
          minWidth: 32,
        }}
      >
        [{label}]
      </span>
      <span style={{ fontSize: 13, color: "#5a5a5a", fontFamily: "'Noto Sans KR', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}
