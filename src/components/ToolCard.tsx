import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  categoryMeta,
  type Tool,
  type ToolBadge,
  type ToolCategory,
} from "@/data/tools";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
  index?: number;
}

const categoryStyles: Record<
  ToolCategory,
  { icon: string; dot: string; hover: string }
> = {
  image: {
    icon: "border-emerald-300/15 bg-emerald-300/[0.08] text-emerald-300",
    dot: "bg-emerald-400",
    hover:
      "group-hover:border-emerald-300/20 group-hover:shadow-[0_30px_80px_-42px_rgba(52,211,153,0.65)]",
  },
  "video-audio": {
    icon: "border-indigo-300/15 bg-indigo-300/[0.08] text-indigo-300",
    dot: "bg-indigo-400",
    hover:
      "group-hover:border-indigo-300/20 group-hover:shadow-[0_30px_80px_-42px_rgba(129,140,248,0.65)]",
  },
  "pdf-doc": {
    icon: "border-rose-300/15 bg-rose-300/[0.08] text-rose-300",
    dot: "bg-rose-400",
    hover:
      "group-hover:border-rose-300/20 group-hover:shadow-[0_30px_80px_-42px_rgba(251,113,133,0.6)]",
  },
  utility: {
    icon: "border-amber-300/15 bg-amber-300/[0.08] text-amber-300",
    dot: "bg-amber-400",
    hover:
      "group-hover:border-amber-300/20 group-hover:shadow-[0_30px_80px_-42px_rgba(251,191,36,0.55)]",
  },
};

const badgeStyles: Record<ToolBadge, string> = {
  Popular: "border-amber-300/20 bg-amber-300/[0.08] text-amber-200",
  New: "border-indigo-300/20 bg-indigo-300/[0.08] text-indigo-200",
  Instant: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200",
};

export function ToolCard({ tool, index = 0 }: ToolCardProps) {
  const Icon = getIcon(tool.icon);
  const styles = categoryStyles[tool.category];
  const category = categoryMeta[tool.category];

  const content = (
    <>
      <span
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-2xl border transition-transform duration-300 group-hover:scale-105",
            styles.icon,
          )}
        >
          <Icon className="size-[22px]" strokeWidth={1.8} aria-hidden="true" />
        </span>

        <div className="flex items-center gap-2">
          {tool.badge ? (
            <span
              className={cn(
                "rounded-md border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]",
                badgeStyles[tool.badge],
              )}
            >
              {tool.badge}
            </span>
          ) : null}
          <span
            className="flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-500"
            title={tool.isAvailable ? "Available" : "Coming soon"}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                tool.isAvailable ? styles.dot : "bg-zinc-600",
              )}
            />
            {tool.isAvailable ? "Available" : "Soon"}
          </span>
        </div>
      </div>

      <div className="mt-5 flex-1">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          <span className={cn("size-1 rounded-full", styles.dot)} />
          {category.label}
        </div>
        <h3 className="mt-2.5 text-[17px] font-semibold leading-snug tracking-[-0.015em] text-zinc-50 transition-colors group-hover:text-white">
          {tool.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-[13px] leading-6 text-zinc-500 transition-colors group-hover:text-zinc-400">
          {tool.description}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/[0.06] pt-4">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all duration-200",
            tool.isAvailable
              ? "border-white/[0.08] bg-white/[0.035] text-zinc-300 group-hover:border-emerald-300/20 group-hover:bg-emerald-300/[0.08] group-hover:text-emerald-200"
              : "border-white/[0.05] bg-transparent text-zinc-600",
          )}
        >
          {tool.isAvailable ? "Open Tool" : "Coming Soon"}
          <ArrowRight
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </>
  );

  const cardClassName = cn(
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(155deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]",
    tool.isAvailable
      ? cn("hover:-translate-y-1 hover:bg-white/[0.04]", styles.hover)
      : "opacity-60",
  );

  if (!tool.isAvailable) {
    return (
      <article
        className={cardClassName}
        data-disabled="true"
        style={{
          animationDelay: `${Math.min(index * 45, 240)}ms`,
        }}
      >
        {content}
      </article>
    );
  }

  return (
    <Link
      href={tool.href}
      className={cn(cardClassName, "animate-fade-up")}
      style={{
        animationDelay: `${Math.min(index * 45, 240)}ms`,
      }}
    >
      {content}
    </Link>
  );
}
