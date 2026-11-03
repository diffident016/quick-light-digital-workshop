CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, company)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'company');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.questions (
  id integer PRIMARY KEY CHECK (id BETWEEN 1 AND 10),
  question text NOT NULL,
  weakness_title text NOT NULL,
  weakness_description text NOT NULL
);
GRANT SELECT ON public.questions TO authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "questions readable" ON public.questions FOR SELECT TO authenticated USING (true);

INSERT INTO public.questions VALUES
(1,'Are you set up as a company (i.e. Pty Ltd)?','Business Structure','Your business is not formally established as a company. This may limit your ability to separate personal and business liabilities, establish credibility, and structure the business for future growth.'),
(2,'Do you have a shareholders agreement?','Shareholders Agreement','Your business does not have a shareholders agreement. This can lead to disagreements between shareholders and uncertainty around ownership, decision-making, and exit arrangements.'),
(3,'Do you fully understand your duties and responsibilities as a director?','Director Responsibilities','You do not fully understand your responsibilities as a director. This may expose you to legal, financial, and compliance risks when making business decisions.'),
(4,'Are you able to step away from the business for an extended period of time? I.e. 6 months off?','Business Independence','Your business may be too dependent on your day-to-day involvement. This limits your ability to take extended time away without disrupting operations.'),
(5,'Do you have a general manager or CEO running your business for you?','Management Structure','Your business does not have a general manager or CEO running its operations. This may leave too many operational responsibilities dependent on you, limiting scalability and your ability to focus on strategic growth.'),
(6,'Is your business adequately capitalized? Have access to cash reserves.','Business Capitalization','Your business may not have sufficient capital or cash reserves. This can make it difficult to handle unexpected expenses, maintain operations, or pursue growth opportunities.'),
(7,'Can your business access bank funding right now? Will the bank give you money if you called them tomorrow?','Access to Bank Funding','Your business may not have immediate access to bank funding. This could limit your ability to respond to cash flow challenges or finance expansion when opportunities arise.'),
(8,'Is your business investor ready right now? You can attract an investor within 1 month','Investor Readiness','Your business may not be investor-ready. This can make it difficult to attract investment quickly and secure the capital needed to accelerate growth.'),
(9,'Are your directors insured?','Directors Insurance','Your directors are not insured. This may expose personal assets to financial risks associated with certain claims or liabilities arising from their director responsibilities.'),
(10,'Is your business insured? Professional Indemnity, Public Liability, Assets','Business Insurance','Your business does not have adequate insurance coverage. This may leave your business financially exposed to professional claims, public liability incidents, or damage to business assets.');

CREATE TABLE public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL CHECK (score BETWEEN 0 AND 10),
  total_yes integer NOT NULL CHECK (total_yes BETWEEN 0 AND 10),
  total_no integer NOT NULL CHECK (total_no BETWEEN 0 AND 10),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total_yes + total_no = 10 AND score = 10 - total_no)
);
CREATE INDEX ON public.assessments(user_id, created_at DESC);
GRANT SELECT ON public.assessments TO authenticated;
GRANT ALL ON public.assessments TO service_role;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assessments" ON public.assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.assessment_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id integer NOT NULL REFERENCES public.questions(id),
  answer boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);
GRANT SELECT ON public.assessment_answers TO authenticated;
GRANT ALL ON public.assessment_answers TO service_role;
ALTER TABLE public.assessment_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own answers" ON public.assessment_answers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND a.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.submit_assessment(_answers jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _no int;
  _count int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF jsonb_typeof(_answers) <> 'array' THEN RAISE EXCEPTION 'Invalid answers'; END IF;
  SELECT count(DISTINCT (e->>'question_id')::int),
         count(*) FILTER (WHERE (e->>'answer')::boolean = false)
    INTO _count, _no
    FROM jsonb_array_elements(_answers) e
    WHERE (e->>'question_id')::int BETWEEN 1 AND 10 AND jsonb_typeof(e->'answer') = 'boolean';
  IF _count <> 10 OR jsonb_array_length(_answers) <> 10 THEN RAISE EXCEPTION 'Exactly 10 unique answers required'; END IF;
  INSERT INTO assessments (user_id, score, total_yes, total_no)
  VALUES (_uid, 10 - _no, 10 - _no, _no) RETURNING id INTO _id;
  INSERT INTO assessment_answers (assessment_id, question_id, answer)
  SELECT _id, (e->>'question_id')::int, (e->>'answer')::boolean FROM jsonb_array_elements(_answers) e;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.submit_assessment(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_assessment(jsonb) TO authenticated;