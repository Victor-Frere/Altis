DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.training_plans
    GROUP BY athlete_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Duplicate training_plans rows exist for an athlete; resolve duplicates before applying this migration.';
  END IF;
END;
$migration$;

CREATE UNIQUE INDEX IF NOT EXISTS training_plans_one_per_athlete
  ON public.training_plans (athlete_id);

REVOKE INSERT ON TABLE public.training_plans FROM anon, authenticated;
GRANT INSERT (athlete_id, weeks) ON TABLE public.training_plans TO authenticated;

CREATE POLICY "Athletes can create their own training plans"
  ON public.training_plans
  FOR INSERT
  WITH CHECK (athlete_id = (SELECT auth.uid()));

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'training_plans'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.training_plans;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'trainer_athletes'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_athletes;
    END IF;
  END IF;
END;
$migration$;
