import { headers } from "next/headers";
import { fetchStickyPromoFromSheet } from "@/lib/fetch-sticky-promo";
import { isMobileUserAgent } from "@/lib/is-mobile-user-agent";
import { PromoStickyBar } from "./PromoStickyBar";

/** Sheet stickyPromoText — 서버에서만 조회 (본문 렌더와 분리) */
export async function PromoStickyBarServer({ siteCode }: { siteCode: string }) {
  const { stickyPromoText } = await fetchStickyPromoFromSheet(siteCode);
  const ua = (await headers()).get("user-agent") ?? "";
  const serverMobile = isMobileUserAgent(ua);

  return (
    <PromoStickyBar
      siteCode={siteCode}
      initialText={stickyPromoText}
      serverMobile={serverMobile}
    />
  );
}
