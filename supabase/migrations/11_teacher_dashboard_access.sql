-- Allow teachers to read the relationship data used by the alumni performance dashboard.
DROP POLICY IF EXISTS requests_select ON public.requests;
DROP POLICY IF EXISTS "Teachers can view requests" ON public.requests;
CREATE POLICY requests_select
  ON public.requests FOR SELECT TO authenticated
  USING (
    auth.uid() = student_id
    OR auth.uid() = alumni_id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'teacher'
    )
  );

NOTIFY pgrst, 'reload schema';
