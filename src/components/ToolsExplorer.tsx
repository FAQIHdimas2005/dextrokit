"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, X } from "lucide-react";
import { CategoryFilter } from "@/components/CategoryFilter";
import { HeroSection } from "@/components/HeroSection";
import { ToolCard } from "@/components/ToolCard";
import {
  categoryMeta,
  categoryOptions,
  tools,
  type CategoryFilterValue,
  type Tool,
} from "@/data/tools";

interface ToolsExplorerProps {
  initialCategory?: CategoryFilterValue;
}

function matchesQuery(tool: Tool, query: string) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) return true;

  const haystack = [
    tool.title,
    tool.description,
    categoryMeta[tool.category].label,
    tool.badge ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return tokens.every((token) => haystack.includes(token));
}

export function ToolsExplorer({
  initialCategory = "all",
}: ToolsExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilterValue>(initialCategory);

  const normalizedQuery = query.trim();
  const filteredTools = useMemo(
    () =>
      tools.filter((tool) => {
        const categoryMatches =
          activeCategory === "all" || tool.category === activeCategory;

        return categoryMatches && matchesQuery(tool, normalizedQuery);
      }),
    [activeCategory, normalizedQuery],
  );

  const activeCategoryLabel =
    categoryOptions.find((option) => option.id === activeCategory)?.label ??
    "All Tools";
  const hasActiveFilters = normalizedQuery.length > 0 || activeCategory !== "all";

  const resetFilters = () => {
    setQuery("");
    setActiveCategory("all");
  };

  return (
    <>
      <HeroSection
        query={query}
        onQueryChange={setQuery}
        totalTools={tools.length}
      />

      <section
        id="tools"
        aria-labelledby="tools-title"
        className="scroll-mt-24 pb-14 sm:pb-20"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/75">
                <span className="h-px w-6 bg-emerald-300/30" aria-hidden="true" />
                Tool directory
              </p>
              <h2
                id="tools-title"
                className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl"
              >
                Pick a tool. Get it done.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-zinc-500">
                No installation, no account, and no uploads. Find the right tool
                or browse by category.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex size-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
              </span>
              <span>
                <strong className="font-semibold text-zinc-300">
                  {tools.length} tools
                </strong>{" "}
                live · 100% local
              </span>
            </div>
          </div>

          <div className="mt-9">
            <CategoryFilter
              activeCategory={activeCategory}
              onChange={setActiveCategory}
            />
          </div>

          <div className="mt-7 flex flex-col gap-3 border-t border-white/[0.055] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500" aria-live="polite">
              Showing{" "}
              <span className="font-semibold text-zinc-200">
                {filteredTools.length}
              </span>{" "}
              {filteredTools.length === 1 ? "tool" : "tools"}
              {normalizedQuery ? (
                <>
                  {" "}
                  for{" "}
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 font-medium text-zinc-300">
                    “{normalizedQuery}”
                  </span>
                </>
              ) : (
                <> in {activeCategoryLabel}</>
              )}
            </p>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 self-start rounded-lg border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset filters
              </button>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-700">
                Instant filter
              </span>
            )}
          </div>

          {filteredTools.length > 0 ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredTools.map((tool, index) => (
                <ToolCard
                  key={`${activeCategory}-${tool.id}`}
                  tool={tool}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.018] px-6 py-16 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-500">
                <Search className="size-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-base font-semibold text-white">
                No matching tools yet
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
                Try a different keyword, or bring back the full OmniTools
                collection.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#05070c]"
              >
                <X className="size-3.5" aria-hidden="true" />
                Show all tools
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
