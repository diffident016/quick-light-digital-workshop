import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ActionPlanSection } from "@/components/report/ActionPlanSection";
import { ReportView } from "@/components/report/ReportView";
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
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["report", id],
    queryFn: () => fetchReport({ data: { id } }),
  });

  if (isLoading)
    return (
      // Skeleton mirrors the real layout so nothing jumps when the report arrives.
      <main className="mx-auto max-w-3xl px-5 pt-8 sm:pt-10" aria-busy="true">
        <p className="sr-only">Loading report…</p>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-3 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-12 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-10 flex flex-col items-center gap-8 border-t border-border pt-10 sm:flex-row">
          <div className="size-44 animate-pulse rounded-full bg-muted sm:size-48" />
          <div className="grid w-full flex-1 grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded bg-muted" />
            ))}
          </div>
        </div>
      </main>
    );
  if (error)
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold">We couldn't load this report</h1>
        <p className="mt-2 text-muted-foreground">Check your connection and try again.</p>
        <Button className="mt-6" onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching ? "Retrying…" : "Try again"}
        </Button>
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold">Report not found</h1>
        <p className="mt-2 text-muted-foreground">This report doesn't exist or isn't yours.</p>
        <Button asChild className="mt-6"><Link to="/assessment">Take the assessment</Link></Button>
      </main>
    );

  return (
    <main>
      <ReportView report={data}>
        <ActionPlanSection assessmentId={data.id} weaknesses={data.weaknesses} />
      </ReportView>
    </main>
  );
}
