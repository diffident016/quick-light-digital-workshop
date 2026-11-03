import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircleAlert, Clock, FileText, ListChecks } from "lucide-react";
import { ScoreRing } from "@/components/report/ScoreRing";
import { Button } from "@/components/ui/button";
import { AREAS } from "@/lib/assessment-areas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Growth Health Check — How healthy is your business?" },
      {
        name: "description",
        content:
          "Answer 10 quick questions and get a scored report on your business structure, leadership, financial readiness and risk protection.",
      },
      { property: "og:title", content: "Growth Health Check" },
      { property: "og:description", content: "A 10-question assessment of your business's growth readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FACTS = [
  { icon: ListChecks, label: "10 questions", detail: "Simple Yes / No answers" },
  { icon: Clock, label: "3–5 minutes", detail: "One question at a time" },
  { icon: FileText, label: "Instant results", detail: "Score and written report" },
];

function Index() {
  return (
    <main className="overflow-x-clip">
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-24">
        <div className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">Growth Health Check</p>
          <h1 className="mt-5 text-[clamp(2.6rem,6.5vw,4.5rem)] font-semibold">
            How Healthy Is Your Business?
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-foreground/70">
            A focused assessment of the four foundations growth depends on: business structure, leadership,
            financial readiness and risk protection.
          </p>
          <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="h-13 px-7 text-base shadow-[var(--shadow-raised)]">
              <Link to="/assessment">
                Start Your Health Check <ArrowRight aria-hidden />
              </Link>
            </Button>
            <p className="max-w-xs text-sm text-muted-foreground">
              You'll receive a score out of 10 and a report explaining every gap found.
            </p>
          </div>

          <dl className="mt-12 grid max-w-xl gap-3 border-t border-border pt-6 sm:grid-cols-3 sm:gap-4">
            {FACTS.map(({ icon: Icon, label, detail }) => (
              <div key={label} className="flex items-baseline gap-2 sm:flex-col sm:gap-1">
                <dt className="flex shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <Icon className="size-4 shrink-0 self-center text-accent" aria-hidden />
                  {label}
                </dt>
                <dd className="text-sm leading-snug text-muted-foreground">
                  <span aria-hidden className="mr-2 sm:hidden">·</span>
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ReportPreview />
      </section>

      {/* What it evaluates */}
      <section aria-labelledby="areas-heading" className="border-y border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-ink">What it evaluates</p>
            <h2 id="areas-heading" className="mt-3 text-3xl font-semibold sm:text-4xl">
              Four areas, ten questions
            </h2>
          </div>
          <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {AREAS.map(({ icon: Icon, title, description, questionIds }) => (
              <li key={title} className="border-t-2 border-foreground/80 pt-5">
                <Icon className="size-5 text-accent" aria-hidden />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                <p className="mt-3 text-xs font-medium tabular-nums text-foreground/60">
                  {questionIds.length} questions
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-16 sm:flex-row sm:items-center sm:justify-between sm:py-20">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Find out where your business stands.</h2>
          <p className="mt-2 text-muted-foreground">Answer honestly. Your results are private to your account.</p>
        </div>
        <Button asChild size="lg" className="h-12 shrink-0 px-7 text-base">
          <Link to="/assessment">
            Start Your Health Check <ArrowRight aria-hidden />
          </Link>
        </Button>
      </section>
    </main>
  );
}

/**
 * A clearly-labelled example of the report a user receives. Weakness titles are real
 * titles from the assessment; the score is illustrative, not a statistic.
 */
function ReportPreview() {
  const answers = [true, false, true, true, true, true, true, false, true, false];
  return (
    <figure
      aria-label="Example of a Growth Health Check report"
      className="relative mx-auto w-full max-w-md animate-rise [animation-delay:120ms] lg:max-w-none"
    >
      {/* soft backdrop shape */}
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-accent-soft/70 blur-2xl" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-raised)] sm:p-8">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your report</p>
          <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-[0.7rem] font-medium text-muted-foreground">
            Example
          </span>
        </div>
        <div className="mt-6 flex items-center gap-6">
          <ScoreRing score={7} size="md" countUp={false} />
          <div className="min-w-0 flex-1">
            <p className="font-serif text-xl font-semibold">Business Health Score</p>
            <div className="mt-3 flex gap-1" aria-hidden>
              {answers.map((yes, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", yes ? "bg-primary" : "bg-caution/70")} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">7 Yes · 3 No</p>
          </div>
        </div>
        <ul className="mt-6 divide-y divide-border border-t border-border">
          {[
            { q: 2, title: "Shareholders Agreement" },
            { q: 8, title: "Investor Readiness" },
            { q: 10, title: "Business Insurance" },
          ].map((w) => (
            <li key={w.q} className="flex items-center gap-3 py-3.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-caution-soft text-caution">
                <CircleAlert className="size-3.5" aria-hidden />
              </span>
              <span className="flex-1 text-sm font-medium">{w.title}</span>
              <span className="text-xs tabular-nums text-muted-foreground">Q{w.q}</span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}
