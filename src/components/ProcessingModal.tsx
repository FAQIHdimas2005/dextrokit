"use client";

import { useEffect, useId, useRef } from "react";
import { Check, LoaderCircle, LockKeyhole, X } from "lucide-react";
import { AdSlot } from "@/components/AdSlot";
import { cn } from "@/lib/utils";

interface ProcessingModalProps {
  isOpen: boolean;
  progress: number;
  statusText: string;
  onClose: () => void;
  /**
   * Optional real cancellation handler. When provided the modal exposes a
   * "Cancel" action that aborts the running job instead of only hiding the UI.
   */
  onCancel?: () => void;
  /** Headline override, e.g. "Download ready". */
  title?: string;
  /** Set when the job was cancelled by the user. */
  isCanceled?: boolean;
}

export function ProcessingModal({
  isOpen,
  progress,
  statusText,
  onClose,
  onCancel,
  title,
  isCanceled = false,
}: ProcessingModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const statusId = useId();
  const progressLabelId = useId();

  onCloseRef.current = onClose;

  const progressValue = Math.min(
    100,
    Math.max(0, Math.round(Number.isFinite(progress) ? progress : 0)),
  );
  const isComplete = progressValue >= 100 && !isCanceled;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const heading =
    title ?? (isCanceled ? "Processing canceled" : isComplete ? "Processing complete" : "Processing your file");

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6">
      <div
        className="absolute inset-0 bg-[#020409]/85 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={statusId}
        className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-[420px] overflow-y-auto rounded-[26px] border border-white/10 bg-[#080d15] shadow-[0_36px_120px_-24px_rgba(0,0,0,0.9)]"
      >
        <span
          className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/70 to-transparent"
          aria-hidden="true"
        />

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 inline-flex size-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          aria-label="Close processing dialog"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="p-4 pt-7 sm:p-7 sm:pt-8">
          <div className="flex items-center gap-3.5 pr-8">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-2xl border",
                isCanceled
                  ? "border-amber-300/20 bg-amber-300/10 text-amber-300"
                  : isComplete
                    ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-300"
                    : "border-indigo-300/15 bg-indigo-300/[0.08] text-indigo-300",
              )}
            >
              {isComplete ? (
                <Check className="size-5" aria-hidden="true" />
              ) : isCanceled ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <LoaderCircle
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
              )}
            </span>
            <div>
              <h2
                id={titleId}
                className="text-[15px] font-semibold tracking-tight text-white"
              >
                {heading}
              </h2>
              <p
                id={statusId}
                className="mt-0.5 line-clamp-1 text-xs text-zinc-500"
                aria-live="polite"
              >
                {statusText}
              </p>
            </div>
          </div>

          <div className="mt-7">
            <div className="flex items-end justify-between gap-4">
              <span
                id={progressLabelId}
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"
              >
                Progress
              </span>
              <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-white">
                {progressValue}
                <span className="ml-0.5 text-xs font-normal text-zinc-500">
                  %
                </span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-labelledby={progressLabelId}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressValue}
              aria-valuetext={`${progressValue}% complete`}
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/[0.06]"
            >
              <div
                className={cn(
                  "relative h-full rounded-full transition-[width] duration-500 ease-out",
                  isCanceled
                    ? "bg-gradient-to-r from-amber-400 to-orange-300"
                    : isComplete
                      ? "bg-gradient-to-r from-emerald-400 to-teal-300"
                      : "bg-gradient-to-r from-indigo-400 via-teal-300 to-emerald-300",
                )}
                style={{ width: `${progressValue}%` }}
              >
                {!isComplete && !isCanceled ? (
                  <span className="absolute inset-y-0 right-0 w-16 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                ) : null}
              </div>
            </div>
          </div>

          <AdSlot type="banner-300" className="mt-6" />

          {onCancel && !isComplete && !isCanceled ? (
            <button
              type="button"
              onClick={onCancel}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <X className="size-3.5" aria-hidden="true" />
              Cancel processing
            </button>
          ) : null}

          <p className="mt-5 flex items-start justify-center gap-2 text-center text-[10px] leading-5 text-zinc-600">
            <LockKeyhole
              className="mt-0.5 size-3.5 shrink-0 text-emerald-400/70"
              aria-hidden="true"
            />
            Your file is handled privately and nothing is retained after processing.
          </p>
        </div>
      </div>
    </div>
  );
}
