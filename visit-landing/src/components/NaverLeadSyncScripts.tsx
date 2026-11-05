import { escapeForInlineJsString, isNaverWaId } from "@/lib/naver-conversion";

type Props = {
  /**
   * 소유확인코드 WA ID.
   * 없거나 WA 형식이 아니면 빈 문자열로 출력.
   */
  waId?: string | null;
};

/**
 * 네이버 신청완료(lead) 기본 스크립트.
 * 본문은 가이드 평문 고정, `wcs_add['wa']` 만 소유확인코드에서 치환.
 */
function buildNaverLeadGuideScript(waId: string): string {
  const wa = escapeForInlineJsString(waId);
  return `if(window.wcs){
    if(!wcs_add) var wcs_add = {};
    wcs_add['wa'] = '${wa}';
    var _conv = {};
    	_conv.type = 'lead';
    wcs.trans(_conv);
    }`;
}

/**
 * /complete 네이버 lead — SSR 동기 script.
 * WA는 소유확인코드만 사용 (없으면 빈 값).
 */
export function NaverLeadSyncScripts({ waId }: Props) {
  const wa =
    waId?.trim() && isNaverWaId(waId.trim()) ? waId.trim() : "";

  return (
    <>
      <span
        hidden
        dangerouslySetInnerHTML={{
          __html: "<!-- NAVER 신청완료(lead) SCRIPT -->",
        }}
      />
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script type="text/javascript" src="//wcs.naver.net/wcslog.js" />
      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: buildNaverLeadGuideScript(wa),
        }}
      />
    </>
  );
}
