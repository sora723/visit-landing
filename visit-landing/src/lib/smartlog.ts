/** Smartlog(smlog) — 현장별 부정클릭/유입 스크립트 */

export type SmartlogIds = {
  /** hpt_info._account — UHPT-300862 */
  account: string;
  /** noscript·이미지용 숫자 — 300862 */
  accountNumeric: string;
  /** hpt_info._server — a300 */
  server: string;
};

export type SmartlogConversionMode = "q" | "order" | "join";

export function normalizeSmartlogAccount(
  raw?: string | null
): { account: string; accountNumeric: string } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;

  const uhpt = s.match(/^UHPT-(\d+)$/i);
  if (uhpt) {
    return {
      account: `UHPT-${uhpt[1]}`,
      accountNumeric: uhpt[1]!,
    };
  }

  const digits = s.match(/^(\d+)$/);
  if (digits) {
    return {
      account: `UHPT-${digits[1]}`,
      accountNumeric: digits[1]!,
    };
  }

  return null;
}

export function normalizeSmartlogServer(raw?: string | null): string | null {
  let s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(".")[0];
  if (!s) return null;
  if (!/^a\d+$/i.test(s) && !/^[a-z0-9_-]+$/i.test(s)) return null;
  return s;
}

export function resolveSmartlogIds(
  accountRaw?: string | null,
  serverRaw?: string | null
): SmartlogIds | null {
  const account = normalizeSmartlogAccount(accountRaw);
  const server = normalizeSmartlogServer(serverRaw);
  if (!account || !server) return null;
  return {
    account: account.account,
    accountNumeric: account.accountNumeric,
    server,
  };
}

export function normalizeSmartlogConversionMode(
  raw?: string | null
): SmartlogConversionMode {
  const m = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (m === "order" || m === "주문") return "order";
  if (m === "join" || m === "회원가입" || m === "가입") return "join";
  return "q";
}

export function smartlogScriptSrc(): string {
  return "https://cdn.smlog.co.kr/core/smart_renew.js";
}

export function smartlogNoscriptSrc(ids: SmartlogIds): string {
  return `https://${ids.server}.smlog.co.kr/smart_bda?_account=${encodeURIComponent(ids.accountNumeric)}`;
}

export function smartlogBaseInline(ids: SmartlogIds): string {
  return `var hpt_info={'_account':'${ids.account}','_server':'${ids.server}'};`;
}

export function smartlogTraceInline(
  mode: SmartlogConversionMode,
  memId: string,
  totalPrice?: string
): string {
  const safeMem = String(memId || "")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
  if (mode === "order") {
    const price = String(totalPrice ?? "0").replace(/'/g, "");
    return `var hpt_trace_info={'_mode':'order','_memid':'${safeMem}','_total_price':'${price}'};`;
  }
  return `var hpt_trace_info={'_mode':'${mode}','_memid':'${safeMem}'};`;
}
