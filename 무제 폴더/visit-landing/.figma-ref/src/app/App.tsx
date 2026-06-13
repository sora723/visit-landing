import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { RealtimeStatus } from "./components/RealtimeStatus";
import { ReservationSection } from "./components/ReservationSection";
import { Features } from "./components/Features";
import { Premium } from "./components/Premium";
import { ProjectOverview } from "./components/ProjectOverview";
import { Location } from "./components/Location";
import { FloorPlan } from "./components/FloorPlan";
import { Benefits } from "./components/Benefits";
import { Footer } from "./components/Footer";
import { BottomBar } from "./components/BottomBar";
import { VideoCtaSection } from "./components/VideoCtaSection";

export default function App() {
  return (
    <div
      style={{
        fontFamily: "'Noto Sans KR', sans-serif",
        backgroundColor: "#f8f6f2",
        overflowX: "hidden",
      }}
    >
      {/* Fixed Header */}
      <Header />

      {/* Main Content */}
      <main style={{ paddingBottom: 66 }}>
        {/* 1. Hero */}
        <Hero />

        {/* 2. 실시간 방문예약 현황 */}
        <RealtimeStatus />

        {/* 3. 방문예약 CTA 영상 ① — 긴급성 강조 */}
        <VideoCtaSection
          variant="dark"
          headline="지금 이 순간도 예약이 마감되고 있습니다"
          sub={`한정된 분양 물량 · 조기 완판 예상\n무료 방문 상담으로 내 가족의 미래를 확인하세요`}
          bgImage="https://images.unsplash.com/photo-1702738684590-b4399327e0ef?w=1920&h=800&fit=crop&auto=format"
        />

        {/* 4. 방문예약 (첫번째) */}
        <ReservationSection id="방문예약" />

        {/* 5. 현장 특장점 */}
        <Features />

        {/* 6. 프리미엄 커뮤니티 */}
        <Premium />

        {/* 7. 사업개요 */}
        <ProjectOverview />

        {/* 8. 입지환경 */}
        <Location />

        {/* 9. 입지 CTA 영상 ② — 가치 강조 */}
        <VideoCtaSection
          variant="gold"
          headline="원주혁신도시의 미래 가치를 선점하세요"
          sub={`KTX 원주역 도보 5분 · 수도권 54분 생활권\n지금 방문하시면 특별 혜택을 안내해 드립니다`}
          bgImage="https://images.unsplash.com/photo-1777551180597-e2155c8935ab?w=1920&h=800&fit=crop&auto=format"
        />

        {/* 10. 단지안내 · 평면도 */}
        <FloorPlan />

        {/* 11. 혜택안내 */}
        <Benefits />

        {/* 12. 혜택 CTA 영상 ③ — 혜택 강조 */}
        <VideoCtaSection
          variant="dark"
          headline={`約 2,800만원 무상혜택\n지금 방문 예약하시면 모두 드립니다`}
          sub="시스템에어컨 · 빌트인 가전 · 발코니 확장 — 입주 즉시 완벽한 삶이 시작됩니다"
          bgImage="https://images.unsplash.com/photo-1760182042697-fd8d2e3139eb?w=1920&h=800&fit=crop&auto=format"
        />

        {/* 13. 방문예약 (두번째) */}
        <ReservationSection id="방문예약-2" />
      </main>

      {/* Footer */}
      <Footer />

      {/* 하단 고정 관심등록란 */}
      <BottomBar />
    </div>
  );
}
