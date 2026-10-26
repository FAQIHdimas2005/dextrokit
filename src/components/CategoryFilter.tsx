"use client";

import {
  categoryOptions,
  getCategoryCounts,
  type CategoryFilterValue,
} from "@/data/tools";
import { getIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface CategoryFilterProps {
  activeCategory: CategoryFilterValue;
  onChange: (category: CategoryFilterValue) => void;
}

const categoryCounts = getCategoryCounts();

export function CategoryFilter({
  activeCategory,
  onChange,
}: CategoryFilterProps) {
  return (
    <div
      className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="group"
      aria-label="Filter tools by category"
    >
      {categoryOptions.map((category) => {
        const Icon = getIcon(category.icon);
        const isActive = activeCategory === category.id;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            aria-pressed={isActive}
            className={cn(
              "group inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60",
              isActive
                ? "border-emerald-300/25 bg-emerald-300/[0.09] text-emerald-100 shadow-[0_0_32px_-16px_rgba(52,211,153,0.8)]"
                : "border-white/[0.07] bg-white/[0.025] text-zinc-400 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-zinc-200",
            )}
          >
            <Icon
              className={cn(
                "size-4 transition-colors",
                isActive
                  ? "text-emerald-300"
                  : "text-zinc-500 group-hover:text-zinc-300",
              )}
              aria-hidden="true"
            />
            <span>{category.label}</span>
            <span
              className={cn(
                "min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums",
                isActive
                  ? "bg-emerald-300/15 text-emerald-200"
                  : "bg-white/[0.055] text-zinc-500",
              )}
            >
              {categoryCounts[category.id]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
