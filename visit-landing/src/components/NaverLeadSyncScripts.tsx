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

function wrapOnce(submissionId: string, body: string): string {
  const key = escapeForInlineJsString(`vl_naver_lead:${submissionId}`);
  return `try{var __nk="${key}";if(sessionStorage.getItem(__nk)==="1")throw 1;sessionStorage.setItem(__nk,"1");
${body}
}catch(e){if(e!==1){}}`;
}

function buildLeadFromWa(waId: string, submissionId: string): string {
  const wa = escapeForInlineJsString(waId.trim());
  return wrapOnce(
    submissionId,
    `if(window.wcs){
  if(!wcs_add) var wcs_add={};
  wcs_add["wa"]="${wa}";
  var _conv={};_conv.type="lead";
  wcs.trans(_conv);
}`
  );
}

/**
 * /complete 네이버 lead — SSR 동기 script.
 * afterInteractive 는 어시스턴트·autoReturn 레이스에 취약해 PV와 동일하게 초기 HTML에 출력.
 */
export function NaverLeadSyncScripts({ html, submissionId }: Props) {
  const trimmed = html.trim();
  const sid = submissionId.trim();
  if (!trimmed || !sid) return null;

  if (isNaverWaId(trimmed)) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script type="text/javascript" src="//wcs.naver.net/wcslog.js" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: buildLeadFromWa(trimmed, sid),
          }}
        />
      </>
    );
  }

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
            dangerouslySetInnerHTML={{
              __html: wrapOnce(sid, part.content),
            }}
          />
        )
      )}
    </>
  );
}
