"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Coffee,
  Layers,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { categoryOptions, getCategoryHref } from "@/data/tools";
import { getIcon } from "@/lib/icons";
import { siteConfig } from "@/lib/site";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#05070c]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="DextroKit — back to home"
        >
          <span className="relative flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-indigo-400 shadow-[0_10px_30px_-12px_rgba(52,211,153,0.75)] transition-transform duration-300 group-hover:scale-105">
            <Layers
              className="size-5 text-[#03100c]"
              strokeWidth={2.5}
              aria-hidden="true"
            />
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#05070c] bg-indigo-300" />
          </span>
          <span className="flex flex-col">
            <span className="text-[17px] font-semibold tracking-tight text-white">
              Omni<span className="text-emerald-300">Tools</span>
            </span>
            <span className="mt-0.5 hidden items-center gap-1.5 text-[9px] font-medium uppercase tracking-[0.16em] text-zinc-500 sm:flex">
              100% Client-Side
              <span className="text-zinc-700">•</span>
              Free Forever
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Category navigation"
        >
          {categoryOptions.map((category) => (
            <Link
              key={category.id}
              href={getCategoryHref(category.id)}
              className="group rounded-lg px-3 py-2 text-[13px] font-medium text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <span className="flex items-center gap-1.5">
                {category.shortLabel}
                <span className="size-1 rounded-full bg-emerald-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </span>
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={siteConfig.supportUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-zinc-200 transition-all hover:-translate-y-0.5 hover:border-emerald-300/25 hover:bg-emerald-400/10 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 sm:inline-flex"
          >
            <Coffee className="size-4" aria-hidden="true" />
            Buy Me a Coffee
            <ArrowUpRight className="size-3.5 opacity-60" aria-hidden="true" />
          </a>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div
          id="mobile-navigation"
          className="animate-fade-up border-t border-white/[0.06] lg:hidden"
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {categoryOptions.map((category) => (
                <MobileNavLink
                  key={category.id}
                  category={category}
                  onNavigate={closeMobileMenu}
                />
              ))}
            </nav>

            <div className="my-4 h-px bg-white/[0.06]" />

            <div className="flex items-center justify-between gap-4 pb-1">
              <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Private &amp; free forever
              </span>
              <a
                href={siteConfig.supportUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950"
              >
                <Coffee className="size-3.5" aria-hidden="true" />
                Support Us
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MobileNavLink({
  category,
  onNavigate,
}: {
  category: (typeof categoryOptions)[number];
  onNavigate: () => void;
}) {
  const Icon = getIcon(category.icon);

  return (
    <Link
      href={getCategoryHref(category.id)}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
    >
      <span className="flex size-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-zinc-400">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      {category.label}
    </Link>
  );
}
