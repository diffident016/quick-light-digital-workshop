import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { QUESTIONS, type Answer } from "@/lib/assessment";
import { areaForQuestion } from "@/lib/assessment-areas";
import { cn } from "@/lib/utils";
import { AnsweredProgress } from "./AnsweredProgress";
import { AnswerOption } from "./AnswerOption";
import { CompletionPanel } from "./CompletionPanel";
import { QuestionStepper } from "./QuestionStepper";

const TOTAL = QUESTIONS.length;
const COMPLETE_STEP = TOTAL; // a virtual step after the last question

type Props = {
  /** Persists the answers; throw to show an error. Navigation on success is the caller's job. */
  onSubmit: (answers: Answer[]) => Promise<void>;
  initialAnswers?: Record<number, boolean>;
  initialStep?: number;
};

export function AssessmentFlow({ onSubmit, initialAnswers = {}, initialStep = 0 }: Props) {
  const [step, setStep] = useState(initialStep);
  // Which way the last move went, so the next screen enters from the side it came from.
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [answers, setAnswers] = useState<Record<number, boolean>>(initialAnswers);
  const [justAnswered, setJustAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onComplete = step === COMPLETE_STEP;
  const q = onComplete ? undefined : QUESTIONS[step];
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === TOTAL;
  const unanswered = QUESTIONS.filter((x) => answers[x.id] === undefined);
  const isLastQuestion = step === TOTAL - 1;
  const currentAnswered = q ? answers[q.id] !== undefined : false;

  function goTo(next: number) {
    if (next < 0 || next > COMPLETE_STEP || next === step) return;
    if (next === COMPLETE_STEP && !allAnswered) return;
    setDirection(next > step ? "forward" : "back");
    setJustAnswered(false);
    setError(null);
    setStep(next);
  }

  // Selecting only records the answer; the user moves on with Next when ready.
  function choose(value: boolean) {
    if (!q || busy) return;
    setAnswers((a) => ({ ...a, [q.id]: value }));
    setJustAnswered(true);
    setError(null);
  }

  function next() {
    if (isLastQuestion) goTo(allAnswered ? COMPLETE_STEP : QUESTIONS.indexOf(unanswered[0]!));
    else goTo(step + 1);
  }

  async function generate() {
    if (!allAnswered) return setError("Please answer all 10 questions.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit(QUESTIONS.map((x) => ({ question_id: x.id, answer: answers[x.id]! })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  // Keyboard: Y / N answer, ← / → move. Tab + Enter/Space work natively on every control.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (busy || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target;
    if (target instanceof Element && target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (q && key === "y") choose(true);
    else if (q && key === "n") choose(false);
    else if (e.key === "ArrowLeft") goTo(step - 1);
    else if (e.key === "ArrowRight" && currentAnswered) next();
    else return;
    e.preventDefault();
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const area = q ? areaForQuestion(q.id) : undefined;
  const enter = cn(
    "animate-in fade-in duration-300 ease-fluid",
    direction === "forward" ? "motion-safe:slide-in-from-right-8" : "motion-safe:slide-in-from-left-8",
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-32 pt-8 sm:pb-16 sm:pt-12">
      {/* Progress: what's done, where you are, and a way to jump anywhere. */}
      <div className="space-y-4">
        <div className="flex items-baseline justify-between text-sm">
          <p className="font-semibold text-foreground" aria-live="polite">
            {onComplete ? (
              "All questions answered"
            ) : (
              <>
                Question {step + 1} <span className="font-normal text-muted-foreground">of {TOTAL}</span>
              </>
            )}
          </p>
          <p className="tabular-nums text-muted-foreground">
            {answeredCount} of {TOTAL} answered
          </p>
        </div>
        <AnsweredProgress answered={answeredCount} total={TOTAL} />
        <QuestionStepper
          total={TOTAL}
          current={onComplete ? -1 : step}
          answers={QUESTIONS.map((x) => answers[x.id])}
          onSelect={goTo}
          disabled={busy}
        />
      </div>

      <div className="mt-8 sm:mt-10">
        {onComplete ? (
          <CompletionPanel
            total={TOTAL}
            busy={busy}
            error={error}
            onGenerate={generate}
            onReview={() => goTo(0)}
          />
        ) : (
          q && (
            <section key={step} className={enter} aria-labelledby="question-text">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-ink">
                <span className="tabular-nums">Question {String(step + 1).padStart(2, "0")}</span>
                {area && (
                  <>
                    <span aria-hidden className="text-border">
                      /
                    </span>
                    <span className="text-muted-foreground">{area.title}</span>
                  </>
                )}
              </p>
              <h1 id="question-text" className="mt-4 min-h-[5.5rem] text-[1.75rem] font-semibold sm:min-h-[7.5rem] sm:text-4xl">
                {q.question}
              </h1>

              <div role="radiogroup" aria-labelledby="question-text" className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
                <AnswerOption label="Yes" shortcut="Y" selected={answers[q.id] === true} disabled={busy} onSelect={() => choose(true)} />
                <AnswerOption label="No" shortcut="N" selected={answers[q.id] === false} disabled={busy} onSelect={() => choose(false)} />
              </div>

              {/* Brief acknowledgement, plus what to do if something is still missing on the last question. */}
              <div className="mt-4 min-h-6 text-sm" aria-live="polite">
                {isLastQuestion && currentAnswered && !allAnswered ? (
                  <p className="text-muted-foreground">
                    {unanswered.length} {unanswered.length === 1 ? "question is" : "questions are"} still unanswered:{" "}
                    {unanswered.map((u, i) => (
                      <span key={u.id}>
                        {i > 0 && ", "}
                        <button
                          type="button"
                          onClick={() => goTo(QUESTIONS.indexOf(u))}
                          className="font-semibold text-foreground underline underline-offset-4 hover:text-accent-ink"
                        >
                          {u.id}
                        </button>
                      </span>
                    ))}
                    .
                  </p>
                ) : justAnswered ? (
                  <p className="flex animate-rise items-center gap-1.5 font-medium text-success-ink">
                    <Check className="size-4" strokeWidth={3} aria-hidden /> Answer saved
                  </p>
                ) : null}
              </div>
            </section>
          )
        )}
      </div>

      {/* Navigation. Pinned to the bottom on phones so it's always in thumb reach. */}
      {!onComplete && (
        <nav
          aria-label="Question navigation"
          className="site-header fixed inset-x-0 bottom-0 z-30 border-t border-border/60 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
        >
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <Button variant="outline" size="lg" onClick={() => goTo(step - 1)} disabled={step === 0 || busy} className="h-11">
              <ArrowLeft aria-hidden /> Previous
            </Button>
            <Button size="lg" onClick={next} disabled={!currentAnswered || busy} className="h-11 min-w-32">
              {isLastQuestion ? (allAnswered ? "Finish" : "Next unanswered") : "Next"} <ArrowRight aria-hidden />
            </Button>
          </div>
        </nav>
      )}
      <p className={cn("mt-10 hidden text-center text-xs text-muted-foreground", !onComplete && "sm:block")}>
        Keyboard: <kbd className="font-semibold">Y</kbd> / <kbd className="font-semibold">N</kbd> to answer ·{" "}
        <kbd className="font-semibold">←</kbd> <kbd className="font-semibold">→</kbd> to move · Tab and Enter work
        everywhere
      </p>
    </div>
  );
}
