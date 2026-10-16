CREATE POLICY "Athletes can read profiles of their linked trainers"
  ON public.profiles
  FOR SELECT
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.trainer_athletes AS ta
      WHERE ta.trainer_id = profiles.id
        AND ta.athlete_id = (SELECT auth.uid())
    )
  );

REVOKE DELETE ON TABLE public.trainer_athletes FROM anon, authenticated;
GRANT DELETE ON TABLE public.trainer_athletes TO authenticated;

CREATE POLICY "Athletes can remove their trainer relationships"
  ON public.trainer_athletes
  FOR DELETE
  USING (athlete_id = (SELECT auth.uid()));
