import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdSlotType = "banner-728" | "banner-300" | "responsive";

interface AdSlotProps {
  type?: AdSlotType;
  className?: string;
}

const sizeStyles: Record<AdSlotType, string> = {
  "banner-728": "mx-auto h-[90px] w-full max-w-[728px]",
  "banner-300": "mx-auto h-[250px] w-full max-w-[300px]",
  responsive: "min-h-[120px] w-full sm:min-h-[150px]",
};

const dimensionLabels: Record<AdSlotType, string> = {
  "banner-728": "728 × 90",
  "banner-300": "300 × 250",
  responsive: "Responsive",
};

export function AdSlot({ type = "responsive", className }: AdSlotProps) {
  return (
    <aside
      aria-label="Advertisement space"
      data-ad-format={type}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.018]",
        sizeStyles[type],
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.035),transparent_65%)]"
        aria-hidden="true"
      />
      <span
        className="absolute right-3 top-2.5 rounded border border-white/[0.07] bg-[#080c13]/80 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600"
        aria-hidden="true"
      >
        Ad
      </span>

      <div className="relative flex flex-col items-center justify-center gap-2 px-5 py-4 text-center">
        <span className="flex size-7 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-zinc-600">
          <Megaphone className="size-3.5" aria-hidden="true" />
        </span>
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Sponsored / Advertisement Space
        </p>
        {type !== "banner-728" ? (
          <p className="font-mono text-[9px] tracking-[0.08em] text-zinc-700">
            {dimensionLabels[type]}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
