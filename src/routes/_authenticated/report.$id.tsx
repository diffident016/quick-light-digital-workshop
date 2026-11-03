import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getReport } from "@/lib/assessment.functions";

export const Route = createFileRoute("/_authenticated/report/$id")({
  head: () => ({
    meta: [
      { title: "Your Report — Growth Health Check" },
      { name: "description", content: "Your Growth Health Check score and identified weaknesses." },
      { property: "og:title", content: "Growth Health Check Report" },
      { property: "og:description", content: "Score and identified weaknesses." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Report,
});

function Report() {
  const { id } = Route.useParams();
  const fetchReport = useServerFn(getReport);
  const { data, isLoading, error } = useQuery({ queryKey: ["report", id], queryFn: () => fetchReport({ data: { id } }) });

  if (isLoading) return <main className="mx-auto max-w-3xl px-5 py-16 text-muted-foreground">Loading report…</main>;
  if (error || !data)
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">This report doesn't exist or isn't yours.</p>
        <Button asChild className="mt-6"><Link to="/assessment">Take the assessment</Link></Button>
      </main>
    );

  const pct = (data.score / 10) * 100;
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Growth Health Check Report</h1>
          <p className="mt-2 text-muted-foreground">
            {new Date(data.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" className="no-print" onClick={() => window.print()}>Print / Save as PDF</Button>
      </div>

      <section className="print-plain mt-8 flex flex-col items-center gap-8 rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)] sm:flex-row">
        <div
          className="grid size-36 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--accent) ${pct}%, var(--muted) 0)` }}
          aria-label={`Score ${data.score} out of 10`}
        >
          <div className="grid size-28 place-items-center rounded-full bg-card">
            <span className="font-serif text-4xl font-semibold">{data.score}<span className="text-lg text-muted-foreground">/10</span></span>
          </div>
        </div>
        <dl className="grid flex-1 grid-cols-2 gap-4">
          <Stat label="Yes answers" value={data.totalYes} />
          <Stat label="No answers" value={data.totalNo} />
        </dl>
      </section>

      <h2 className="mt-12 text-2xl font-semibold">Weaknesses identified</h2>
      {data.weaknesses.length === 0 ? (
        <p className="print-plain mt-4 rounded-xl border border-border bg-card p-6 text-success shadow-[var(--shadow-card)]">
          Congratulations! Your business has achieved a perfect Growth Health Check score. No weaknesses were identified based on your responses.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {data.weaknesses.map((w) => (
            <li key={w.questionId} className="print-plain rounded-xl border border-border border-l-4 border-l-accent bg-card p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Question {w.questionId}</p>
              <h3 className="mt-1 text-xl font-semibold">{w.title}</h3>
              <p className="mt-2 text-muted-foreground">{w.description}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-10 text-xs text-muted-foreground">This report is general guidance only and is not legal, financial or insurance advice.</p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-serif text-3xl font-semibold">{value}</dd>
    </div>
  );
}
