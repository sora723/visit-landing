import { fetchStickyPromoFromSheet } from "@/lib/fetch-sticky-promo";
import { PromoStickyBar } from "./PromoStickyBar";

/** Sheet stickyPromoText — 서버에서만 조회 (본문 렌더와 분리) */
export async function PromoStickyBarServer({ siteCode }: { siteCode: string }) {
  const { stickyPromoText } = await fetchStickyPromoFromSheet(siteCode);
  return <PromoStickyBar siteCode={siteCode} initialText={stickyPromoText} />;
}
