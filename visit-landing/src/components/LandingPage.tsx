"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "./HeroSection";
import { SiteChrome } from "./SiteHeader";
import { BottomBar } from "./BottomBar";

const ReservationPopup = dynamic(
  () => import("./ReservationPopup").then((m) => ({ default: m.ReservationPopup })),
  { ssr: false }
);
const ReservationToast = dynamic(
  () =>
    import("./ReservationToast").then((m) => ({ default: m.ReservationToast })),
  { ssr: false }
);
const LiveReservationSection = dynamic(
  () =>
    import("./LiveReservationSection").then((m) => ({
      default: m.LiveReservationSection,
    })),
  { ssr: true }
);
const CtaSection = dynamic(
  () => import("./CtaSection").then((m) => ({ default: m.CtaSection })),
  { ssr: true }
);
const CtaPromoImageSection = dynamic(
  () =>
    import("./CtaPromoImageSection").then((m) => ({
      default: m.CtaPromoImageSection,
    })),
  { ssr: true }
);
const PremiumSection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.PremiumSection })),
  { ssr: true }
);
const OverviewSection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.OverviewSection })),
  { ssr: true }
);
const LocationSection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.LocationSection })),
  { ssr: true }
);
const FutureValueSection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.FutureValueSection })),
  { ssr: true }
);
const UnitTypesSection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.UnitTypesSection })),
  { ssr: true }
);
const CommunitySection = dynamic(
  () =>
    import("./Sections").then((m) => ({ default: m.CommunitySection })),
  { ssr: true }
);
const CustomSections = dynamic(
  () =>
    import("./CustomSections").then((m) => ({ default: m.CustomSections })),
  { ssr: true }
);
const FooterReservationSection = dynamic(
  () =>
    import("./FooterReservationSection").then((m) => ({
      default: m.FooterReservationSection,
    })),
  { ssr: true }
);
const SiteFooter = dynamic(
  () => import("./CtaSection").then((m) => ({ default: m.SiteFooter })),
  { ssr: true }
);

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
        <UnitTypesSection />
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
