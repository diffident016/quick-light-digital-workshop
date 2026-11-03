import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
  const { data, isLoading } = useQuery({ queryKey: ["reports"], queryFn: () => list() });
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">My reports</h1>
        <Button asChild><Link to="/assessment">New assessment</Link></Button>
      </div>
      {isLoading ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : !data?.length ? (
        <p className="mt-8 text-muted-foreground">No reports yet.</p>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          {data.map((r) => (
            <li key={r.id}>
              <Link to="/report/$id" params={{ id: r.id }} className="flex items-center justify-between p-5 hover:bg-muted">
                <span>{new Date(r.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="font-serif text-xl font-semibold">{r.score}/10</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
