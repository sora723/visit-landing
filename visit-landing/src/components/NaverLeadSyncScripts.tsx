import {
  escapeForInlineJsString,
  isNaverWaId,
} from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  /** 접수당 1회 — sessionStorage 키에 사용 */
  submissionId: string;
};

/** 시트 HTML에서 WA ID 추출 */
function extractWaId(html: string): string | null {
  const trimmed = html.trim();
  if (isNaverWaId(trimmed)) return trimmed;
  const m =
    trimmed.match(/wcs_add\s*\[\s*['"]wa['"]\s*\]\s*=\s*['"]([^'"]+)['"]/i) ||
    trimmed.match(/wcs_add\s*\.\s*wa\s*=\s*['"]([^'"]+)['"]/i);
  return m?.[1]?.trim() || null;
}

/**
 * wcs 준비 후 lead 1회. sessionStorage는 성공 후에만 기록
 * (이전: 선점 후 if(window.wcs) 실패 시 전환 영구 스킵)
 */
function buildLeadFireScript(waId: string, submissionId: string): string {
  const wa = escapeForInlineJsString(waId.trim());
  const key = escapeForInlineJsString(`vl_naver_lead:${submissionId}`);
  return `(function(){
  var __nk="${key}";
  try{if(sessionStorage.getItem(__nk)==="1")return;}catch(e){}
  function __fire(){
    if(!window.wcs||typeof wcs.trans!=="function")return false;
    if(!window.wcs_add)var wcs_add={};
    wcs_add["wa"]="${wa}";
    var _conv={};_conv.type="lead";
    wcs.trans(_conv);
    try{sessionStorage.setItem(__nk,"1");}catch(e){}
    return true;
  }
  if(__fire())return;
  var __n=0;
  var __t=setInterval(function(){
    if(__fire()||++__n>50)clearInterval(__t);
  },100);
})();`;
}

/**
 * /complete 네이버 lead — SSR 동기 script.
 * afterInteractive 는 어시스턴트·autoReturn 레이스에 취약해 PV와 동일하게 초기 HTML에 출력.
 */
export function NaverLeadSyncScripts({ html, submissionId }: Props) {
  const trimmed = html.trim();
  const sid = submissionId.trim();
  if (!trimmed || !sid) return null;

  const waId = extractWaId(trimmed);
  if (!waId) {
    const parts = parseRawHtmlScripts(trimmed, "naver-lead-ssr");
    if (parts.length === 0) return null;
    return (
      <>
        {parts.map((part) =>
          part.kind === "external" ? (
            // eslint-disable-next-line @next/next/no-sync-scripts
            <script key={part.key} type="text/javascript" src={part.src} />
          ) : (
            <script
              key={part.key}
              type="text/javascript"
              dangerouslySetInnerHTML={{ __html: part.content }}
            />
          )
        )}
      </>
    );
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script type="text/javascript" src="//wcs.naver.net/wcslog.js" />
      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: buildLeadFireScript(waId, sid),
        }}
      />
    </>
  );
}
