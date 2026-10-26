"use client";

import { useEffect, useId, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search tools, formats, or what you need to do...",
  className,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }

      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  return (
    <div className={cn("group relative mx-auto w-full max-w-2xl", className)}>
      <div
        className="absolute -inset-px rounded-2xl bg-gradient-to-r from-emerald-400/35 via-white/10 to-indigo-400/35 opacity-70 blur-[1px] transition-opacity duration-300 group-focus-within:opacity-100"
        aria-hidden="true"
      />
      <div className="relative flex items-center rounded-2xl border border-white/10 bg-[#080d16]/95 shadow-[0_24px_70px_-35px_rgba(0,0,0,0.95)] backdrop-blur-xl transition-shadow duration-300 group-focus-within:shadow-[0_24px_80px_-32px_rgba(52,211,153,0.28)]">
        <label htmlFor={inputId} className="sr-only">
          Search DextroKit tools
        </label>
        <Search
          className="ml-4 size-5 shrink-0 text-zinc-500 transition-colors group-focus-within:text-emerald-300 sm:ml-5"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-keyshortcuts="Control+K Meta+K"
          className="h-14 min-w-0 flex-1 appearance-none bg-transparent px-3 text-base text-white outline-none placeholder:text-zinc-500 sm:h-16 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
        />

        <div className="flex shrink-0 items-center gap-1.5 pr-2.5 sm:pr-3">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              aria-label="Clear search"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <kbd className="hidden select-none items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 font-mono text-[10px] font-medium text-zinc-500 sm:flex">
            Ctrl K
          </kbd>
        </div>
      </div>
    </div>
  );
}
