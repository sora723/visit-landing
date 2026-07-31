/**
 * 시스템 기본 법적 footer — ConfigProvider 없이 props만으로 렌더.
 * V1 SiteFooter와 동일 마크업·문구 (하드코딩 법률 문구 추가 없음).
 */

import React from "react";
import type { V2FooterItem } from "@/v2/v2-runtime-site-context";

export type SiteSystemFooterProps = {
  siteName: string;
  footer: {
    items: V2FooterItem[];
    bottomText?: string;
  };
};

export function SiteSystemFooter({ siteName, footer }: SiteSystemFooterProps) {
  const items = footer.items.filter((item) => item.title || item.content);

  return (
    <footer className="site-footer border-t border-white/8 bg-[var(--color-navy)] pt-8 text-white/55 sm:pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-5">
          <strong className="block text-base text-white sm:text-lg">
            {siteName}
          </strong>
          {items.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-2">
              {items.map((item, index) => (
                <div
                  key={`${item.title}-${item.content}-${index}`}
                  className="grid grid-cols-[88px_1fr] gap-2 text-xs"
                >
                  <dt className="text-white/38">{item.title}</dt>
                  <dd className="text-white/72">{item.content}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        {footer.bottomText ? (
          <p className="whitespace-pre-line text-xs leading-relaxed">
            {footer.bottomText}
          </p>
        ) : null}
        <p className="mt-2 pb-6 text-xs text-white/28">
          © 2026 DAVID. All rights reserved.
          <br />
          Powered by DAVID
        </p>
      </div>
    </footer>
  );
}
