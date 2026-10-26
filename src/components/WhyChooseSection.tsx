import { Gauge, Infinity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const reasons = [
  {
    number: "01",
    title: "Native Browser Speed",
    description:
      "Everything runs on your own hardware. There is no upload step, no server queue, and results appear in seconds.",
    icon: Gauge,
    tag: "No queues",
    accent: "text-emerald-300",
    dot: "bg-emerald-300",
    iconSurface: "border-emerald-300/15 bg-emerald-300/[0.07]",
    line: "from-emerald-300/50",
  },
  {
    number: "02",
    title: "Privacy You Can Verify",
    description:
      "Files stay in browser memory and aren't stored in the cloud. Close the tab and every trace of the session is gone.",
    icon: ShieldCheck,
    tag: "Zero server storage",
    accent: "text-indigo-300",
    dot: "bg-indigo-300",
    iconSurface: "border-indigo-300/15 bg-indigo-300/[0.07]",
    line: "from-indigo-300/50",
  },
  {
    number: "03",
    title: "No Quotas, Ever",
    description:
      "No server-side file size caps, no hidden subscriptions, and no forced watermarks. If your browser can handle it, OmniTools can too.",
    icon: Infinity,
    tag: "Free forever",
    accent: "text-amber-300",
    dot: "bg-amber-300",
    iconSurface: "border-amber-300/15 bg-amber-300/[0.07]",
    line: "from-amber-300/50",
  },
];

export function WhyChooseSection() {
  return (
    <section
      id="why"
      aria-labelledby="why-title"
      className="relative border-y border-white/[0.055] bg-white/[0.012] py-16 sm:py-24"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300/75">
            Privacy by default
          </p>
          <h2
            id="why-title"
            className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl"
          >
            Why Choose OmniTools?
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-500">
            Built for fast results and sensitive files. You keep full control
            over every byte.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {reasons.map((reason) => {
            const Icon = reason.icon;

            return (
              <article
                key={reason.number}
                className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[linear-gradient(150deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.12] hover:bg-white/[0.035]"
              >
                <span
                  className={cn(
                    "absolute inset-x-8 top-0 h-px bg-gradient-to-r to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
                    reason.line,
                  )}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-xl border",
                      reason.iconSurface,
                      reason.accent,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-zinc-700">
                    {reason.number}
                  </span>
                </div>

                <h3 className="mt-6 text-base font-semibold tracking-tight text-zinc-100">
                  {reason.title}
                </h3>
                <p className="mt-2.5 text-[13px] leading-6 text-zinc-500">
                  {reason.description}
                </p>
                <div className="mt-6 flex items-center gap-2 border-t border-white/[0.055] pt-4">
                  <span className={cn("size-1.5 rounded-full", reason.dot)} />
                  <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                    {reason.tag}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
