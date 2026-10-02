import {
  escapeForInlineJsString,
  isNaverWaId,
  normalizeNaverInflowDomain,
} from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  /** 접수당 1회 — sessionStorage 키에 사용 */
  submissionId: string;
  /** wcs.inflow — 시트 domain 또는 요청 Host */
  inflowDomain?: string | null;
  /** 소유확인 WA ID (lead HTML보다 우선) */
  ownershipWaId?: string | null;
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
 * 네이버 §2.1 완료 페이지 평문 패턴 (어시스턴트 Site ID 인식용).
 * IIFE/`window.wcs_add` 래핑은 정적 검수에서 Site ID 0건으로 판정됨.
 * lead만 sessionStorage로 접수당 1회.
 */
function buildCompletePvLeadScript(
  waId: string,
  inflowDomain: string | null | undefined,
  submissionId: string
): string {
  const wa = escapeForInlineJsString(waId.trim());
  const domain = normalizeNaverInflowDomain(inflowDomain ?? "");
  const domainArg = domain ? `"${escapeForInlineJsString(domain)}"` : '""';
  const key = escapeForInlineJsString(`vl_naver_lead:${submissionId}`);
  return `if (!wcs_add) var wcs_add = {};
wcs_add["wa"] = "${wa}";
if (window.wcs) {
  wcs.inflow(${domainArg});
  wcs_do();
  try {
    var __nk = "${key}";
    if (sessionStorage.getItem(__nk) !== "1") {
      var _conv = {};
      _conv.type = "lead";
      wcs.trans(_conv);
      sessionStorage.setItem(__nk, "1");
    }
  } catch (e) {}
}`;
}

/**
 * /complete 네이버 lead — SSR 동기 script.
 * PV+lead 를 가이드 §2.1 과 동일한 실행 순서로 한 블록에 출력.
 */
export function NaverLeadSyncScripts({
  html,
  submissionId,
  inflowDomain,
  ownershipWaId,
}: Props) {
  const trimmed = html.trim();
  const sid = submissionId.trim();
  if (!trimmed || !sid) return null;

  const waId =
    (ownershipWaId?.trim() && isNaverWaId(ownershipWaId.trim())
      ? ownershipWaId.trim()
      : null) || extractWaId(trimmed);
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
          __html: buildCompletePvLeadScript(waId, inflowDomain, sid),
        }}
      />
    </>
  );
}
