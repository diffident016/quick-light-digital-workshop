import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppLanguage } from "@/hooks/use-app-language";
import type { Weakness } from "@/lib/assessment";
import { businessContextSchema, STAGES, TEAM_SIZES, type BusinessContext } from "@/lib/ai/insights";
import type { StoredPlan } from "@/lib/ai/generate-plan";
import { generateActionPlan, getActionPlan, type GenerateResult } from "@/lib/insights.functions";
import { cn } from "@/lib/utils";

const FAILURE_COPY: Record<Extract<GenerateResult, { ok: false }>["reason"], string> = {
  rate_limited: "You've reached today's limit for action plans. Please try again tomorrow.",
  busy: "We're getting a lot of requests right now. Please wait a minute and try again.",
  not_configured: "Action plans aren't available right now.",
  not_found: "We couldn't find this report.",
  unavailable: "We couldn't create your action plan just now. Please try again in a moment.",
};

/** On-demand AI action plan for a report. Additive only: the report above never depends on it. */
export function ActionPlanSection({ assessmentId, weaknesses }: { assessmentId: string; weaknesses: Weakness[] }) {
  const fetchPlan = useServerFn(getActionPlan);
  const runGenerate = useServerFn(generateActionPlan);
  const language = useAppLanguage();
  const qc = useQueryClient();
  const queryKey = ["action-plan", assessmentId];
  const [editing, setEditing] = useState(false);

  const query = useQuery({ queryKey, queryFn: () => fetchPlan({ data: { assessmentId } }) });

  const mutation = useMutation({
    mutationFn: (context: BusinessContext) => runGenerate({ data: { assessmentId, context, language } }),
    onSuccess: (res) => {
      if (!res.ok) return;
      setEditing(false);
      qc.setQueryData(queryKey, (old: typeof query.data) =>
        old ? { ...old, plan: res.plan, savedContext: res.plan.businessContext, remainingToday: Math.max(0, old.remainingToday - 1) } : old,
      );
    },
  });

  // The feature stays invisible until a Gemini key is configured, and never blocks the report.
  if (query.isLoading || query.isError || !query.data?.enabled) return null;
  const { plan, savedContext, remainingToday, dailyLimit } = query.data;
  const failure = mutation.data && !mutation.data.ok ? FAILURE_COPY[mutation.data.reason] : mutation.isError ? FAILURE_COPY.unavailable : null;

  return (
    <section aria-labelledby="action-plan-heading" className="mt-14">
      {plan && !editing ? (
        <PlanView
          stored={plan}
          weaknesses={weaknesses}
          onRegenerate={() => setEditing(true)}
          remainingToday={remainingToday}
        />
      ) : (
        <GenerateCard
          busy={mutation.isPending}
          error={failure}
          initialContext={plan?.businessContext ?? savedContext}
          remainingToday={remainingToday}
          dailyLimit={dailyLimit}
          isRegenerate={Boolean(plan)}
          onCancel={plan ? () => setEditing(false) : undefined}
          onSubmit={(ctx) => mutation.mutate(ctx)}
        />
      )}
    </section>
  );
}

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-foreground/80">
      <Sparkles className="size-3 text-accent" aria-hidden /> AI-generated
    </span>
  );
}

/* --------------------------------- Request --------------------------------- */

