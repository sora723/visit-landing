import {
  escapeForInlineJsString,
  isNaverWaId,
  normalizeNaverInflowDomain,
} from "@/lib/naver-conversion";
import { parseRawHtmlScripts } from "@/lib/parse-raw-html-scripts";

type Props = {
  html: string;
  /**
   * 접수당 1회 dedupe 키. 없으면 페이지 단위 키.
   * (사이트맵 `/complete` 검수는 submissionId 없이 들어오므로 optional)
   */
  submissionId?: string | null;
  /** wcs.inflow — 시트 domain 또는 요청 Host */
  inflowDomain?: string | null;
  /** 소유확인 WA ID (lead HTML보다 우선) */
  ownershipWaId?: string | null;
  /**
   * false 면 wcs.trans 는 호출하지 않되, HTML에 lead 패턴은 남김
   * (정적 검수용). 기본 true.
   */
  fireTrans?: boolean;
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
 * 네이버 신청완료(lead) 평문 패턴 — CTS/GFA 정적 검수·가이드 §2.1 동일.
 * IIFE 래핑 금지. `_conv.type = 'lead'` + `wcs.trans` 문자열이 HTML에 보여야 함.
 * fireTrans=false 여도 lead 리터럴은 유지(사이트맵 /complete 검수용).
 */
function buildCompletePvLeadScript(
  waId: string,
  inflowDomain: string | null | undefined,
  dedupeKey: string,
  fireTrans: boolean
): string {
  const wa = escapeForInlineJsString(waId.trim());
  const domain = normalizeNaverInflowDomain(inflowDomain ?? "");
  const domainArg = domain ? `"${escapeForInlineJsString(domain)}"` : '""';
  const key = escapeForInlineJsString(dedupeKey);
  /** fire 여부와 무관하게 lead·wcs.trans 리터럴을 HTML에 유지 (CTS 정적 검수) */
  const shouldFire = fireTrans ? "true" : "false";
  return `if (!wcs_add) var wcs_add = {};
wcs_add["wa"] = "${wa}";
if (window.wcs) {
  wcs.inflow(${domainArg});
  wcs_do();
  try {
    var __nk = "${key}";
    var __fire = ${shouldFire};
    var _conv = {};
    _conv.type = "lead";
    if (__fire && sessionStorage.getItem(__nk) !== "1") {
      wcs.trans(_conv);
      sessionStorage.setItem(__nk, "1");
    }
  } catch (e) {}
}`;
}

/**
 * /complete 네이버 lead — SSR 동기 script.
 * PV+lead 를 가이드와 같은 순서로 한 블록에 출력.
 * submissionId 없이도 HTML에 lead 패턴을 남겨 사이트맵 검수가 통과하게 함.
 */
export function NaverLeadSyncScripts({
  html,
  submissionId,
  inflowDomain,
  ownershipWaId,
  fireTrans = true,
}: Props) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  const sid = String(submissionId || "").trim();
  const dedupeKey = sid ? `vl_naver_lead:${sid}` : "vl_naver_lead:page";

  const waId =
    (ownershipWaId?.trim() && isNaverWaId(ownershipWaId.trim())
      ? ownershipWaId.trim()
      : null) || extractWaId(trimmed);
  if (!waId) {
    /** WA 추출 실패 시 시트 HTML 원문 출력(검수용 lead 문자열 유지) */
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
          __html: buildCompletePvLeadScript(
            waId,
            inflowDomain,
            dedupeKey,
            fireTrans
          ),
        }}
      />
    </>
  );
}
