import Link from "next/link";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

interface LegalPageProps {
  badge: string;
  title: string;
  description: string;
  updatedAt: string;
  sections: LegalSection[];
}

export function LegalPage({
  badge,
  title,
  description,
  updatedAt,
  sections,
}: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main-content" className="flex-1">
        <div className="relative overflow-hidden">
          <div
            className="bg-grid-pattern pointer-events-none absolute inset-x-0 top-0 h-[380px]"
            aria-hidden="true"
          />
          <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to home
            </Link>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.055] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
              <ShieldCheck className="size-3.5" aria-hidden="true" />
              {badge}
            </div>

            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-[15px] sm:leading-8">
              {description}
            </p>
            <p className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              <Clock className="size-3.5" aria-hidden="true" />
              Last updated {updatedAt}
            </p>

            <div className="mt-12 space-y-9">
              {sections.map((section) => (
                <section
                  key={section.heading}
                  className="grid gap-3 border-t border-white/[0.065] pt-7 sm:grid-cols-[190px_1fr] sm:gap-8"
                >
                  <h2 className="text-sm font-semibold tracking-tight text-zinc-200">
                    {section.heading}
                  </h2>
                  <div className="space-y-3.5">
                    {section.paragraphs?.map((paragraph) => (
                      <p
                        key={paragraph}
                        className="text-[13px] leading-7 text-zinc-500"
                      >
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets ? (
                      <ul className="space-y-2.5">
                        {section.bullets.map((bullet) => (
                          <li
                            key={bullet}
                            className="flex items-start gap-2.5 text-[13px] leading-6 text-zinc-500"
                          >
                            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-emerald-400/70" />
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-14 overflow-hidden rounded-2xl border border-emerald-300/10 bg-[linear-gradient(130deg,rgba(52,211,153,0.06),rgba(255,255,255,0.018))] p-5 sm:p-6">
              <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                <ShieldCheck className="size-4" aria-hidden="true" />
                The DextroKit principle
              </p>
              <p className="mt-2 text-[13px] leading-6 text-zinc-500">
                Files aren&apos;t retained on our servers. Browser tools process
                everything in memory, and temporary AI inpainting files are
                deleted immediately after processing.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
