import { normalizeGoogleAdsId } from "@/lib/conversion-tracking";

type Props = {
  conversionId?: string | null;
};

/**
 * Google Ads 베이스 태그 — 전 페이지.
 * googleConversionId 만 있어도 설치 확인(Tag Assistant)용 gtag config 출력.
 * 전환 이벤트(send_to)는 /complete 의 ConversionTracking (라벨 필요).
 */
export function GoogleAdsBaseScripts({ conversionId }: Props) {
  const raw = conversionId?.trim();
  if (!raw) return null;

  const id = normalizeGoogleAdsId(raw);

  return (
    <>
      {/* Google 권장 async + 동기 config — 초기 HTML에 넣어 설치 검수 대응 */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`,
        }}
      />
    </>
  );
}
