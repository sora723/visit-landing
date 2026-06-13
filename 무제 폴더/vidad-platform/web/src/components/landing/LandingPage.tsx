"use client";

import { ReservationPopup } from "./ReservationPopup";
import { HeroSection } from "./HeroSection";
import { LiveReservations } from "./LiveReservations";
import { ReservationGuide } from "./ReservationGuide";
import { OverviewSection } from "./OverviewSection";
import { PremiumSection, LocationSection, ContentGridSection } from "./ContentSections";
import { CtaSection, SiteFooter, MobileFixedBar } from "./CtaSection";
import { useSite } from "./SiteProvider";

export function LandingPage() {
  const { site } = useSite();

  return (
    <>
      <ReservationPopup />
      <main>
        <HeroSection />
        <LiveReservations />
        <ReservationGuide />
        <OverviewSection />
        <PremiumSection />
        <LocationSection />
        <ContentGridSection
          id="future"
          label="FUTURE VALUE"
          title="미래가치"
          items={site.futureValue}
        />
        <ContentGridSection
          id="layout"
          label="SITE PLAN"
          title="단지배치도"
          items={site.siteLayout}
        />
        <ContentGridSection
          id="community"
          label="COMMUNITY"
          title="커뮤니티"
          items={site.community}
          dark
        />
        <CtaSection />
      </main>
      <SiteFooter />
      <MobileFixedBar />
    </>
  );
}
