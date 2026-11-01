-- Repair older conversation schemas used by the teacher-to-alumni messaging flow.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS alumni_id UUID REFERENCES public.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_student_alumni_idx
  ON public.conversations (student_id, alumni_id);

DROP POLICY IF EXISTS conversations_select ON public.conversations;
CREATE POLICY conversations_select
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = alumni_id);

DROP POLICY IF EXISTS conversations_insert ON public.conversations;
CREATE POLICY conversations_insert
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = student_id OR auth.uid() = alumni_id)
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id = alumni_id
        AND users.role = 'alumni'
    )
  );

NOTIFY pgrst, 'reload schema';
