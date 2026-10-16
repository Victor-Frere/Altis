CREATE OR REPLACE FUNCTION public.add_trainer_athlete_by_username(target_username TEXT)
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

  SELECT profile.id
  INTO matching_athlete
  FROM public.profiles AS profile
  WHERE profile.username = normalized_username;

  IF matching_athlete IS NULL THEN
    RAISE EXCEPTION 'No athlete was found for that username.'
      USING ERRCODE = 'P0002';
  END IF;

  IF matching_athlete = current_trainer THEN
    RAISE EXCEPTION 'You cannot add yourself as an athlete.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.trainer_athletes AS relationship (
    trainer_id,
    athlete_id,
    status
  )
  VALUES (current_trainer, matching_athlete, 'pending')
  ON CONFLICT ON CONSTRAINT trainer_athletes_pkey DO NOTHING;

  RETURN QUERY
  SELECT
    relationship.athlete_id,
    profile.username,
    relationship.edit_consent,
    relationship.status
  FROM public.trainer_athletes AS relationship
  JOIN public.profiles AS profile ON profile.id = relationship.athlete_id
  WHERE relationship.trainer_id = current_trainer
    AND relationship.athlete_id = matching_athlete;
END;
$function$;

REVOKE ALL ON FUNCTION public.add_trainer_athlete_by_username(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_trainer_athlete_by_username(TEXT) TO authenticated;
