CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin');
$$;

DROP POLICY IF EXISTS admin_alumni_profiles_select ON public.alumni_profiles;
CREATE POLICY admin_alumni_profiles_select
  ON public.alumni_profiles FOR SELECT TO authenticated
  USING (
    auth.uid() = profile_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS admin_alumni_profiles_update ON public.alumni_profiles;
CREATE POLICY admin_alumni_profiles_update
  ON public.alumni_profiles FOR UPDATE TO authenticated
  USING (
    auth.uid() = profile_id
    OR public.is_admin()
  )
  WITH CHECK (
    auth.uid() = profile_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS admin_sessions_select ON public.mentorship_sessions;
CREATE POLICY admin_sessions_select
  ON public.mentorship_sessions FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = alumni_id
    OR public.is_admin()
  );

DROP POLICY IF EXISTS admin_notifications_insert ON public.notifications;
CREATE POLICY admin_notifications_insert
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin()
  );

NOTIFY pgrst, 'reload schema';
