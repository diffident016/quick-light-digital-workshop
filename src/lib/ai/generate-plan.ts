import type { Answer, Weakness } from "@/lib/assessment";
import { QUESTIONS } from "@/lib/assessment";
import {
  buildPrompt,
  InvalidPlanError,
  normalizeContext,
  PROMPT_VERSION,
  SYSTEM_INSTRUCTION,
  validatePlan,
  type ActionPlan,
  type BusinessContext,
} from "./insights";

/** Generations allowed per user in any rolling 24 hours (caps Gemini cost and abuse). */
export const DAILY_LIMIT = 5;

export class RateLimitedError extends Error {}
export class ReportNotFoundError extends Error {}

export type StoredPlan = {
  plan: ActionPlan;
  createdAt: string;
  model: string;
  language: string;
  businessContext: BusinessContext | null;
};

type ReportForPlan = { score: number; answers: Answer[]; weaknesses: Weakness[] };

/** Everything with side effects is injected, so this can be tested without Gemini or a DB. */
export type PlanDeps = {
  loadReport: (assessmentId: string) => Promise<ReportForPlan | null>;
  countRecentGenerations: (userId: string, since: Date) => Promise<number>;
  callModel: (args: { system: string; prompt: string }) => Promise<string>;
  savePlan: (row: {
    assessmentId: string;
    userId: string;
    model: string;
    promptVersion: number;
    language: string;
    businessContext: BusinessContext | null;
    content: ActionPlan;
  }) => Promise<{ createdAt: string }>;
  saveContextForNextTime: (ctx: BusinessContext | null) => Promise<void>;
  model: string;
  now?: () => Date;
};

type Input = { assessmentId: string; userId: string; context?: BusinessContext | undefined; language: string };

export async function generatePlan(deps: PlanDeps, input: Input): Promise<StoredPlan> {
  const report = await deps.loadReport(input.assessmentId);
  if (!report) throw new ReportNotFoundError("Report not found");

  const now = deps.now?.() ?? new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if ((await deps.countRecentGenerations(input.userId, since)) >= DAILY_LIMIT)
    throw new RateLimitedError(`Daily limit of ${DAILY_LIMIT} action plans reached`);

  const context = normalizeContext(input.context);
  const yesIds = new Set(report.answers.filter((a) => a.answer).map((a) => a.question_id));
  const prompt = buildPrompt({
    score: report.score,
    weaknesses: report.weaknesses,
    strengths: QUESTIONS.filter((q) => yesIds.has(q.id)).map((q) => ({ questionId: q.id, question: q.question })),
    context,
    language: input.language,
  });

  // Models occasionally return off-spec JSON; one retry fixes almost all of those.
  let plan: ActionPlan | undefined;
  for (let attempt = 1; attempt <= 2 && !plan; attempt++) {
    const raw = await deps.callModel({ system: SYSTEM_INSTRUCTION, prompt });
    try {
      plan = validatePlan(raw, report.weaknesses);
    } catch (e) {
      if (!(e instanceof InvalidPlanError) || attempt === 2) throw e;
      console.warn(`[ai] attempt ${attempt} rejected: ${e.message}`);
    }
  }

  const { createdAt } = await deps.savePlan({
    assessmentId: input.assessmentId,
    userId: input.userId,
    model: deps.model,
    promptVersion: PROMPT_VERSION,
    language: input.language,
    businessContext: context,
    content: plan!,
  });
  // Prefill only; a failure here must not lose the plan the user just paid latency for.
  await deps.saveContextForNextTime(context).catch((e) => console.error("[ai] saving context failed", e));

  return { plan: plan!, createdAt, model: deps.model, language: input.language, businessContext: context };
}
