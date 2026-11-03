-- AI action plans (optional, on-demand extension). Never touches scores or weaknesses:
-- those stay in assessments / assessment_answers / questions exactly as before.
-- Idempotent: safe to run more than once (e.g. by hand in the SQL editor and again by tooling).

-- Last-used business context, so the optional form is prefilled next time.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS business_context jsonb;

-- One row per generation. The newest row for an assessment is the one shown;
-- older rows are kept as history and count toward the per-user daily limit.
CREATE TABLE IF NOT EXISTS public.assessment_insights (
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
CREATE INDEX IF NOT EXISTS assessment_insights_assessment_created_idx
  ON public.assessment_insights (assessment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS assessment_insights_user_created_idx
  ON public.assessment_insights (user_id, created_at DESC);

-- Owners can read their own plans. Users get no direct write access: plans are saved only
-- through the save_assessment_insight function (migration 0002), which checks ownership and
-- the daily limit inside the database.
-- Supabase auto-grants new public tables to anon/authenticated; take writes back so the
-- table is read-only for users even if an RLS policy is ever loosened (defence in depth).
REVOKE ALL ON public.assessment_insights FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.assessment_insights FROM authenticated;
GRANT SELECT ON public.assessment_insights TO authenticated;
GRANT ALL ON public.assessment_insights TO service_role;
ALTER TABLE public.assessment_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own insights" ON public.assessment_insights;
CREATE POLICY "own insights" ON public.assessment_insights FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Make the new table/column visible to the API immediately.
NOTIFY pgrst, 'reload schema';
