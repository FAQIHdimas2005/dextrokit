"use client";

import {
  CircleDollarSign,
  CloudOff,
  Cpu,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  query: string;
  onQueryChange: (value: string) => void;
  totalTools: number;
}

const features = [
  {
    label: "No Server Size Limits",
    icon: Zap,
    accent: "text-amber-300",
    surface: "border-amber-300/15 bg-amber-300/[0.055]",
  },
  {
    label: "100% Privacy Guaranteed",
    icon: ShieldCheck,
    accent: "text-emerald-300",
    surface: "border-emerald-300/15 bg-emerald-300/[0.055]",
  },
  {
    label: "Free Forever",
    icon: CircleDollarSign,
    accent: "text-indigo-300",
    surface: "border-indigo-300/15 bg-indigo-300/[0.055]",
  },
];

export function HeroSection({
  query,
  onQueryChange,
  totalTools,
}: HeroSectionProps) {
  return (
    <section className="relative isolate overflow-hidden pb-10 pt-14 sm:pb-14 sm:pt-20">
      <div
        className="bg-grid-pattern pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px]"
        aria-hidden="true"
      />
      <div
        className="animate-float-slow pointer-events-none absolute -left-32 top-20 -z-10 size-80 rounded-full bg-emerald-500/[0.08] blur-3xl"
        aria-hidden="true"
      />
      <div
        className="animate-float-slow pointer-events-none absolute -right-32 top-10 -z-10 size-80 rounded-full bg-indigo-500/[0.09] blur-3xl"
        style={{ animationDelay: "-4s" }}
        aria-hidden="true"
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.055] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90 shadow-[0_0_30px_-12px_rgba(52,211,153,0.65)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-300" />
          </span>
          Private by design
          <span className="text-emerald-300/40">•</span>
          No uploads
        </div>

        <h1
          className="animate-fade-up mt-7 max-w-4xl text-balance text-[2.6rem] font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-[4.5rem]"
          style={{ animationDelay: "70ms" }}
        >
          Free Online File Tools,
          <br className="hidden sm:block" /> Fast &{" "}
          <span className="text-gradient">100% Private</span>
        </h1>

        <p
          className="animate-fade-up mt-6 max-w-2xl text-balance text-sm leading-7 text-zinc-400 sm:text-base sm:leading-8"
          style={{ animationDelay: "140ms" }}
        >
          Your files never leave your laptop or phone. Every conversion runs in
          browser memory — no uploads, no queues, and no privacy trade-offs.
        </p>

        <div
          className="animate-fade-up mt-9 w-full"
          style={{ animationDelay: "210ms" }}
        >
          <SearchBar value={query} onChange={onQueryChange} />
          <p className="mt-3.5 flex items-center justify-center gap-2 text-[11px] text-zinc-600">
            <Sparkles className="size-3.5 text-zinc-500" aria-hidden="true" />
            Search across {totalTools} tools. Press{" "}
            <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
              /
            </kbd>{" "}
            to start typing.
          </p>
        </div>

        <div
          className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-2.5"
          style={{ animationDelay: "280ms" }}
        >
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.label}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium text-zinc-300 backdrop-blur-sm",
                  feature.surface,
                )}
              >
                <Icon
                  className={cn("size-3.5", feature.accent)}
                  aria-hidden="true"
                />
                {feature.label}
              </div>
            );
          })}
        </div>

        <div
          className="animate-fade-up mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] uppercase tracking-[0.13em] text-zinc-600"
          style={{ animationDelay: "340ms" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <CloudOff className="size-3.5" aria-hidden="true" />
            0 bytes uploaded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Cpu className="size-3.5" aria-hidden="true" />
            Processed on your device
          </span>
        </div>
      </div>
    </section>
  );
}
