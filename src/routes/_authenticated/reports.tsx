import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scoreTone } from "@/lib/score-tone";
import { cn } from "@/lib/utils";

const toneText = { high: "text-success-ink", mid: "text-accent-ink", low: "text-caution" } as const;
import { listMyReports } from "@/lib/assessment.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "My Reports — Growth Health Check" },
      { name: "description", content: "Your past Growth Health Check reports." },
      { property: "og:title", content: "My Reports" },
      { property: "og:description", content: "Your past Growth Health Check reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const list = useServerFn(listMyReports);
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["reports"], queryFn: () => list() });
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Growth Health Check</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">My reports</h1>
          {!!data?.length && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.length} {data.length === 1 ? "assessment" : "assessments"}, newest first
            </p>
          )}
        </div>
        <Button asChild>
          <Link to="/assessment">
            <Plus aria-hidden /> New assessment
          </Link>
        </Button>
      </div>
      {isLoading ? (
        <ul className="mt-8 space-y-px overflow-hidden rounded-xl border border-border" aria-busy="true" aria-label="Loading reports">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[4.5rem] animate-pulse bg-muted" />
          ))}
        </ul>
      ) : error ? (
        <div role="alert" className="mt-8 text-muted-foreground">
          <p>We couldn't load your reports.</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : !data?.length ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-serif text-xl font-semibold">No reports yet</p>
          <p className="mt-2 text-sm text-muted-foreground">Take the 10-question assessment to get your first score.</p>
          <Button asChild className="mt-6"><Link to="/assessment">Start assessment</Link></Button>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          {data.map((r, i) => (
            <li key={r.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <Link
                to="/report/$id"
                params={{ id: r.id }}
                className="group flex items-center gap-4 p-5 transition-colors duration-100 hover:bg-muted active:bg-muted focus-visible:bg-muted focus-visible:outline-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {r.total_no === 0 ? "No weaknesses" : `${r.total_no} ${r.total_no === 1 ? "weakness" : "weaknesses"} identified`}
                  </span>
                </span>
                {/* 10 segments: filled = Yes. Decorative; the number carries the meaning. */}
                <span aria-hidden className="hidden w-24 gap-0.5 sm:flex">
                  {Array.from({ length: 10 }, (_, s) => (
                    <span key={s} className={cn("h-1.5 flex-1 rounded-full", s < r.score ? "bg-primary" : "bg-surface-sunken")} />
                  ))}
                </span>
                <span className={cn("w-16 text-right font-serif text-2xl font-semibold tabular-nums", toneText[scoreTone(r.score)])}>
                  {r.score}
                  <span className="text-base text-muted-foreground">/10</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted-foreground transition-transform duration-150 ease-fluid motion-safe:group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
