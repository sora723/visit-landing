"use client";

import { useEffect, useId, useRef, useState } from "react";

export type ScrollableSelectOption = { value: string; label: string };

export function ScrollableSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  listMaxHeight = 180,
  dropUp = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ScrollableSelectOption[];
  placeholder: string;
  className?: string;
  listMaxHeight?: number;
  /** true — 목록을 트리거 위쪽으로 (하단 고정바용) */
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
        className="flex h-full min-h-10 w-full items-center justify-between gap-2 rounded border border-[var(--color-navy)]/15 bg-white px-3 text-left text-[13px] text-[var(--color-navy)] outline-none focus:border-[var(--color-gold)]/60"
      >
        <span className={`truncate ${selected ? "" : "text-[#7a7060]"}`}>
          {selected?.label ?? placeholder}
        </span>
        <span className="shrink-0 text-[10px] text-[#7a7060]" aria-hidden>
          {dropUp ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute left-0 right-0 z-[260] overflow-y-auto rounded border border-[var(--color-navy)]/15 bg-white py-1 shadow-lg ${
            dropUp ? "bottom-full mb-1" : "top-full mt-1"
          }`}
          style={{ maxHeight: listMaxHeight }}
        >
          <li role="option" aria-selected={value === ""}>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-[13px] text-[#7a7060] hover:bg-[var(--color-bg)]"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={value === opt.value}>
              <button
                type="button"
                className={`block w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--color-bg)] ${
                  value === opt.value
                    ? "bg-[var(--color-gold)]/10 font-semibold text-[var(--color-navy)]"
                    : "text-[var(--color-navy)]"
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