export function GenerateCard(props: {
  busy: boolean;
  error: string | null;
  initialContext: BusinessContext | null;
  remainingToday: number;
  dailyLimit: number;
  isRegenerate: boolean;
  onCancel: (() => void) | undefined;
  onSubmit: (ctx: BusinessContext) => void;
}) {
  const { busy, error, initialContext, remainingToday, dailyLimit, isRegenerate, onCancel, onSubmit } = props;
  const [showDetails, setShowDetails] = useState(Boolean(initialContext) || isRegenerate);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const outOfQuota = remainingToday <= 0;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const ctx: BusinessContext = {};
    const industry = String(f.get("industry") ?? "").trim();
    const teamSize = String(f.get("teamSize") ?? "");
    const stage = String(f.get("stage") ?? "");
    if (industry) ctx.industry = industry;
    if ((TEAM_SIZES as readonly string[]).includes(teamSize)) ctx.teamSize = teamSize as BusinessContext["teamSize"] & string;
    if ((STAGES as readonly string[]).includes(stage)) ctx.stage = stage as BusinessContext["stage"] & string;
    // Same schema the server enforces, so problems show inline instead of as a generic failure.
    const checked = businessContextSchema.safeParse(ctx);
    if (!checked.success) {
      setShowDetails(true);
      setFieldError(checked.error.issues[0]?.message ?? "Please check the industry field.");
      return;
    }
    setFieldError(null);
    onSubmit(checked.data);
  }

  return (
    <div className="no-print rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
          <Sparkles className="size-5" aria-hidden />
        </span>
        <div>
          <h2 id="action-plan-heading" className="text-2xl font-semibold">
            {isRegenerate ? "Update your action plan" : "Get your personalised action plan"}
          </h2>
          <p className="mt-2 text-foreground/75">
            Friendly, step-by-step suggestions for each area above, put in the order we'd tackle them.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6" aria-busy={busy}>
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          aria-expanded={showDetails}
          aria-controls="business-details"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-accent-ink"
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200 ease-fluid", showDetails && "rotate-180")} aria-hidden />
          Tell us about your business <span className="font-normal text-muted-foreground">(optional)</span>
        </button>

        {showDetails && (
          <fieldset id="business-details" disabled={busy} className="mt-4 grid animate-rise gap-4 sm:grid-cols-3">
            <legend className="sr-only">Business details</legend>
            <div className="space-y-1.5">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                name="industry"
                maxLength={60}
                placeholder="e.g. Construction"
                defaultValue={initialContext?.industry ?? ""}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? "industry-error" : undefined}
                onChange={() => setFieldError(null)}
                className="h-11 aria-invalid:border-destructive"
              />
              {fieldError && (
                <p id="industry-error" className="text-xs font-medium text-destructive">
                  {fieldError}
                </p>
              )}
            </div>
            <SelectField name="teamSize" label="Team size" options={TEAM_SIZES} defaultValue={initialContext?.teamSize} />
            <SelectField name="stage" label="Stage" options={STAGES} defaultValue={initialContext?.stage} />
          </fieldset>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="submit" size="lg" disabled={busy || outOfQuota} className="h-11">
            {busy ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Creating your plan…
              </>
            ) : (
              <>
                <Sparkles aria-hidden /> {isRegenerate ? "Create updated plan" : "Create my action plan"}
              </>
            )}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={busy} className="h-11">
              Cancel
            </Button>
          )}
          <p className="text-xs text-muted-foreground sm:ml-auto">
            {outOfQuota ? "Daily limit reached" : `${remainingToday} of ${dailyLimit} left today`}
          </p>
        </div>

        <div aria-live="polite">
          {busy && <PlanSkeleton />}
          {error && !busy && (
            <p role="alert" className="mt-4 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue: string | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Prefer not to say</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="mt-6 space-y-3 border-t border-border pt-6" aria-hidden>
      <div className="h-4 w-11/12 animate-pulse rounded bg-muted" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-5 h-5 w-1/2 animate-pulse rounded bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
    </div>
  );
}

/* ---------------------------------- Plan ----------------------------------- */

export function PlanView({
  stored,
  weaknesses,
  onRegenerate,
  remainingToday,
}: {
  stored: StoredPlan;
  weaknesses: Weakness[];
  onRegenerate: () => void;
  remainingToday: number;
}) {
  const { plan } = stored;
  const titles = new Map(weaknesses.map((w) => [w.questionId, w.title]));
  const date = new Date(stored.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="animate-rise">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
        <h2 id="action-plan-heading" className="text-2xl font-semibold sm:text-3xl">
          Your action plan
        </h2>
        <AiBadge />
      </div>

      <p className="mt-6 max-w-prose text-lg leading-relaxed text-foreground/85">{plan.summary}</p>

      {plan.priorities.length > 0 && (
        <ol className="mt-8 space-y-8">
          {plan.priorities.map((p, i) => (
            <li key={p.questionId} className="print-plain grid grid-cols-[auto_1fr] gap-x-4 sm:gap-x-6">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-full bg-primary font-serif text-base font-semibold text-primary-foreground tabular-nums"
              >
                {i + 1}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className="sr-only">Priority {i + 1}: </span>
                  Question {p.questionId} · {titles.get(p.questionId)}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{p.headline}</h3>
                <ul className="mt-3 space-y-2">
                  {p.actions.map((a, j) => (
                    <li key={j} className="flex gap-3 leading-relaxed text-foreground/80">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}

      {plan.maintain.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold">Keeping it that way</h3>
          <ul className="mt-3 space-y-2">
            {plan.maintain.map((m, j) => (
              <li key={j} className="flex gap-3 leading-relaxed text-foreground/80">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-success" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Created {date} with Google Gemini. AI suggestions can be wrong. Check important decisions with your
          accountant, lawyer or broker.
        </p>
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={remainingToday <= 0} className="no-print">
          <RefreshCw aria-hidden /> Update plan
        </Button>
      </div>
    </div>
  );
}
