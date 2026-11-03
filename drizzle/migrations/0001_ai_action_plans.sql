-- AI action plans (optional, on-demand extension). Never touches scores or weaknesses:
-- those stay in assessments / assessment_answers / questions exactly as before.

-- Last-used business context, so the optional form is prefilled next time.
ALTER TABLE public.profiles ADD COLUMN business_context jsonb;

-- One row per generation. The newest row for an assessment is the one shown;
-- older rows are kept as history and count toward the per-user daily limit.
CREATE TABLE public.assessment_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model text NOT NULL,
  prompt_version integer NOT NULL,
  language text NOT NULL DEFAULT 'en',
  business_context jsonb,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.assessment_insights(assessment_id, created_at DESC);
CREATE INDEX ON public.assessment_insights(user_id, created_at DESC);

-- Owners can read their own plans. There is deliberately no INSERT/UPDATE grant for
-- `authenticated`: only the server (service role) writes, after validating the AI output
-- and enforcing the rate limit, so users can't store arbitrary "AI" content or skip limits.
GRANT SELECT ON public.assessment_insights TO authenticated;
GRANT ALL ON public.assessment_insights TO service_role;
ALTER TABLE public.assessment_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insights" ON public.assessment_insights FOR SELECT TO authenticated
USING (auth.uid() = user_id);
