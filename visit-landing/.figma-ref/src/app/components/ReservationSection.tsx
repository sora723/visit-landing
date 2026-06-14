import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { CheckCircle } from "lucide-react";
import { motion, useInView } from "motion/react";
import { submitReservation, dispatchNewReservation } from "../utils/submitApi";
import { PrivacyModal } from "./PrivacyModal";

interface FormData {
  name: string;
  phone: string;
  unitType: string;
  visitDate: string;
  visitTime: string;
  privacy: boolean;
}

const UNIT_TYPES = ["84A형", "84B형", "101형", "112형", "미정"];
const VISIT_TIMES = [
  "오전 10:00",
  "오전 11:00",
  "오후 12:00",
  "오후 1:00",
  "오후 2:00",
  "오후 3:00",
  "오후 4:00",
  "오후 5:00",
];

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  fontSize: 14,
  color: "#0f1d3a",
  backgroundColor: "white",
  border: "1px solid rgba(15,29,58,0.2)",
  borderRadius: 4,
  fontFamily: "'Noto Sans KR', sans-serif",
  outline: "none",
  boxSizing: "border-box" as const,
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  color: "#0f1d3a",
  fontFamily: "'Noto Sans KR', sans-serif",
  fontWeight: 500,
  marginBottom: 6,
  letterSpacing: "0.04em",
};

