import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { answersSchema, scoreAnswers } from "./assessment";
import { loadReport } from "./report-query";

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
    const report = await loadReport(context.supabase, data.id);
    if (!report) return null;
    const { answers: _answers, ...rest } = report;
    return rest;
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("assessments")
      .select("id, score, total_no, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      throw new Error("We couldn't load your reports. Please try again.");
    }
    return data;
  });
