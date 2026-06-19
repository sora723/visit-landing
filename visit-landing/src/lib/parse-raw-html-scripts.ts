/** 시트 '전환코드' / 소유확인 HTML → Next Script용 파트 */

export type RawScriptPart =
  | { kind: "external"; src: string; key: string }
  | { kind: "inline"; content: string; key: string };

const SCRIPT_TAG_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

function readScriptSrc(attrs: string): string | undefined {
  const match = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
  return match?.[1]?.trim() || undefined;
}

/** HTML 주석 제거 후 script 태그 순서 유지 */
export function parseRawHtmlScripts(
  html: string,
  idPrefix = "raw"
): RawScriptPart[] {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (!cleaned) return [];

  const parts: RawScriptPart[] = [];
  let index = 0;

  for (const match of cleaned.matchAll(SCRIPT_TAG_RE)) {
    const attrs = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    const src = readScriptSrc(attrs);
    const key = `${idPrefix}-${index++}`;

    if (src) {
      parts.push({ kind: "external", src, key });
    } else if (body) {
      parts.push({ kind: "inline", content: body, key });
    }
  }

  return parts;
}
