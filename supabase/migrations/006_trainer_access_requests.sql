ALTER TABLE public.trainer_athletes
  ADD COLUMN status TEXT NOT NULL DEFAULT 'accepted';

ALTER TABLE public.trainer_athletes
  ADD CONSTRAINT trainer_athletes_status_check
  CHECK (status IN ('pending', 'accepted'));

ALTER TABLE public.trainer_athletes
  ALTER COLUMN status SET DEFAULT 'pending';

DROP POLICY "Athletes and their trainers can read training plans"
  ON public.training_plans;

CREATE POLICY "Athletes and accepted trainers can read training plans"
  ON public.training_plans
  FOR SELECT
  USING (
    athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = (SELECT auth.uid())
        AND ta.athlete_id = training_plans.athlete_id
        AND ta.status = 'accepted'
    )
  );

DROP POLICY "Athletes and consenting trainers can update training plans"
  ON public.training_plans;

CREATE POLICY "Athletes and consenting accepted trainers can update training plans"
  ON public.training_plans
  FOR UPDATE
  USING (
    athlete_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = (SELECT auth.uid())
        AND ta.athlete_id = training_plans.athlete_id
        AND ta.status = 'accepted'
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
        AND ta.status = 'accepted'
        AND ta.edit_consent = true
    )
  );

DROP FUNCTION public.list_my_trainer_athletes();

CREATE FUNCTION public.list_my_trainer_athletes()
RETURNS TABLE (
  athlete_id UUID,
  username TEXT,
  edit_consent BOOLEAN,
  status TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT ta.athlete_id, p.username, ta.edit_consent, ta.status
  FROM public.trainer_athletes AS ta
  JOIN public.profiles AS p ON p.id = ta.athlete_id
  WHERE ta.trainer_id = (SELECT auth.uid())
    AND ta.status = 'accepted'
  ORDER BY p.username;
$function$;

DROP FUNCTION public.add_trainer_athlete_by_username(TEXT);

CREATE FUNCTION public.add_trainer_athlete_by_username(target_username TEXT)
RETURNS TABLE (
  athlete_id UUID,
  username TEXT,
  edit_consent BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_trainer UUID := auth.uid();
  normalized_username TEXT := lower(btrim(target_username));
  matching_athlete UUID;
BEGIN
  IF current_trainer IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.'
      USING ERRCODE = '42501';
  END IF;

  IF normalized_username !~ '^[a-z0-9._-]{3,32}$' THEN
    RAISE EXCEPTION 'Invalid username.'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.id
  INTO matching_athlete
  FROM public.profiles AS p
  WHERE p.username = normalized_username;

  IF matching_athlete IS NULL THEN
    RAISE EXCEPTION 'No athlete was found for that username.'
      USING ERRCODE = 'P0002';
  END IF;

  IF matching_athlete = current_trainer THEN
    RAISE EXCEPTION 'You cannot add yourself as an athlete.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trainer_athletes (trainer_id, athlete_id, status)
  VALUES (current_trainer, matching_athlete, 'pending')
  ON CONFLICT (trainer_id, athlete_id) DO NOTHING;

  RETURN QUERY
  SELECT ta.athlete_id, p.username, ta.edit_consent, ta.status
  FROM public.trainer_athletes AS ta
  JOIN public.profiles AS p ON p.id = ta.athlete_id
  WHERE ta.trainer_id = current_trainer
    AND ta.athlete_id = matching_athlete;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_my_trainer_athletes() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_trainer_athlete_by_username(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_trainer_athletes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_trainer_athlete_by_username(TEXT) TO authenticated;

GRANT SELECT (status) ON TABLE public.trainer_athletes TO authenticated;
GRANT UPDATE (status) ON TABLE public.trainer_athletes TO authenticated;
