import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowLeft, CircleAlert, Download, PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Weakness } from "@/lib/assessment";
import { scoreTone } from "@/lib/score-tone";
import { cn } from "@/lib/utils";
import { ScoreRing } from "./ScoreRing";

export type ReportData = {
  id: string;
  createdAt: string;
  score: number;
  totalYes: number;
  totalNo: number;
  weaknesses: Weakness[];
};

const PERFECT_MESSAGE =
  "Congratulations! Your business has achieved a perfect Growth Health Check score. No weaknesses were identified based on your responses.";

const toneText = { high: "text-success-ink", mid: "text-accent-ink", low: "text-caution" } as const;

/** The report as a document: header, score summary, then each weakness as its own section. */
export function ReportView({ report, children }: { report: ReportData; children?: ReactNode }) {
  const { score, totalYes, totalNo, weaknesses } = report;
  const answered = totalYes + totalNo;
  const tone = scoreTone(score);
  const date = new Date(report.createdAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:pt-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/reports"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> My reports
        </Link>
        <ReportActions />
      </div>

      {/* Report header */}
      <header className="mt-8 border-b border-border pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">Growth Health Check Report</p>
        <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">Your Business Health Score</h1>
        <p className="mt-3 text-muted-foreground">
          <time dateTime={report.createdAt}>{date}</time>
        </p>
      </header>

      {/* Score summary */}
      <section aria-label="Score summary" className="print-plain animate-rise flex flex-col items-center gap-8 py-10 sm:flex-row sm:gap-12">
        <ScoreRing score={score} />
        <dl className="grid w-full flex-1 grid-cols-3 divide-x divide-border text-center sm:text-left">
          <Stat label="Weaknesses identified" value={totalNo} className={totalNo > 0 ? toneText[tone] : "text-success-ink"} />
          <Stat label="Yes answers" value={totalYes} />
          <Stat label="Questions answered" value={`${answered}/10`} />
        </dl>
      </section>

      {/* Weaknesses, or the perfect-score state in their place */}
      {weaknesses.length === 0 ? (
        <section className="print-plain animate-rise rounded-2xl border border-success/25 bg-success-soft px-6 py-10 text-center sm:px-12">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-card text-success shadow-[var(--shadow-card)]">
            <PartyPopper className="size-7" aria-hidden />
          </div>
          <h2 className="mt-5 text-2xl font-semibold">A perfect score</h2>
          <p className="mx-auto mt-3 max-w-lg text-foreground/80">{PERFECT_MESSAGE}</p>
        </section>
      ) : (
        <section aria-labelledby="weaknesses-heading">
          <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
            <h2 id="weaknesses-heading" className="text-2xl font-semibold sm:text-3xl">
              Areas needing attention
            </h2>
            <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
              {weaknesses.length} identified
            </p>
          </div>
          <ol className="divide-y divide-border">
            {weaknesses.map((w, i) => (
              <li
                key={w.questionId}
                className="print-plain animate-rise grid grid-cols-[auto_1fr] gap-x-4 py-7 sm:gap-x-6"
                style={{ animationDelay: `${120 + i * 50}ms` }}
              >
                <span
                  aria-hidden
                  className="mt-0.5 grid size-9 place-items-center rounded-full bg-caution-soft text-caution"
                >
                  <CircleAlert className="size-[1.1rem]" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Question {w.questionId}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold sm:text-2xl">{w.title}</h3>
                  <p className="mt-2 max-w-prose leading-relaxed text-foreground/75">{w.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Optional extensions (e.g. the AI action plan) render below the core report. */}
      {children}

      <footer className="mt-12 border-t border-border pt-6">
        <div className="no-print mb-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/assessment">
              <RotateCcw aria-hidden /> Start a new assessment
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/reports">All my reports</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          This report is general guidance only and is not legal, financial or insurance advice.
        </p>
      </footer>
    </article>
  );
}

function ReportActions() {
  // Opens the browser's print dialog, where users can save as PDF or print on paper.
  return (
    <div className="no-print flex shrink-0 flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => window.print()} title="Opens the print dialog — choose “Save as PDF”">
        <Download aria-hidden /> Save as PDF
      </Button>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number | string; className?: string }) {
  return (
    <div className="flex flex-col-reverse px-3 sm:px-6 sm:first:pl-0">
      <dt className="mt-1 text-xs leading-snug text-muted-foreground sm:text-sm">{label}</dt>
      <dd className={cn("font-serif text-3xl font-semibold tabular-nums sm:text-4xl", className)}>{value}</dd>
    </div>
  );
}
