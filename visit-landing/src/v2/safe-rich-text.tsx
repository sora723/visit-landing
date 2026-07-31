/**
 * 제한 Markdown → React 노드 (raw HTML / script / iframe 없음).
 * 허용: 문단, 줄바꿈, h2/h3, ul/ol, strong, em, https 링크.
 */

import React, { type ReactNode } from "react";
import { parseSafeHttpsUrl } from "@/v2/safe-url";

/** 인라인: **bold** *em* [label](https://...) */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re =
    /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    if (m[2] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${i++}`}>{m[2]}</strong>
      );
    } else if (m[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-e-${i++}`}>{m[3]}</em>);
    } else if (m[4] !== undefined && m[5] !== undefined) {
      const href = parseSafeHttpsUrl(m[5]);
      if (href) {
        nodes.push(
          <a
            key={`${keyPrefix}-a-${i++}`}
            href={href}
            className="underline underline-offset-2"
            rel="noopener noreferrer"
          >
            {m[4]}
          </a>
        );
      } else {
        nodes.push(m[4]);
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function stripDangerous(raw: string): string {
  return String(raw || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

/**
 * description 필드를 제한 Markdown으로 렌더.
 * HTML 태그는 제거하고 텍스트만 남긴 뒤 Markdown 문법 적용.
 */
export function renderV2SafeRichText(raw: unknown): ReactNode {
  const cleaned = stripDangerous(String(raw ?? ""));
  if (!cleaned.trim()) return null;

  const lines = cleaned.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let bi = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^###\s+/.test(line)) {
      blocks.push(
        <h3
          key={`h3-${bi++}`}
          className="mt-4 text-lg font-semibold tracking-tight"
        >
          {renderInline(line.replace(/^###\s+/, ""), `h3-${bi}`)}
        </h3>
      );
      i += 1;
      continue;
    }
    if (/^##\s+/.test(line)) {
      blocks.push(
        <h2
          key={`h2-${bi++}`}
          className="mt-5 text-xl font-semibold tracking-tight"
        >
          {renderInline(line.replace(/^##\s+/, ""), `h2-${bi}`)}
        </h2>
      );
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*]\s+/, "");
        items.push(
          <li key={`ul-${bi}-${items.length}`}>
            {renderInline(itemText, `ul-${bi}-${items.length}`)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ul key={`ul-${bi++}`} className="mt-3 list-disc space-y-1 pl-5">
          {items}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
        items.push(
          <li key={`ol-${bi}-${items.length}`}>
            {renderInline(itemText, `ol-${bi}-${items.length}`)}
          </li>
        );
        i += 1;
      }
      blocks.push(
        <ol key={`ol-${bi++}`} className="mt-3 list-decimal space-y-1 pl-5">
          {items}
        </ol>
      );
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^##/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={`p-${bi++}`} className="mt-3 leading-relaxed text-pretty">
        {para.map((ln, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 ? <br /> : null}
            {renderInline(ln, `p-${bi}-${idx}`)}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return <div className="v2-richtext max-w-none">{blocks}</div>;
}

/** 테스트용 — HTML/script 스트립 결과 */
export function stripV2RichTextForTest(raw: string): string {
  return stripDangerous(raw);
}
