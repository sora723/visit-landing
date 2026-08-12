import {
  escapeForInlineJsString,
  isNaverWaId,
  normalizeNaverInflowDomain,
} from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  inflowDomain?: string | null;
};

export function ownershipHtmlIsNaver(html: string): boolean {
  const trimmed = html.trim();
  if (!trimmed) return false;
  if (isNaverWaId(trimmed)) return true;
  return /wcs\.naver\.net|wcs_add|wcs\.inflow|wcs_do\s*\(/i.test(trimmed);
}

function buildWaInlineScript(waId: string, inflowDomain?: string | null): string {
  const wa = escapeForInlineJsString(waId.trim());
  const domain = normalizeNaverInflowDomain(inflowDomain ?? "");
  const domainArg = domain ? `"${escapeForInlineJsString(domain)}"` : "";
  return `if (!wcs_add) var wcs_add={};
wcs_add["wa"] = "${wa}";
if(window.wcs) {
    wcs.inflow(${domainArg});
}
wcs_do();`;
}

/**
 * 네이버 공통영역 PV/유입 — 동기 script 를 SSR HTML에 직접 출력.
 * next/script afterInteractive 는 초기 HTML에 없어 전환 스크립트 어시스턴트가 Site ID 0건으로 판정함.
 */
export function NaverCommonPvScripts({ html, inflowDomain }: Props) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (isNaverWaId(trimmed)) {
    return (
      <>
        {/* 네이버 검수: 동기 로드 순서(wcslog → inflow/do) 유지 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script type="text/javascript" src="//wcs.naver.net/wcslog.js" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: buildWaInlineScript(trimmed, inflowDomain),
          }}
        />
      </>
    );
  }

  const parts = parseRawHtmlScripts(trimmed, "ownership-naver");
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
