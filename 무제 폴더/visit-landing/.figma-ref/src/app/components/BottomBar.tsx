import { useState } from "react";
import { X, Phone, MessageCircle, Calendar } from "lucide-react";
import { submitReservation, dispatchNewReservation } from "../utils/submitApi";
import { PrivacyModal } from "./PrivacyModal";

const UNIT_TYPES = ["84A형", "84B형", "101형", "112형", "미정"];
const VISIT_TIMES_SHORT = ["오전 10시", "오전 11시", "오후 12시", "오후 1시", "오후 2시", "오후 3시", "오후 4시", "오후 5시"];

interface SheetFormState {
  name: string;
  phone: string;
  unitType: string;
  visitTime: string;
  agreed: boolean;
}

function BottomSheet({
  open,
  onClose,
  title,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
}) {
  const [form, setForm] = useState<SheetFormState>({ name: "", phone: "", unitType: "", visitTime: "", agreed: false });
  const [submitted, setSubmitted] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.agreed) return;
    dispatchNewReservation(form.name, form.phone);
    submitReservation({ name: form.name, phone: form.phone, unitType: form.unitType, visitTime: form.visitTime, source: "bottom_bar" });
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", phone: "", unitType: "", visitTime: "", agreed: false });
      onClose();
    }, 2500);
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          zIndex: 400,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 401,
          backgroundColor: "white",
          borderRadius: "20px 20px 0 0",
          padding: "0 0 40px",
          boxShadow: "0 -8px 48px rgba(0,0,0,0.2)",
          animation: "sheetUp 0.28s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <style>{`
          @keyframes sheetUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#e0dcd4",
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 24px 20px",
            borderBottom: "1px solid rgba(15,29,58,0.07)",
          }}
        >
          <div>
            <p
              style={{
                fontSize: 11,
                letterSpacing: "0.25em",
                color: "#caa85c",
                fontFamily: "'Noto Sans KR', sans-serif",
                marginBottom: 4,
              }}
            >
              HANYANG LIPS · WONJU
            </p>
            <p
              style={{
                fontSize: 18,
                color: "#0f1d3a",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
              }}
            >
              {title}
            </p>
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
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 24px 0" }}>
          {submitted ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  backgroundColor: "rgba(202,168,92,0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <span style={{ fontSize: 24 }}>✓</span>
              </div>
              <p
                style={{
                  fontSize: 16,
                  color: "#0f1d3a",
                  fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                접수 완료
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "#7a7060",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  lineHeight: 1.7,
                }}
              >
                담당자가 빠른 시간 내 연락드리겠습니다.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#7a7060",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    marginBottom: 6,
                    letterSpacing: "0.04em",
                  }}
                >
                  성함 <span style={{ color: "#caa85c" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    fontSize: 15,
                    color: "#0f1d3a",
                    backgroundColor: "#f8f6f2",
                    border: "1px solid rgba(15,29,58,0.15)",
                    borderRadius: 8,
                    fontFamily: "'Noto Sans KR', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "#7a7060",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    marginBottom: 6,
                    letterSpacing: "0.04em",
                  }}
                >
                  연락처 <span style={{ color: "#caa85c" }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  style={{
                    width: "100%",
                    padding: "13px 16px",
                    fontSize: 15,
                    color: "#0f1d3a",
                    backgroundColor: "#f8f6f2",
                    border: "1px solid rgba(15,29,58,0.15)",
                    borderRadius: 8,
                    fontFamily: "'Noto Sans KR', sans-serif",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* 관심평형 */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#7a7060", fontFamily: "'Noto Sans KR', sans-serif", marginBottom: 6 }}>
                  관심 평형 <span style={{ color: "#b0a898" }}>(선택)</span>
                </label>
                <select
                  value={form.unitType}
                  onChange={(e) => setForm((f) => ({ ...f, unitType: e.target.value }))}
                  style={{ width: "100%", padding: "13px 16px", fontSize: 14, color: "#0f1d3a", backgroundColor: "#f8f6f2", border: "1px solid rgba(15,29,58,0.15)", borderRadius: 8, fontFamily: "'Noto Sans KR', sans-serif", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">평형 선택</option>
                  {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* 방문희망시간 */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#7a7060", fontFamily: "'Noto Sans KR', sans-serif", marginBottom: 6 }}>
                  방문 희망 시간 <span style={{ color: "#b0a898" }}>(선택)</span>
                </label>
                <select
                  value={form.visitTime}
                  onChange={(e) => setForm((f) => ({ ...f, visitTime: e.target.value }))}
                  style={{ width: "100%", padding: "13px 16px", fontSize: 14, color: "#0f1d3a", backgroundColor: "#f8f6f2", border: "1px solid rgba(15,29,58,0.15)", borderRadius: 8, fontFamily: "'Noto Sans KR', sans-serif", outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">시간 선택</option>
                  {VISIT_TIMES_SHORT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Privacy */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                  padding: "12px 14px",
                  backgroundColor: "#f8f6f2",
                  borderRadius: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.agreed}
                  onChange={(e) => setForm((f) => ({ ...f, agreed: e.target.checked }))}
                  style={{ accentColor: "#caa85c", width: 16, height: 16, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, color: "#7a7060", fontFamily: "'Noto Sans KR', sans-serif", flex: 1 }}>
                  <span style={{ color: "#0f1d3a", fontWeight: 500 }}>[필수]</span> 개인정보 수집 및 이용에 동의합니다.
                </span>
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: "#caa85c", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 600, cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}
                >
                  [보기]
                </button>
              </div>
              <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />

              {/* 신청하기 */}
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "16px",
                  fontSize: 15,
                  color: "white",
                  backgroundColor: "#0f1d3a",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  marginBottom: 12,
                }}
              >
                신청하기
              </button>

              {/* 전화로 문의하기 */}
              <a
                href="tel:15440000"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "15px",
                  fontSize: 14,
                  color: "#0f1d3a",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(15,29,58,0.2)",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
              >
                <Phone size={16} style={{ color: "#caa85c" }} />
                전화로 문의하기 · 1544-0000
              </a>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

export function BottomBar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("방문예약 신청");
  const [pcPrivacyOpen, setPcPrivacyOpen] = useState(false);

  // PC form state
  const [pcName, setPcName] = useState("");
  const [pcPhone, setPcPhone] = useState("");
  const [pcUnitType, setPcUnitType] = useState("");
  const [pcVisitTime, setPcVisitTime] = useState("");
  const [pcAgreed, setPcAgreed] = useState(false);
  const [pcSubmitted, setPcSubmitted] = useState(false);

  const handlePcSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pcName.trim() || !pcPhone.trim() || !pcAgreed) return;
    dispatchNewReservation(pcName, pcPhone);
    submitReservation({ name: pcName, phone: pcPhone, unitType: pcUnitType, visitTime: pcVisitTime, source: "pc_bottom_bar" });
    setPcSubmitted(true);
    setTimeout(() => {
      setPcSubmitted(false);
      setPcName("");
      setPcPhone("");
      setPcAgreed(false);
    }, 3000);
  };

  const openSheet = (type: "inquiry" | "reservation") => {
    setSheetTitle(type === "inquiry" ? "문의하기" : "방문예약 신청");
    setSheetOpen(true);
  };

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px",
    fontSize: 13,
    color: "#0f1d3a",
    backgroundColor: "white",
    border: "1px solid rgba(15,29,58,0.15)",
    borderRadius: 4,
    fontFamily: "'Noto Sans KR', sans-serif",
    outline: "none",
    height: 40,
    boxSizing: "border-box",
  };

  return (
    <>
      {/* PC version */}
      <div
        className="bottom-bar-pc"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: "#0f1d3a",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
          borderTop: "2px solid #caa85c",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "11px 24px",
          }}
        >
          {pcSubmitted ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 40 }}>
              <span style={{ fontSize: 13, color: "#caa85c", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 500 }}>
                ✓ 관심 등록이 완료되었습니다. 담당자가 연락드리겠습니다.
              </span>
            </div>
          ) : (
            <form
              onSubmit={handlePcSubmit}
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              {/* Label */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <MessageCircle size={14} style={{ color: "#caa85c" }} />
                <span style={{ fontSize: 12, color: "#caa85c", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 600, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                  관심등록
                </span>
              </div>

              {/* Name */}
              <input
                type="text"
                placeholder="성함"
                value={pcName}
                onChange={(e) => setPcName(e.target.value)}
                required
                style={{ ...inputStyle, width: 90 }}
              />

              {/* Phone — narrower */}
              <input
                type="tel"
                placeholder="010-0000-0000"
                value={pcPhone}
                onChange={(e) => setPcPhone(e.target.value)}
                required
                style={{ ...inputStyle, width: 148 }}
              />

              {/* 관심평형 드롭박스 */}
              <select
                value={pcUnitType}
                onChange={(e) => setPcUnitType(e.target.value)}
                style={{ ...inputStyle, width: 100 }}
              >
                <option value="">평형(선택)</option>
                {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* 방문희망시간 드롭박스 */}
              <select
                value={pcVisitTime}
                onChange={(e) => setPcVisitTime(e.target.value)}
                style={{ ...inputStyle, width: 110 }}
              >
                <option value="">시간(선택)</option>
                {VISIT_TIMES_SHORT.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* Privacy */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={pcAgreed}
                  onChange={(e) => setPcAgreed(e.target.checked)}
                  style={{ accentColor: "#caa85c", width: 14, height: 14, cursor: "pointer" }}
                />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans KR', sans-serif", whiteSpace: "nowrap" }}>
                  개인정보 동의
                </span>
                <button
                  type="button"
                  onClick={() => setPcPrivacyOpen(true)}
                  style={{ background: "none", border: "none", padding: 0, fontSize: 11, color: "#caa85c", fontFamily: "'Noto Sans KR', sans-serif", fontWeight: 600, cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}
                >
                  [보기]
                </button>
              </div>
              <PrivacyModal open={pcPrivacyOpen} onClose={() => setPcPrivacyOpen(false)} />

              {/* Submit */}
              <button
                type="submit"
                style={{
                  padding: "0 20px",
                  height: 40,
                  fontSize: 13,
                  color: "white",
                  backgroundColor: "#caa85c",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: "'Noto Sans KR', sans-serif",
                  fontWeight: 500,
                  flexShrink: 0,
                  whiteSpace: "nowrap",
                }}
              >
                신청하기
              </button>

              {/* Divider */}
              <div style={{ width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.12)", flexShrink: 0 }} />

              {/* Phone call */}
              <a
                href="tel:15440000"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                  textDecoration: "none",
                }}
              >
                <Phone size={14} style={{ color: "#caa85c" }} />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'Noto Sans KR', sans-serif", whiteSpace: "nowrap" }}>
                  1544-0000
                </span>
              </a>
            </form>
          )}
        </div>
      </div>

      {/* Mobile version */}
      <div
        className="bottom-bar-mobile"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: "#0f1d3a",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.25)",
          borderTop: "2px solid #caa85c",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 58,
          }}
        >
          {/* 전화문의 — 바로 전화 연결 */}
          <a
            href="tel:15440000"
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              textDecoration: "none",
              borderRight: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <Phone size={18} style={{ color: "rgba(255,255,255,0.75)" }} />
            <span
              style={{
                fontSize: 15,
                color: "white",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              전화문의
            </span>
          </a>

          {/* 문의/방문예약 — 바텀시트 */}
          <button
            onClick={() => openSheet("reservation")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              background: "#caa85c",
              border: "none",
              cursor: "pointer",
            }}
          >
            <Calendar size={18} style={{ color: "white" }} />
            <span
              style={{
                fontSize: 15,
                color: "white",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                letterSpacing: "0.04em",
              }}
            >
              문의/방문예약
            </span>
          </button>
        </div>
      </div>

      {/* Bottom Sheet (mobile) */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={sheetTitle}
      />

      <style>{`
        .bottom-bar-pc  { display: none; }
        .bottom-bar-mobile { display: block; }
        @media (min-width: 768px) {
          .bottom-bar-pc     { display: block; }
          .bottom-bar-mobile { display: none; }
        }
      `}</style>
    </>
  );
}
