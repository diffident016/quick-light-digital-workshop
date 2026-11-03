import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildWeaknesses, scoreAnswers, type Answer } from "./assessment";

export class ReportLoadError extends Error {}

/**
 * Loads one report with a user-scoped client, so RLS limits it to the owner.
 * Returns null for "doesn't exist" and "not yours" alike. Scores and weaknesses are
 * always recomputed from stored answers + trusted question text, never from client input.
 */
export async function loadReport(sb: SupabaseClient<Database>, id: string) {
  const { data: a, error } = await sb
    .from("assessments")
    .select("id, created_at, assessment_answers(question_id, answer)")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error(error);
    throw new ReportLoadError("We couldn't load this report. Please try again.");
  }
  if (!a) return null;
  const { data: questions, error: qError } = await sb
    .from("questions")
    .select("id, weakness_title, weakness_description");
  if (qError || !questions) {
    console.error(qError);
    throw new ReportLoadError("We couldn't load this report. Please try again.");
  }
  const answers: Answer[] = a.assessment_answers;
  return {
    id: a.id,
    createdAt: a.created_at,
    answers,
    ...scoreAnswers(answers),
    weaknesses: buildWeaknesses(answers, questions),
  };
}
