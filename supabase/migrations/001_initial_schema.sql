CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  weeks JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE public.trainer_athletes (
  trainer_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  edit_consent BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (trainer_id, athlete_id)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_athletes ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE ON TABLE public.training_plans FROM anon, authenticated;
GRANT UPDATE (weeks) ON TABLE public.training_plans TO authenticated;

CREATE POLICY "Users can read their own profile"
  ON public.profiles
  FOR SELECT
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can create their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Athletes and their trainers can read training plans"
  ON public.training_plans
  FOR SELECT
  USING (
    athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = (SELECT auth.uid())
        AND ta.athlete_id = training_plans.athlete_id
    )
  );

CREATE POLICY "Athletes and consenting trainers can update training plans"
  ON public.training_plans
  FOR UPDATE
  USING (
    athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = (SELECT auth.uid())
        AND ta.athlete_id = training_plans.athlete_id
        AND ta.edit_consent = true
    )
  )
  WITH CHECK (
    athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = (SELECT auth.uid())
        AND ta.athlete_id = training_plans.athlete_id
        AND ta.edit_consent = true
    )
  );

CREATE POLICY "Related athletes and trainers can read their relationship"
  ON public.trainer_athletes
  FOR SELECT
  USING (
    trainer_id = (SELECT auth.uid())
    OR athlete_id = (SELECT auth.uid())
  );