export function ReservationSection({ id = "방문예약" }: { id?: string }) {
  const [submitted, setSubmitted] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px" });
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>();

  const onSubmit = (data: FormData) => {
    dispatchNewReservation(data.name, data.phone);
    submitReservation({
      name: data.name,
      phone: data.phone,
      unitType: data.unitType,
      visitDate: data.visitDate,
      visitTime: data.visitTime,
      source: "reservation_form",
    });
    setSubmitted(true);
  };

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{
        backgroundColor: "#0f1d3a",
        padding: "80px 24px",
        scrollMarginTop: 100,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated background decorations */}
      <style>{`
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.12; }
          33% { transform: translate(20px, -30px) rotate(120deg); opacity: 0.22; }
          66% { transform: translate(-15px, 15px) rotate(240deg); opacity: 0.08; }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.08; }
          50% { transform: translate(-25px, 20px) scale(1.3); opacity: 0.18; }
        }
        @keyframes shimmerLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(202,168,92,0), 0 8px 48px rgba(15,29,58,0.15); }
          50% { box-shadow: 0 0 0 4px rgba(202,168,92,0.15), 0 16px 64px rgba(15,29,58,0.2); }
        }
        @keyframes submitGlow {
          0%, 100% { box-shadow: 0 4px 20px rgba(15,29,58,0.4); }
          50% { box-shadow: 0 8px 40px rgba(15,29,58,0.6), 0 0 20px rgba(202,168,92,0.2); }
        }
        .reservation-form-card {
          animation: borderPulse 3s ease-in-out infinite;
        }
        .reservation-submit-btn {
          animation: submitGlow 2.5s ease-in-out infinite;
        }
        .reservation-submit-btn:hover {
          animation: none !important;
          box-shadow: 0 8px 32px rgba(15,29,58,0.5), 0 0 28px rgba(202,168,92,0.35) !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* Floating gold orbs */}
      {[
        { size: 280, top: -80, left: -80, delay: "0s" },
        { size: 200, top: "40%", right: -60, delay: "2s" },
        { size: 150, bottom: -40, left: "30%", delay: "4s" },
      ].map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(202,168,92,0.18) 0%, transparent 70%)",
            top: orb.top,
            left: (orb as any).left,
            right: (orb as any).right,
            bottom: (orb as any).bottom,
            animation: `floatA 8s ease-in-out ${orb.delay} infinite`,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Animated grid pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(202,168,92,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(202,168,92,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />
      <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Section Title */}
        <motion.div
          style={{ textAlign: "center", marginBottom: 48 }}
          initial={{ opacity: 0, y: -24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.span
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              color: "#caa85c",
              fontFamily: "'Noto Sans KR', sans-serif",
              display: "inline-block",
            }}
            initial={{ opacity: 0, letterSpacing: "0.6em" }}
            animate={isInView ? { opacity: 1, letterSpacing: "0.3em" } : {}}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            VISIT RESERVATION
          </motion.span>
          <motion.h2
            style={{
              fontSize: "clamp(26px, 4vw, 42px)",
              color: "white",
              fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
              fontWeight: 800,
              marginTop: 10,
              letterSpacing: "0.05em",
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            방문예약 신청
          </motion.h2>
          <motion.div
            style={{
              height: 2,
              backgroundColor: "#caa85c",
              margin: "16px auto 0",
              originX: 0.5,
            }}
            initial={{ width: 0 }}
            animate={isInView ? { width: 60 } : {}}
            transition={{ duration: 0.6, delay: 0.35 }}
          />
          <motion.p
            style={{
              marginTop: 14,
              fontSize: 14,
              color: "rgba(255,255,255,0.6)",
              fontFamily: "'Noto Sans KR', sans-serif",
            }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            방문예약 신청 후 전담 상담사가 확인 연락드립니다
          </motion.p>

          {/* Stats bar */}
          <motion.div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 32,
              marginTop: 24,
              padding: "16px 0",
              borderTop: "1px solid rgba(202,168,92,0.2)",
              borderBottom: "1px solid rgba(202,168,92,0.2)",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {[
              { num: "무료", label: "방문 상담" },
              { num: "당일", label: "예약 가능" },
              { num: "1:1", label: "전담 상담사" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, color: "#caa85c", fontFamily: "'Gothic A1', sans-serif", fontWeight: 900 }}>{s.num}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans KR', sans-serif", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </motion.div>

        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: "60px 40px",
              textAlign: "center",
              boxShadow: "0 8px 64px rgba(15,29,58,0.3)",
            }}
          >
            <CheckCircle
              size={56}
              style={{ color: "#caa85c", margin: "0 auto 24px" }}
            />
            <h3
              style={{
                fontSize: 22,
                color: "#0f1d3a",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              예약이 접수되었습니다
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "#7a7060",
                fontFamily: "'Noto Sans KR', sans-serif",
                lineHeight: 1.8,
              }}
            >
              담당 상담사가 빠른 시간 내 연락드리겠습니다.
              <br />
              원주 한양립스를 선택해 주셔서 감사합니다.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              style={{
                marginTop: 32,
                padding: "12px 32px",
                fontSize: 14,
                color: "white",
                backgroundColor: "#0f1d3a",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "'Noto Sans KR', sans-serif",
              }}
            >
              추가 예약하기
            </button>
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleSubmit(onSubmit)}
            className="reservation-form-card"
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6, ease: "easeOut" }}
            style={{
              backgroundColor: "white",
              borderRadius: 16,
              padding: "48px 40px",
              boxShadow: "0 8px 48px rgba(15,29,58,0.25)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Shimmer overlay on card top */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: "linear-gradient(90deg, transparent, #caa85c, #e8d4a0, #caa85c, transparent)",
                backgroundSize: "200% 100%",
                animation: "shimmerLine 2.5s linear infinite",
              }}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px 24px",
              }}
              className="form-grid"
            >
              {/* Name */}
              <div>
                <label style={labelStyle}>
                  성함 <span style={{ color: "#caa85c" }}>*</span>
                </label>
                <input
                  {...register("name", { required: true })}
                  placeholder="홍길동"
                  style={{
                    ...inputStyle,
                    borderColor: errors.name ? "#d4183d" : "rgba(15,29,58,0.2)",
                  }}
                />
                {errors.name && (
                  <p style={{ fontSize: 12, color: "#d4183d", marginTop: 4 }}>
                    성함을 입력해주세요
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>
                  연락처 <span style={{ color: "#caa85c" }}>*</span>
                </label>
                <input
                  {...register("phone", {
                    required: true,
                    pattern: /^010-?\d{4}-?\d{4}$/,
                  })}
                  placeholder="010-0000-0000"
                  style={{
                    ...inputStyle,
                    borderColor: errors.phone ? "#d4183d" : "rgba(15,29,58,0.2)",
                  }}
                />
                {errors.phone && (
                  <p style={{ fontSize: 12, color: "#d4183d", marginTop: 4 }}>
                    올바른 연락처를 입력해주세요
                  </p>
                )}
              </div>

              {/* Unit Type */}
              <div>
                <label style={labelStyle}>관심 평형 <span style={{ color: "#b0a898", fontWeight: 400 }}>(선택)</span></label>
                <select
                  {...register("unitType")}
                  style={inputStyle}
                  defaultValue=""
                >
                  <option value="" disabled>
                    평형 선택
                  </option>
                  {UNIT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visit Date */}
              <div>
                <label style={labelStyle}>방문 희망일 <span style={{ color: "#b0a898", fontWeight: 400 }}>(선택)</span></label>
                <input
                  {...register("visitDate")}
                  type="date"
                  style={inputStyle}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Visit Time */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>방문 희망 시간 <span style={{ color: "#b0a898", fontWeight: 400 }}>(선택)</span></label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {VISIT_TIMES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedTime(t);
                        setValue("visitTime", t);
                      }}
                      style={{
                        padding: "8px 16px",
                        fontSize: 13,
                        borderRadius: 4,
                        border: `1px solid ${selectedTime === t ? "#caa85c" : "rgba(15,29,58,0.2)"}`,
                        backgroundColor: selectedTime === t ? "rgba(202,168,92,0.1)" : "white",
                        color: selectedTime === t ? "#caa85c" : "#7a7060",
                        cursor: "pointer",
                        fontFamily: "'Noto Sans KR', sans-serif",
                        transition: "all 0.15s",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy */}
            <div
              style={{
                marginTop: 28,
                padding: "16px 20px",
                backgroundColor: "#f8f6f2",
                borderRadius: 6,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <input
                type="checkbox"
                {...register("privacy", { required: true })}
                id="privacy"
                style={{ marginTop: 2, accentColor: "#caa85c", width: 16, height: 16, cursor: "pointer" }}
              />
              <div style={{ flex: 1 }}>
                <label
                  htmlFor="privacy"
                  style={{
                    fontSize: 13,
                    color: "#7a7060",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    lineHeight: 1.6,
                    cursor: "pointer",
                    display: "inline",
                  }}
                >
                  <span style={{ color: "#0f1d3a", fontWeight: 500 }}>[필수]</span>{" "}
                  개인정보 수집 및 이용에 동의합니다.
                </label>
                {" "}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 13,
                    color: "#caa85c",
                    fontFamily: "'Noto Sans KR', sans-serif",
                    fontWeight: 600,
                    cursor: "pointer",
                    textDecoration: "underline",
                    letterSpacing: "0.02em",
                  }}
                >
                  [보기]
                </button>
              </div>
            </div>
            <PrivacyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
            {errors.privacy && (
              <p
                style={{
                  fontSize: 12,
                  color: "#d4183d",
                  marginTop: 6,
                  paddingLeft: 4,
                }}
              >
                개인정보 수집에 동의해주세요
              </p>
            )}

            <motion.button
              type="submit"
              className="reservation-submit-btn"
              whileHover={{ scale: 1.02, backgroundColor: "#1a2e5a" }}
              whileTap={{ scale: 0.98 }}
              style={{
                marginTop: 28,
                width: "100%",
                padding: "20px",
                fontSize: 16,
                color: "white",
                backgroundColor: "#0f1d3a",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "'Gothic A1', 'Noto Sans KR', sans-serif",
                fontWeight: 800,
                letterSpacing: "0.12em",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Shimmer on button */}
              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: "linear-gradient(90deg, transparent 0%, rgba(202,168,92,0.15) 50%, transparent 100%)",
                  animation: "shimmerLine 2s linear infinite",
                  pointerEvents: "none",
                }}
              />
              방문예약 신청하기 →
            </motion.button>
          </motion.form>
        )}
      </div>

      <style>{`
        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr !important;
          }
          .reservation-form-card {
            padding: 32px 20px !important;
          }
        }
      `}</style>
    </section>
  );
}

