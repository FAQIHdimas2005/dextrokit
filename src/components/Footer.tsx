import Link from "next/link";
import {
  ArrowUpRight,
  Coffee,
  Download,
  Layers,
  LockKeyhole,
  ServerOff,
  ShieldCheck,
} from "lucide-react";
import { categoryOptions, getCategoryHref } from "@/data/tools";
import { siteConfig } from "@/lib/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-auto border-t border-white/[0.06] bg-[#04060a]/80">
      <div className="mx-auto w-full max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pt-12 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-indigo-300/10 bg-[linear-gradient(100deg,rgba(99,102,241,0.11),rgba(16,185,129,0.055)_55%,rgba(255,255,255,0.015))] p-4 sm:p-5">
          <div
            className="pointer-events-none absolute -right-16 -top-20 size-52 rounded-full bg-indigo-400/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-300/15 bg-indigo-300/[0.08] text-indigo-200">
                <Download className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-200/65">
                  Partner recommendation
                </p>
                <p className="mt-1 text-[13px] leading-6 text-zinc-300 sm:text-sm">
                  Need to download TikTok, Instagram, or YouTube videos without a watermark?{" "}
                  <span className="font-semibold text-white">
                    Try VidLoot Downloader
                  </span>{" "}
                  <ArrowUpRight
                    className="inline size-3.5 text-indigo-200"
                    aria-hidden="true"
                  />
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-300 sm:self-center">
              VidLoot
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              aria-label="OmniTools — back to home"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-indigo-400">
                <Layers
                  className="size-[18px] text-[#03100c]"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
              </span>
              <span className="text-base font-semibold tracking-tight text-white">
                Omni<span className="text-emerald-300">Tools</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-6 text-zinc-500">
              {siteConfig.tagline}. Free web tools that process every file right
              in your browser.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/10 bg-emerald-300/[0.045] px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-emerald-200/75">
                <ShieldCheck className="size-3" aria-hidden="true" />
                100% client-side
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                <ServerOff className="size-3" aria-hidden="true" />
                Zero server storage
              </span>
            </div>
          </div>

          <nav className="lg:col-span-3" aria-label="Tool categories">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Explore
            </h3>
            <ul className="mt-4 space-y-3">
              {categoryOptions.map((category) => (
                <li key={category.id}>
                  <Link
                    href={getCategoryHref(category.id)}
                    className="text-[13px] text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                  >
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-5">
              <div className="flex items-center gap-2 text-zinc-300">
                <LockKeyhole
                  className="size-4 text-emerald-300"
                  aria-hidden="true"
                />
                <h3 className="text-xs font-semibold">Privacy Guarantee</h3>
              </div>
              <p className="mt-2.5 text-[12px] leading-6 text-zinc-500">
                Your files aren&apos;t stored on a server. Browser tools process
                everything in memory and finish when you close the tab.
              </p>
              <a
                href={siteConfig.supportUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[11px] font-semibold text-zinc-300 transition-colors hover:border-emerald-300/20 hover:bg-emerald-300/[0.07] hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <Coffee className="size-3.5" aria-hidden="true" />
                Buy us a coffee
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.055] pt-6 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} OmniTools. All rights reserved.
          </p>
          <p className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            All systems run locally on your device.
          </p>
        </div>
      </div>
    </footer>
  );
}
