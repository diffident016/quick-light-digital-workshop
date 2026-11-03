import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QUESTIONS } from "@/lib/assessment";
import { submitAssessment } from "@/lib/assessment.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assessment")({
  head: () => ({
    meta: [
      { title: "Assessment — Growth Health Check" },
      { name: "description", content: "Answer 10 Yes/No questions about your business." },
      { property: "og:title", content: "Growth Health Check Assessment" },
      { property: "og:description", content: "Answer 10 Yes/No questions about your business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Assessment,
});

function Assessment() {
  const navigate = useNavigate();
  const submit = useServerFn(submitAssessment);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = QUESTIONS[step];
  const answered = Object.keys(answers).length;
  const isLast = step === QUESTIONS.length - 1;
  const complete = answered === QUESTIONS.length;

  function choose(v: boolean) {
    setAnswers((a) => ({ ...a, [q.id]: v }));
    if (!isLast) setTimeout(() => setStep((s) => s + 1), 180);
  }

  async function generate() {
    if (!complete) return setError("Please answer all 10 questions.");
    setBusy(true);
    setError(null);
    try {
      const res = await submit({
        data: { answers: QUESTIONS.map((x) => ({ question_id: x.id, answer: answers[x.id] })) },
      });
      navigate({ to: "/report/$id", params: { id: res.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Question {step + 1} of {QUESTIONS.length}</span>
        <span>{answered} answered</span>
      </div>
      <Progress value={(answered / QUESTIONS.length) * 100} className="mt-3 h-2" />

      <section className="mt-10 rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">{q.question}</h1>
        <div role="radiogroup" aria-label="Your answer" className="mt-8 grid grid-cols-2 gap-3">
          {[true, false].map((v) => {
            const selected = answers[q.id] === v;
            return (
              <button
                key={String(v)}
                role="radio"
                aria-checked={selected}
                onClick={() => choose(v)}
                className={cn(
                  "h-16 rounded-lg border-2 text-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/50",
                )}
              >
                {v ? "Yes" : "No"}
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Back</Button>
        {isLast ? (
          <Button onClick={generate} disabled={!complete || busy} className="h-11 px-6">
            {busy ? "Generating…" : "Generate My Report"}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setStep((s) => s + 1)} disabled={answers[q.id] === undefined}>Next</Button>
        )}
      </div>
      {isLast && !complete && <p className="mt-4 text-sm text-muted-foreground">Answer all 10 questions to generate your report.</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </main>
  );
}
