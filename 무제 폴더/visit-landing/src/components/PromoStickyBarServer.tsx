import { fetchStickyPromoFromSheet } from "@/lib/fetch-sticky-promo";
import { PromoStickyBar } from "./PromoStickyBar";

/** Sheet stickyPromoText — 서버에서만 조회 (본문 렌더와 분리) */
export async function PromoStickyBarServer() {
  const { stickyPromoText } = await fetchStickyPromoFromSheet();
  return <PromoStickyBar initialText={stickyPromoText} />;
}
