import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { answersSchema, buildWeaknesses, scoreAnswers } from "./assessment";

export const submitAssessment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ answers: answersSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("submit_assessment", {
      _answers: data.answers,
    });
    if (error || !id) {
      console.error(error);
      throw new Error("We couldn't save your assessment. Please try again.");
    }
    return { id: id as string, ...scoreAnswers(data.answers) };
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: a } = await sb
      .from("assessments")
      .select("id, created_at, assessment_answers(question_id, answer)")
      .eq("id", data.id)
      .maybeSingle();
    if (!a) return null;
    const { data: questions } = await sb
      .from("questions")
      .select("id, weakness_title, weakness_description");
    const answers = a.assessment_answers;
    return {
      id: a.id,
      createdAt: a.created_at,
      ...scoreAnswers(answers),
      weaknesses: buildWeaknesses(answers, questions ?? []),
    };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("assessments")
      .select("id, score, total_no, created_at")
      .order("created_at", { ascending: false });
    return data ?? [];
  });
