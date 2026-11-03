import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Growth Health Check — Is your business ready to grow?" },
      { name: "description", content: "Answer 10 quick questions and get a scored report on your business structure, management, finances and risk protection." },
      { property: "og:title", content: "Growth Health Check" },
      { property: "og:description", content: "A 10-question assessment of your business's growth readiness." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const AREAS = ["Business structure", "Management", "Financial readiness", "Risk protection"];

function Index() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-20 sm:py-28">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">10 questions · 3 minutes</p>
      <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight text-foreground sm:text-6xl">
        How ready is your business to grow?
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        The Growth Health Check scores your business out of 10 and shows exactly where the gaps are — across
        structure, management, financial readiness and risk protection.
      </p>
      <Button asChild size="lg" className="mt-10 h-12 px-8 text-base">
        <Link to="/assessment">Start Assessment</Link>
      </Button>
      <ul className="mt-16 grid gap-3 sm:grid-cols-4">
        {AREAS.map((a) => (
          <li key={a} className="rounded-lg border border-border bg-card p-4 text-sm font-medium shadow-[var(--shadow-card)]">
            {a}
          </li>
        ))}
      </ul>
    </main>
  );
}
