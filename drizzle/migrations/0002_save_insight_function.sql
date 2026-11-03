-- Save AI action plans through a database function instead of the service-role key, so the
-- app needs no server-only Supabase secret (Lovable Cloud doesn't expose it locally).
-- Idempotent: safe to run more than once.
--
-- The function runs as the signed-in user's own request (auth.uid()) and enforces, in the DB:
--   * the assessment belongs to the caller
--   * at most 5 plans per user per rolling 24h (keep in sync with DAILY_LIMIT in generate-plan.ts)
--   * basic shape/size limits on what is stored
-- Calling it directly can only ever add a plan to your *own* report (visible only to you),
-- and still counts toward your own daily limit. The Gemini call itself stays server-side.

CREATE OR REPLACE FUNCTION public.save_assessment_insight(
  _assessment_id uuid,
  _model text,
  _prompt_version integer,
  _language text,
  _business_context jsonb,
  _content jsonb
) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _created timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;

  IF NOT EXISTS (SELECT 1 FROM assessments WHERE id = _assessment_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF jsonb_typeof(_content) IS DISTINCT FROM 'object' OR pg_column_size(_content) > 20000
     OR (_business_context IS NOT NULL AND (jsonb_typeof(_business_context) <> 'object' OR pg_column_size(_business_context) > 2000))
     OR length(_model) NOT BETWEEN 1 AND 100
     OR length(_language) NOT BETWEEN 2 AND 20 THEN
    RAISE EXCEPTION 'invalid_plan';
  END IF;

  -- Serialise per user so parallel requests can't slip past the limit.
  PERFORM pg_advisory_xact_lock(hashtext('assessment_insights:' || _uid::text));
  IF (SELECT count(*) FROM assessment_insights
      WHERE user_id = _uid AND created_at > now() - interval '24 hours') >= 5 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  INSERT INTO assessment_insights (assessment_id, user_id, model, prompt_version, language, business_context, content)
  VALUES (_assessment_id, _uid, _model, _prompt_version, _language, _business_context, _content)
  RETURNING created_at INTO _created;
  RETURN _created;
END $$;

REVOKE ALL ON FUNCTION public.save_assessment_insight(uuid, text, integer, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_assessment_insight(uuid, text, integer, text, jsonb, jsonb) TO authenticated;

-- Table stays read-only for users; writes only happen inside the function above.
REVOKE ALL ON public.assessment_insights FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.assessment_insights FROM authenticated;

NOTIFY pgrst, 'reload schema';
