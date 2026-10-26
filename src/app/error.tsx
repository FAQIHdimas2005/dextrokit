"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. Keeps an unexpected render/runtime failure from
 * turning into a blank white screen and gives the user a way to recover.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-[#05070c] px-4 text-center text-slate-100"
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] text-amber-300">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-zinc-400">
        This step hit an unexpected error. Your files were never uploaded, so
        nothing left your device. Try again, or head back home and pick another
        tool.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
        >
          Back to all tools
        </Link>
      </div>
    </main>
  );
}
