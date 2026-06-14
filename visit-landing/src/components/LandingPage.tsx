"use client";

import { ReservationPopup } from "./ReservationPopup";
import { ReservationToast } from "./ReservationToast";
import { SiteChrome } from "./SiteHeader";
import { HeroSection } from "./HeroSection";
import { LiveReservationSection } from "./LiveReservationSection";
import {
  OverviewSection,
  PremiumSection,
  LocationSection,
  FutureValueSection,
  SitePlanSection,
  CommunitySection,
} from "./Sections";
import { CtaSection, SiteFooter } from "./CtaSection";
import { CtaPromoImageSection } from "./CtaPromoImageSection";
import { FooterReservationSection } from "./FooterReservationSection";
import { CustomSections } from "./CustomSections";
import { BottomBar } from "./BottomBar";

export function LandingPage({ promoBar }: { promoBar?: React.ReactNode }) {
  return (
    <>
      <ReservationPopup />
      <ReservationToast />
      <SiteChrome />
      <main>
        <HeroSection />
        <LiveReservationSection />
        <CtaSection sectionId="방문예약" />
        <CtaPromoImageSection />
        <PremiumSection />
        <OverviewSection />
        <LocationSection />
        <FutureValueSection />
        <SitePlanSection />
        <CommunitySection />
        <CustomSections />
        <FooterReservationSection />
      </main>
      <SiteFooter />
      {promoBar}
      <BottomBar />
    </>
  );
}
