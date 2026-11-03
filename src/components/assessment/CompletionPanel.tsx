import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  total: number;
  busy: boolean;
  error: string | null;
  onGenerate: () => void;
  onReview: () => void;
};

/** Shown once every question is answered: a calm "you're done" moment before the report. */
export function CompletionPanel({ total, busy, error, onGenerate, onReview }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  // Move focus here so keyboard and screen-reader users land on the new state.
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="animate-rise rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-raised)] sm:px-12 sm:py-14">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
        <Check className="size-8 animate-pop" strokeWidth={2.5} aria-hidden />
      </div>
      <h1 ref={heading} tabIndex={-1} className="mt-6 text-3xl font-semibold outline-none sm:text-4xl">
        Assessment Complete
      </h1>
      <p className="mx-auto mt-3 max-w-md text-muted-foreground">
        You've completed all {total} questions. Your Growth Health Check report is ready.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={onGenerate} disabled={busy} className="h-12 w-full px-7 text-base sm:w-auto">
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden /> Generating your report…
            </>
          ) : (
            <>
              Generate My Report <ArrowRight aria-hidden />
            </>
          )}
        </Button>
        <Button variant="ghost" size="lg" onClick={onReview} disabled={busy} className="h-12 w-full sm:w-auto">
          Review my answers
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
