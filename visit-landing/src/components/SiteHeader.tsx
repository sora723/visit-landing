"use client";

import { IconPhone } from "./icons";
import { useEffect, useState } from "react";
import { useConfig } from "./ConfigProvider";
import { normalizeImageUrl } from "@/lib/image-url";
import { formatHeaderTagline } from "@/lib/utils";

const NAV: { label: string; href: string; highlight?: boolean }[] = [
  { label: "사업개요", href: "#사업개요" },
  { label: "프리미엄", href: "#프리미엄" },
  { label: "입지환경", href: "#입지환경" },
  { label: "세대안내", href: "#세대안내" },
  { label: "방문예약", href: "#방문예약", highlight: true },
];

function scrollToAnchor(href: string) {
  const id = href.replace("#", "");
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function SiteHeader() {
  const { config } = useConfig();
  const tel = config.phone.replace(/\D/g, "");
  const headerTagline = formatHeaderTagline(config.headerBrand, config.headerSubBrand);
  const headerLogoSrc = config.headerLogoUrl
    ? normalizeImageUrl(config.headerLogoUrl, "logo")
    : "";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-header transition-all duration-300 ${
        scrolled
          ? "bg-white shadow-[0_2px_20px_rgba(15,29,58,0.12)]"
          : "bg-transparent shadow-none"
      }`}
    >
      <div className="mx-auto flex h-[58px] max-w-[1280px] items-center justify-between px-5">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex min-w-0 items-center gap-2.5 text-left"
        >
          {headerLogoSrc ? (
            <img
              src={headerLogoSrc}
              alt=""
              width={120}
              height={32}
              className="h-8 w-auto max-w-[120px] shrink-0 object-contain object-left"
            />
          ) : null}
          <div className="min-w-0 flex flex-col leading-tight">
            {headerTagline ? (
              <span className="text-[9px] tracking-[0.28em] text-[var(--color-gold)]">
                {headerTagline}
              </span>
            ) : null}
            <span
              className={`truncate text-xl font-black tracking-wide transition-colors duration-300 ${
                scrolled ? "text-[var(--color-navy)]" : "text-white"
              }`}
            >
              {config.siteName}
            </span>
          </div>
        </button>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) =>
            item.highlight ? (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor(item.href);
                }}
                className="rounded-sm border-[1.5px] border-[var(--color-gold)]/70 px-5 py-2 text-[17px] font-extrabold tracking-wide text-[var(--color-gold)] transition-colors hover:bg-[var(--color-gold)] hover:text-white"
              >
                {item.label}
              </a>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor(item.href);
                }}
                className={`text-sm tracking-wide transition-colors hover:text-[var(--color-gold)] ${
                  scrolled ? "text-[var(--color-navy)]" : "text-white/90"
                }`}
              >
                {item.label}
              </a>
            )
          )}
          <div className="flex items-center gap-1.5 border-l border-[var(--color-gold)]/30 pl-4">
            <IconPhone className="h-4 w-4 shrink-0 text-[var(--color-gold)]" />
            <a
              href={`tel:${tel}`}
              className={`text-2xl font-black tracking-wide transition-colors hover:text-[var(--color-gold)] ${
                scrolled ? "text-[var(--color-navy)]" : "text-white"
              }`}
            >
              {config.phone}
            </a>
          </div>
        </nav>

        <a
          href={`tel:${tel}`}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border md:hidden ${
            scrolled
              ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/15"
              : "border-[var(--color-gold)]/50 bg-[var(--color-gold)]/20"
          }`}
          aria-label="전화상담"
        >
          <IconPhone className="h-4 w-4 text-[var(--color-gold)]" />
        </a>
      </div>

      <div
        className={`overflow-hidden border-t bg-white transition-[max-height] duration-300 md:hidden ${
          scrolled
            ? "max-h-[44px] border-[var(--color-navy)]/8"
            : "max-h-0 border-transparent"
        }`}
      >
        <div className="flex w-full">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => {
                e.preventDefault();
                scrollToAnchor(item.href);
              }}
              className={`relative flex min-w-0 flex-1 items-center justify-center border-r border-[var(--color-navy)]/7 px-1 py-2.5 text-center text-[clamp(10px,2.65vw,13px)] leading-tight tracking-wide last:border-r-0 ${
                item.highlight
                  ? "font-extrabold text-[var(--color-gold)]"
                  : "font-normal text-[var(--color-navy)]"
              }`}
            >
              <span className="truncate">{item.label}</span>
              {item.highlight && (
                <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--color-gold)]" />
              )}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}

export function SiteChrome() {
  return (
    <div className="site-chrome fixed left-0 right-0 top-0 z-[100]">
      <SiteHeader />
    </div>
  );
}
