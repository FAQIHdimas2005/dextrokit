import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-[#05070c] px-4 text-center text-slate-100"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400">
        <SearchX className="size-6" aria-hidden="true" />
      </span>
      <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
        Error 404
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        This page doesn&apos;t exist
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        The link may be outdated, or the tool may have been renamed. Everything
        still runs locally in your browser.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to all tools
      </Link>
    </main>
  );
}
