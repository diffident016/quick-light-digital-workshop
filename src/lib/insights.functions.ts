import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DAILY_LIMIT, generatePlan, RateLimitedError, ReportNotFoundError, type StoredPlan } from "./ai/generate-plan";
import {
  actionPlanSchema,
  businessContextSchema,
  InvalidPlanError,
  languageSchema,
  type BusinessContext,
} from "./ai/insights";
import { loadReport } from "./report-query";

// `assessment_insights` and `profiles.business_context` come from migration 0001 and aren't
// in the generated types until Lovable regenerates src/integrations/supabase/types.ts.
// Until then these queries go through an untyped view of the same (RLS-scoped) client.
const untyped = (sb: unknown) => sb as SupabaseClient;

type InsightRow = {
  content: unknown;
  created_at: string;
  model: string;
  language: string;
  business_context: BusinessContext | null;
};

const dayAgo = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

async function countRecent(sb: SupabaseClient, since: string): Promise<number> {
  // RLS limits this to the caller's own rows.
  const { count, error } = await sb
    .from("assessment_insights")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

/** Latest plan for a report (if any), prefill for the context form, and today's remaining quota. */
export const getActionPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { assessmentId: string }) => z.object({ assessmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { isAiConfigured } = await import("./ai/gemini.server");
    const sb = untyped(context.supabase);

    const [insight, profile, used] = await Promise.all([
      sb
        .from("assessment_insights")
        .select("content, created_at, model, language, business_context")
        .eq("assessment_id", data.assessmentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<InsightRow>(),
      sb.from("profiles").select("business_context").eq("id", context.userId).maybeSingle<{ business_context: BusinessContext | null }>(),
      countRecent(sb, dayAgo()).catch(() => 0),
    ]);
    if (insight.error) console.error("[ai] load plan failed", insight.error);

    let plan: StoredPlan | null = null;
    if (insight.data) {
      // Defensive: only show stored content that still matches the current schema.
      const parsed = actionPlanSchema.safeParse(insight.data.content);
      if (parsed.success)
        plan = {
          plan: parsed.data,
          createdAt: insight.data.created_at,
          model: insight.data.model,
          language: insight.data.language,
          businessContext: insight.data.business_context,
        };
    }

    return {
      enabled: isAiConfigured(),
      plan,
      savedContext: profile.data?.business_context ?? null,
      remainingToday: Math.max(0, DAILY_LIMIT - used),
      dailyLimit: DAILY_LIMIT,
    };
  });

export type GenerateResult =
  | { ok: true; plan: StoredPlan }
  | { ok: false; reason: "not_configured" | "rate_limited" | "busy" | "not_found" | "unavailable" };

/** Generates (or regenerates) the AI action plan for one of the caller's reports. On demand only. */
export const generateActionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        assessmentId: z.string().uuid(),
        context: businessContextSchema.optional(),
        language: languageSchema,
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<GenerateResult> => {
    const { generateJson, geminiModel, isAiConfigured, AiBusyError, AiNotConfiguredError, AiUnavailableError } = await import(
      "./ai/gemini.server"
    );
    if (!isAiConfigured()) return { ok: false, reason: "not_configured" };
    const sb = untyped(context.supabase);

    try {
      const plan = await generatePlan(
        {
          model: geminiModel(),
          loadReport: (id) => loadReport(context.supabase, id),
          countRecentGenerations: (_userId, since) => countRecent(sb, since.toISOString()),
          callModel: generateJson,
          savePlan: async (row) => {
            // Saved via the save_assessment_insight DB function (migration 0002) as the signed-in
            // user. The DB re-checks ownership and the daily limit, so no service-role key is needed.
            const { data: createdAt, error } = await sb.rpc("save_assessment_insight", {
              _assessment_id: row.assessmentId,
              _model: row.model,
              _prompt_version: row.promptVersion,
              _language: row.language,
              _business_context: row.businessContext,
              _content: row.content,
            });
            if (error) {
              if (error.message.includes("rate_limited")) throw new RateLimitedError("Daily limit reached");
              if (error.message.includes("not_found")) throw new ReportNotFoundError("Report not found");
              throw error;
            }
            if (typeof createdAt !== "string") throw new Error("Save returned no timestamp");
            return { createdAt };
          },
          saveContextForNextTime: async (ctx) => {
            const { error } = await sb.from("profiles").update({ business_context: ctx }).eq("id", context.userId);
            if (error) throw error;
          },
        },
        { assessmentId: data.assessmentId, userId: context.userId, context: data.context, language: data.language },
      );
      return { ok: true, plan };
    } catch (e) {
      if (e instanceof RateLimitedError) return { ok: false, reason: "rate_limited" };
      if (e instanceof ReportNotFoundError) return { ok: false, reason: "not_found" };
      if (e instanceof AiNotConfiguredError) return { ok: false, reason: "not_configured" };
      // Gemini's own quota (per minute/day on the API key), not our per-user daily limit.
      if (e instanceof AiBusyError) return { ok: false, reason: "busy" };
      if (e instanceof AiUnavailableError || e instanceof InvalidPlanError) {
        console.error("[ai] generation failed", e.message);
        return { ok: false, reason: "unavailable" };
      }
      console.error("[ai] unexpected error", e);
      return { ok: false, reason: "unavailable" };
    }
  });
