import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AssessmentFlow } from "@/components/assessment/AssessmentFlow";
import type { Answer } from "@/lib/assessment";
import { submitAssessment } from "@/lib/assessment.functions";

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

  async function onSubmit(answers: Answer[]) {
    // Score is computed and stored server-side; the report page reads it back from the database.
    const res = await submit({ data: { answers } });
    await navigate({ to: "/report/$id", params: { id: res.id } });
  }

  return (
    <main>
      <AssessmentFlow onSubmit={onSubmit} />
    </main>
  );
}
